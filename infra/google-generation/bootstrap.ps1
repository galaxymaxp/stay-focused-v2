param([string]$Project = 'stay-focus-492811', [string]$Region = 'asia-northeast1')
$ErrorActionPreference = 'Stop'
function Invoke-Gcloud {
  & gcloud.cmd @args --project=$Project --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Google infrastructure command failed.' }
}
function Test-GcloudResource {
  $ErrorActionPreference = 'Continue'
  & gcloud.cmd @args --project=$Project --format='value(name)' *> $null
  return ($LASTEXITCODE -eq 0)
}
if ((& gcloud.cmd config get-value project 2>$null) -ne $Project) { throw 'Active Google project mismatch.' }
Invoke-Gcloud services enable run.googleapis.com cloudtasks.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
foreach ($name in @('generation-worker', 'generation-invoker', 'generation-dispatcher', 'generation-builder')) {
  if (-not (Test-GcloudResource iam service-accounts describe "$name@$Project.iam.gserviceaccount.com")) { Invoke-Gcloud iam service-accounts create $name --display-name=$name }
}
if (-not (Test-GcloudResource artifacts repositories describe generation --location=$Region)) { Invoke-Gcloud artifacts repositories create generation --repository-format=docker --location=$Region }
if (-not (Test-GcloudResource tasks queues describe generation --location=$Region)) { Invoke-Gcloud tasks queues create generation --location=$Region }
# Ten deliveries allow overlap/busy responses without unbounded provider retries.
# The durable job separately limits claimed executions to its existing max_attempts.
Invoke-Gcloud tasks queues update generation --location=$Region --max-concurrent-dispatches=2 --max-dispatches-per-second=1 --max-attempts=10 --min-backoff=60s --max-backoff=300s --max-doublings=3 --max-retry-duration=3600s --log-sampling-ratio=1
Invoke-Gcloud projects add-iam-policy-binding $Project --member="serviceAccount:generation-worker@$Project.iam.gserviceaccount.com" --role=roles/serviceusage.serviceUsageConsumer --condition=None --format='none'
Invoke-Gcloud tasks queues add-iam-policy-binding generation --location=$Region --member="serviceAccount:generation-dispatcher@$Project.iam.gserviceaccount.com" --role=roles/cloudtasks.enqueuer --format='none'
Invoke-Gcloud iam service-accounts add-iam-policy-binding "generation-invoker@$Project.iam.gserviceaccount.com" --member="serviceAccount:generation-dispatcher@$Project.iam.gserviceaccount.com" --role=roles/iam.serviceAccountUser --format='none'
foreach ($name in @('generation-openai-api-key', 'generation-supabase-url', 'generation-supabase-service-role')) {
  if (-not (Test-GcloudResource secrets describe $name)) { Invoke-Gcloud secrets create $name --replication-policy=user-managed --locations=$Region }
  Invoke-Gcloud secrets add-iam-policy-binding $name --member="serviceAccount:generation-worker@$Project.iam.gserviceaccount.com" --role=roles/secretmanager.secretAccessor --format='none'
}
Invoke-Gcloud artifacts repositories add-iam-policy-binding generation --location=$Region --member="serviceAccount:generation-builder@$Project.iam.gserviceaccount.com" --role=roles/artifactregistry.writer --format='none'
Invoke-Gcloud projects add-iam-policy-binding $Project --member="serviceAccount:generation-builder@$Project.iam.gserviceaccount.com" --role=roles/logging.logWriter --condition=None --format='none'
$bucket = "gs://$Project-generation-builds"
if (-not (Test-GcloudResource storage buckets describe $bucket)) { Invoke-Gcloud storage buckets create $bucket --location=$Region --uniform-bucket-level-access }
Invoke-Gcloud storage buckets add-iam-policy-binding $bucket --member="serviceAccount:generation-builder@$Project.iam.gserviceaccount.com" --role=roles/storage.objectViewer --format='none'

param([string]$Project = 'stay-focus-492811', [string]$Region = 'asia-northeast1')
$ErrorActionPreference = 'Stop'
if ((& gcloud.cmd config get-value project 2>$null) -ne $Project) { throw 'Active Google project mismatch.' }
$workerMember = "serviceAccount:generation-worker@$Project.iam.gserviceaccount.com"
# Scope enqueue access to the existing queue and act-as to its existing invoker.
& gcloud.cmd tasks queues add-iam-policy-binding generation --project=$Project --location=$Region --member=$workerMember --role=roles/cloudtasks.enqueuer --quiet --format='none'
if ($LASTEXITCODE -ne 0) { throw 'Queue enqueue binding failed.' }
& gcloud.cmd iam service-accounts add-iam-policy-binding "generation-invoker@$Project.iam.gserviceaccount.com" --project=$Project --member=$workerMember --role=roles/iam.serviceAccountUser --quiet --format='none'
if ($LASTEXITCODE -ne 0) { throw 'Task invoker identity binding failed.' }

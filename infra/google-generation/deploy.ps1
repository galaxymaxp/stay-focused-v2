param([Parameter(Mandatory=$true)][string]$Image, [string]$Project = 'stay-focus-492811', [string]$Region = 'asia-northeast1')
$ErrorActionPreference = 'Stop'
if ((& gcloud.cmd config get-value project 2>$null) -ne $Project) { throw 'Active Google project mismatch.' }
$workerUrl = & gcloud.cmd run services describe generation-worker --project=$Project --region=$Region --format='value(status.url)'
if ($LASTEXITCODE -ne 0 -or $workerUrl -notmatch '^https://[a-z0-9.-]+\.run\.app$') { throw 'Existing private worker URL unavailable.' }
# Automatic admission dispatches to the same queue using the worker's ADC identity.
& gcloud.cmd run deploy generation-worker --project=$Project --region=$Region --image=$Image --service-account="generation-worker@$Project.iam.gserviceaccount.com" --no-allow-unauthenticated --cpu=1 --memory=2Gi --concurrency=1 --min-instances=0 --max-instances=2 --timeout=1800s --set-env-vars="GOOGLE_CLOUD_PROJECT_ID=$Project,GENERATION_BACKEND=google-cloud,GOOGLE_GENERATION_REGION=$Region,GOOGLE_GENERATION_QUEUE=generation,GOOGLE_TASKS_INVOKER_EMAIL=generation-invoker@$Project.iam.gserviceaccount.com,GOOGLE_GENERATION_WORKER_URL=$workerUrl" --set-secrets='OPENAI_API_KEY=generation-openai-api-key:1,SUPABASE_URL=generation-supabase-url:1,SUPABASE_SERVICE_ROLE_KEY=generation-supabase-service-role:1' --quiet
if ($LASTEXITCODE -ne 0) { throw 'Cloud Run deployment failed.' }
& gcloud.cmd run services add-iam-policy-binding generation-worker --project=$Project --region=$Region --member="serviceAccount:generation-invoker@$Project.iam.gserviceaccount.com" --role=roles/run.invoker --quiet --format='none'
if ($LASTEXITCODE -ne 0) { throw 'Cloud Run invocation binding failed.' }

# Deploy Server
param(
    [Parameter(Mandatory=$true)]
    [string]$OptimizerUrl
)

$ErrorActionPreference = "Stop"
Write-Host "Preparing to deploy Server..."

# 1. Convert .env to env.yaml
if (Test-Path .env) {
    Write-Host "   Reading .env file..."
    $content = Get-Content .env
    $yamlContent = @()
    
    foreach ($line in $content) {
        if ($line -match "^[^#]*=.*") {
            $key, $value = $line.Split('=', 2)
            $value = $value.Trim('"').Trim("'")
            $yamlContent += "${key}: `"$value`""
        }
    }
} else {
    $yamlContent = @()
}

# 2. Add dynamic variables
$yamlContent += "OPTIMIZER_URL: `"$OptimizerUrl`""
$yamlContent += "FRONTEND_URL: `"*`"" # Temporary wildcard

$yamlContent | Out-File env.yaml -Encoding ASCII
Write-Host "   Created temporary env.yaml with Optimizer URL"

# 3. Deploy
Write-Host "Deploying to Cloud Run..."
try {
    gcloud run deploy chainfreight-server `
        --image us-central1-docker.pkg.dev/rock-idiom-475618-q4/chainfreight-repo/server `
        --platform managed `
        --region us-central1 `
        --allow-unauthenticated `
        --env-vars-file env.yaml
}
finally {
    if (Test-Path env.yaml) {
        Remove-Item env.yaml
    }
}

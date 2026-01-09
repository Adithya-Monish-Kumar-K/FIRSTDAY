# Deploy Optimizer
$ErrorActionPreference = "Stop"

Write-Host "Preparing to deploy Optimizer..."

# 1. Convert .env to env.yaml for gcloud
if (Test-Path .env) {
    Write-Host "   Reading .env file..."
    $content = Get-Content .env
    $yamlContent = @()
    
    foreach ($line in $content) {
        if ($line -match "^[^#]*=.*") {
            $key, $value = $line.Split('=', 2)
            # Trim quotes if present
            $value = $value.Trim('"').Trim("'")
            $yamlContent += "${key}: `"$value`""
        }
    }
    
    $yamlContent | Out-File env.yaml -Encoding ASCII
    Write-Host "   Created temporary env.yaml"
} else {
    Write-Warning ".env file not found! Deploying without environment variables."
    New-Item env.yaml -ItemType File -Force
}

# 2. Deploy
Write-Host "Deploying to Cloud Run..."
try {
    gcloud run deploy chainfreight-optimizer `
        --image us-central1-docker.pkg.dev/rock-idiom-475618-q4/chainfreight-repo/optimizer `
        --platform managed `
        --region us-central1 `
        --allow-unauthenticated `
        --env-vars-file env.yaml
}
finally {
    # Cleanup
    if (Test-Path env.yaml) {
        Remove-Item env.yaml
    }
}

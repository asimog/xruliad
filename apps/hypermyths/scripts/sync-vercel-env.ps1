# Set Vercel production environment variables from .env.local
# Skips local-only variables and uses --force to overwrite existing.

$envFile = ".env.local"
$lines = Get-Content $envFile

# Local-only vars to skip (or force to production values)
$skipPatterns = @(
  '^MEDIA_BACKEND',
  '^MEDIA_LOCAL_ROOT',
  '^OPENMONTAGE_PATH',
  '^OPENMONTAGE_OUTPUT',
  '^MYTHX_API_KEY',
  '^MYTHX_BASE_URL',
  '^AUTONOMOUS_CHAT_TOKEN',
  '^YOUTUBE_DL_BINARY',
  '^SOLANA_RPC_URL',
  '^SOLANA_RPC_FALLBACK_URL',
  '^SOLANA_DAS_RPC_URL',
  '^SOLANA_MINT_PAYMENT_ADDRESS',
  '^SOLANA_MINT_AUTHORITY_SECRET',
  '^CNFT_',
  '^ARWEAVE_',
  '^IRYS_',
  '^HELIUS_',
  '^COLOSSEUM_',
  '^VAST_'
)

# Production overrides (force these values regardless of .env.local)
$productionOverrides = @{
  NODE_ENV = "production"
  APP_BASE_URL = "https://hypermyths.com"
  ALLOW_IN_PROCESS_WORKER = "false"
  WORKER_BACKEND = "railway"
  WORKER_URL = "https://hypermyths-production.up.railway.app/jobs/process"
  VIDEO_API_BASE_URL = "https://hypermyths.com/api"
  VIDEO_SERVICE_BASE_URL = "https://hypermyths.com"
  VIDEO_RESOLUTION = "768p"
  TEXT_INFERENCE_PROVIDER = "openrouter"
  VIDEO_PROVIDER_PRIORITY = "openrouter,eliza,xai,fal,replicate,huggingface"
  ELIZA_VIDEO_MODEL = "bytedance/seedance-2.0/fast/text-to-video"
}

$count = 0
foreach ($line in $lines) {
  if ($line -match '^([A-Z_][A-Z0-9_]*)=(.+)$') {
    $key = $matches[1]
    $value = $matches[2].Trim('"')

    # Skip local-only patterns
    $skip = $false
    foreach ($pat in $skipPatterns) {
      if ($key -like $pat) { $skip = $true; break }
    }
    if ($skip) { continue }

    # Use override if defined
    if ($productionOverrides.ContainsKey($key)) {
      $value = $productionOverrides[$key]
    }

    # Set on Vercel
    Write-Host "Setting Vercel prod: $key = $value"
    $escapedValue = $value | ForEach-Object { $_ -replace '"','\"' }
    vercel env add $key production --value "$escapedValue" --sensitive:$false --yes --non-interactive 2>&1 | Select-Object -First 1
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Failed to set $key"
    }
    $count++
  }
}

Write-Host "`nSet $count variables on Vercel production."

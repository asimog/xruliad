1..4 | ForEach-Object {
  try {
    $resp = Invoke-RestMethod -Uri "https://www.hypermyths.com/api/jobs/d9ba5e7f-4457-438a-ad2e-92fa2d97574c" -Method Get -TimeoutSec 15
    $status = $resp.job.status
    $progress = $resp.job.progress
    $updated = $resp.job.updatedAt
    Write-Host "$(Get-Date -Format HH:mm:ss) — status: $status, progress: $progress, updated: $updated"
    if ($status -notin @('pending','processing','generating_script','generating_video','rendering_scenes','stitching_video','uploading_assets')) { break }
  } catch { Write-Host "Error: $_"; break }
  Start-Sleep -Seconds 30
}

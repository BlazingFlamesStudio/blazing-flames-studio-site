# Blazing Flames Studio — upload full-resolution original VRMs to Cloudflare R2
# Usage: powershell -ExecutionPolicy Bypass -File .\r2-upload-originals.ps1
# Requires Node.js (npx) and an R2 bucket in your own Cloudflare account.
# This script never needs an API token pasted into a file; Wrangler authenticates via browser.
[CmdletBinding()]
param(
    [string]$Bucket,
    [string]$Folder
)
$ErrorActionPreference = 'Stop'
if (-not $Bucket) { $Bucket = Read-Host 'Enter your Cloudflare R2 BUCKET NAME (not the public URL)' }
if (-not $Folder) { $Folder = Read-Host 'Enter the Windows folder containing your ORIGINAL Blaze Silver .vrm files' }
$Folder = $Folder.Trim('"')
if ($Bucket -notmatch '^[a-z0-9][a-z0-9-]*[a-z0-9]$') { throw 'Invalid bucket name. Use the exact bucket name shown in the R2 dashboard, not the r2.dev URL.' }
if (-not (Test-Path -LiteralPath $Folder -PathType Container)) { throw "Folder does not exist: $Folder" }
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js/npx not found. Install Node.js from https://nodejs.org/ and reopen PowerShell.'
}

$manifestUrl = 'https://raw.githubusercontent.com/BlazingFlamesStudio/blazing-flames-studio-site/main/asset-manifest.json'
Write-Host 'Reading the current website catalogue...' -ForegroundColor Cyan
$manifest = Invoke-RestMethod -Uri $manifestUrl
$expectedBase = 'https://pub-fef7be833f654ebbb17c5d36a6745552.r2.dev/'
if ($manifest.baseUrl -ne $expectedBase) {
    throw "The website asset base URL has changed. The upload target is no longer confirmed: $($manifest.baseUrl)"
}
$expected = @($manifest.assets.PSObject.Properties.Name)
$lookup = @{}
$all = @(Get-ChildItem -LiteralPath $Folder -File -Recurse -Filter '*.vrm')
foreach ($file in $all) {
    $stem = $file.BaseName -replace '^Blaze Silver Model\s*', ''
    $stem = $stem -replace '\(\d+\)$', ''
    $id = (($stem.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-'))
    if (-not $id) { continue }
    $copyNumbered = $file.BaseName -match '\(\d+\)$'
    if (-not $lookup.ContainsKey($id) -or ($lookup[$id].CopyNumbered -and -not $copyNumbered)) {
        $lookup[$id] = @{ File = $file; CopyNumbered = $copyNumbered }
    }
}
$matched = @($expected | Where-Object { $lookup.ContainsKey($_) })
$missing = @($expected | Where-Object { -not $lookup.ContainsKey($_) })
Write-Host ("Found {0} of {1} distinct website models in {2} local VRM files." -f $matched.Count, $expected.Count, $all.Count) -ForegroundColor Green
if ($missing.Count) { Write-Warning ('Missing local VRMs: ' + ($missing -join ', ')) }
if (-not $matched.Count) { throw 'No matching files were found. Point the script at your folder of original Blaze Silver models.' }
Write-Host ('Destination: R2 bucket ' + $Bucket + ' under models/<catalogue-id>.vrm')
Write-Host ('Public URL: ' + $expectedBase)
Write-Host 'The original files will be publicly downloadable as well as viewable in 3D.' -ForegroundColor Yellow
$answer = Read-Host 'Upload these originals now? Type YES to proceed'
if ($answer -cne 'YES') { Write-Host 'Cancelled — no changes made.'; exit 0 }

Write-Host 'Authenticating with Cloudflare. A browser login may open...' -ForegroundColor Cyan
& npx.cmd --yes wrangler whoami
if ($LASTEXITCODE -ne 0) {
    & npx.cmd --yes wrangler login
    if ($LASTEXITCODE -ne 0) { throw 'Cloudflare Wrangler login did not complete.' }
}
$success = 0
$failed = [System.Collections.Generic.List[string]]::new()
$index = 0
foreach ($id in $matched) {
    $index++
    $file = $lookup[$id].File
    $key = [string]$manifest.assets.$id
    if ($key -ne ("models/$id.vrm")) { throw "Unexpected manifest path for $id : $key" }
    $object = "$Bucket/$key"
    Write-Host ("[{0}/{1}] {2} ({3:N1} MB)" -f $index, $matched.Count, $object, ($file.Length / 1MB)) -ForegroundColor Cyan
    & npx.cmd --yes wrangler r2 object put $object --file $file.FullName --content-type application/octet-stream --remote
    if ($LASTEXITCODE -eq 0) { $success++ } else {
        $failed.Add($id)
        Write-Warning "Failed upload: $id"
    }
}
Write-Host ("Uploaded {0} of {1} models. Missing locally: {2}. Failed: {3}." -f $success, $matched.Count, $missing.Count, $failed.Count) -ForegroundColor Green
if ($failed.Count) {
    Write-Warning ('Failed models: ' + ($failed -join ', '))
    exit 1
}
Write-Host 'Your viewer should fetch uploaded models from R2 after the upload is complete.' -ForegroundColor Green

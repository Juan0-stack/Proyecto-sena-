$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = 'http://127.0.0.1:5000/'
$stdout = Join-Path $root 'isailo-server.log'
$stderr = Join-Path $root 'isailo-server-error.log'

# If ISAILO MAPS is already answering, reuse it instead of starting a duplicate.
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Start-Process $url
        exit 0
    }
} catch {}

$python = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    $python = (Get-Command python.exe -ErrorAction Stop).Source
}

Start-Process -FilePath $python -ArgumentList 'app.py' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null

# Wait briefly for Flask to become ready, then open the page.
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { $ready = $true; break }
    } catch {}
}
if ($ready) {
    Start-Process $url
} else {
    [System.Windows.Forms.MessageBox]::Show("ISAILO MAPS no pudo iniciar. Revisa isailo-server-error.log en la carpeta del proyecto.", 'ISAILO MAPS') | Out-Null
}

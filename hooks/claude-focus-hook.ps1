# Claude Code hook script for Windows
# Reads JSON from stdin and sends a focus request to the VS Code extension

$input = $Input | Out-String
$port = if ($env:CLAUDE_FOCUS_PORT) { $env:CLAUDE_FOCUS_PORT } else { "19876" }

$message = "Claude Code needs your attention"
$type = ""
try {
    $json = $input | ConvertFrom-Json
    if ($json.message) { $message = $json.message }
    if ($json.notification_type) { $type = $json.notification_type }
} catch {}

$body = @{ message = $message; type = $type } | ConvertTo-Json -Compress

try {
    Invoke-RestMethod -Uri "http://127.0.0.1:${port}/focus" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 2 | Out-Null
} catch {}

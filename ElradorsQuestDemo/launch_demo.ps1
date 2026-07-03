param(
  [int]$Port = 8090
)

$demoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $demoRoot
$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "Could not start the demo server on $prefix"
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "Echoes of Eldrador demo running at ${prefix}ElradorsQuestDemo/index.html"
Write-Host "Press Ctrl+C in this window to stop it."
Start-Process "${prefix}ElradorsQuestDemo/index.html"

$mime = @{
  ".html" = "text/html";
  ".css" = "text/css";
  ".js" = "text/javascript";
  ".json" = "application/json";
  ".fbx" = "application/octet-stream";
  ".png" = "image/png";
  ".jpg" = "image/jpeg";
  ".jpeg" = "image/jpeg";
  ".mp4" = "video/mp4";
  ".txt" = "text/plain"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($requestPath)) {
    $requestPath = "ElradorsQuestDemo/index.html"
  }

  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $requestPath))
  if (-not $fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $context.Response.StatusCode = 403
    $context.Response.Close()
    continue
  }

  if (-not [System.IO.File]::Exists($fullPath)) {
    $context.Response.StatusCode = 404
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
    continue
  }

  $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
  $context.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
  $bytes = [System.IO.File]::ReadAllBytes($fullPath)
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}

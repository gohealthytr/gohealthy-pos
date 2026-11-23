$possiblePaths = @(
    [Environment]::GetFolderPath('Desktop'),
    "C:\Users\GoHea\Desktop",
    "C:\Users\GoHea\Masaüstü",
    "C:\Users\GoHea\OneDrive\Desktop",
    "C:\Users\GoHea\OneDrive\Masaüstü"
)

$validPaths = $possiblePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

if ($validPaths.Count -eq 0) {
    $validPaths = @("C:\Users\GoHea\Desktop")
}

foreach ($p in $validPaths) {
    $dest = Join-Path $p "GO HEALTHY POSS - Sunucu Baslat.bat"
    Copy-Item -Path "C:\Users\GoHea\.gemini\antigravity\scratch\restoran\GO HEALTHY POSS - Sunucu Baslat.bat" -Destination $dest -Force -ErrorAction SilentlyContinue
    Write-Host "Deployed launcher at: $dest"
}

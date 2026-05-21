$EdgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$TargetPath = 'C:\Users\GoHea\.gemini\antigravity\scratch\restoran\index.html'

$WshShell = New-Object -ComObject WScript.Shell

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
    $lnkPath = Join-Path $p "GO HEALTHY POSS.lnk"
    
    # Remove existing to avoid conflicts
    if (Test-Path $lnkPath) { Remove-Item $lnkPath -Force -ErrorAction SilentlyContinue }
    
    # Create the shortcut
    try {
        $Shortcut = $WshShell.CreateShortcut($lnkPath)
        if (Test-Path $EdgePath) {
            $Shortcut.TargetPath = $EdgePath
            $Shortcut.Arguments = '--app="file:///C:/Users/GoHea/.gemini/antigravity/scratch/restoran/index.html"'
        } else {
            $Shortcut.TargetPath = $TargetPath
        }
        $Shortcut.Description = "GO HEALTHY POSS - Restoran Yonetim Sistemi"
        $Shortcut.Save()
        Write-Host "Created shortcut at: $lnkPath"
    } catch {
        Write-Host "Failed to create shortcut at: $lnkPath"
    }
}

# Clean up search files in workspace
Remove-Item -Path 'find_kardo.py', 'find_kardo.js', 'find_kardo.js', 'find_kardo.py' -Force -ErrorAction SilentlyContinue

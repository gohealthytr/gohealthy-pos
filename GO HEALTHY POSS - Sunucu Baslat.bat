@echo off
:: Yonetici yetkisi kontrolu
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo ==============================================
    echo  GO HEALTHY POSS - Yonetici Yetkisi Isteniyor...
    echo ==============================================
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:admin
title GO HEALTHY POSS - Yerel Sunucu
cd /d "C:\Users\GoHea\.gemini\antigravity\scratch\restoran"
echo ==============================================
echo  GO HEALTHY POSS - Sunucu Baslatiliyor...
echo ==============================================
powershell -NoProfile -ExecutionPolicy Bypass -File "start_server.ps1"
pause

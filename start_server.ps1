# Yerel Wi-Fi sunucusu kullanıcının isteği doğrultusunda iptal edilmiş ve Vercel geçişi yapılmıştır.
# Bu script çalıştırıldığında artık yerel sunucu başlatmaz, kullanıcıya Vercel dağıtım adımlarını gösterir.

Clear-Host
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==============================================================" -ForegroundColor Green
Write-Host "       🌱 GO HEALTHY POSS - BULUT GEÇİŞİ ETKİN! 🌱" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [İPTAL EDİLDİ] Yerel Wi-Fi sunucusu talebiniz üzerine kapatılmıştır." -ForegroundColor Yellow
Write-Host "  Uygulamanız artık bulut altyapısına (Vercel & Firebase) hazırdır." -ForegroundColor White
Write-Host ""
Write-Host "  ----------------- VERCEL DAĞITIM ADIMLARI -----------------" -ForegroundColor Cyan
Write-Host "  1. vercel.com sitesine girip ücretsiz bir hesap oluşturun."
Write-Host "  2. Proje klasörünü sürükle-bırak yöntemiyle Vercel Dashboard'a yükleyin"
Write-Host "     veya bilgisayarınızda Vercel CLI (terminal) kullanarak 'vercel' yazın."
Write-Host "  3. Vercel size 'https://gohealthy-poss.vercel.app' gibi bir URL verecektir."
Write-Host "  4. Bu URL'i sistemin 'Ayarlar' sayfasındaki 'QR Menü Alan Adı' kutusuna kaydedin."
Write-Host ""
Write-Host "  -----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Detaylı yönergeler için 'walkthrough.md' kılavuzunu okuyabilirsiniz." -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Kapatmak için Enter'a basın..."
exit

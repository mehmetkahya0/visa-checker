#!/bin/bash

# Hızlı Raspberry Pi Kurulum Scripti
# Bu script'i Raspberry Pi'de çalıştırın

echo "🚀 Visa Checker Bot - Hızlı Kurulum"
echo "=================================="

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_note() { echo -e "${BLUE}[NOTE]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Temel kurulumlar
print_step "Sistem güncellemeleri..."
sudo apt update && sudo apt upgrade -y

print_step "Node.js ve npm kurulumu..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

print_step "PM2 global kurulumu..."
sudo npm install -g pm2

# 2. Proje klasörü oluştur
PROJECT_DIR="/home/pi/visa-checker"
print_step "Proje klasörü: $PROJECT_DIR"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 3. GitHub'dan indir (değiştirilmesi gerekiyor)
print_note "Manuel dosya kopyalama gerekiyor:"
echo "1. Local bilgisayarınızdan dosyaları kopyalayın:"
echo "   scp -r /path/to/visa-checker pi@$(hostname -I | awk '{print $1}'):~/"
echo ""
echo "2. Veya GitHub'a push edip clone edin:"
echo "   git clone YOUR_REPO_URL ."
echo ""
read -p "Dosyalar kopyalandı mı? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Önce dosyaları kopyalayın!"
    exit 1
fi

# 4. Dependencies ve build
print_step "Dependencies yükleniyor..."
npm install

print_step "TypeScript build..."
npm run build

# 5. .env dosyası
if [ ! -f ".env" ]; then
    print_step ".env dosyası oluşturuluyor..."
    cp .env.example .env
    print_warn "Lütfen .env dosyasını düzenleyin!"
    echo "nano .env"
    read -p "Enter tuşuna basın..."
fi

# 6. PM2 ile başlat
print_step "PM2 ile başlatılıyor..."
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 7. Durum kontrolü
print_step "Durum kontrol ediliyor..."
pm2 status
pm2 logs visa-checker --lines 5

echo ""
print_note "✅ Kurulum tamamlandı!"
echo ""
echo "🔧 Yararlı komutlar:"
echo "  pm2 status           - Durum görüntüle"
echo "  pm2 logs visa-checker - Logları izle"
echo "  pm2 restart visa-checker - Yeniden başlat"
echo "  pm2 monit            - Monitoring"
echo ""
echo "🌐 Web interface: http://$(hostname -I | awk '{print $1}'):3000/api/status"
echo ""
print_warn "UNUTMAYIN: .env dosyasındaki bot token'larını doldurun!"

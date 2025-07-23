#!/bin/bash

# Raspberry Pi Deployment Script
# Visa Checker Bot kurulum ve çalıştırma scripti

set -e  # Hata durumunda script'i durdur

echo "🚀 Visa Checker Bot - Raspberry Pi Deployment Script"
echo "=================================================="

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parametreler
RPI_USER="pi"
PROJECT_DIR="/home/$RPI_USER/visa-checker"
SERVICE_NAME="visa-checker"

# Fonksiyonlar
print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Sistem güncellemeleri
print_step "Sistem güncellemeleri yapılıyor..."
sudo apt update && sudo apt upgrade -y

# 2. Node.js kurulumu
print_step "Node.js kurulumu kontrol ediliyor..."
if ! command -v node &> /dev/null; then
    print_step "Node.js kuruluyor..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js zaten kurulu: $(node --version)"
fi

# 3. PNPM kurulumu
print_step "PNPM kurulumu kontrol ediliyor..."
if ! command -v pnpm &> /dev/null; then
    print_step "PNPM kuruluyor..."
    npm install -g pnpm
else
    echo "PNPM zaten kurulu: $(pnpm --version)"
fi

# 4. PM2 kurulumu
print_step "PM2 kurulumu kontrol ediliyor..."
if ! command -v pm2 &> /dev/null; then
    print_step "PM2 kuruluyor..."
    npm install -g pm2
else
    echo "PM2 zaten kurulu: $(pm2 --version)"
fi

# 5. Proje klasörü oluştur
print_step "Proje klasörü hazırlanıyor..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 6. Dosyaları kopyala (bu script'in çalıştırıldığı yerden)
print_step "Proje dosyaları kopyalanıyor..."
if [ -f "../package.json" ]; then
    cp -r ../* . 2>/dev/null || true
    cp -r ../.[^.]* . 2>/dev/null || true
else
    print_warning "Package.json bulunamadı. Manuel olarak dosyaları kopyalamanız gerekebilir."
fi

# 7. Dependencies yükle
print_step "Bağımlılıklar yükleniyor..."
pnpm install --production

# 8. TypeScript build
print_step "Proje derleniyor..."
pnpm run build

# 9. .env dosyası kontrolü
if [ ! -f ".env" ]; then
    print_warning ".env dosyası bulunamadı. Örnek dosya oluşturuluyor..."
    cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=your_channel_id_here

# API Configuration
VISA_API_URL=https://api.example.com/visa-appointments
API_MAX_RETRIES=3
API_RETRY_DELAY_BASE=1000

# Application Settings
CHECK_INTERVAL=5m
TARGET_COUNTRY=tr
MISSION_COUNTRIES=de,at,nl,be,fr,it,es
TARGET_CITIES=
TARGET_VISA_SUBCATEGORIES=

# Cache Settings
CACHE_MAX_SIZE=1000
CACHE_CLEANUP_INTERVAL=1h

# Debug
DEBUG=false
NODE_ENV=production
EOF
    print_warning "Lütfen .env dosyasını düzenleyerek gerçek değerleri girin!"
fi

# 10. PM2 ile başlat
print_step "PM2 ile uygulama başlatılıyor..."
pm2 delete $SERVICE_NAME 2>/dev/null || true  # Mevcut process'i sil
pm2 start ecosystem.config.js

# 11. PM2'yi startup'a ekle
print_step "Boot'ta otomatik başlatma ayarlanıyor..."
pm2 startup systemd -u $RPI_USER --hp /home/$RPI_USER
pm2 save

# 12. Firewall ayarları (isteğe bağlı)
print_step "Firewall kontrol ediliyor..."
if command -v ufw &> /dev/null; then
    sudo ufw allow ssh
    sudo ufw allow 3000  # Eğer web interface kullanılacaksa
    print_step "Firewall kuralları güncellendi"
fi

# 13. Log rotation kurulumu
print_step "Log rotation ayarlanıyor..."
pm2 install pm2-logrotate 2>/dev/null || true
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# 14. Durum kontrolü
print_step "Final durum kontrolü..."
pm2 status
pm2 logs $SERVICE_NAME --lines 10

echo ""
echo "🎉 Kurulum tamamlandı!"
echo "====================="
echo ""
echo "Kullanılabilir komutlar:"
echo "  pm2 status              - Uygulama durumu"
echo "  pm2 logs $SERVICE_NAME  - Logları görüntüle" 
echo "  pm2 restart $SERVICE_NAME - Uygulamayı yeniden başlat"
echo "  pm2 stop $SERVICE_NAME     - Uygulamayı durdur"
echo "  pm2 monit               - Sistem monitoring"
echo ""
echo "Web monitoring için: pm2 plus"
echo ""
print_warning "ÖNEMLI: .env dosyasındaki TELEGRAM_BOT_TOKEN ve TELEGRAM_CHANNEL_ID değerlerini düzenlemeyi unutmayın!"

# Son kontrol - .env dosyası düzenlendi mi?
if grep -q "your_bot_token_here" .env; then
    print_error "❌ .env dosyası henüz düzenlenmemiş! Lütfen düzenleyin ve pm2 restart $SERVICE_NAME komutunu çalıştırın."
    exit 1
fi

print_step "✅ Bot başarıyla çalışıyor ve Telegram'da aktif!"

# Raspberry Pi Deployment Rehberi

## 1. Raspberry Pi'ye Bağlantı ve Hazırlık

```bash
# SSH ile bağlanın
ssh pi@[RPI_IP_ADDRESS]

# Sistem güncellemeleri
sudo apt update && sudo apt upgrade -y

# Node.js kurulumu (18.x LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PNPM kurulumu (projede kullanılan package manager)
npm install -g pnpm

# PM2 kurulumu (process manager)
npm install -g pm2

# Git kurulumu (eğer yoksa)
sudo apt install git -y
```

## 2. Proje Dosyalarını Raspberry Pi'ye Aktarma

### Yöntem A: Git ile (Önerilen)
```bash
# Pi'de proje klasörü oluştur
mkdir -p ~/visa-checker
cd ~/visa-checker

# Projeyi clone et (GitHub'a push ettikten sonra)
git clone [YOUR_REPO_URL] .
```

### Yöntem B: SCP ile dosya aktarımı
```bash
# Local bilgisayarınızdan çalıştırın
scp -r /Users/mehmetkahya/Desktop/visa-checker pi@[RPI_IP_ADDRESS]:~/
```

## 3. Proje Kurulumu

```bash
# Pi'de proje klasörüne git
cd ~/visa-checker

# Bağımlılıkları yükle
pnpm install

# TypeScript build
pnpm run build

# .env dosyasını oluştur (aşağıdaki template'i kullan)
nano .env
```

## 4. Environment Dosyası (.env)

```env
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
```

## 5. PM2 ile Çalıştırma

### PM2 Konfigürasyon Dosyası Oluştur
```bash
nano ecosystem.config.js
```

### PM2 Komutları
```bash
# Uygulamayı başlat
pm2 start ecosystem.config.js

# Durumu kontrol et
pm2 status

# Logları görüntüle
pm2 logs visa-checker

# Uygulamayı durdur
pm2 stop visa-checker

# Uygulamayı yeniden başlat
pm2 restart visa-checker

# Boot'ta otomatik başlatmayı aktifleştir
pm2 startup
pm2 save
```

## 6. Sistem Servisi Olarak Çalıştırma (Alternatif)

### Systemd Service Dosyası
```bash
sudo nano /etc/systemd/system/visa-checker.service
```

### Service Komutları
```bash
# Servisi aktifleştir
sudo systemctl enable visa-checker.service

# Servisi başlat
sudo systemctl start visa-checker.service

# Durumu kontrol et
sudo systemctl status visa-checker.service

# Logları görüntüle
sudo journalctl -u visa-checker.service -f
```

## 7. Docker ile Çalıştırma (En Kolay)

```bash
# Docker kurulumu (eğer yoksa)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi

# Docker Compose kurulumu
sudo apt install docker-compose -y

# Proje klasöründe
docker-compose up -d

# Logları görüntüle
docker-compose logs -f
```

## 8. Monitoring ve Maintenance

### PM2 Monitoring
```bash
# Web tabanlı monitoring
pm2 plus

# Sistem kaynaklarını izle
pm2 monit
```

### Log Rotation
```bash
# PM2 log rotation kurulumu
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Otomatik Güncellemeler
```bash
# Crontab ekle
crontab -e

# Her gün saat 3'te güncelleme kontrolü
0 3 * * * cd ~/visa-checker && git pull && pnpm install && pm2 restart visa-checker
```

## 9. Home Assistant Entegrasyonu (İsteğe Bağlı)

### MQTT Publisher Ekle
```bash
# MQTT client kur
npm install mqtt

# Home Assistant'a durum gönder
```

### REST API Endpoint
```bash
# Home Assistant'tan bot durumunu sorgula
curl http://[RPI_IP]:3000/api/status
```

## 10. Troubleshooting

### Yaygın Problemler
```bash
# Port kullanımda hatası
sudo lsof -i :3000
sudo kill -9 [PID]

# Memory problemi
sudo systemctl restart visa-checker

# Log kontrolü
tail -f ~/.pm2/logs/visa-checker-out.log
tail -f ~/.pm2/logs/visa-checker-error.log
```

### Performans Optimizasyonu
```bash
# Swap artır (düşük RAM'li Pi'ler için)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# CPU governor ayarla
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## 11. Güvenlik

```bash
# Firewall ayarları
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 3000  # Eğer web interface kullanıyorsanız

# SSH key ile bağlantı
ssh-copy-id pi@[RPI_IP_ADDRESS]
```

---

## Hangi Yöntemi Seçmeli?

1. **PM2 (Önerilen)**: En kolay, güvenilir, web monitoring
2. **Docker**: En temiz, izole environment 
3. **Systemd**: En stabil, sistem seviyesi entegrasyon
4. **Home Assistant Add-on**: En entegre (custom add-on gerekli)

# 🚀 Raspberry Pi'de Kesintisiz Çalıştırma Rehberi

## ⚡ Hızlı Başlangıç (3 Adım)

### 1. Dosyaları Raspberry Pi'ye Kopyalayın
```bash
# Local bilgisayarınızdan:
scp -r /Users/mehmetkahya/Desktop/visa-checker pi@RPI_IP:~/
```

### 2. Hızlı kurulum script'ini çalıştırın
```bash
# Raspberry Pi'de:
cd ~/visa-checker
chmod +x quick-install-rpi.sh
./quick-install-rpi.sh
```

### 3. .env dosyasını düzenleyin
```bash
nano .env
# TELEGRAM_BOT_TOKEN ve TELEGRAM_CHANNEL_ID değerlerini girin
# Ctrl+X, Y, Enter ile kaydedin

# Bot'u yeniden başlatın
pm2 restart visa-checker
```

## 🔧 Yönetim Komutları

### PM2 Komutları
```bash
pm2 status              # Durum görüntüle
pm2 logs visa-checker   # Logları izle (Ctrl+C ile çık)
pm2 restart visa-checker # Yeniden başlat
pm2 stop visa-checker    # Durdur
pm2 delete visa-checker  # Tamamen sil
pm2 monit               # Web monitoring interface
```

### Sistem Kontrolleri
```bash
# CPU ve memory kullanımı
htop

# Disk kullanımı
df -h

# Bot process kontrolü
ps aux | grep node

# Port kontrolü
sudo netstat -tlnp | grep :3000
```

## 🌐 Web Interface

Bot çalışırken bu URL'leri kullanabilirsiniz:

- **Status API**: `http://RPI_IP:3000/api/status`
- **Health Check**: `http://RPI_IP:3000/health`
- **Cache Stats**: `http://RPI_IP:3000/api/cache`

## 📊 Home Assistant Entegrasyonu

### Sensor Ekleme
`configuration.yaml` dosyasına ekleyin:

```yaml
sensor:
  - platform: rest
    resource: http://RPI_IP:3000/api/status
    name: "Visa Bot Status"
    value_template: "{{ value_json.status }}"
    json_attributes:
      - uptime
      - messageCount
      - memory
    scan_interval: 60

  - platform: template
    sensors:
      visa_bot_uptime_hours:
        friendly_name: "Visa Bot Uptime (Hours)"
        value_template: "{{ (state_attr('sensor.visa_bot_status', 'uptime') / 3600) | round(1) }}"
        unit_of_measurement: "hours"
```

### Automation Örneği
```yaml
automation:
  - alias: "Visa Bot Down Alert"
    trigger:
      - platform: state
        entity_id: sensor.visa_bot_status
        to: 'unavailable'
        for: "00:05:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "⚠️ Visa Bot Down"
          message: "Visa checker bot 5 dakikadır yanıt vermiyor!"
```

## 🔄 Otomatik Güncellemeler

### Crontab ile günlük güncelleme
```bash
crontab -e

# Şu satırı ekleyin (her gün 04:00'da):
0 4 * * * cd ~/visa-checker && git pull && npm install && npm run build && pm2 restart visa-checker
```

### Watchtower ile Docker güncelleme (Docker kullanıyorsanız)
```bash
docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --cleanup \
  --interval 86400 \
  visa-checker-bot
```

## 🛡️ Güvenlik ve Performans

### Firewall Ayarları
```bash
# UFW enable et
sudo ufw enable

# SSH ve API portlarını aç
sudo ufw allow ssh
sudo ufw allow 3000

# Durumu kontrol et
sudo ufw status
```

### Memory Optimization (Düşük RAM'li Pi'ler için)
```bash
# Swap artır
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# CPU governor ayarla
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### Log Rotation
PM2 otomatik log rotation kurar, ama elle de yapabilirsiniz:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## 🚨 Troubleshooting

### Bot başlamıyor
```bash
# Error loglarını kontrol et
pm2 logs visa-checker --lines 50

# Dikkat edilecekler:
# 1. .env dosyası doğru doldurulmuş mu?
# 2. Network bağlantısı var mı?
# 3. Port 3000 kullanımda mı?
```

### Memory tükenmesi
```bash
# Memory kullanımını kontrol et
free -h

# Node.js process'ini kontrol et
ps aux | grep node

# PM2 restart ile memory temizle
pm2 restart visa-checker
```

### API bağlantı hatası
```bash
# Network connectivity test
ping google.com
curl -I https://api.visasbot.com

# DNS problemiyse
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
```

## 📱 Telegram Bot Komutları

Bot aktifken şu komutları kullanabilirsiniz:

- `/start` - Bot hakkında bilgi
- `/status` - Bot durumu ve ayarları
- `/stats` - İstatistikler ve önbellek bilgisi
- `/ping` - Bot bağlantı testi
- `/arama` - Manuel randevu arama
- `/help` - Tüm komutlar
- `/config` - Detaylı yapılandırma
- `/uptime` - Çalışma süresi

## 🎯 Performance Tips

1. **Kontrol sıklığını optimize edin**: Çok sık kontrol etmek API limit'e takılabilir
2. **Hedef filtreleri daraltın**: Az şehir/ülke seçerek gereksiz işlemleri azaltın
3. **Cache boyutunu ayarlayın**: Yeterli ama aşırı büyük olmayan cache kullanın
4. **Log'ları takip edin**: `pm2 logs` ile sistem sağlığını izleyin

## 🔗 Yararlı Linkler

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Raspberry Pi Setup**: https://www.raspberrypi.org/documentation/
- **Home Assistant REST Sensor**: https://www.home-assistant.io/integrations/rest/
- **Telegram Bot API**: https://core.telegram.org/bots/api

---

## ❓ Sık Sorulan Sorular

**S: Bot durdu, nasıl yeniden başlatırım?**
A: `pm2 restart visa-checker` komutu ile.

**S: Çok fazla memory kullanıyor?**  
A: `pm2 restart visa-checker` ile memory'yi temizleyin. ecosystem.config.js'te memory limit ayarlayabilirsiniz.

**S: Telegram bildirimleri gelmiyor?**
A: .env dosyasındaki token'ları kontrol edin ve `/ping` komutu ile bot'u test edin.

**S: Home Assistant'ta görünmüyor?**
A: RPI_IP adresini doğru yazdığınızdan ve port 3000'in açık olduğundan emin olun.

**S: Otomatik başlatma çalışmıyor?**
A: `pm2 startup` ve `pm2 save` komutlarını tekrar çalıştırın.

---

✅ Bu rehberi takip ederek visa-checker bot'unuzu Raspberry Pi'de kesintisiz çalıştırabilirsiniz!

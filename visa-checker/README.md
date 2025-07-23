# Visa Checker Home Assistant Add-on

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

Schengen vize randevularını otomatik takip eden ve Telegram bildirimleri gönderen Home Assistant add-on'u.

## Özellikler

- 🔄 Otomatik randevu kontrolü (her 5 dakika)
- 📱 Telegram bildirimleri ve interaktif komutlar
- 🌍 Ülke ve şehir bazında filtreleme
- 🎯 Vize tipi filtreleme
- 🚫 Tekrar bildirim engelleme
- � **YENİ!** Deneme bildirimi sistemi - her kontrol sonucunu görebilme
- �📊 Web API ile izleme ve manuel kontrol
- 🤖 Home Assistant entegrasyonu
- 💬 15+ bot komutu ile tam kontrol

## Kurulum

1. Home Assistant'ta **Supervisor > Add-on Store** bölümüne gidin
2. Sağ üst köşedeki **⋮** menüsünden **Repositories** seçin
3. Şu URL'yi ekleyin: `https://github.com/mehmetkahya0/visa-checker`
4. **Add** butonuna tıklayın
5. Store'u yenileyin ve **Visa Checker Bot** add-on'unu bulun
6. **Install** butonuna tıklayın

## Konfigürasyon

### Zorunlu Ayarlar

- **telegram_bot_token**: Telegram bot token'ınız
- **telegram_channel_id**: Telegram kanal/grup ID'niz

### Opsiyonel Ayarlar

- **check_interval**: Kontrol sıklığı (cron formatı)
- **target_country**: Hedef ülke kodu (tr, gb, etc.)
- **mission_countries**: Vize başvuru ülkeleri
- **target_cities**: Takip edilecek şehirler
- **target_visa_subcategories**: Vize tipleri
- **debug**: Debug modu
- **api_url**: API adresi
- **max_retries**: Maksimum deneme sayısı
- **restart_token**: API restart token'ı

### Örnek Konfigürasyon

```yaml
telegram_bot_token: "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
telegram_channel_id: "-100123456789"
check_interval: "*/5 * * * *"
target_country: "tr"
mission_countries:
  - "de"
  - "nl"
  - "fr"
target_cities:
  - "Istanbul"
  - "Ankara"
target_visa_subcategories:
  - "Tourism"
  - "Business"
debug: false
max_retries: 3
restart_token: "my_secure_token_123"
```

## Home Assistant Entegrasyonu

Add-on çalıştıktan sonra `configuration.yaml`'a ekleyin:

```yaml
sensor:
  - platform: rest
    resource: "http://a0d7b954-visa-checker:3000/api/status"
    name: "Visa Bot Status"
    value_template: "{{ value_json.status }}"
    json_attributes:
      - uptime
      - config
      - memory
    scan_interval: 60

rest_command:
  restart_visa_bot:
    url: "http://a0d7b954-visa-checker:3000/api/restart"
    method: POST
    headers:
      Authorization: "Bearer YOUR_RESTART_TOKEN"
  
  manual_visa_search:
    url: "http://a0d7b954-visa-checker:3000/api/search"
    method: POST
```

## 🤖 Bot Komutları

Add-on çalıştırıldıktan sonra Telegram bot'u şu komutları destekler:

### 📋 Temel Komutlar
- `/start` - Bot hakkında bilgi ve hoş geldin mesajı
- `/help` - Detaylı komut listesi ve kullanım kılavuzu
- `/status` - Bot durumu, çalışma süresi ve ayarları
- `/ping` - Bot bağlantı testi

### 🔍 Randevu Komutları
- `/arama` - Manuel randevu arama (1 dakika cooldown)
- `/randevu` - Alternatif arama komutu
- `/search` - İngilizce arama komutu

### 🔔 YENİ! Bildirim Sistemi
- `/bildirim` - Mevcut bildirim durumunu göster
- `/bildirim aç` - Her kontrol sonucunu bildir
- `/bildirim kapat` - Sadece randevu bulunca bildir

💡 **Deneme Bildirimi Özelliği**: Bu özellik açıldığında bot her 5 dakikalık kontrol sonucunu bildirir (randevu bulunmasa bile). Bu sayede bot'un aktif çalıştığından emin olabilirsiniz.

### 📊 İstatistik ve Bilgi
- `/stats` - Bot istatistikleri ve önbellek bilgileri
- `/config` - Detaylı konfigürasyon görüntüleme
- `/uptime` - Bot çalışma süresi
- `/version` - Versiyon bilgileri

## API Endpoints

- `GET /health` - Health check
- `GET /api/status` - Bot status ve istatistikler
- `GET /api/cache` - Cache bilgileri
- `POST /api/search` - Manuel randevu arama
- `POST /api/restart` - Bot restart (token gerekli)

## Destek

Sorunlar için [GitHub Issues](https://github.com/mehmetkahya0/visa-checker/issues) kullanın.

## 👨‍💻 Geliştirici

**Mehmet Kahya**
- 🐙 GitHub: [@mehmetkahya0](https://github.com/mehmetkahya0)
- 📧 Email: [mehmetkahya0@gmail.com](mailto:mehmetkahya0@gmail.com)

## 🔄 Versiyon Geçmişi

- **v1.1.0** (Mevcut) - Deneme bildirimi sistemi eklendi, bot komutları geliştirildi
- **v1.0.8** - Kararlılık iyileştirmeleri
- **v1.0.0** - İlk sürüm

## Lisans

MIT License

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg

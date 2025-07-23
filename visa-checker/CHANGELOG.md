# Changelog

Bu dosya, Visa Checker Bot Home Assistant Add-on'unun tüm önemli değişikliklerini belgelemektedir.

## [1.1.1] - 2025-07-23

### 🔔 Yeni Özellikler
- **Deneme Bildirimi Sistemi**: Her 5 dakikalık kontrol sonucunu görebilme özelliği
  - `/bildirim aç` - Her kontrol sonucunu bildir
  - `/bildirim kapat` - Sadece randevu bulunca bildir
  - `/bildirim` - Mevcut durum görüntüleme
- **Geliştirilmiş Bot Komutları**: 15+ interaktif komut
- **Akıllı Bildirimler**: Bot aktiflik doğrulama sistemi

### 📱 Bot Komutları
- `/start` - Hoş geldin mesajı ve hızlı komutlar
- `/help` - Detaylı komut listesi
- `/status` - Bot durumu ve konfigürasyon
- `/stats` - İstatistikler ve önbellek bilgileri
- `/config` - Detaylı yapılandırma bilgileri
- `/arama` - Manuel randevu arama (cooldown korumalı)
- `/ping` - Bağlantı testi
- `/uptime` - Çalışma süresi
- `/version` - Versiyon bilgileri

### 🔧 İyileştirmeler
- Daha iyi hata yönetimi
- Geliştirilmiş Markdown formatlaması
- Rate limit koruması
- Cooldown sistemi (manuel arama için)
- Detaylı loglama

### 📊 Durum Gösterimi
- Deneme bildirimleri durumu `/status` komutunda
- Son kontrol edilen randevu sayısı
- Bot yapılandırması görüntüleme

## [1.0.8] - 2025-07-20

### 🔧 İyileştirmeler
- Kararlılık iyileştirmeleri
- API hata yönetimi geliştirildi
- Önbellek sistemi optimize edildi

## [1.0.0] - 2025-07-15

### 🚀 İlk Sürüm
- Otomatik vize randevu takibi
- Telegram bildirimleri
- Ülke ve şehir bazında filtreleme
- Vize tipi filtreleme
- Tekrar bildirim engelleme
- Web API ile izleme
- Home Assistant entegrasyonu

---

**Geliştirici**: [Mehmet Kahya](https://github.com/mehmetkahya0)  
**Repository**: [visa-checker](https://github.com/mehmetkahya0/visa-checker)

# Changelog

Bu dosya, Visa Checker Bot Home Assistant Add-on'unun tüm önemli değişikliklerini belgelemektedir.

## [1.1.5] - 2025-07-23
### 🔧 Kritik Düzeltme
- **Deneme Bildirimi Eksikliği**: Add-on versiyonunda eksik olan `sendCheckResult` çağrısı eklendi
- **Bildirim Sistemi**: Artık `/bildirim_ac` ile açılan bildirimlerin düzgün çalışması sağlandı
- **Kontrol Sayacı**: Her 5 dakikalık kontrol sonuçları düzgün bildirilecek
- **Log İyileştirmesi**: Daha detaylı kontrol ve bildirim logları

## [1.1.4] - 2025-07-23
### 🔧 Kritik Düzeltme
- **Help Komut Hatası**: `/help` komutundaki markdown ayrıştırma hatası düzeltildi (byte offset 1286)
- **Parantez Kaçışı**: Help mesajındaki parantez ve nokta karakterleri düzgün kaçışlandı
- **Bot Çökme Engellendi**: Help komutunun bot'u çöktürmesi sorunu giderildi

## [1.1.3] - 2025-07-23
### 🔧 Düzeltmeler
- **Telegram Markdown Hatası**: `/bildirim_ac` komutundaki markdown ayrıştırma hatası düzeltildi
- **Komut Mesajları**: Tüm bildirim komutlarında markdown karakter kaçışları düzeltildi
- **Bot Kararlılığı**: Telegram API entitesi hatalarının önlenmesi

##  [1.1.2] - 2025-07-23
- **Bildirim sistemi düzeltildi**

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

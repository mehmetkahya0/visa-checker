# Visa Checker - Düzeltilmiş Versiyon

Bu dizin (`visa-checker/visa-checker`) Raspberry Pi ve Home Assistant için düzeltilmiş ve optimize edilmiş visa checker uygulamasını içermektedir.

## ✅ Düzeltilen Sorunlar

### 1. CRON Job Sorunları
- **Sorun**: CRON job çalışmıyor, otomatik kontroller yapılmıyor
- **Çözüm**: 
  - CRON job doğru şekilde başlatılması (scheduled: false -> start())
  - Async/await hatalarının düzeltilmesi
  - Race condition önleme (isRunning flag)
  - Hata yakalama iyileştirmeleri

### 2. Environment Doğrulaması
- **Sorun**: Geçersiz CRON formatları kabul ediliyor
- **Çözüm**: 
  - Environment startup'ta CRON format doğrulaması
  - Geçersiz formatlar için fallback değer
  - Detaylı hata mesajları

### 3. Logging ve Debug İyileştirmeleri
- **Sorun**: Yetersiz logging, debug bilgisi yok
- **Çözüm**:
  - Detaylı başlatma logları
  - CRON job durumu tracking
  - Zaman damgalı kontrol logları
  - Memory ve sistem bilgisi

### 4. Telegram Bot İyileştirmeleri
- **Sorun**: CRON job çalışma durumu test edilemiyor
- **Çözüm**:
  - `/debug` komutu eklendi (manuel kontrol tetikleme)
  - Gelişmiş durum bilgileri
  - Hata yakalama iyileştirmeleri

## 🚀 Kullanım

### 1. Yapılandırma

`.env` dosyasını düzenleyin:
```bash
# CRON Format - Her dakika kontrol için
CHECK_INTERVAL=* * * * *

# Diğer ayarlar...
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 2. Çalıştırma

```bash
# Build
npm run build

# Başlat
npm start
```

### 3. Test Komutları

```bash
# CRON format testi
node test-cron.js

# Yapılandırma testi
node test-config.js
```

## 📊 CRON Format Örnekleri

| Format | Açıklama |
|--------|----------|
| `* * * * *` | Her dakika |
| `*/2 * * * *` | Her 2 dakika |
| `*/5 * * * *` | Her 5 dakika (varsayılan) |
| `0 * * * *` | Her saat başı |
| `0 9 * * *` | Her gün 09:00 |

## 🔧 Debug Komutları

Telegram bot'ta kullanabileceğiniz komutlar:

- `/debug` - Manuel kontrol testi + sistem bilgisi
- `/status` - Bot durumu
- `/bildirim` - Deneme bildirimleri aç/kapat

## 📁 Dosya Yapısı

```
visa-checker/
├── src/
│   ├── index.ts              # ✅ Ana dosya (düzeltildi)
│   ├── config/
│   │   └── environment.ts    # ✅ Çevre değişkenleri (düzeltildi)
│   ├── services/
│   │   ├── telegram.ts       # ✅ Telegram servisi (geliştirildi)
│   │   ├── api.ts
│   │   ├── cache.ts
│   │   └── webServer.ts
│   └── utils/
│       └── appointmentChecker.ts # ✅ Kontrol mantığı (geliştirildi)
├── dist/                     # Build edilmiş dosyalar
├── .env                      # Yapılandırma dosyası
├── test-cron.js             # CRON testi
├── test-config.js           # Yapılandırma testi
└── package.json
```

## 🛠️ Başlıca Değişiklikler

### index.ts
- Global `cronJob` ve `isRunning` değişkenleri eklendi
- Race condition önleme
- Gelişmiş error handling
- Test monitoring (5 test döngüsü)
- Graceful shutdown iyileştirmeleri

### environment.ts
- CRON format doğrulaması eklendi
- Fallback değer sistemi
- "tr" -> "tur" dönüşümü

### telegram.ts
- `/debug` komutu eklendi
- Manuel kontrol tetikleme
- Sistem bilgisi gösterimi

### appointmentChecker.ts
- Detaylı kontrol logları
- Zaman damgalı mesajlar
- Hata yakalama iyileştirmeleri

## ⚠️ Önemli Notlar

1. **CRON Format**: Mutlaka geçerli CRON formatı kullanın
2. **Memory**: Her dakika kontrol memory kullanımını artırabilir
3. **API Limits**: Çok sık kontrol API limitlerini aşabilir
4. **Debug Modu**: Production'da debug modunu kapatın

## 🏠 Home Assistant Addon Olarak Kullanım

Bu düzeltilmiş versiyon Home Assistant addon olarak da kullanılabilir. `config.yaml` dosyasındaki `check_interval` alanına geçerli CRON formatı yazın:

```yaml
options:
  check_interval: "* * * * *"  # Her dakika
  # veya
  check_interval: "*/5 * * * *"  # Her 5 dakika
```

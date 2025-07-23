# 🚀 Visa Checker Bot v1.1.0 - Yayın Notları

## 🔔 Ana Yenilikler

### Deneme Bildirimi Sistemi
- **Her kontrol sonucu bildirilir**: Randevu bulunamasa bile bot aktiflik durumu bildirimi
- **Açma/Kapama kontrolü**: `/bildirim aç/kapat` komutları ile
- **Durum gösterimi**: `/bildirim` komutu ile mevcut durumu görüntüleme
- **Akıllı bildirimler**: Bot'un çalışıp çalışmadığını doğrulama

### 📱 Geliştirilmiş Bot Komutları

#### Yeni Komutlar
- `/bildirim` - Deneme bildirimleri yönetimi
- `/bildirim aç` - Her kontrol sonucunu bildir
- `/bildirim kapat` - Sadece randevu bulunca bildir

#### Geliştirilmiş Komutlar
- `/start` - Hızlı komutlarda `/bildirim` eklendi
- `/status` - Deneme bildirimleri durumu gösteriliyor
- `/help` - Yeni bildirim komutları bölümü eklendi
- `/version` - Yeni özellik bilgisi eklendi

## 🔧 Teknik İyileştirmeler

### Kod Yapısı
- **Yeni fonksiyonlar**: `setCheckNotifications()`, `sendCheckResult()`
- **Durum yönetimi**: `checkNotificationsEnabled` ve `lastCheckCount` değişkenleri
- **Hata toleransı**: Bildirim gönderimi sırasında geliştirilmiş hata yönetimi

### Home Assistant Add-on
- **Versiyon**: 1.1.0'a güncellendi
- **Açıklama**: Yeni özellikler vurgulandı
- **README**: Bot komutları ve yeni özellikler eklendi
- **CHANGELOG**: Detaylı değişiklik günlüğü oluşturuldu

## 📊 Kullanıcı Deneyimi

### Daha İyi Bilgilendirme
- **Status komutu**: Deneme bildirimleri durumu görünür
- **Help sayfası**: Yeni bildirim komutları kategorisi
- **Bot özellikleri**: "Her 5 dakikalık kontrol bildirimi" eklendi

### Kullanım Kolaylığı
- **Açık/kapalı toggle**: Tek komutla bildirim kontrolü
- **Durum sorgulama**: Mevcut ayarları görebilme
- **Türkçe/İngilizce**: Çoklu dil desteği (`aç/ac/on`)

## 🔄 Versiyon Bilgileri

- **Ana Proje**: v1.1.0
- **Home Assistant Add-on**: v1.1.0
- **Yayın Tarihi**: 23 Temmuz 2025
- **Geliştirici**: Mehmet Kahya

## 📝 Migration Notları

### Mevcut Kullanıcılar İçin
- **Otomatik**: Yeni özellik varsayılan olarak **kapalı**
- **Manuel Aktivasyon**: `/bildirim aç` komutu ile etkinleştirme
- **Geriye Uyumluluk**: Mevcut tüm özellikler korundu

### Yeni Kullanıcılar İçin
- **Kurulum**: Aynı kurulum adımları
- **Konfigürasyon**: Ek ayar gerektirmez
- **Kullanım**: `/help` komutu ile tüm özellikleri keşfedebilir

## 🐛 Düzeltilen Hatalar

- Markdown formatlaması iyileştirildi
- Emoji kodlaması düzeltildi
- Help menüsü daha düzenli hale getirildi

## 📈 Performans

- **Yeni özellik**: Performans etkisi minimal
- **Memory**: Sadece 2 yeni değişken eklendi
- **Network**: Sadece bildirim açıksa ek mesaj gönderimi

---

**🔗 GitHub Repository**: [mehmetkahya0/visa-checker](https://github.com/mehmetkahya0/visa-checker)  
**📧 Destek**: mehmetkahya0@gmail.com  
**🐛 Issues**: [GitHub Issues](https://github.com/mehmetkahya0/visa-checker/issues)

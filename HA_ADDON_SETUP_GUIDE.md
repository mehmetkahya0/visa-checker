# Home Assistant Add-on Repository Kurulum Rehberi

## 1. GitHub Repository'yi Hazırlama

### Adım 1: Repository'yi GitHub'a Push Edin
```bash
cd /Users/mehmetkahya/Desktop/visa-checker

# Tüm dosyaları staging area'ya ekle
git add .

# Commit oluştur
git commit -m "feat: Add Home Assistant add-on support

- Add repository.yaml for HA add-on store
- Add visa-checker add-on configuration
- Add Dockerfile for HA supervisor
- Add run.sh script for add-on execution
- Add README.md for add-on documentation"

# GitHub'a push et
git push origin main
```

### Adım 2: Repository'nin Public Olduğundan Emin Olun
GitHub'da repository'nizin **Public** olduğundan emin olun:
1. GitHub'da repository'nize gidin
2. **Settings** tab'ına tıklayın
3. En altta **Danger Zone** bölümünde
4. **Change repository visibility** > **Make public**

## 2. Home Assistant'ta Add-on Repository Ekleme

### Adım 1: Home Assistant'a Repository Ekleyin
1. Home Assistant'ınızı açın
2. **Settings** > **Add-ons** bölümüne gidin
3. **Add-on Store** tab'ına tıklayın
4. Sağ üst köşede **⋮** (3 nokta) menüsüne tıklayın
5. **Repositories** seçeneğine tıklayın
6. **Add Repository** alanına şu URL'yi girin:
   ```
   https://github.com/mehmetkahya0/visa-checker
   ```
7. **ADD** butonuna tıklayın

### Adım 2: Repository'yi Yenileyin
1. **⋮** menüsünden **Check for updates** seçin
2. Birkaç dakika bekleyin
3. Store'u yenileyin (sayfa yenileme)

### Adım 3: Add-on'u Bulun ve Kurun
1. Add-on Store'da **"Visa Checker Bot"** arayın
2. Add-on'a tıklayın
3. **Install** butonuna tıklayın
4. Kurulum tamamlanınca **Configuration** tab'ına gidin

## 3. Add-on Konfigürasyonu

### Zorunlu Ayarlar
```yaml
telegram_bot_token: "YOUR_BOT_TOKEN_HERE"
telegram_channel_id: "YOUR_CHANNEL_ID_HERE"
```

### Tam Konfigürasyon Örneği
```yaml
telegram_bot_token: "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
telegram_channel_id: "-100123456789"
check_interval: "*/5 * * * *"
target_country: "tr"
mission_countries:
  - "de"
  - "nl"
  - "fr"
  - "it"
  - "es"
target_cities:
  - "Istanbul"
  - "Ankara"
target_visa_subcategories:
  - "Tourism"
  - "Business"
debug: false
api_url: "https://api.visasbot.com/api/visa/list"
max_retries: 3
restart_token: "my_secure_token_123"
```

### Adım 4: Add-on'u Başlatın
1. **Save** butonuna tıklayın
2. **Info** tab'ına gidin
3. **Start** butonuna tıklayın
4. **Auto-start** ve **Watchdog** seçeneklerini aktifleştirin

## 4. Home Assistant Entegrasyonu

### Configuration.yaml'a Ekleyin
```yaml
# Visa Bot Sensor
sensor:
  - platform: rest
    resource: "http://a0d7b954-visa-checker:3000/api/status"
    name: "Visa Bot Status"
    value_template: "{{ value_json.status }}"
    json_attributes:
      - uptime
      - config
      - memory
      - telegram
    scan_interval: 60

  - platform: template
    sensors:
      visa_bot_uptime_hours:
        friendly_name: "Visa Bot Uptime"
        value_template: >
          {% set uptime = state_attr('sensor.visa_bot_status', 'uptime') %}
          {% if uptime %}
            {{ (uptime / 3600) | round(1) }}
          {% else %}
            0
          {% endif %}
        unit_of_measurement: "hours"
        
      visa_bot_memory_usage:
        friendly_name: "Visa Bot Memory"
        value_template: >
          {% set memory = state_attr('sensor.visa_bot_status', 'memory') %}
          {% if memory %}
            {{ memory.used | round(1) }}
          {% else %}
            0
          {% endif %}
        unit_of_measurement: "MB"

# REST Commands
rest_command:
  restart_visa_bot:
    url: "http://a0d7b954-visa-checker:3000/api/restart"
    method: POST
    headers:
      Authorization: "Bearer my_secure_token_123"
  
  manual_visa_search:
    url: "http://a0d7b954-visa-checker:3000/api/search"
    method: POST

# Scripts
script:
  visa_manual_search:
    alias: "Manuel Vize Arama"
    sequence:
      - service: rest_command.manual_visa_search
      - service: notify.mobile_app_your_phone
        data:
          title: "🔍 Vize Arama"
          message: "Manuel vize arama başlatıldı"

  visa_bot_restart:
    alias: "Visa Bot Restart"
    sequence:
      - service: rest_command.restart_visa_bot
      - delay: "00:00:05"
      - service: notify.mobile_app_your_phone
        data:
          title: "🔄 Bot Restart"
          message: "Visa bot yeniden başlatıldı"

# Automation
automation:
  - alias: "Visa Bot Health Monitor"
    trigger:
      - platform: state
        entity_id: sensor.visa_bot_status
        to: 'unavailable'
        for: "00:10:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "🚨 Visa Bot Problem"
          message: "Visa bot 10 dakikadır yanıt vermiyor!"
      - service: persistent_notification.create
        data:
          title: "Visa Bot Down"
          message: "Bot 10 dakikadır offline!"
          notification_id: "visa_bot_down"

  - alias: "Daily Visa Bot Report"
    trigger:
      - platform: time
        at: "09:00:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "📊 Visa Bot Günlük Rapor"
          message: >
            Status: {{ states('sensor.visa_bot_status') }}
            Uptime: {{ states('sensor.visa_bot_uptime_hours') }} saat
            Memory: {{ states('sensor.visa_bot_memory_usage') }} MB
```

## 5. Dashboard Card

### Lovelace Card Örneği
```yaml
type: entities
title: 📋 Visa Bot Control
show_header_toggle: false
entities:
  - entity: sensor.visa_bot_status
    name: "Bot Status"
    icon: mdi:robot
  - entity: sensor.visa_bot_uptime_hours
    name: "Çalışma Süresi"
    icon: mdi:clock-outline
  - entity: sensor.visa_bot_memory_usage
    name: "Memory Kullanımı"
    icon: mdi:memory
  - type: divider
  - type: button
    name: "🔍 Manuel Arama"
    action_name: "Ara"
    tap_action:
      action: call-service
      service: script.visa_manual_search
  - type: button
    name: "🔄 Bot Restart"
    action_name: "Restart"
    tap_action:
      action: call-service
      service: script.visa_bot_restart
    hold_action:
      action: more-info
```

## 6. Troubleshooting

### Repository Eklenmiyorsa
1. GitHub repository'nin public olduğundan emin olun
2. `repository.yaml` dosyasının root'ta olduğunu kontrol edin
3. Home Assistant'ı yeniden başlatın
4. Supervisor logs'unda hata kontrol edin

### Add-on Başlamıyorsa
1. **Logs** tab'ında hataları kontrol edin
2. Telegram token'larının doğru olduğundan emin olun
3. Channel ID'nin doğru format'ta olduğunu kontrol edin (başında -)

### Sensor Çalışmıyorsa
1. Add-on'un çalıştığından emin olun
2. Port 3000'in açık olduğunu kontrol edin
3. `a0d7b954-visa-checker` yerine doğru container adını kullanın

### Container Adını Bulma
```bash
# Home Assistant host'ta (SSH/Terminal add-on)
docker ps | grep visa-checker
```

## 7. Güncelleme

Add-on güncellemesi için:
1. GitHub'da yeni versiyon yayınlayın
2. `config.yaml`'da version numarasını artırın
3. Home Assistant'ta **⋮** > **Check for updates**
4. **Update** butonuna tıklayın

---

Bu rehberi takip ederek visa-checker'ı tam Home Assistant add-on'u olarak kullanabilirsiniz! 🎉

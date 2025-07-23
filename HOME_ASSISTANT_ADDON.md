# Home Assistant Add-on Olarak Visa Checker

⚠️ **ÖNEMLİ**: Bu repository'yi Home Assistant add-on olarak kullanabilmek için önce GitHub'a push etmeniz gerekiyor!

## 🚀 Hızlı Kurulum

### 1. Repository'yi GitHub'a Push Edin
```bash
git add .
git commit -m "feat: Add Home Assistant add-on support"
git push origin main
```

### 2. Home Assistant'ta Repository Ekleyin
1. **Settings > Add-ons > Add-on Store**
2. **⋮** menüsünden **Repositories**
3. Şu URL'yi ekleyin: `https://github.com/mehmetkahya0/visa-checker`
4. **ADD** butonuna tıklayın

### 3. Add-on'u Kurun
1. Store'da **"Visa Checker Bot"** arayın
2. **Install** > **Configuration** 
3. Token'ları girin ve **Save**
4. **Start** butonuna tıklayın

Detaylı kurulum için: `HA_ADDON_SETUP_GUIDE.md`

---

### Repository Yapısı
```
/config/addons/
├── visa-checker/
│   ├── config.yaml
│   ├── Dockerfile
│   ├── rootfs/
│   │   └── run.sh
│   └── icon.png
└── repository.yaml
```

## 2. Add-on Dosyaları

### `/config/addons/repository.yaml`
```yaml
name: "Local Add-ons"
url: "https://github.com/your-username/hassio-addons"
maintainer: "Your Name <your-email@example.com>"
```

### `/config/addons/visa-checker/config.yaml`
```yaml
name: "Visa Checker Bot"
version: "1.0.1"
slug: "visa_checker"
description: "Schengen vize randevu takip botu"
url: "https://github.com/your-username/visa-checker"
arch:
  - armhf
  - armv7
  - aarch64
  - amd64
  - i386
startup: services
boot: auto
init: false
map:
  - share:rw
options:
  telegram_bot_token: ""
  telegram_channel_id: ""
  check_interval: "*/5 * * * *"
  target_country: "tr"
  mission_countries: ["de", "at", "nl", "be", "fr", "it", "es"]
  target_cities: []
  target_visa_subcategories: []
  debug: false
  api_url: "https://api.visasbot.com/api/visa/list"
  max_retries: 3
  restart_token: "change_me_secure_token"
schema:
  telegram_bot_token: str
  telegram_channel_id: str
  check_interval: str
  target_country: str
  mission_countries: [str]
  target_cities: [str]
  target_visa_subcategories: [str]
  debug: bool
  api_url: url
  max_retries: int
  restart_token: str
ports:
  3000/tcp: 3000
ports_description:
  3000/tcp: "Web API interface"
image: "ghcr.io/{arch}-addon-visa-checker"
```

### `/config/addons/visa-checker/Dockerfile`
```dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

# Install dependencies
RUN apk add --no-cache \
    nodejs \
    npm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Copy run script
COPY rootfs/ /

# Make script executable
RUN chmod a+x /run.sh

CMD ["/run.sh"]
```

### `/config/addons/visa-checker/rootfs/run.sh`
```bash
#!/usr/bin/with-contenv bashio

bashio::log.info "Starting Visa Checker Bot Add-on..."

# Create .env from add-on options
cat > /app/.env << EOF
TELEGRAM_BOT_TOKEN=$(bashio::config 'telegram_bot_token')
TELEGRAM_CHANNEL_ID=$(bashio::config 'telegram_channel_id')
CHECK_INTERVAL=$(bashio::config 'check_interval')
TARGET_COUNTRY=$(bashio::config 'target_country')
MISSION_COUNTRY=$(bashio::config 'mission_countries' | jq -r 'join(",")')
CITIES=$(bashio::config 'target_cities' | jq -r 'join(",")')
VISA_SUBCATEGORIES=$(bashio::config 'target_visa_subcategories' | jq -r 'join(",")')
DEBUG=$(bashio::config 'debug')
VISA_API_URL=$(bashio::config 'api_url')
MAX_RETRIES=$(bashio::config 'max_retries')
RESTART_TOKEN=$(bashio::config 'restart_token')
NODE_ENV=production
PORT=3000
EOF

bashio::log.info "Configuration created from add-on options"

# Validate required fields
if ! bashio::config.has_value 'telegram_bot_token'; then
    bashio::log.fatal "Telegram bot token is required!"
    exit 1
fi

if ! bashio::config.has_value 'telegram_channel_id'; then
    bashio::log.fatal "Telegram channel ID is required!"
    exit 1
fi

# Start the application
bashio::log.info "Starting Visa Checker Bot..."
cd /app
exec node dist/index.js
```

## 3. Home Assistant Entegrasyonu

Add-on çalıştıktan sonra Home Assistant'ta kullanım:

### Configuration.yaml
```yaml
# REST Sensor - Add-on içinde çalışıyor
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

# REST Commands
rest_command:
  restart_visa_bot:
    url: "http://a0d7b954-visa-checker:3000/api/restart"
    method: POST
    headers:
      Authorization: "Bearer {{ states.sensor.visa_bot_restart_token.state }}"
  
  manual_visa_search:
    url: "http://a0d7b954-visa-checker:3000/api/search"
    method: POST

# Input fields for configuration
input_text:
  visa_bot_restart_token:
    name: "Visa Bot Restart Token"
    initial: "change_me_secure_token"
    mode: password

# Automation examples
automation:
  - alias: "Visa Bot Health Monitor"
    trigger:
      - platform: state
        entity_id: sensor.visa_bot_status
        to: 'unavailable'
        for: "00:10:00"
    action:
      - service: persistent_notification.create
        data:
          title: "Visa Bot Down"
          message: "Visa checker bot 10 dakikadır yanıt vermiyor!"
          notification_id: "visa_bot_down"

  - alias: "Manual Search Button"
    trigger:
      - platform: event
        event_type: call_service
        event_data:
          domain: script
          service: manual_visa_search
    action:
      - service: rest_command.manual_visa_search
      - service: persistent_notification.create
        data:
          title: "Visa Search"
          message: "Manuel vize arama başlatıldı"

# Scripts for easy access
script:
  manual_visa_search:
    alias: "Manuel Vize Arama"
    sequence:
      - service: rest_command.manual_visa_search
      - service: notify.mobile_app_your_phone
        data:
          title: "🔍 Visa Search"
          message: "Manuel vize arama başlatıldı"

  restart_visa_bot:
    alias: "Visa Bot Restart"
    sequence:
      - service: rest_command.restart_visa_bot
      - delay: "00:00:05"
      - service: notify.mobile_app_your_phone
        data:
          title: "🔄 Visa Bot"
          message: "Bot yeniden başlatıldı"
```

### Lovelace Dashboard Card
```yaml
# Dashboard card örneği
type: entities
title: Visa Bot Control
entities:
  - entity: sensor.visa_bot_status
    name: "Bot Status"
  - entity: sensor.visa_bot_uptime_hours
    name: "Uptime (Hours)"
  - entity: sensor.visa_bot_memory_usage
    name: "Memory Usage (MB)"
  - type: button
    name: "Manual Search"
    action_name: "Search"
    tap_action:
      action: call-service
      service: script.manual_visa_search
  - type: button
    name: "Restart Bot"
    action_name: "Restart"
    tap_action:
      action: call-service
      service: script.restart_visa_bot
```

## 4. Kurulum Adımları

1. **Home Assistant File Editor** add-on'unu kurun
2. `/config/addons/` klasörünü oluşturun
3. Yukarıdaki dosyaları ilgili yerlerine kopyalayın
4. **Settings > Add-ons > Add-on Store > 3 dots > Check for updates**
5. "Visa Checker Bot" add-on'unu kurun ve yapılandırın
6. Home Assistant configuration.yaml'ı güncelleyin
7. Home Assistant'ı yeniden başlatın

## 5. Avantajları

✅ **Home Assistant UI'da tam entegrasyon**  
✅ **Add-on store'dan kolay kurulum**  
✅ **Configuration UI'dan ayar değişikliği**  
✅ **Otomatik backup dahil**  
✅ **Supervisor tarafından yönetim**  
✅ **Log'lar Home Assistant'ta görünür**  
✅ **Home Assistant restart'ında otomatik başlama**

## 6. Dezavantajları

❌ **Initial setup biraz karmaşık**  
❌ **Custom repository gerekli**  
❌ **Home Assistant'a bağımlı**  
❌ **Update process elle**

---

Bu yöntem en entegre çözümdür ancak setup biraz karmaşıktır. Daha basit çözüm için **Docker Compose** yöntemini öneriyorum.

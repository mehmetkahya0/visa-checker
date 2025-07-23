# Basit Home Assistant + Visa Checker Docker Setup

Bu dosya, mevcut Home Assistant kurulumunuza visa-checker eklemek için kullanılabilir.

## Hızlı Kurulum

### 1. Docker Compose Dosyasını Kullanma

Eğer Home Assistant'ınız zaten Docker ile çalışıyorsa:

```bash
# Mevcut Home Assistant'ınızın yanına ekleyin
cd /path/to/your/homeassistant/
mkdir visa-checker
cd visa-checker

# Visa checker dosyalarını buraya kopyalayın
# Sonra şu dosyayı kullanarak başlatın:
```

### 2. Minimal Docker Compose
```yaml
# docker-compose.visa.yml
version: '3.8'

services:
  visa-checker:
    build: .
    container_name: visa-checker-bot
    restart: unless-stopped
    env_file: .env
    ports:
      - "3000:3000"
    networks:
      - homeassistant_default  # Mevcut HA network'ü
    volumes:
      - ./logs:/app/logs
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.3'

networks:
  homeassistant_default:
    external: true  # Mevcut HA network'ünü kullan
```

### 3. Başlatma
```bash
# Visa checker'ı başlat
docker-compose -f docker-compose.visa.yml up -d

# Log'ları kontrol et
docker-compose -f docker-compose.visa.yml logs -f
```

### 4. Home Assistant'ta Kullanım

Home Assistant'ın `configuration.yaml` dosyasına ekleyin:

```yaml
# Visa bot sensor
sensor:
  - platform: rest
    resource: http://visa-checker-bot:3000/api/status
    name: "Visa Bot"
    value_template: "{{ value_json.status }}"
    json_attributes:
      - uptime
      - config
      - memory
    scan_interval: 60

# Template sensor'lar
  - platform: template
    sensors:
      visa_bot_uptime:
        friendly_name: "Visa Bot Uptime"
        value_template: >
          {% set uptime = state_attr('sensor.visa_bot', 'uptime') %}
          {% if uptime %}
            {{ (uptime / 3600) | round(1) }} hours
          {% else %}
            Unknown
          {% endif %}
      
      visa_bot_memory:
        friendly_name: "Visa Bot Memory"
        value_template: >
          {% set memory = state_attr('sensor.visa_bot', 'memory') %}
          {% if memory %}
            {{ memory.used | round(1) }} MB
          {% else %}
            Unknown
          {% endif %}

# Button'lar ve komutlar
rest_command:
  visa_bot_search:
    url: http://visa-checker-bot:3000/api/search
    method: POST
    
  visa_bot_restart:
    url: http://visa-checker-bot:3000/api/restart
    method: POST
    headers:
      Authorization: "Bearer YOUR_RESTART_TOKEN_HERE"

# Automation'lar
automation:
  - alias: "Visa Bot Health Check"
    trigger:
      - platform: state
        entity_id: sensor.visa_bot
        to: 'unavailable'
        for: "00:05:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "🚨 Visa Bot Problem"
          message: "Visa bot 5 dakikadır yanıt vermiyor!"

  - alias: "Daily Visa Bot Status"
    trigger:
      - platform: time
        at: "08:00:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "📊 Visa Bot Günlük Rapor"
          message: >
            Status: {{ states('sensor.visa_bot') }}
            Uptime: {{ states('sensor.visa_bot_uptime') }}
            Memory: {{ states('sensor.visa_bot_memory') }}

# Script'ler
script:
  visa_search:
    alias: "Manuel Vize Arama"
    sequence:
      - service: rest_command.visa_bot_search
      - service: notify.mobile_app_your_phone
        data:
          title: "🔍 Vize Arama"
          message: "Manuel vize arama başlatıldı"

  visa_bot_restart:
    alias: "Visa Bot Restart"
    sequence:
      - service: rest_command.visa_bot_restart
      - delay: "00:00:03"
      - service: notify.mobile_app_your_phone
        data:
          title: "🔄 Bot Restart"
          message: "Visa bot yeniden başlatıldı"
```

### 5. Lovelace Dashboard Card

```yaml
# Lovelace'a ekleyebileceğiniz card
type: entities
title: 📋 Visa Bot Control
show_header_toggle: false
entities:
  - entity: sensor.visa_bot
    name: "Bot Status"
    icon: mdi:robot
  - entity: sensor.visa_bot_uptime
    name: "Uptime"
    icon: mdi:clock-outline
  - entity: sensor.visa_bot_memory
    name: "Memory Usage"
    icon: mdi:memory
  - type: divider
  - type: button
    name: "🔍 Manual Search"
    action_name: "Search"
    tap_action:
      action: call-service
      service: script.visa_search
  - type: button
    name: "🔄 Restart Bot"
    action_name: "Restart"
    tap_action:
      action: call-service
      service: script.visa_bot_restart
    hold_action:
      action: more-info
```

## Network Troubleshooting

Eğer Home Assistant bot'u bulamazsa:

### 1. Network kontrol et
```bash
# Hangi network'te çalıştığını kontrol et
docker network ls
docker inspect homeassistant_default
```

### 2. Container isimlerini kontrol et
```bash
# Running container'ları listele
docker ps

# Eğer farklı isimle çalışıyorsa, configuration.yaml'da değiştir
# Örn: http://different-container-name:3000/api/status
```

### 3. Port kontrol et
```bash
# Port'un açık olduğunu doğrula
docker exec visa-checker-bot wget -O- http://localhost:3000/health
```

## Faydaları

✅ **Tek Docker environment**  
✅ **Otomatik restart**  
✅ **Home Assistant entegrasyonu**  
✅ **Merkezi monitoring**  
✅ **Backup otomatiği**  
✅ **Network izolasyonu**  

Bu setup ile Home Assistant dashboard'unuzdan visa bot'u tamamen kontrol edebilirsiniz!

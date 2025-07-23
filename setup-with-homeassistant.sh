#!/bin/bash

# Home Assistant + Visa Checker Docker Kurulum Script
echo "🏠 Home Assistant + Visa Checker Docker Setup"
echo "=============================================="

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[STEP]${NC} $1"; }
print_note() { echo -e "${BLUE}[NOTE]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 1. Home Assistant network'ünü bul veya oluştur
print_step "Home Assistant Docker network kontrol ediliyor..."

HA_NETWORK="homeassistant_default"
if docker network ls | grep -q "$HA_NETWORK"; then
    print_note "Home Assistant network bulundu: $HA_NETWORK"
else
    print_step "Home Assistant network oluşturuluyor..."
    docker network create homeassistant_default
fi

# 2. Visa Checker'ı aynı network'te başlat
print_step "Visa Checker container'ı başlatılıyor..."

# Mevcut container'ı durdur ve sil
docker stop visa-checker-bot 2>/dev/null || true
docker rm visa-checker-bot 2>/dev/null || true

# Yeni container'ı başlat
docker run -d \
  --name visa-checker-bot \
  --restart unless-stopped \
  --network $HA_NETWORK \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v /etc/localtime:/etc/localtime:ro \
  --memory=150m \
  --cpus=0.5 \
  visa-checker:latest

print_step "Container başlatıldı!"

# 3. Home Assistant konfigürasyonu için bilgi ver
echo ""
print_note "✅ Kurulum tamamlandı!"
echo ""
echo "🔧 Home Assistant configuration.yaml'a ekleyin:"
echo ""
cat << 'EOF'
# REST Sensor for visa bot
sensor:
  - platform: rest
    resource: http://visa-checker-bot:3000/api/status
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
        value_template: "{{ (state_attr('sensor.visa_bot_status', 'uptime') / 3600) | round(1) }}"
        unit_of_measurement: "hours"
        
      visa_bot_memory_usage:
        friendly_name: "Visa Bot Memory"
        value_template: "{{ state_attr('sensor.visa_bot_status', 'memory').used | round(1) }}"
        unit_of_measurement: "MB"

# REST Commands for bot control
rest_command:
  restart_visa_bot:
    url: "http://visa-checker-bot:3000/api/restart"
    method: POST
    headers:
      Authorization: "Bearer YOUR_RESTART_TOKEN"
    
  search_visa_appointments:
    url: "http://visa-checker-bot:3000/api/search"
    method: POST

# Automation examples
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
          message: "Visa checker bot yanıt vermiyor!"

  - alias: "Daily Visa Bot Report"
    trigger:
      - platform: time
        at: "09:00:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "📊 Visa Bot Günlük Rapor"
          message: >
            Bot Durumu: {{ states('sensor.visa_bot_status') }}
            Çalışma Süresi: {{ states('sensor.visa_bot_uptime_hours') }} saat
            Memory: {{ states('sensor.visa_bot_memory_usage') }} MB

EOF

echo ""
print_warn "NOT: configuration.yaml'daki YOUR_RESTART_TOKEN'ı .env dosyasındaki RESTART_TOKEN ile değiştirin!"
echo ""
echo "🌐 Bot API URL'si: http://$(hostname -I | awk '{print $1}'):3000/api/status"
echo "🔍 Logs: docker logs -f visa-checker-bot"
echo "📊 Status: docker ps | grep visa-checker"

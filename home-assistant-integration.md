# Home Assistant Add-on Konfigürasyonu

Eğer Home Assistant kullanıyorsanız, visa-checker'ı Home Assistant add-on olarak da çalıştırabilirsiniz.

## 1. Custom Add-on Oluşturma

### `/config/addons/visa-checker/config.yaml`
```yaml
name: "Visa Checker Bot"
description: "Schengen vize randevu takip botu"
version: "1.0.0"
slug: "visa_checker"
init: false
arch:
  - aarch64
  - amd64
  - armhf
  - armv7
  - i386
startup: services
boot: auto
homeassistant_api: false
hassio_api: false
host_network: false
privileged: []
ports:
  3000/tcp: 3000
options:
  telegram_bot_token: ""
  telegram_channel_id: ""
  check_interval: "5m"
  target_country: "tr"
  mission_countries: ["de", "at", "nl", "be", "fr", "it", "es"]
  target_cities: []
  target_visa_subcategories: []
  debug: false
schema:
  telegram_bot_token: str
  telegram_channel_id: str
  check_interval: str
  target_country: str
  mission_countries: [str]
  target_cities: [str]
  target_visa_subcategories: [str]
  debug: bool
```

### `/config/addons/visa-checker/Dockerfile`
```dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --production

# Copy application code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm run build

# Copy run script
COPY rootfs/ /

# Make script executable
RUN chmod a+x /run.sh

CMD ["/run.sh"]
```

### `/config/addons/visa-checker/rootfs/run.sh`
```bash
#!/usr/bin/with-contenv bashio

bashio::log.info "Starting Visa Checker Bot..."

# Get options from add-on config
export TELEGRAM_BOT_TOKEN=$(bashio::config 'telegram_bot_token')
export TELEGRAM_CHANNEL_ID=$(bashio::config 'telegram_channel_id')
export CHECK_INTERVAL=$(bashio::config 'check_interval')
export TARGET_COUNTRY=$(bashio::config 'target_country')
export MISSION_COUNTRIES=$(bashio::config 'mission_countries' | tr ',' ' ')
export TARGET_CITIES=$(bashio::config 'target_cities' | tr ',' ' ')
export TARGET_VISA_SUBCATEGORIES=$(bashio::config 'target_visa_subcategories' | tr ',' ' ')
export DEBUG=$(bashio::config 'debug')
export NODE_ENV=production

# Start the application
bashio::log.info "Configuration loaded, starting bot..."
cd /app
exec node dist/index.js
```

## 2. Sensor Entegrasyonu

### `configuration.yaml` (Home Assistant)
```yaml
# REST Sensor for bot status
sensor:
  - platform: rest
    resource: http://[PI_IP]:3000/api/status
    name: "Visa Bot Status"
    value_template: "{{ value_json.status }}"
    json_attributes:
      - uptime
      - message_count
      - last_check
    scan_interval: 60

# Template sensor for uptime formatting
  - platform: template
    sensors:
      visa_bot_uptime:
        friendly_name: "Visa Bot Uptime"
        value_template: >
          {% set uptime = state_attr('sensor.visa_bot_status', 'uptime') %}
          {% if uptime %}
            {{ (uptime / 3600) | round(1) }} hours
          {% else %}
            Unknown
          {% endif %}

# Automation for notifications
automation:
  - alias: "Visa Bot Status Change"
    trigger:
      - platform: state
        entity_id: sensor.visa_bot_status
    condition:
      - condition: template
        value_template: "{{ trigger.to_state.state != trigger.from_state.state }}"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "Visa Bot Status Changed"
          message: "Bot status: {{ trigger.to_state.state }}"

# Dashboard card
lovelace:
  resources:
    - url: /local/visa-bot-card.js
      type: javascript
  dashboards:
    visa-dashboard:
      mode: yaml
      title: Visa Checker
      filename: visa-dashboard.yaml
```

### Dashboard Card Example
```yaml
# visa-dashboard.yaml
views:
  - title: Visa Checker
    cards:
      - type: entities
        title: Bot Status
        entities:
          - sensor.visa_bot_status
          - sensor.visa_bot_uptime
          - sensor.visa_bot_message_count

      - type: button
        name: Restart Bot
        tap_action:
          action: call-service
          service: rest_command.restart_visa_bot

      - type: logbook
        entities:
          - sensor.visa_bot_status
        hours_to_show: 24
```

## 3. MQTT Integration

Telegram servisine MQTT publisher eklemek için:

```typescript
import mqtt from 'mqtt';

class TelegramService {
  private mqttClient?: mqtt.MqttClient;
  
  constructor() {
    // ...existing code...
    this.setupMQTT();
  }
  
  private setupMQTT() {
    if (config.mqtt.enabled) {
      this.mqttClient = mqtt.connect(config.mqtt.broker, {
        username: config.mqtt.username,
        password: config.mqtt.password
      });
      
      this.mqttClient.on('connect', () => {
        console.log('MQTT connected');
        this.publishStatus('online');
      });
    }
  }
  
  private publishStatus(status: string) {
    if (this.mqttClient) {
      this.mqttClient.publish('visa-checker/status', JSON.stringify({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        messageCount: this.messageCount
      }));
    }
  }
  
  async sendNotification(appointment: VisaAppointment): Promise<boolean> {
    const result = await // ...existing send logic...
    
    // MQTT bildirimi
    if (this.mqttClient && result) {
      this.mqttClient.publish('visa-checker/appointment', JSON.stringify({
        center: appointment.center,
        country: appointment.country_code,
        mission: appointment.mission_code,
        status: appointment.status,
        timestamp: new Date().toISOString()
      }));
    }
    
    return result;
  }
}
```

## 4. Monitoring Dashboard

Grafana + InfluxDB ile izleme:

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  influxdb:
    image: influxdb:2.0-alpine
    container_name: influxdb
    restart: unless-stopped
    volumes:
      - influxdb_data:/var/lib/influxdb2
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=your_password
      - DOCKER_INFLUXDB_INIT_ORG=visa-checker
      - DOCKER_INFLUXDB_INIT_BUCKET=metrics
    
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your_password
      
volumes:
  influxdb_data:
  grafana_data:
```

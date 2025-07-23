#!/usr/bin/with-contenv bashio

# Set error handling
set -e

bashio::log.info "🚀 Starting Visa Checker Bot Add-on..."

# Create .env from add-on options
bashio::log.info "📝 Creating configuration from add-on options..."

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

bashio::log.info "✅ Configuration file created"

# Validate required fields
if ! bashio::config.has_value 'telegram_bot_token'; then
    bashio::log.fatal "❌ Telegram bot token is required!"
    bashio::log.fatal "Please configure your bot token in the add-on configuration"
    exit 1
fi

if ! bashio::config.has_value 'telegram_channel_id'; then
    bashio::log.fatal "❌ Telegram channel ID is required!"
    bashio::log.fatal "Please configure your channel ID in the add-on configuration"
    exit 1
fi

# Log configuration info
bashio::log.info "🎯 Target Country: $(bashio::config 'target_country')"
bashio::log.info "🏛️ Mission Countries: $(bashio::config 'mission_countries' | jq -r 'join(", ")')"
bashio::log.info "🔄 Check Interval: $(bashio::config 'check_interval')"
bashio::log.info "🐛 Debug Mode: $(bashio::config 'debug')"

# Show cities if configured
if bashio::config.has_value 'target_cities'; then
    bashio::log.info "🏙️ Target Cities: $(bashio::config 'target_cities' | jq -r 'join(", ")')"
fi

# Show visa subcategories if configured
if bashio::config.has_value 'target_visa_subcategories'; then
    bashio::log.info "📄 Visa Types: $(bashio::config 'target_visa_subcategories' | jq -r 'join(", ")')"
fi

# Start the application
bashio::log.info "🚀 Starting Visa Checker Bot..."
bashio::log.info "🌐 Web API will be available at: http://homeassistant.local:3000"
bashio::log.info "📊 API Status: http://homeassistant.local:3000/api/status"

cd /app

# Export all environment variables
export $(cat .env | xargs)

# Start the application with proper error handling
exec node dist/index.js

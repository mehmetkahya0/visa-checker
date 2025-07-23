#!/usr/bin/with-contenv bashio

# Set error handling
set -e

bashio::log.info "🚀 Starting Visa Checker Bot Add-on..."

# Create .env from add-on options
bashio::log.info "📝 Creating configuration from add-on options..."

# Function to safely join array values
safe_join() {
    local config_key="$1"
    if bashio::config.has_value "$config_key"; then
        bashio::config "$config_key" | jq -r 'if type == "array" then join(",") else . end' 2>/dev/null || echo ""
    else
        echo ""
    fi
}

cat > /app/.env << EOF
TELEGRAM_BOT_TOKEN=$(bashio::config 'telegram_bot_token')
TELEGRAM_CHANNEL_ID=$(bashio::config 'telegram_channel_id')
CHECK_INTERVAL=$(bashio::config 'check_interval')
TARGET_COUNTRY=$(bashio::config 'target_country')
MISSION_COUNTRY=$(safe_join 'mission_countries')
CITIES=$(safe_join 'target_cities')
VISA_SUBCATEGORIES=$(safe_join 'target_visa_subcategories')
DEBUG=$(bashio::config 'debug')
VISA_API_URL=$(bashio::config 'api_url')
MAX_RETRIES=$(bashio::config 'max_retries')
RESTART_TOKEN=$(bashio::config 'restart_token')
NODE_ENV=production
PORT=3000
EOF

bashio::log.info "✅ Configuration file created"

# Debug: Show the generated .env file (without sensitive data)
bashio::log.info "📋 Generated configuration:"
bashio::log.info "  TARGET_COUNTRY: $(bashio::config 'target_country')"
bashio::log.info "  CHECK_INTERVAL: $(bashio::config 'check_interval')"
bashio::log.info "  DEBUG: $(bashio::config 'debug')"
bashio::log.info "  MAX_RETRIES: $(bashio::config 'max_retries')"

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
bashio::log.info "🏛️ Mission Countries: $(safe_join 'mission_countries')"
bashio::log.info "🔄 Check Interval: $(bashio::config 'check_interval')"
bashio::log.info "🐛 Debug Mode: $(bashio::config 'debug')"

# Show cities if configured
if bashio::config.has_value 'target_cities'; then
    bashio::log.info "🏙️ Target Cities: $(safe_join 'target_cities')"
fi

# Show visa subcategories if configured
if bashio::config.has_value 'target_visa_subcategories'; then
    bashio::log.info "📄 Visa Types: $(safe_join 'target_visa_subcategories')"
fi

# Start the application
bashio::log.info "🚀 Starting Visa Checker Bot..."
bashio::log.info "🌐 Web API will be available at: http://homeassistant.local:3000"
bashio::log.info "📊 API Status: http://homeassistant.local:3000/api/status"

cd /app

# Verify the built application exists
if [ ! -f "dist/index.js" ]; then
    bashio::log.fatal "❌ Built application not found at dist/index.js"
    exit 1
fi

# Export environment variables properly
bashio::log.info "🔧 Setting up environment variables..."
set -a  # Automatically export all variables
source /app/.env
set +a  # Stop automatically exporting

# Verify critical environment variables are set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    bashio::log.fatal "❌ TELEGRAM_BOT_TOKEN not set"
    exit 1
fi

if [ -z "$TELEGRAM_CHANNEL_ID" ]; then
    bashio::log.fatal "❌ TELEGRAM_CHANNEL_ID not set"
    exit 1
fi

bashio::log.info "✅ Environment variables configured successfully"

# Start the application with proper error handling
bashio::log.info "🎬 Launching application..."
exec node dist/index.js

#!/usr/bin/with-contenv bashio

# Set error handling
set -e

bashio::log.info "🚀 Starting Visa Checker Bot Add-on..."

# Create .env from add-on options
bashio::log.info "📝 Creating configuration from add-on options..."

# Function to safely join array values
safe_join() {
    local config_key="$1"
    bashio::log.info "🔍 Debug: Checking config key '$config_key'"
    
    if bashio::config.has_value "$config_key"; then
        local raw_value=$(bashio::config "$config_key" 2>/dev/null)
        bashio::log.info "🔍 Debug: Raw value for '$config_key': '$raw_value'"
        
        # Try to parse as array and join with comma using jq
        local result=$(echo "$raw_value" | jq -r 'if type == "array" and length > 0 then join(",") elif type == "string" and length > 0 then . else empty end' 2>/dev/null)
        bashio::log.info "🔍 Debug: jq result for '$config_key': '$result'"
        
        # If jq fails or returns empty, try direct string approach
        if [ -z "$result" ]; then
            bashio::log.info "🔍 Debug: jq failed, trying manual parsing for '$config_key'"
            # Handle different possible formats
            if [[ "$raw_value" == \[*\] ]]; then
                # Array format like ["grc","deu","ita"]
                result=$(echo "$raw_value" | tr -d '[]"' | tr ' ' ',' | sed 's/,,*/,/g' | sed 's/^,\|,$//g')
            else
                # Direct string
                result="$raw_value"
            fi
            bashio::log.info "🔍 Debug: Manual parsing result for '$config_key': '$result'"
        fi
        
        echo "$result"
    else
        bashio::log.info "🔍 Debug: Config key '$config_key' has no value"
        echo ""
    fi
}

# Create the .env file with proper formatting
cat > /app/.env << 'EOF'
TELEGRAM_BOT_TOKEN=%TELEGRAM_BOT_TOKEN%
TELEGRAM_CHAT_ID=%TELEGRAM_CHAT_ID%
CHECK_INTERVAL=%CHECK_INTERVAL%
TARGET_COUNTRY=%TARGET_COUNTRY%
MISSION_COUNTRY=%MISSION_COUNTRY%
CITIES=%CITIES%
VISA_SUBCATEGORIES=%VISA_SUBCATEGORIES%
DEBUG=%DEBUG%
VISA_API_URL=%VISA_API_URL%
MAX_RETRIES=%MAX_RETRIES%
RESTART_TOKEN=%RESTART_TOKEN%
NODE_ENV=production
PORT=3000
EOF

# Replace placeholders with actual values
sed -i "s|%TELEGRAM_BOT_TOKEN%|$(bashio::config 'telegram_bot_token')|g" /app/.env
sed -i "s|%TELEGRAM_CHAT_ID%|$(bashio::config 'telegram_channel_id')|g" /app/.env
sed -i "s|%CHECK_INTERVAL%|$(bashio::config 'check_interval')|g" /app/.env
sed -i "s|%TARGET_COUNTRY%|$(bashio::config 'target_country')|g" /app/.env

# Debug mission countries before replacement
bashio::log.info "🔍 Debug: About to parse mission_countries..."
MISSION_COUNTRIES_VALUE="$(safe_join 'mission_countries')"
bashio::log.info "🔍 Debug: MISSION_COUNTRIES_VALUE before sed: '$MISSION_COUNTRIES_VALUE'"

# Check if the value is empty and try alternative approach
if [ -z "$MISSION_COUNTRIES_VALUE" ]; then
    bashio::log.info "🔍 Debug: MISSION_COUNTRIES_VALUE is empty, trying direct bashio::config approach..."
    MISSION_COUNTRIES_RAW=$(bashio::config 'mission_countries' 2>/dev/null || echo "ERROR_READING_CONFIG")
    bashio::log.info "🔍 Debug: Direct bashio::config result: '$MISSION_COUNTRIES_RAW'"
    
    # Try to handle it manually if it's an array
    if [[ "$MISSION_COUNTRIES_RAW" == \[*\] ]]; then
        MISSION_COUNTRIES_VALUE=$(echo "$MISSION_COUNTRIES_RAW" | sed 's/\[//g' | sed 's/\]//g' | sed 's/"//g' | sed 's/ //g')
        bashio::log.info "🔍 Debug: Manual parsing result: '$MISSION_COUNTRIES_VALUE'"
    fi
fi

sed -i "s|%MISSION_COUNTRY%|$MISSION_COUNTRIES_VALUE|g" /app/.env
sed -i "s|%CITIES%|$(safe_join 'target_cities')|g" /app/.env
sed -i "s|%VISA_SUBCATEGORIES%|$(safe_join 'target_visa_subcategories')|g" /app/.env
sed -i "s|%DEBUG%|$(bashio::config 'debug')|g" /app/.env
sed -i "s|%VISA_API_URL%|$(bashio::config 'api_url')|g" /app/.env
sed -i "s|%MAX_RETRIES%|$(bashio::config 'max_retries')|g" /app/.env
sed -i "s|%RESTART_TOKEN%|$(bashio::config 'restart_token')|g" /app/.env

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

# Debug mission countries parsing
bashio::log.info "🔍 Debug: Raw mission_countries config: $(bashio::config 'mission_countries' 2>/dev/null || echo 'NOT_FOUND')"
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

# Debug: Show the generated .env file (first few lines, without sensitive data)
bashio::log.info "🔍 Generated .env file content (first 10 lines):"
head -10 /app/.env | while read line; do
    if [[ "$line" == *"TOKEN"* ]]; then
        bashio::log.info "  ${line%%=*}=***HIDDEN***"
    else
        bashio::log.info "  $line"
    fi
done

# Also show MISSION_COUNTRY line specifically
bashio::log.info "🔍 MISSION_COUNTRY line from .env: $(grep '^MISSION_COUNTRY=' /app/.env || echo 'NOT_FOUND')"

# Use a more reliable method to export variables
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
    
    # Remove any quotes from the value
    value=$(echo "$value" | sed 's/^["\x27]*//; s/["\x27]*$//')
    
    # Export the variable
    export "$key"="$value"
    bashio::log.info "  ✓ Exported: $key"
done < /app/.env

# Verify critical environment variables are set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    bashio::log.fatal "❌ TELEGRAM_BOT_TOKEN not set"
    exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    bashio::log.fatal "❌ TELEGRAM_CHAT_ID not set"
    exit 1
fi

bashio::log.info "✅ Environment variables configured successfully"

# Start the application with proper error handling
bashio::log.info "🎬 Launching application..."
exec node dist/index.js

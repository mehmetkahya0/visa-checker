const fs = require('fs');
const path = require('path');

// Set up test environment
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.TELEGRAM_CHAT_ID = '-1001234567890'; // Valid chat ID format
process.env.CHECK_INTERVAL = '*/5 * * * *';
process.env.TARGET_COUNTRY = 'tr';
process.env.MISSION_COUNTRY = 'grc,deu,ita';
process.env.CITIES = 'Izmir,Antalya';
process.env.VISA_SUBCATEGORIES = '';
process.env.DEBUG = 'true';
process.env.VISA_API_URL = 'https://api.visasbot.com/api/visa/list';
process.env.MAX_RETRIES = '3';
process.env.RESTART_TOKEN = 'test_token';
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';

// Load the built configuration
try {
    const { config } = require('./dist/config/environment');
    
    console.log('=== Configuration Test Results ===');
    console.log('Target Country:', config.app.targetCountry);
    console.log('Mission Countries:', config.app.missionCountries);
    console.log('Target Cities:', config.app.targetCities);
    console.log('Debug Mode:', config.app.debug);
    
    // Verify mission countries
    if (config.app.missionCountries.length === 3 && 
        config.app.missionCountries.includes('grc') &&
        config.app.missionCountries.includes('deu') &&
        config.app.missionCountries.includes('ita')) {
        console.log('✅ Mission countries parsed correctly!');
    } else {
        console.log('❌ Mission countries parsing failed!');
        console.log('Expected: [grc, deu, ita]');
        console.log('Got:', config.app.missionCountries);
    }
    
    // Verify target country conversion
    if (config.app.targetCountry === 'tur') {
        console.log('✅ Target country converted correctly (tr -> tur)!');
    } else {
        console.log('❌ Target country conversion failed!');
        console.log('Expected: tur');
        console.log('Got:', config.app.targetCountry);
    }
    
} catch (error) {
    console.error('Configuration test failed:', error.message);
    process.exit(1);
}

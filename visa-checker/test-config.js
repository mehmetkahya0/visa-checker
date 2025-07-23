const fs = require('fs');
const path = require('path');

// Test environment
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.TELEGRAM_CHAT_ID = '-1001234567890'; 
process.env.CHECK_INTERVAL = '* * * * *'; // Her dakika
process.env.TARGET_COUNTRY = 'tur';
process.env.MISSION_COUNTRY = 'grc,deu,ita';
process.env.CITIES = 'Izmir,Antalya';
process.env.VISA_SUBCATEGORIES = '';
process.env.DEBUG = 'true';
process.env.VISA_API_URL = 'https://api.visasbot.com/api/visa/list';
process.env.MAX_RETRIES = '3';
process.env.RESTART_TOKEN = 'test_token';
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';

// Load the configuration
try {
    const { config } = require('./dist/config/environment');
    
    console.log('=== Configuration Test Results ===');
    console.log('✅ Configuration loaded successfully!');
    console.log('');
    console.log('📊 App Configuration:');
    console.log(`  - Check Interval: ${config.app.checkInterval}`);
    console.log(`  - Target Country: ${config.app.targetCountry}`);
    console.log(`  - Mission Countries: ${config.app.missionCountries.join(', ')}`);
    console.log(`  - Target Cities: ${config.app.targetCities.join(', ')}`);
    console.log(`  - Debug Mode: ${config.app.debug}`);
    console.log('');
    console.log('📡 API Configuration:');
    console.log(`  - Visa API URL: ${config.api.visaApiUrl}`);
    console.log(`  - Max Retries: ${config.api.maxRetries}`);
    console.log('');
    console.log('💬 Telegram Configuration:');
    console.log(`  - Bot Token: ${config.telegram.botToken.substring(0, 10)}...`);
    console.log(`  - Channel ID: ${config.telegram.channelId}`);
    console.log(`  - Rate Limit: ${config.telegram.rateLimit} msg/min`);
    
} catch (error) {
    console.error('❌ Configuration Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

console.log('\n🧪 Testing CRON validation...');
const cron = require('node-cron');
const testInterval = process.env.CHECK_INTERVAL;

console.log(`Testing pattern: "${testInterval}"`);
console.log(`Is valid: ${cron.validate(testInterval)}`);

if (cron.validate(testInterval)) {
    console.log('✅ CRON pattern is valid!');
    
    console.log('\n🔄 Creating test CRON job...');
    let count = 0;
    const testJob = cron.schedule(testInterval, () => {
        count++;
        console.log(`⏰ CRON job executed #${count} at ${new Date().toISOString()}`);
        
        if (count >= 3) {
            console.log('🛑 Stopping test after 3 executions...');
            testJob.stop();
            process.exit(0);
        }
    }, { scheduled: true });
    
    console.log('✅ CRON job started. Waiting for executions...');
    
    // Safety timeout
    setTimeout(() => {
        console.log('⏰ Test timeout reached. Stopping...');
        testJob.stop();
        process.exit(0);
    }, 180000); // 3 minutes
    
} else {
    console.log('❌ CRON pattern is invalid!');
    process.exit(1);
}

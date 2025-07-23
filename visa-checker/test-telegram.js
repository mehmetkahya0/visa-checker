const { Telegraf } = require('telegraf');

// .env dosyasından değerleri yükle
require('dotenv').config();

async function testTelegramBot() {
    console.log('🧪 Telegram Bot Connection Test');
    console.log('================================');
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);
    console.log(`Chat ID: ${chatId || 'MISSING'}`);
    
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
        process.exit(1);
    }
    
    if (!chatId) {
        console.error('❌ TELEGRAM_CHAT_ID is missing!');
        process.exit(1);
    }
    
    try {
        console.log('\n📡 Creating bot instance...');
        const bot = new Telegraf(token);
        
        console.log('🔍 Getting bot info...');
        const botInfo = await bot.telegram.getMe();
        console.log(`✅ Bot Info: @${botInfo.username} (${botInfo.first_name})`);
        
        console.log('🧹 Clearing webhooks...');
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhooks cleared');
        
        console.log('📤 Sending test message...');
        const message = await bot.telegram.sendMessage(
            chatId,
            '🧪 **Test Message**\n\n✅ Telegram bot connection is working!',
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ Test message sent! Message ID: ${message.message_id}`);
        
        console.log('\n🎉 All tests passed! Bot is working correctly.');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

testTelegramBot();

require('dotenv').config();
const { Telegraf } = require('telegraf');

async function testStatus() {
  try {
    console.log('🤖 TELEGRAM STATUS TEST\n');
    
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    console.log('1️⃣ Bot bilgisi alınıyor...');
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot: @${botInfo.username} (${botInfo.first_name})`);
    
    console.log('\n2️⃣ Status mesajı gönderiliyor...');
    await bot.telegram.sendMessage(chatId, '/status');
    console.log('✅ Status komutu gönderildi!');
    
    console.log('\n3️⃣ Test mesajı gönderiliyor...');
    const testMessage = `🔍 Bot Test - ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}

🤖 Bu bir test mesajıdır
✅ Bot çalışıyor
📅 Zaman: ${new Date().toISOString()}`;

    await bot.telegram.sendMessage(chatId, testMessage);
    console.log('✅ Test mesajı gönderildi!');
    
    console.log('\n🎉 TÜM TESTLER BAŞARILI!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
    if (error.response) {
      console.error('📝 Detay:', error.response);
    }
  }
}

testStatus();

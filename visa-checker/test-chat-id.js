#!/usr/bin/env node

/**
 * Telegram Chat ID Test ve Yardımcı Script
 * Bu script Chat ID problemlerini tanımlayıp çözüm önerir
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');

console.log('\n🔍 TELEGRAM CHAT ID TEST VE YARDIMCI\n');
console.log('====================================\n');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN bulunamadı!');
  console.error('💡 .env dosyasında TELEGRAM_BOT_TOKEN ayarını kontrol edin\n');
  process.exit(1);
}

if (!CHAT_ID) {
  console.error('❌ TELEGRAM_CHAT_ID bulunamadı!');
  console.error('💡 .env dosyasında TELEGRAM_CHAT_ID ayarını kontrol edin\n');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function testChatId() {
  try {
    console.log('1️⃣ Bot bilgisi alınıyor...');
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot: @${botInfo.username} (${botInfo.first_name})`);
    
    console.log(`\n2️⃣ Chat ID test ediliyor: ${CHAT_ID}`);
    
    // Chat bilgisi al
    try {
      const chat = await bot.telegram.getChat(CHAT_ID);
      console.log(`✅ Chat bulundu:`);
      console.log(`   - Tip: ${chat.type}`);
      console.log(`   - Başlık: ${chat.title || chat.first_name || 'Özel Chat'}`);
      console.log(`   - ID: ${chat.id}`);
    } catch (chatError) {
      console.error(`❌ Chat bilgisi alınamadı: ${chatError.response?.description || chatError.message}`);
    }
    
    console.log(`\n3️⃣ Test mesajı gönderiliyor...`);
    await bot.telegram.sendMessage(
      CHAT_ID,
      `🧪 CHAT ID TEST MESAJI

✅ Tebrikler! Chat ID doğru çalışıyor.

📊 Test Bilgileri:
• Bot: @${botInfo.username}
• Chat ID: ${CHAT_ID}
• Test Zamanı: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}

🎯 Visa Checker bot artık bu chat'e bildirim gönderebilir!`
    );
    
    console.log('✅ Test mesajı başarıyla gönderildi!');
    console.log('\n🎉 SONUÇ: Chat ID doğru çalışıyor!');
    console.log('💡 Visa Checker sistemi bu chat\'e bildirim gönderebilir.\n');
    
  } catch (error) {
    console.error('\n❌ HATA OLUŞTU:');
    
    if (error.response?.error_code === 400 && error.response?.description?.includes('chat not found')) {
      console.error('🔍 SORUN: Chat bulunamadı');
      console.error('\n💡 ÇÖZÜM ADIMLAStokens:');
      console.error('1. Bot\'a özel mesaj gönderin');
      console.error('2. /start komutunu kullanın');
      console.error('3. @userinfobot\'a "Show my ID" yazarak doğru Chat ID\'nizi öğrenin');
      console.error('4. .env dosyasındaki TELEGRAM_CHAT_ID\'yi güncelleyin');
    } else if (error.response?.error_code === 403) {
      console.error('🔍 SORUN: Bot\'un bu chat\'e erişim izni yok');
      console.error('\n💡 ÇÖZÜM ADIMARI:');
      console.error('1. Bot\'u gruba ekleyin (grup ise)');
      console.error('2. Bot\'a özel mesajda /start komutunu kullanın');
      console.error('3. Bot\'un mesaj gönderme iznini kontrol edin');
    } else if (error.response?.error_code === 401) {
      console.error('🔍 SORUN: Bot token geçersiz');
      console.error('\n💡 ÇÖZÜM ADIMI:');
      console.error('1. @BotFather\'dan yeni token alın');
      console.error('2. .env dosyasındaki TELEGRAM_BOT_TOKEN\'ı güncelleyin');
    } else {
      console.error(`🔍 SORUN: ${error.response?.description || error.message}`);
    }
    
    console.error(`\n📋 Hata Detayları:`);
    console.error(`   - Error Code: ${error.response?.error_code || 'Bilinmiyor'}`);
    console.error(`   - Description: ${error.response?.description || error.message}`);
    console.error(`\n🔧 Mevcut Ayarlar:`);
    console.error(`   - TELEGRAM_BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}...`);
    console.error(`   - TELEGRAM_CHAT_ID: ${CHAT_ID}`);
    console.error('');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test iptal edildi');
  process.exit(0);
});

// Test başlat
testChatId();

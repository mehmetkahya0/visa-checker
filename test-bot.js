#!/usr/bin/env node

/**
 * Test script for the enhanced Telegram bot functionality
 * This script tests bot commands and startup notifications
 */

import { telegramService } from '../src/services/telegram';
import { config } from '../src/config/environment';

async function testBotFunctionality() {
  console.log('🧪 Bot işlevsellik testi başlatılıyor...\n');

  try {
    // Test 1: Bot başlatma
    console.log('1. Bot başlatma testi...');
    await telegramService.startBot();
    console.log('✅ Bot başarıyla başlatıldı\n');

    // Test 2: Başlangıç bildirimi
    console.log('2. Başlangıç bildirimi testi...');
    const startupResult = await telegramService.sendStartupNotification();
    if (startupResult) {
      console.log('✅ Başlangıç bildirimi gönderildi\n');
    } else {
      console.log('❌ Başlangıç bildirimi gönderilemedi\n');
    }

    // Test 3: Hata bildirimi
    console.log('3. Hata bildirimi testi...');
    const errorResult = await telegramService.sendErrorNotification(
      'Test hatası',
      'Bu bir test hata mesajıdır'
    );
    if (errorResult) {
      console.log('✅ Hata bildirimi gönderildi\n');
    } else {
      console.log('❌ Hata bildirimi gönderilemedi\n');
    }

    // Test 4: Yapılandırma kontrolü
    console.log('4. Yapılandırma kontrolü...');
    console.log(`📋 Bot Token: ${config.telegram.botToken ? '✅ Ayarlandı' : '❌ Eksik'}`);
    console.log(`📋 Kanal ID: ${config.telegram.channelId ? '✅ Ayarlandı' : '❌ Eksik'}`);
    console.log(`📋 Kontrol Sıklığı: ${config.app.checkInterval}`);
    console.log(`📋 Hedef Ülke: ${config.app.targetCountry}`);
    console.log(`📋 Hedef Misyonlar: ${config.app.missionCountries.join(', ')}`);

    console.log('\n🎉 Bot test süreci tamamlandı!');
    
    // Kısa süre bekle ve durdurma bildirimi gönder
    setTimeout(async () => {
      console.log('\n5. Durdurma bildirimi testi...');
      const shutdownResult = await telegramService.sendShutdownNotification();
      if (shutdownResult) {
        console.log('✅ Durdurma bildirimi gönderildi');
      } else {
        console.log('❌ Durdurma bildirimi gönderilemedi');
      }
      
      telegramService.cleanup();
      console.log('\n🏁 Test tamamlandı. Çıkılıyor...');
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Test sırasında hata oluştu:', error);
    process.exit(1);
  }
}

// Eğer direkt çalıştırılırsa test et
if (require.main === module) {
  testBotFunctionality();
}

export { testBotFunctionality };

import cron from 'node-cron';
import { config } from './config/environment';
import { cacheService } from './services/cache';
import { telegramService } from './services/telegram';
import { startWebServer } from './services/webServer';
import { checkAppointments } from './utils/appointmentChecker';

// Global variables for CRON job management
let cronJob: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * Ana uygulama başlatma fonksiyonu
 */
async function startApplication(): Promise<void> {
  try {
    console.log('🚀 Visa Checker Bot başlatılıyor...');
    console.log('📊 Başlatma adımları:');
    
    // 1. Web server'ı başlat
    console.log('1️⃣ Web server başlatılıyor...');
    startWebServer();
    console.log('✅ Web server başlatıldı');
    
    // 2. Önbellek sistemini başlat
    console.log('2️⃣ Önbellek sistemi başlatılıyor...');
    cacheService.startCleanupInterval();
    console.log('✅ Önbellek sistemi başlatıldı');
    
    // 3. CRON formatını doğrula
    console.log('3️⃣ CRON format kontrolü...');
    console.log(`🔍 CRON pattern: ${config.app.checkInterval}`);
    if (!cron.validate(config.app.checkInterval)) {
      console.error(`❌ Geçersiz CRON formatı: ${config.app.checkInterval}`);
      throw new Error(`Geçersiz CRON formatı: ${config.app.checkInterval}`);
    }
    console.log(`✅ CRON format geçerli`);

    // 4. Telegram botunu başlat (timeout ile)
    console.log('4️⃣ Telegram bot başlatılıyor...');
    try {
      // 30 saniye timeout ile Telegram bot başlat
      await Promise.race([
        telegramService.startBot(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Telegram bot timeout')), 30000)
        )
      ]);
      console.log('✅ Telegram bot başlatıldı');
      
      // 5. Başlangıç bildirimini gönder
      console.log('5️⃣ Başlangıç bildirimi gönderiliyor...');
      const notificationSent = await telegramService.sendStartupNotification();
      if (notificationSent) {
        console.log('✅ Başlangıç bildirimi gönderildi');
      } else {
        console.log('⚠️ Başlangıç bildirimi gönderilemedi ama devam ediliyor');
      }
    } catch (telegramError) {
      const errorMsg = telegramError instanceof Error ? telegramError.message : String(telegramError);
      console.error('⚠️ Telegram bot başlatılamadı:', errorMsg);
      console.log('📋 Telegram olmadan devam ediliyor - CRON job çalışacak...');
    }

    // 6. Zamanlanmış görevi başlat
    console.log('6️⃣ CRON job oluşturuluyor...');
    cronJob = cron.schedule(config.app.checkInterval, async () => {
      if (isRunning) {
        console.log(`⚠️ Önceki kontrol hala çalışıyor, bu kontrol atlanıyor...`);
        return;
      }
      
      isRunning = true;
      const startTime = new Date().toISOString();
      console.log(`\n🔄 ZAMANLANMIŞ KONTROL BAŞLADI - ${startTime}`);
      
      try {
        await checkAppointments();
        const endTime = new Date().toISOString();
        console.log(`✅ ZAMANLANMIŞ KONTROL TAMAMLANDI - ${endTime}\n`);
      } catch (error) {
        const errorTime = new Date().toISOString();
        console.error(`❌ ZAMANLANMIŞ KONTROL HATASI - ${errorTime}:`, error);
        
        // Hata bildirimini gönder ama çökmesini engelle
        try {
          await telegramService.sendErrorNotification('Zamanlanmış kontrol hatası', String(error));
        } catch (notificationError) {
          console.error('Hata bildirimi gönderilemedi:', notificationError);
        }
      } finally {
        isRunning = false;
      }
    }, {
      scheduled: false, // İlk olarak false, sonra start() ile başlatacağız
      timezone: "Europe/Istanbul"
    });
    
    // CRON job'ı başlat
    cronJob.start();
    console.log(`✅ CRON Job başlatıldı ve çalışıyor`);
    
    // 7. Sistem konfigürasyonunu göster
    console.log('\n📊 SİSTEM KONFIGÜRASYONU:');
    console.log(`🎯 Hedef ülke: ${config.app.targetCountry}`);
    console.log(`🏛️ Mission ülkeler: ${config.app.missionCountries.join(', ')}`);
    if (config.app.targetCities.length > 0) {
      console.log(`🏙️ Hedef şehirler: ${config.app.targetCities.join(', ')}`);
    }
    if (config.app.targetSubCategories.length > 0) {
      console.log(`📄 Hedef vize tipleri: ${config.app.targetSubCategories.join(', ')}`);
    }
    console.log(`🐛 Debug modu: ${config.app.debug}`);
    
    // CRON job bilgilerini göster
    const now = new Date();
    console.log(`\n⏰ CRON JOB BİLGİLERİ:`);
    console.log(`   - Pattern: ${config.app.checkInterval}`);
    console.log(`   - Timezone: Europe/Istanbul`);
    console.log(`   - Şu anki zaman: ${now.toISOString()}`);
    
    // Debug için bir sonraki çalıştırma zamanını tahmin et
    if (config.app.checkInterval === "* * * * *") {
      const nextMinute = new Date(now.getTime() + 60000);
      nextMinute.setSeconds(0, 0);
      console.log(`   - Bir sonraki çalışma (tahmini): ${nextMinute.toISOString()}`);
    } else if (config.app.checkInterval.startsWith("*/")) {
      const interval = parseInt(config.app.checkInterval.split("/")[1]);
      const nextRun = new Date(now);
      nextRun.setMinutes(Math.ceil(now.getMinutes() / interval) * interval, 0, 0);
      console.log(`   - Bir sonraki çalışma (tahmini): ${nextRun.toISOString()}`);
    }

    // 8. İlk manuel kontrolü yap
    console.log('\n8️⃣ İlk manuel kontrol başlatılıyor...');
    try {
      await checkAppointments();
      console.log('✅ İlk kontrol tamamlandı');
    } catch (error) {
      console.error('❌ İlk kontrol hatası:', error);
      // İlk kontrol başarısız olsa da sistem çalışmaya devam etsin
    }

    // 9. Sistem monitoring başlat
    console.log('\n9️⃣ Sistem monitoring başlatılıyor...');
    let testCount = 0;
    const maxTests = 3; // İlk 3 test sonra durdur
    
    const testInterval = setInterval(() => {
      testCount++;
      const now = new Date();
      console.log(`\n⏰ Monitoring ${testCount}/${maxTests} - (${now.toISOString()}):`);
      console.log(`   - CRON Pattern: ${config.app.checkInterval}`);
      console.log(`   - İşlem durumu: ${isRunning ? 'Çalışıyor' : 'Beklemede'}`);
      console.log(`   - Uptime: ${Math.floor(process.uptime())} saniye`);
      console.log(`   - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      
      if (testCount >= maxTests) {
        clearInterval(testInterval);
        console.log(`\n✅ İlk monitoring tamamlandı. Sistem çalışmaya devam ediyor...`);
        console.log(`🔥 Visa Checker Bot tamamen hazır!`);
        console.log(`📱 /debug komutu ile manuel test yapabilirsiniz`);
      }
    }, 30000); // Her 30 saniyede test

    // 10. Graceful shutdown handler
    setupGracefulShutdown(cronJob);
    
    console.log('\n🎉 TÜM BAŞLATMA ADIMLAR TAMAMLANDI!');
    console.log('✅ Bot şimdi otomatik olarak randevuları kontrol ediyor...\n');
    
  } catch (error) {
    console.error('\n❌ Uygulama başlatılamadı:', error);
    try {
      await telegramService.sendErrorNotification('Uygulama başlatılamadı', String(error));
    } catch (notificationError) {
      console.error('Başlatma hatası bildirimi gönderilemedi:', notificationError);
    }
    process.exit(1);
  }
}

/**
 * Graceful shutdown işlemlerini ayarlar
 */
function setupGracefulShutdown(cronJob: cron.ScheduledTask | null): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} sinyali alındı. Uygulama kapatılıyor...`);
    
    try {
      // CRON job'ı durdur
      if (cronJob) {
        cronJob.stop();
        console.log('CRON job durduruldu.');
      }
      
      // Shutdown bildirimini gönder
      await telegramService.sendShutdownNotification();
      
      // Telegram servisi temizliği
      telegramService.cleanup();
      
      console.log('Uygulama güvenli şekilde kapatıldı.');
      process.exit(0);
    } catch (error) {
      console.error('Shutdown sırasında hata:', error);
      process.exit(1);
    }
  };

  // Çeşitli shutdown sinyallerini dinle
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR1', () => shutdown('SIGUSR1'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2'));
  
  // Beklenmeyen hatalar için
  process.on('uncaughtException', async (error) => {
    console.error('Beklenmeyen hata:', error);
    try {
      await telegramService.sendErrorNotification('Beklenmeyen hata', error.message);
    } catch (notificationError) {
      console.error('Hata bildirimi gönderilemedi:', notificationError);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('İşlenmemiş Promise reddi:', reason, 'at:', promise);
    try {
      await telegramService.sendErrorNotification('İşlenmemiş Promise reddi', String(reason));
    } catch (notificationError) {
      console.error('Hata bildirimi gönderilemedi:', notificationError);
    }
    process.exit(1);
  });
}

// Uygulamayı başlat
console.log('🔥 Visa Checker Bot başlatılıyor...');
startApplication().catch((error) => {
  console.error('Kritik başlatma hatası:', error);
  process.exit(1);
});
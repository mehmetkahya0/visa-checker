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
    console.log('🚀 Uygulama başlatılıyor...');
    
    // Web server'ı başlat
    startWebServer();
    
    // Telegram botunu başlat
    await telegramService.startBot();
    
    // Önbellek temizleme işlemini başlat
    cacheService.startCleanupInterval();

    // Başlangıç bildirimini gönder
    await telegramService.sendStartupNotification();

    // CRON formatını doğrula
    console.log(`🔍 CRON format kontrolü: ${config.app.checkInterval}`);
    if (!cron.validate(config.app.checkInterval)) {
      console.error(`❌ Geçersiz CRON formatı: ${config.app.checkInterval}`);
      throw new Error(`Geçersiz CRON formatı: ${config.app.checkInterval}`);
    }
    console.log(`✅ CRON format geçerli: ${config.app.checkInterval}`);

    // Zamanlanmış görevi başlat
    console.log(`⏰ CRON job oluşturuluyor...`);
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
    
    // CRON job bilgilerini göster
    const now = new Date();
    console.log(`📊 CRON Job Bilgileri:`);
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
    
    console.log(`🎯 Hedef ülke: ${config.app.targetCountry}`);
    console.log(`🏛️ Hedef ülkeler: ${config.app.missionCountries.join(', ')}`);
    if (config.app.targetCities.length > 0) {
      console.log(`🏙️ Hedef şehirler: ${config.app.targetCities.join(', ')}`);
    }
    if (config.app.targetSubCategories.length > 0) {
      console.log(`📄 Hedef vize tipleri: ${config.app.targetSubCategories.join(', ')}`);
    }
    console.log(`🐛 Debug modu: ${config.app.debug}`);

    // İlk kontrolü yap
    console.log(`🚀 İlk manuel kontrol başlatılıyor...`);
    try {
      await checkAppointments();
      console.log(`✅ İlk kontrol tamamlandı`);
    } catch (error) {
      console.error(`❌ İlk kontrol hatası:`, error);
    }

    // CRON job test ve monitoring
    let testCount = 0;
    const maxTests = 5; // 5 test sonra durdur
    
    const testInterval = setInterval(() => {
      testCount++;
      const now = new Date();
      console.log(`\n⏰ Test ${testCount} - CRON Job Durumu (${now.toISOString()}):`);
      console.log(`   - CRON Pattern: ${config.app.checkInterval}`);
      console.log(`   - Son işlem durumu: ${isRunning ? 'Çalışıyor' : 'Beklemede'}`);
      
      if (testCount >= maxTests) {
        clearInterval(testInterval);
        console.log(`🔄 Test monitoring tamamlandı. CRON job çalışmaya devam ediyor...`);
      }
    }, 30000); // Her 30 saniyede test

    // Graceful shutdown handler
    setupGracefulShutdown(cronJob);
    
  } catch (error) {
    console.error('Uygulama başlatılamadı:', error);
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
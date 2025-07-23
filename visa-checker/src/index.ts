import cron from 'node-cron';
import { config } from './config/environment';
import { cacheService } from './services/cache';
import { telegramService } from './services/telegram';
import { startWebServer } from './services/webServer';
import { checkAppointments } from './utils/appointmentChecker';

/**
 * Ana uygulama başlatma fonksiyonu
 */
async function startApplication(): Promise<void> {
  try {
    // Web server'ı başlat
    startWebServer();
    
    // Telegram botunu başlat
    await telegramService.startBot();
    
    // Önbellek temizleme işlemini başlat
    cacheService.startCleanupInterval();

    // Başlangıç bildirimini gönder
    await telegramService.sendStartupNotification();

    // Zamanlanmış görevi başlat
    cron.schedule(config.app.checkInterval, checkAppointments);
    
    console.log(`Vize randevu kontrolü başlatıldı. Kontrol sıklığı: ${config.app.checkInterval}`);
    console.log(`Hedef ülke: ${config.app.targetCountry}`);
    console.log(`Hedef ülkeler: ${config.app.missionCountries.join(', ')}`);
    if (config.app.targetCities.length > 0) {
      console.log(`Hedef şehirler: ${config.app.targetCities.join(', ')}`);
    }
    if (config.app.targetSubCategories.length > 0) {
      console.log(`Hedef vize tipleri: ${config.app.targetSubCategories.join(', ')}`);
    }

    // İlk kontrolü yap
    void checkAppointments();

    // Graceful shutdown handler
    setupGracefulShutdown();
    
  } catch (error) {
    console.error('Uygulama başlatılamadı:', error);
    await telegramService.sendErrorNotification('Uygulama başlatılamadı', String(error));
    process.exit(1);
  }
}

/**
 * Graceful shutdown işlemlerini ayarlar
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} sinyali alındı. Uygulama kapatılıyor...`);
    
    try {
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
    await telegramService.sendErrorNotification('Beklenmeyen hata', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('İşlenmemiş Promise reddi:', reason, 'at:', promise);
    await telegramService.sendErrorNotification('İşlenmemiş Promise reddi', String(reason));
    process.exit(1);
  });
}

// Uygulamayı başlat
startApplication();
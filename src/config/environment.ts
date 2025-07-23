import dotenv from "dotenv";

dotenv.config();

/**
 * Çevre değişkenleri için tip tanımlamaları
 */
export interface EnvironmentConfig {
  // Telegram ile ilgili yapılandırmalar
  telegram: {
    botToken: string; // Telegram bot token'ı
    channelId: string; // Telegram kanal ID'si
    rateLimit: number; // Dakikada gönderilebilecek maksimum mesaj sayısı
    retryAfter: number; // Rate limit aşıldığında beklenecek süre (ms)
  };
  // Uygulama genel yapılandırmaları
  app: {
    checkInterval: string; // Kontrol sıklığı (cron formatında)
    targetCountry: string; // Kaynak ülke (Turkiye)
    targetCities: string[]; // Takip edilecek şehirler listesi
    missionCountries: string[]; // Hedef ülkeler listesi
    targetSubCategories: string[]; // Takip edilecek subkategoriler listesi
    debug: boolean; // Hata ayıklama modu
  };
  // API ile ilgili yapılandırmalar
  api: {
    visaApiUrl: string; // Vize API'sinin adresi
    maxRetries: number; // Maksimum deneme sayısı
    retryDelayBase: number; // Denemeler arası bekleme süresi (ms)
    restartToken: string; // Web API restart token'ı
  };
  // Önbellek yapılandırmaları
  cache: {
    maxSize: number; // Maksimum önbellek boyutu
    cleanupInterval: number; // Temizleme sıklığı (ms)
  };
}

/**
 * Çevre değişkenlerini doğrular ve yapılandırma nesnesini oluşturur
 * @returns Doğrulanmış yapılandırma nesnesi
 * @throws Eksik veya hatalı yapılandırma durumunda hata fırlatır
 */
function validateEnvironment(): EnvironmentConfig {
  // Zorunlu çevre değişkenlerini kontrol et
  const requiredEnvVars = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  };

  // Eksik değişkenleri bul
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  // Eksik değişken varsa hata fırlat
  if (missingVars.length > 0) {
    console.error(`Eksik çevre değişkenleri: ${missingVars.join(", ")}`);
    process.exit(1);
  }

  // Telegram kanal ID'sini doğrula
  const channelId = process.env.TELEGRAM_CHAT_ID;
  if (!channelId || !/^-?\d+$/.test(channelId)) {
    console.error("Geçersiz TELEGRAM_CHAT_ID formatı");
    process.exit(1);
  }

  // Şehirleri virgülle ayrılmış listeden diziye çevir
  const cities = process.env.CITIES
    ? process.env.CITIES.split(",").map((city) => city.trim())
    : [];

  // Hedef ülkeleri virgülle ayrılmış listeden diziye çevir
  const missionCountries = process.env.MISSION_COUNTRY
    ? process.env.MISSION_COUNTRY.split(",")
        .map((country) => country.trim().toLowerCase())
        .filter((country) => country.length > 0)
    : ["grc"];

  // Debug logging for mission countries
  console.log(`🔍 Environment Debug - MISSION_COUNTRY env var: "${process.env.MISSION_COUNTRY}"`);
  console.log(`🔍 Environment Debug - Parsed mission countries: [${missionCountries.join(', ')}]`);

  // Parse subcategories from env
  const subCategories = process.env.VISA_SUBCATEGORIES
    ? process.env.VISA_SUBCATEGORIES.split(",").map((cat) => cat.trim())
    : [];

  // Validate CRON format
  const checkInterval = process.env.CHECK_INTERVAL || "*/5 * * * *";
  console.log(`🔍 Environment Debug - CHECK_INTERVAL: "${checkInterval}"`);

  // Yapılandırma nesnesini oluştur ve döndür
  return {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN as string,
      channelId,
      rateLimit: Number(process.env.TELEGRAM_RATE_LIMIT_MINUTES) || 15,
      retryAfter: Number(process.env.TELEGRAM_RETRY_AFTER) || 5000,
    },
    app: {
      checkInterval: checkInterval,
      // The target country should be a lower-case country code (e.g., "tur", "gbr"). Defaults to "tur".
      // Convert "tr" to "tur" for Turkey
      targetCountry: (process.env.TARGET_COUNTRY?.toLowerCase() === "tr" ? "tur" : process.env.TARGET_COUNTRY?.toLowerCase()) || "tur",
      targetCities: cities,
      missionCountries,
      targetSubCategories: subCategories,
      debug: process.env.DEBUG === "true",
    },
    api: {
      visaApiUrl:
        process.env.VISA_API_URL || "https://api.visasbot.com/api/visa/list",
      maxRetries: Number(process.env.MAX_RETRIES) || 3,
      retryDelayBase: Number(process.env.RETRY_DELAY_BASE) || 1000,
      restartToken: process.env.RESTART_TOKEN || "default-restart-token",
    },
    cache: {
      maxSize: Number(process.env.MAX_CACHE_SIZE) || 1000,
      cleanupInterval:
        Number(process.env.CACHE_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000,
    },
  };
}

// Yapılandırma nesnesini oluştur ve dışa aktar
export const config = validateEnvironment();

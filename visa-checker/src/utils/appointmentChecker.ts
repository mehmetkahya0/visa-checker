import type { VisaAppointment } from "../types";
import { config } from "../config/environment";
import { fetchAppointments } from "../services/api";
import { cacheService } from "../services/cache";
import { telegramService } from "../services/telegram";
import { extractCity } from "./cityExtractor";

/**
 * Ana kontrol fonksiyonu
 * Yeni randevuları kontrol eder ve uygun olanları Telegram'a gönderir
 */
export async function checkAppointments(): Promise<void> {
  const startTime = new Date().toISOString();
  console.log(`\n🔍 RANDEVU KONTROLÜ BAŞLADI - ${startTime}`);
  console.log(`📊 Kontrol parametreleri:`);
  console.log(`   - Hedef ülke: ${config.app.targetCountry}`);
  console.log(`   - Hedef şehirler: ${config.app.targetCities.length > 0 ? config.app.targetCities.join(', ') : 'Tümü'}`);
  console.log(`   - Hedef mission ülkeler: ${config.app.missionCountries.join(', ')}`);
  console.log(`   - Hedef vize tipleri: ${config.app.targetSubCategories.length > 0 ? config.app.targetSubCategories.join(', ') : 'Tümü'}`);
  console.log(`   - Debug modu: ${config.app.debug}`);
  
  try {
    console.log(`📡 API'den randevular çekiliyor...`);
    const appointments = await fetchAppointments();

    if (appointments.length === 0) {
      console.log("⚠️ Randevu bulunamadı veya bir hata oluştu");
      // Deneme bildirimi gönder (bildirimler açıksa)
      await telegramService.sendCheckResult(0, 0);
      return;
    }

    console.log(`📋 ${appointments.length} randevu kontrol ediliyor...`);
    
    let validAppointmentsCount = 0;
    let newAppointmentsCount = 0;

    for (const appointment of appointments) {
      // First, check if the appointment is valid based on configured filters
      if (!isAppointmentValid(appointment)) continue;
      
      validAppointmentsCount++;

      // Create a unique key for the appointment using its ID
      const appointmentKey = cacheService.createKey(appointment);

      // Debug modunda tüm randevuları göster
      if (config.app.debug) {
        console.log(
          `Geçerli randevu bulundu (ID: ${appointment.id}): ${appointment.center}, Durum: ${appointment.status}, Son Kontrol: ${appointment.last_checked_at}`
        );
      }

      // Check if this appointment ID has already been sent (is in cache)
      if (!cacheService.has(appointmentKey)) {
        if (config.app.debug) {
          console.log(
            `Randevu (ID: ${appointment.id}) önbellekte yok. İşleniyor...`
          );
        }
        await processNewAppointment(appointment, appointmentKey);
        newAppointmentsCount++;
      } else if (config.app.debug) {
        console.log(
          `Randevu (ID: ${appointment.id}) zaten önbellekte. Atlanıyor.`
        );
      }
    }

    // Kontrol sonucunu bildir (bildirimler açıksa)
    await telegramService.sendCheckResult(appointments.length, validAppointmentsCount);
    
    const endTime = new Date().toISOString();
    if (newAppointmentsCount > 0) {
      console.log(`✅ ${newAppointmentsCount} yeni randevu bildirimi gönderildi`);
    } else {
      console.log(`ℹ️ Yeni randevu bulunamadı. Toplam kontrol edilen: ${appointments.length}, Geçerli: ${validAppointmentsCount}`);
    }
    console.log(`⏱️ RANDEVU KONTROLÜ TAMAMLANDI - ${endTime}\n`);
    
  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`❌ RANDEVU KONTROLÜ HATASI - ${errorTime}:`, error);
    
    // Kritik hataları Telegram'a bildir
    try {
      if (error instanceof Error) {
        await telegramService.sendErrorNotification(
          'Randevu kontrolü hatası',
          `${error.message}\n\nStack: ${error.stack?.substring(0, 500) || 'Yok'}`
        );
      } else {
        await telegramService.sendErrorNotification(
          'Randevu kontrolü hatası',
          String(error)
        );
      }
    } catch (notificationError) {
      console.error('Hata bildirimi gönderilemedi:', notificationError);
    }
  }
}

/**
 * Randevunun geçerli olup olmadığını kontrol eder
 * @param appointment Kontrol edilecek randevu
 * @returns Randevu geçerli ise true, değilse false
 */
function isAppointmentValid(appointment: VisaAppointment): boolean {
  // Only check appointments with 'open' or 'waitlist_open' status
  if (appointment.status !== "open" && appointment.status !== "waitlist_open") {
    if (config.app.debug) {
      console.log(
        `Skipping appointment ID ${appointment.id} due to status: ${appointment.status}`
      );
    }
    return false;
  }

  // Filter by target source country code (e.g., 'tur')
  // Note: The config still uses targetCountry which might be a full name like 'Turkiye'
  // We should ideally compare country codes directly if TARGET_COUNTRY env var is set to a code like 'tur'
  // For now, assuming country_code matches or TARGET_COUNTRY needs adjustment.
  // Example check (adjust if TARGET_COUNTRY is not a code):
  if (
    config.app.targetCountry.toLowerCase() !== "all" && // Add ability to check all source countries
    appointment.country_code.toLowerCase() !==
      config.app.targetCountry.toLowerCase()
  ) {
    if (config.app.debug) {
      console.log(
        `Skipping appointment ID ${appointment.id}: Source country ${appointment.country_code} doesn't match target ${config.app.targetCountry}`
      );
    }
    return false;
  }

  // Filter by target mission country codes (e.g., ['nld', 'fra'])
  if (
    !config.app.missionCountries.some(
      (code) => code.toLowerCase() === appointment.mission_code.toLowerCase()
    )
  ) {
    if (config.app.debug) {
      console.log(
        `Skipping appointment ID ${appointment.id}: Mission country ${
          appointment.mission_code
        } not in target list [${config.app.missionCountries.join(", ")}]`
      );
    }
    return false;
  }

  // If target cities are specified, filter by city extracted from center name
  if (config.app.targetCities.length > 0) {
    const appointmentCity = extractCity(appointment.center); // Use 'center' field
    const cityMatch = config.app.targetCities.some((city) =>
      appointmentCity.toLowerCase().includes(city.toLowerCase())
    );
    if (!cityMatch) {
      if (config.app.debug) {
        console.log(
          `Skipping appointment ID ${
            appointment.id
          }: City ${appointmentCity} not in target list [${config.app.targetCities.join(
            ", "
          )}]`
        );
      }
      return false;
    }
  }

  // If target visa types (subcategories) are specified, filter by visa_type
  if (config.app.targetSubCategories.length > 0) {
    // Check if appointment.visa_type exists and is a string before calling toLowerCase()
    const visaType = appointment.visa_type || "";
    const subCategoryMatch = config.app.targetSubCategories.some(
      (subCategory) =>
        visaType.toLowerCase().includes(subCategory.toLowerCase())
    );
    if (!subCategoryMatch) {
      if (config.app.debug) {
        console.log(
          `Skipping appointment ID ${
            appointment.id
          }: Visa type "${visaType}" not in target list [${config.app.targetSubCategories.join(
            ", "
          )}]`
        );
      }
      return false;
    }
  }

  // If all checks pass, the appointment is valid
  return true;
}

/**
 * Yeni randevuyu işler ve Telegram'a gönderir
 * @param appointment İşlenecek randevu
 * @param appointmentKey Randevu için önbellek anahtarı
 */
async function processNewAppointment(
  appointment: VisaAppointment,
  appointmentKey: string
): Promise<void> {
  cacheService.set(appointmentKey);

  console.log(
    `Yeni randevu bildirimi gönderiliyor: ID ${appointment.id} - ${appointment.center}`
  );
  const success = await telegramService.sendNotification(appointment);
  if (success) {
    console.log(`Bildirim başarıyla gönderildi: ID ${appointment.id}`);
  } else {
    // Hata durumunda önbellekten sil ve bir sonraki kontrolde tekrar dene
    console.error(
      `Bildirim gönderilemedi: ID ${appointment.id}. Önbellekten siliniyor.`
    );
    cacheService.delete(appointmentKey);
  }
}

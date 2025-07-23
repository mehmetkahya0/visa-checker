/**
 * Randevu bilgilerini içeren tip tanımı
 */
export interface VisaAppointment {
  id: number;
  tracking_count: number;
  country_code: string; // Kaynak ülke kodu (örn: tur)
  mission_code: string; // Hedef ülke kodu (örn: nld)
  visa_category: string; // Vize kategorisi
  visa_type: string; // Vize tipi
  center: string; // Merkez adı
  status: string; // Durum (örn: open, closed, waitlist_open, waitlist_closed)
  last_checked_at: string; // Son kontrol tarihi (ISO 8601 formatında)
  last_open_at?: string; // Son açılma tarihi (varsa, ISO 8601 formatında)
  last_available_date?: string; // Son müsait tarih (varsa, GG/AA/YYYY formatında)
}

/**
 * Önbellek için tip tanımı
 * Anahtar: Randevu ID'si
 * Değer: Gönderildi bilgisi (boolean)
 */
export interface AppointmentCache {
  [key: string]: { timestamp: number }; // key: appointment ID, value: object with timestamp
}

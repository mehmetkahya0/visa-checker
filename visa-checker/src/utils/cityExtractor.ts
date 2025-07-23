/**
 * Merkez adından şehir ismini çıkarır
 * Örnekler:
 * "Netherlands Visa Application Centre - Antalya" -> "Antalya"
 * "Bulgaria Visa Application Center, Ankara" -> "Ankara"
 * "Netherlands Visa application center- Dubai" -> "Dubai"
 * @param centerName Merkez adı
 * @returns Şehir ismi veya orijinal merkez adı (eşleşme yoksa)
 */
export function extractCity(centerName: string): string {
  // Tire veya virgülle ayrılmış son kelime grubunu yakala
  // Allows spaces in the city name
  const match = centerName.match(/(?:-|\s*,\s*)\s*([^-,]+)$/);
  return match ? match[1].trim() : centerName;
}

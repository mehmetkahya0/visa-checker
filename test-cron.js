const cron = require('node-cron');

// Test different CRON formats
const testFormats = [
  "* * * * *",     // Her dakika
  "*/2 * * * *",   // Her 2 dakika  
  "*/5 * * * *",   // Her 5 dakika
  "0 * * * *",     // Her saat başı
  "1",             // Geçersiz format
  "",              // Boş format
];

console.log("🧪 CRON Format Test Başlıyor...\n");

testFormats.forEach((format, index) => {
  console.log(`Test ${index + 1}: "${format}"`);
  
  try {
    const isValid = cron.validate(format);
    console.log(`✅ Geçerli: ${isValid}`);
    
    if (isValid) {
      console.log(`🔄 Test zamanlaması oluşturuluyor...`);
      const task = cron.schedule(format, () => {
        console.log(`⏰ CRON çalıştı: ${new Date().toISOString()}`);
      }, { scheduled: false });
      
      console.log(`📋 Task oluşturuldu: ${task.getStatus ? task.getStatus() : 'OK'}`);
      task.destroy();
    }
  } catch (error) {
    console.log(`❌ Hata: ${error.message}`);
  }
  
  console.log('---\n');
});

// Gerçek zamanlı test - her dakika çalışacak
console.log("🚀 Gerçek zamanlı test başlatılıyor (her dakika)...");
const testJob = cron.schedule('* * * * *', () => {
  console.log(`🎯 Test CRON çalıştı: ${new Date().toISOString()}`);
}, { scheduled: true });

console.log("✅ Test job başlatıldı. 2 dakika bekleyip kapanacak...");

setTimeout(() => {
  testJob.stop();
  console.log("🛑 Test tamamlandı.");
  process.exit(0);
}, 120000); // 2 dakika

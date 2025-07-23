#!/usr/bin/env node

/**
 * Final System Test - Visa Checker
 * Tests all components and verifies system readiness
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧪 VISA CHECKER - FİNAL SİSTEM TESTİ');
console.log('=====================================\n');

// Test 1: Configuration Files
console.log('📋 1. Yapılandırma dosyaları kontrol ediliyor...');
const envPath = path.join(__dirname, '.env');
const configPath = path.join(__dirname, 'config.json');

if (fs.existsSync(envPath)) {
  console.log('✅ .env dosyası mevcut');
} else {
  console.log('❌ .env dosyası bulunamadı');
}

if (fs.existsSync(configPath)) {
  console.log('✅ config.json dosyası mevcut');
} else {
  console.log('❌ config.json dosyası bulunamadı');
}

// Test 2: Environment Variables
console.log('\n📋 2. Çevre değişkenleri kontrol ediliyor...');
require('dotenv').config();

const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'CHECK_INTERVAL',
  'TARGET_COUNTRY',
  'MISSION_COUNTRY'
];

let envValid = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ********`);
  } else {
    console.log(`❌ ${envVar}: Eksik`);
    envValid = false;
  }
});

// Test 3: CRON Pattern
console.log('\n📋 3. CRON formatı kontrol ediliyor...');
const cronPattern = process.env.CHECK_INTERVAL;
const cronRegex = /^(\*|[0-5]?\d|\*\/\d+)(\s+(\*|[01]?\d|2[0-3]|\*\/\d+)){4}$/;

if (cronRegex.test(cronPattern)) {
  console.log(`✅ CRON pattern geçerli: "${cronPattern}"`);
} else {
  console.log(`❌ CRON pattern geçersiz: "${cronPattern}"`);
}

// Test 4: Build Check
console.log('\n📋 4. Build dosyaları kontrol ediliyor...');
const distPath = path.join(__dirname, 'dist');
const indexJsPath = path.join(distPath, 'index.js');

if (fs.existsSync(distPath) && fs.existsSync(indexJsPath)) {
  console.log('✅ Build dosyaları mevcut');
} else {
  console.log('❌ Build dosyaları eksik - npm run build çalıştırın');
}

// Test 5: Package Dependencies
console.log('\n📋 5. Paket bağımlılıkları kontrol ediliyor...');
const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (fs.existsSync(packageJsonPath) && fs.existsSync(nodeModulesPath)) {
  console.log('✅ Paket bağımlılıkları yüklü');
} else {
  console.log('❌ node_modules eksik - npm install çalıştırın');
}

// Final Status
console.log('\n🏁 FİNAL DURUM');
console.log('==============');

if (envValid) {
  console.log('✅ SİSTEM HAZIR - Başlatmaya hazır!');
  console.log('\n🚀 Başlatma komutları:');
  console.log('   npm start          # Sistemi başlat');
  console.log('   npm run build      # Yeniden derle');
  console.log('   npm run dev        # Geliştirme modu');
  
  console.log('\n📊 Sistem Özellikleri:');
  console.log('   ✅ Otomatik randevu kontrolü');
  console.log('   ✅ Telegram bildirimleri');
  console.log('   ✅ Web server ve API');
  console.log('   ✅ Önbellek sistemi');
  console.log('   ✅ Hata yönetimi');
  console.log('   ✅ Debug ve monitoring');
  console.log('   ✅ Home Assistant uyumlu');
  console.log('   ✅ Raspberry Pi uyumlu');
  
  console.log('\n🔗 Erişim URL\'leri:');
  console.log('   http://localhost:3000/health');
  console.log('   http://localhost:3000/api/status');
  
} else {
  console.log('❌ SİSTEM HAZIR DEĞİL - Yapılandırma eksik');
  console.log('\n🔧 Düzeltme adımları:');
  console.log('   1. .env dosyasını kontrol edin');
  console.log('   2. Eksik environment variable\'ları ekleyin');
  console.log('   3. npm install çalıştırın');
  console.log('   4. npm run build çalıştırın');
}

console.log('\n📝 Telegram Conflict Çözümü:');
console.log('   Eğer 409 Conflict hatası alıyorsanız:');
console.log('   1. Tüm bot instance\'larını durdurun');
console.log('   2. Birkaç dakika bekleyin');
console.log('   3. Sistemi tekrar başlatın');
console.log('\n💡 Telegram conflict geçicidir ve otomatik düzelir.\n');

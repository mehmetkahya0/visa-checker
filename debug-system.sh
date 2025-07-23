#!/bin/bash

echo "🔍 Visa Checker Debug Scripti"
echo "============================="
echo ""

echo "📅 Sistem Zamanı:"
date
echo ""

echo "🌍 Zaman Dilimi:"
timedatectl 2>/dev/null || echo "$(date '+%Z %z')"
echo ""

echo "🔄 Node.js Versiyonu:"
node --version
echo ""

echo "📦 NPM Packages (cron ile ilgili):"
npm list | grep -i cron || echo "Cron paketi bulunamadı"
echo ""

echo "🐳 Docker Konteyner Durumu:"
if [ -f /.dockerenv ]; then
    echo "✅ Docker konteyner içinde çalışıyor"
    echo "Konteyner ID: $(cat /proc/self/cgroup | head -1 | cut -d/ -f3)"
else
    echo "❌ Docker konteyner dışında çalışıyor"
fi
echo ""

echo "📊 Sistem Kaynakları:"
echo "CPU: $(nproc) core"
echo "Memory: $(free -h 2>/dev/null | grep Mem | awk '{print $2}' || echo 'Bilinmiyor')"
echo ""

echo "🔧 Environment Variables (Visa Checker):"
env | grep -E "(CHECK_INTERVAL|TELEGRAM|VISA|DEBUG)" | sort
echo ""

echo "📝 Son 20 Log Satırı (eğer varsa):"
if [ -f "/var/log/visa-checker.log" ]; then
    tail -20 /var/log/visa-checker.log
elif [ -f "./logs/app.log" ]; then
    tail -20 ./logs/app.log
else
    echo "Log dosyası bulunamadı"
fi
echo ""

echo "🏃 Çalışan Processes:"
ps aux | grep -E "(node|visa|cron)" | grep -v grep || echo "İlgili process bulunamadı"
echo ""

echo "Debug scripti tamamlandı ✅"

#!/bin/bash

# Home Assistant Add-on Build Script
echo "🔨 Building Visa Checker Home Assistant Add-on..."

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[STEP]${NC} $1"; }
print_note() { echo -e "${BLUE}[NOTE]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Gerekli dosyaları kontrol et
print_step "Dosyaları kontrol ediliyor..."

if [ ! -f "visa-checker/Dockerfile" ]; then
    print_error "visa-checker/Dockerfile bulunamadı!"
    exit 1
fi

if [ ! -f "visa-checker/config.yaml" ]; then
    print_error "visa-checker/config.yaml bulunamadı!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_error "package.json bulunamadı!"
    exit 1
fi

# Docker build test
print_step "Docker image build test..."

# Test için basit Dockerfile oluştur
cat > visa-checker/Dockerfile.test << 'EOF'
FROM homeassistant/aarch64-base:latest

# Install dependencies
RUN apk add --no-cache nodejs npm jq curl

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build
RUN npm install && npm run build

# Copy run script
COPY visa-checker/run.sh /run.sh
RUN chmod +x /run.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["/run.sh"]
EOF

# Test build
print_step "Test build başlatılıyor..."
if docker build -f visa-checker/Dockerfile.test -t visa-checker-test .; then
    print_step "✅ Build başarılı!"
    
    # Test çalıştırma
    print_note "Test container çalıştırılıyor..."
    
    # .env.test dosyası oluştur
    cat > .env.test << 'EOF'
TELEGRAM_BOT_TOKEN=test_token
TELEGRAM_CHANNEL_ID=-100123456789
CHECK_INTERVAL=*/5 * * * *
TARGET_COUNTRY=tr
MISSION_COUNTRY=de,nl
DEBUG=true
NODE_ENV=production
PORT=3000
EOF

    # Test container çalıştır
    docker run -d --name visa-checker-test \
        --env-file .env.test \
        -p 3001:3000 \
        visa-checker-test
    
    print_note "Test container başlatıldı (port 3001)"
    print_note "Test URL: http://localhost:3001/health"
    
    # 10 saniye bekle ve health check yap
    sleep 10
    
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_step "✅ Health check başarılı!"
        print_step "✅ Add-on build ready!"
    else
        print_warn "Health check başarısız - konteyner loglarını kontrol edin"
        docker logs visa-checker-test
    fi
    
    # Cleanup
    print_note "Test container temizleniyor..."
    docker stop visa-checker-test > /dev/null 2>&1
    docker rm visa-checker-test > /dev/null 2>&1
    docker rmi visa-checker-test > /dev/null 2>&1
    rm -f .env.test visa-checker/Dockerfile.test
    
else
    print_error "❌ Build başarısız!"
    print_error "Docker build hatası oluştu"
    exit 1
fi

print_step "🎉 Add-on hazır!"
echo ""
print_note "Sonraki adımlar:"
echo "1. git add . && git commit -m 'fix: Update add-on configuration' && git push"
echo "2. Home Assistant'ta repository'yi yenileyin"
echo "3. Add-on'u tekrar kurmayı deneyin"
echo ""
print_warn "Not: İlk kurulumda build biraz zaman alabilir"

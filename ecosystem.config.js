module.exports = {
  apps: [{
    name: 'visa-checker',
    script: './dist/index.js',
    cwd: '/home/pi/visa-checker',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production'
    },
    // Log ayarları
    log_file: '~/.pm2/logs/visa-checker.log',
    out_file: '~/.pm2/logs/visa-checker-out.log',
    error_file: '~/.pm2/logs/visa-checker-error.log',
    time: true,
    
    // Restart stratejisi
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Cron restart (her gün saat 4'te)
    cron_restart: '0 4 * * *',
    
    // Monitoring
    pmx: true,
    
    // Memory ve CPU limitleri
    max_memory_restart: '150M',
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Health check
    health_check_grace_period: 3000,
    
    // Environment variables file
    env_file: '.env'
  }]
};

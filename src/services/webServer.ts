import express, { Request, Response, NextFunction } from 'express';
import { telegramService } from './telegram';
import { cacheService } from './cache';
import { config } from '../config/environment';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Status endpoint for Home Assistant
app.get('/api/status', (req: Request, res: Response) => {
  const cacheStats = cacheService.getStats();
  
  res.json({
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    config: {
      checkInterval: config.app.checkInterval,
      targetCountry: config.app.targetCountry,
      missionCountries: config.app.missionCountries,
      targetCities: config.app.targetCities,
      debug: config.app.debug
    },
    cache: {
      size: cacheStats.size,
      maxSize: config.cache.maxSize
    },
    telegram: {
      rateLimit: config.telegram.rateLimit,
      messageCount: (telegramService as any).messageCount || 0
    },
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      total: process.memoryUsage().heapTotal / 1024 / 1024 // MB
    }
  });
});

// Manual search endpoint
app.post('/api/search', async (req: Request, res: Response) => {
  try {
    const { fetchAppointments } = await import('./api');
    const appointments = await fetchAppointments();
    
    res.json({
      success: true,
      count: appointments?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Cache stats endpoint
app.get('/api/cache', (req: Request, res: Response) => {
  const stats = cacheService.getStats();
  res.json(stats);
});

// Restart endpoint (with basic auth)
app.post('/api/restart', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${config.api.restartToken}`;
  
  if (authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({ message: 'Restart initiated' });
  
  // Graceful restart
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start server
export function startWebServer() {
  app.listen(PORT, () => {
    console.log(`🌐 Web server started on port ${PORT}`);
    console.log(`📊 Status API: http://localhost:${PORT}/api/status`);
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  });
}

export { app };

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './src/routes/auth';
import eventsRouter from './src/routes/events';
import organizerRouter from './src/routes/organizer';
import reservationsRouter from './src/routes/reservations';
import paymentsRouter from './src/routes/payments';
import ordersRouter from './src/routes/orders';
import analyticsRouter from './src/routes/analytics';
import adminRouter from './src/routes/admin';
import systemRouter from './src/routes/system';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in dev
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API ${req.method}] ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/organizer', organizerRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/organizer/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/system', systemRouter);

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'TicketNest API Engine',
    timestamp: new Date().toISOString(),
  });
});

// Vite Middleware for Development / Static files for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TicketNest Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

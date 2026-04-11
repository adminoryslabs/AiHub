// Punto de entrada de la API Express de AI Hub
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { errorHandler } from './middleware/error-handler';
import { authenticateAdmin } from './middleware/auth';
import { setupMeilisearchIndex } from './services/meilisearch';

// Rutas públicas
import healthRouter from './routes/public/health';
import articlesRouter from './routes/public/articles';
import categoriesRouter from './routes/public/categories';
import featuredRouter from './routes/public/featured';
import searchRouter from './routes/public/search';
import sitemapRouter from './routes/public/sitemap';

// Rutas admin
import authRouter from './routes/admin/auth';
import adminArticlesRouter from './routes/admin/articles';
import resourcesRouter from './routes/admin/resources';
import imagesRouter from './routes/admin/images';

// Configuración del logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export function createApp() {
  const app = express();

  // Middleware global
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS: en desarrollo permite cualquier localhost; en producción usa CORS_ORIGIN
  const corsOrigin =
    process.env.NODE_ENV === 'development'
      ? (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
          // Permite cualquier origen localhost en desarrollo (puerto variable)
          if (!origin || origin.startsWith('http://localhost')) {
            cb(null, true);
          } else {
            cb(new Error('No permitido por CORS'));
          }
        }
      : process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.use(cors({ origin: corsOrigin, credentials: true }));

  // Logger HTTP (solo si no estamos en tests)
  if (process.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }

  // Rutas públicas
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/articles', articlesRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/featured', featuredRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/sitemap', sitemapRouter);

  // Login admin (sin autenticación previa)
  app.use('/api/v1/admin/auth', authRouter);

  // Rutas admin protegidas con JWT
  app.use('/api/v1/admin/articles', authenticateAdmin, adminArticlesRouter);
  app.use('/api/v1/admin/resources', authenticateAdmin, resourcesRouter);
  app.use('/api/v1/admin/images', authenticateAdmin, imagesRouter);

  // Handler de errores (debe ser el último middleware)
  app.use(errorHandler);

  return app;
}

// Iniciar servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  const app = createApp();

  app.listen(PORT, async () => {
    logger.info({ port: PORT }, 'Servidor AI Hub API iniciado');

    // Configurar índice de Meilisearch al arrancar
    try {
      await setupMeilisearchIndex();
      logger.info('Índice de Meilisearch configurado');
    } catch (err) {
      // No es fatal — la API funciona sin búsqueda
      logger.warn({ err }, 'No se pudo configurar Meilisearch (la búsqueda no funcionará)');
    }
  });
}

export default createApp;

// Configuración global para los tests
import { closePool } from '../src/services/db';

// Configurar variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL_TEST = 'postgresql://fcp_user:fcp_password@localhost:5432/aihub_test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '24h';
process.env.MEILISEARCH_HOST = 'http://localhost:7700';
process.env.MEILISEARCH_API_KEY = '';

// Cerrar el pool de DB al terminar todos los tests
afterAll(async () => {
  await closePool();
});

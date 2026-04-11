// Servicio de base de datos: pool de conexiones PostgreSQL
import { Pool } from 'pg';

// Pool singleton para reutilizar conexiones
let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.NODE_ENV === 'test'
        ? process.env.DATABASE_URL_TEST
        : process.env.DATABASE_URL;

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      // En producción, usar logger en vez de console
      process.stderr.write(`Error inesperado en pool de DB: ${err.message}\n`);
    });
  }
  return pool;
}

// Verificar conectividad con la base de datos
export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

// Cerrar el pool (útil para tests)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined as unknown as Pool;
  }
}

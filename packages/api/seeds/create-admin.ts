// Script para crear el usuario admin inicial
// Uso: tsx seeds/create-admin.ts
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

async function createAdminUser() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const email = process.env.ADMIN_EMAIL || 'admin@aihub.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  // Hashear contraseña con bcrypt (coste 12)
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO admin_users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [email, passwordHash]
  );

  process.stdout.write(`Usuario admin creado: ${email}\n`);
  await pool.end();
}

createAdminUser().catch((err) => {
  process.stderr.write(`Error creando admin: ${err.message}\n`);
  process.exit(1);
});

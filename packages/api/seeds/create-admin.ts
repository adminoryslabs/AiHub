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

  const roleResult = await pool.query(
    `SELECT id FROM roles WHERE slug = 'superadmin'`
  );

  if (roleResult.rows.length === 0) {
    throw new Error('El rol superadmin no existe. Ejecuta primero las migraciones.');
  }

  const roleId = roleResult.rows[0].id;

  await pool.query(
    `INSERT INTO users (email, password_hash, role_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role_id = EXCLUDED.role_id,
       is_active = true`,
    [email, passwordHash, roleId]
  );

  process.stdout.write(`Usuario admin creado: ${email}\n`);
  await pool.end();
}

createAdminUser().catch((err) => {
  process.stderr.write(`Error creando admin: ${err.message}\n`);
  process.exit(1);
});

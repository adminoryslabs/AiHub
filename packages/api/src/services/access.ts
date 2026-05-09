import { getPool } from './db';

export interface AuthUser {
  id: string;
  email: string;
  role: {
    id: string;
    slug: string;
    name: string;
  };
  permissions: string[];
}

function mapAuthUser(row: {
  id: string;
  email: string;
  role_id: string;
  role_slug: string;
  role_name: string;
  permissions: string[] | null;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: {
      id: row.role_id,
      slug: row.role_slug,
      name: row.role_name,
    },
    permissions: row.permissions ?? [],
  };
}

export async function getUserAuthByEmail(email: string): Promise<{
  id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  role_id: string;
  role_slug: string;
  role_name: string;
  permissions: string[];
} | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
      u.id,
      u.email,
      u.password_hash,
      u.is_active,
      r.id AS role_id,
      r.slug AS role_slug,
      r.name AS role_name,
      COALESCE(array_agg(p.key) FILTER (WHERE p.key IS NOT NULL), '{}') AS permissions
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE u.email = $1
    GROUP BY u.id, u.email, u.password_hash, u.is_active, r.id, r.slug, r.name`,
    [email]
  );

  return result.rows[0] || null;
}

export async function getUserSessionById(userId: string): Promise<AuthUser | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
      u.id,
      u.email,
      u.is_active,
      r.id AS role_id,
      r.slug AS role_slug,
      r.name AS role_name,
      COALESCE(array_agg(p.key) FILTER (WHERE p.key IS NOT NULL), '{}') AS permissions
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = $1 AND u.is_active = true
    GROUP BY u.id, u.email, u.is_active, r.id, r.slug, r.name`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAuthUser(result.rows[0]);
}

export function buildSessionPayload(user: AuthUser) {
  return {
    userId: user.id,
    email: user.email,
    role: {
      id: user.role.id,
      slug: user.role.slug,
      name: user.role.name,
    },
    permissions: user.permissions,
  };
}

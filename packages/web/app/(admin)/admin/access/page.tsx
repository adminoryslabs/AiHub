'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminSession, listAccessRoles, listAccessUsers, updateAccessRolePermissions, updateAccessUserRole } from '@/lib/admin-api-client';
import { getSession, saveSession } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

type AccessTab = 'users' | 'roles';

interface AccessUser {
  id: string;
  email: string;
  is_active?: boolean;
  created_at: string;
  role?: {
    id: string;
    slug: string;
    name: string;
  };
}

interface AccessRole {
  id: string;
  slug: string;
  name: string;
  is_system?: boolean;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  'article.create',
  'article.edit',
  'article.review',
  'article.publish',
  'article.delete',
  'resource.manage',
  'image.upload',
  'access.manage',
];

export default function AccessPage() {
  const session = useMemo(() => getSession(), []);
  const [tab, setTab] = useState<AccessTab>('users');
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [usersRes, rolesRes] = await Promise.all([listAccessUsers(), listAccessRoles()]);
      setUsers(usersRes.data as AccessUser[]);
      setRoles(rolesRes.data as AccessRole[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la administración de accesos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  async function refreshOwnSession() {
    try {
      const current = await getAdminSession();
      saveSession(current);
    } catch {
      // El layout ya manejará una sesión inválida en la siguiente navegación.
    }
  }

  function showMessage(nextMessage: string) {
    setMessage(nextMessage);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleRoleChange(userId: string, roleId: string) {
    setSaving(true);
    try {
      await updateAccessUserRole(userId, roleId);
      await loadData();
      await refreshOwnSession();
      showMessage('Rol actualizado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el rol');
    } finally {
      setSaving(false);
    }
  }

  async function handlePermissionToggle(role: AccessRole, permission: string) {
    const nextPermissions = role.permissions.includes(permission)
      ? role.permissions.filter((item) => item !== permission)
      : [...role.permissions, permission].sort();

    setSaving(true);
    try {
      await updateAccessRolePermissions(role.id, nextPermissions);
      await loadData();
      await refreshOwnSession();
      showMessage(`Permisos del rol ${role.name} actualizados`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar los permisos');
    } finally {
      setSaving(false);
    }
  }

  if (!session?.permissions.includes('access.manage')) {
    return (
      <div className="p-8">
        <h1 className="font-orys-sans text-2xl font-bold text-orys-fg mb-2">Accesos</h1>
        <p className="text-sm text-orys-fail">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orys-sans text-2xl font-bold text-orys-fg">Accesos</h1>
          <p className="text-sm text-orys-fg-dim mt-1">
            Administra roles y permisos del panel interno.
          </p>
        </div>
        {message && <span className="text-sm text-orys-ok bg-orys-ok-soft px-3 py-1 rounded-full">{message}</span>}
      </div>

      <div className="flex gap-2 border-b border-orys-line">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-3 text-sm font-medium rounded-t-orys-md border-b-2 ${tab === 'users' ? 'border-orys-accent text-orys-accent' : 'border-transparent text-orys-fg-dim'}`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setTab('roles')}
          className={`px-4 py-3 text-sm font-medium rounded-t-orys-md border-b-2 ${tab === 'roles' ? 'border-orys-accent text-orys-accent' : 'border-transparent text-orys-fg-dim'}`}
        >
          Roles
        </button>
      </div>

      {error && <div className="p-3 bg-orys-fail-soft border border-orys-fail rounded-orys-xl text-sm text-orys-fail">{error}</div>}

      {loading ? (
        <div className="p-6 text-sm text-orys-fg-dim">Cargando...</div>
      ) : tab === 'users' ? (
        <div className="bg-orys-bg-panel border border-orys-line rounded-orys-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-orys-bg-raised border-b border-orys-line">
              <tr>
                <th className="text-left p-4 font-semibold text-orys-fg-dim">Email</th>
                <th className="text-left p-4 font-semibold text-orys-fg-dim">Rol</th>
                <th className="text-left p-4 font-semibold text-orys-fg-dim hidden lg:table-cell">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orys-line">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-4 font-medium text-orys-fg">{user.email}</td>
                  <td className="p-4">
                    <select
                      value={user.role?.id || ''}
                      disabled={saving}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      className="px-3 py-2 bg-orys-bg-input border border-orys-line rounded-orys-xl text-sm focus:outline-none"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-orys-fg-dim hidden lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="p-6 bg-orys-bg-panel border border-orys-line rounded-orys-2xl">
              <div className="mb-4">
                <h2 className="font-orys-sans font-bold text-orys-fg">{role.name}</h2>
                <p className="text-xs text-orys-fg-dim mt-1">{role.slug}</p>
              </div>

              <div className="space-y-3">
                {AVAILABLE_PERMISSIONS.map((permission) => {
                  const checked = role.permissions.includes(permission);
                  return (
                    <label key={`${role.id}-${permission}`} className="flex items-center gap-3 text-sm text-orys-fg">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={() => handlePermissionToggle(role, permission)}
                        className="w-4 h-4 accent-orys-accent"
                      />
                      <span>{permission}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <Button variant="secondary" onClick={() => loadData()} loading={loading || saving}>
          Recargar
        </Button>
      </div>
    </div>
  );
}

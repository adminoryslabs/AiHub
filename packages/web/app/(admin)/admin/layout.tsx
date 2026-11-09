// Layout del panel de administración con protección de rutas
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-api-client';
import { getSession, isAuthenticated, removeToken, saveSession } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/articles', label: 'Artículos', icon: 'article' },
  { href: '/admin/resources', label: 'Recursos', icon: 'link' },
  { href: '/admin/images', label: 'Imágenes', icon: 'image' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'bar_chart' },
  { href: '/admin/access', label: 'Accesos', icon: 'admin_panel_settings', permission: 'access.manage' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    async function hydrateSession() {
      if (pathname === '/admin/login') {
        setReady(true);
        return;
      }

      if (!isAuthenticated()) {
        router.replace('/admin/login');
        return;
      }

      const cachedSession = getSession();
      if (cachedSession) {
        setPermissions(cachedSession.permissions);
      }

      try {
        const session = await getAdminSession();
        saveSession(session);
        setPermissions(session.permissions);
        setReady(true);
      } catch {
        removeToken();
        router.replace('/admin/login');
      }
    }

    hydrateSession().catch(() => {
      removeToken();
      router.replace('/admin/login');
    });
  }, [pathname, router]);

  function handleLogout() {
    removeToken();
    router.push('/admin/login');
  }

  // No mostrar nada hasta verificar auth
  if (!ready && pathname !== '/admin/login') return null;
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-orys-bg flex">
      {/* Sidebar de admin */}
      <aside className="w-60 bg-orys-bg-raised border-r border-orys-line flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-orys-line">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orys-accent rounded-orys-xl flex items-center justify-center">
              <Icon name="hub" className="text-orys-fg-on-accent text-sm" />
            </div>
            <div>
              <span className="font-orys-sans font-bold text-orys-fg text-sm">AI Hub</span>
              <p className="text-xs text-orys-fg-dim">Admin</p>
            </div>
          </Link>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission)).map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-orys-xl text-sm transition-all
                  ${
                    isActive
                      ? 'bg-orys-accent-soft text-orys-accent font-semibold'
                      : 'text-orys-fg-dim hover:bg-orys-bg-raised hover:text-orys-fg'
                  }
                `}
              >
                <Icon name={item.icon} size="sm" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-3 border-t border-orys-line space-y-1">
          <Link
            href="/es"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-orys-xl text-sm text-orys-fg-dim hover:bg-orys-bg-raised transition-colors"
          >
            <Icon name="open_in_new" size="sm" />
            Ver sitio
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-orys-xl text-sm text-orys-fail hover:bg-orys-fail-soft transition-colors"
          >
            <Icon name="logout" size="sm" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

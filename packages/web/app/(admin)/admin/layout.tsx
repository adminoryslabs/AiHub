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
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar de admin */}
      <aside className="w-60 bg-surface-container-low border-r border-outline-variant/15 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-outline-variant/15">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Icon name="hub" className="text-on-primary text-sm" />
            </div>
            <div>
              <span className="font-headline font-bold text-on-surface text-sm">AI Hub</span>
              <p className="text-xs text-on-surface-variant">Admin</p>
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
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                  ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
        <div className="p-3 border-t border-outline-variant/15 space-y-1">
          <Link
            href="/es"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Icon name="open_in_new" size="sm" />
            Ver sitio
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-error hover:bg-error/5 transition-colors"
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

// Página de login del panel de administración
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network } from 'lucide-react';
import { login } from '@/lib/admin-api-client';
import { saveAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await login(email, password);
      saveAuth(token, user);
      router.push('/admin');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-orys-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-orys-accent rounded-orys-2xl flex items-center justify-center mx-auto mb-4">
            <Network size={24} strokeWidth={1.75} className="text-orys-fg-on-accent" aria-hidden="true" />
          </div>
          <h1 className="font-orys-sans text-2xl font-bold text-orys-fg">AI Hub Admin</h1>
          <p className="text-sm text-orys-fg-dim mt-1">Panel de administración</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-orys-fail-soft border border-orys-fail rounded-orys-xl text-sm text-orys-fail">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-orys-fg mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 bg-orys-bg-raised border border-orys-line rounded-orys-xl text-orys-fg placeholder-orys-fg-mute focus:outline-none focus-visible:ring-2 focus-visible:ring-orys-line-brand focus-visible:border-orys-line-brand transition-all"
              placeholder="admin@aihub.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-orys-fg mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-orys-bg-raised border border-orys-line rounded-orys-xl text-orys-fg placeholder-orys-fg-mute focus:outline-none focus-visible:ring-2 focus-visible:ring-orys-line-brand focus-visible:border-orys-line-brand transition-all"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}

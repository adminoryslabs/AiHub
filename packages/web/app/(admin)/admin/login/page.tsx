// Página de login del panel de administración
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/admin-api-client';
import { saveToken } from '@/lib/auth';
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
      const { token } = await login(email, password);
      saveToken(token);
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
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-on-primary">hub</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">AI Hub Admin</h1>
          <p className="text-sm text-on-surface-variant mt-1">Panel de administración</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              placeholder="admin@aihub.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
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

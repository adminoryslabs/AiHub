// Página de creación de nuevo artículo (solo metadatos)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createArticle } from '@/lib/admin-api-client';
import { getCategories } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';

export default function NewArticlePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    slug_uk: '',
    type: 'concept' as 'concept' | 'tutorial',
    difficulty: '' as '' | 'beginner' | 'intermediate' | 'advanced',
    estimated_time: '',
    category: '',
    volatility: 'low' as 'low' | 'medium' | 'high',
    featured: false,
  });

  useEffect(() => {
    getCategories('es').then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        slug_uk: form.slug_uk,
        type: form.type,
        category: form.category,
        volatility: form.volatility,
        featured: form.featured,
      };

      // Solo enviar difficulty y estimated_time si es tutorial
      if (form.type === 'tutorial') {
        payload.difficulty = form.difficulty || null;
        payload.estimated_time = form.estimated_time || null;
      }

      const res = await createArticle(payload as Parameters<typeof createArticle>[0]);
      const created = (res?.data as { id: string })?.id;
      if (created) {
        router.push(`/admin/articles/${created}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear artículo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-8">Nuevo artículo</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Slug canónico */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Slug canónico (en inglés)
              <span className="text-error ml-1">*</span>
            </label>
            <input
              type="text"
              value={form.slug_uk}
              onChange={(e) => setForm({ ...form, slug_uk: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              required
              placeholder="what-is-an-agent"
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-on-surface-variant mt-1">Solo letras minúsculas, números y guiones</p>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Tipo <span className="text-error ml-1">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'concept' | 'tutorial' })}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
            >
              <option value="concept">Concepto</option>
              <option value="tutorial">Tutorial</option>
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Categoría <span className="text-error ml-1">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Campos condicionales para tutorial */}
          {form.type === 'tutorial' && (
            <>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">
                  Dificultad <span className="text-error ml-1">*</span>
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as '' | 'beginner' | 'intermediate' | 'advanced' })}
                  required
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
                >
                  <option value="">Seleccionar</option>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">
                  Tiempo estimado <span className="text-error ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={form.estimated_time}
                  onChange={(e) => setForm({ ...form, estimated_time: e.target.value })}
                  required
                  placeholder="30 min"
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Volatilidad */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Volatilidad</label>
            <select
              value={form.volatility}
              onChange={(e) => setForm({ ...form, volatility: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          {/* Destacado */}
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="featured" className="text-sm font-medium text-on-surface">
              Artículo destacado (homepage)
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={loading}>
            Crear artículo
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

// Página de creación de nuevo artículo (solo metadatos)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createArticle, listAdminArticles } from '@/lib/admin-api-client';
import { getCategories } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';

export default function NewArticlePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [parentOptions, setParentOptions] = useState<{ id: string; slug_uk: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    slug_uk: '',
    type: 'concept' as 'concept' | 'tool-branch',
    parent_id: '',
    category: '',
    volatility: 'low' as 'low' | 'medium' | 'high',
    featured: false,
  });

  useEffect(() => {
    async function loadData() {
      const [cats, articles] = await Promise.all([
        getCategories('es'),
        listAdminArticles({ type: 'concept', per_page: 100 }),
      ]);
      setCategories(cats);
      setParentOptions(
        (articles?.data as { id: string; slug_uk: string }[] || [])
      );
    }
    loadData().catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await createArticle({
        ...form,
        parent_id: form.type === 'tool-branch' ? form.parent_id || null : null,
      });
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
              onChange={(e) => setForm({ ...form, type: e.target.value as 'concept' | 'tool-branch' })}
              className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
            >
              <option value="concept">Concepto</option>
              <option value="tool-branch">Herramienta (tool-branch)</option>
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

          {/* Padre (solo tool-branch) */}
          {form.type === 'tool-branch' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                Artículo padre <span className="text-error ml-1">*</span>
              </label>
              <select
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
              >
                <option value="">Seleccionar concepto padre</option>
                {parentOptions.map((art) => (
                  <option key={art.id} value={art.id}>{art.slug_uk}</option>
                ))}
              </select>
            </div>
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

// Editor de artículo con pestañas: metadatos, contenido ES/EN, relaciones, recursos
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getAdminArticle,
  updateArticle,
  updateArticleContent,
  updateArticleStatus,
  verifyArticle,
  addRelation,
  removeRelation,
  linkResource,
  unlinkResource,
  createResource,
} from '@/lib/admin-api-client';
import { getCategories } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

type TabId = 'metadata' | 'content-es' | 'content-en' | 'relations' | 'resources';

interface ArticleContent {
  lang: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  last_edited_at: string;
  last_verified_at: string | null;
}

interface ArticleData {
  id: string;
  slug_uk: string;
  type: string;
  category: string;
  status: string;
  featured: boolean;
  volatility: string;
  applicable_as_of: string | null;
  contents: ArticleContent[];
  relations: { related: string[]; prerequisite: string[]; next: string[] };
  resources: { id: string; title: string; type: string; url: string; description: string | null }[];
}

const STATUS_TRANSITIONS: Record<string, string> = {
  draft: 'published',
  published: 'deprecated',
  deprecated: 'draft',
};

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('metadata');
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadArticle = useCallback(async () => {
    try {
      const res = await getAdminArticle(id);
      setArticle(res?.data as ArticleData);
    } catch {
      router.push('/admin/articles');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadArticle();
    getCategories('es').then(setCategories).catch(() => {});
  }, [loadArticle]);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleStatusChange() {
    if (!article) return;
    const next = STATUS_TRANSITIONS[article.status];
    if (!next) return;
    if (!confirm(`¿Cambiar estado a "${next}"?`)) return;

    setSaving(true);
    try {
      await updateArticleStatus(id, next);
      await loadArticle();
      showMessage(`Estado cambiado a: ${next}`);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-on-surface-variant">Cargando...</div>;
  }

  if (!article) return null;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'metadata', label: 'Metadatos', icon: 'settings' },
    { id: 'content-es', label: 'Contenido ES', icon: 'language' },
    { id: 'content-en', label: 'Contenido EN', icon: 'language' },
    { id: 'relations', label: 'Relaciones', icon: 'account_tree' },
    { id: 'resources', label: 'Recursos', icon: 'link' },
  ];

  const contentEs = article.contents.find((c) => c.lang === 'es');
  const contentEn = article.contents.find((c) => c.lang === 'en');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push('/admin/articles')}
            className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-2"
          >
            <Icon name="arrow_back" size="sm" />
            Volver a artículos
          </button>
          <h1 className="font-headline text-xl font-bold text-on-surface">
            {contentEs?.title || contentEn?.title || article.slug_uk}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={article.status} />
            <span className="text-sm text-on-surface-variant">{article.category}</span>
          </div>
        </div>

        {/* Cambiar estado */}
        <div className="flex items-center gap-2">
          {message && (
            <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">{message}</span>
          )}
          {STATUS_TRANSITIONS[article.status] && (
            <Button variant="secondary" size="sm" onClick={handleStatusChange} loading={saving}>
              → {STATUS_TRANSITIONS[article.status]}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/20 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={t.icon} size="sm" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido de cada pestaña */}
      {tab === 'metadata' && (
        <MetadataTab
          article={article}
          categories={categories}
          onSaved={loadArticle}
          onMessage={showMessage}
        />
      )}
      {(tab === 'content-es' || tab === 'content-en') && (
        <ContentTab
          key={tab}
          articleId={id}
          lang={tab === 'content-es' ? 'es' : 'en'}
          existing={tab === 'content-es' ? contentEs : contentEn}
          onSaved={loadArticle}
          onMessage={showMessage}
          onVerify={async (lang) => {
            await verifyArticle(id, lang);
            await loadArticle();
            showMessage(`Verificado en ${lang}`);
          }}
        />
      )}
      {tab === 'relations' && (
        <RelationsTab
          articleId={id}
          relations={article.relations}
          onSaved={loadArticle}
          onMessage={showMessage}
        />
      )}
      {tab === 'resources' && (
        <ResourcesTab
          articleId={id}
          resources={article.resources}
          onSaved={loadArticle}
          onMessage={showMessage}
        />
      )}
    </div>
  );
}

// Pestaña de metadatos
function MetadataTab({
  article,
  categories,
  onSaved,
  onMessage,
}: {
  article: ArticleData;
  categories: { slug: string; name: string }[];
  onSaved: () => void;
  onMessage: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    category: article.category,
    volatility: article.volatility,
    featured: article.featured,
    applicable_as_of: article.applicable_as_of || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateArticle(article.id, {
        ...form,
        applicable_as_of: form.applicable_as_of || null,
      });
      onSaved();
      onMessage('Metadatos guardados');
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-on-surface mb-1.5">Categoría</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1.5">Volatilidad</label>
        <select
          value={form.volatility}
          onChange={(e) => setForm({ ...form, volatility: e.target.value })}
          className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
      </div>

      {article.type === 'tool-branch' && (
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Versión (applicable_as_of)</label>
          <input
            type="text"
            value={form.applicable_as_of}
            onChange={(e) => setForm({ ...form, applicable_as_of: e.target.value })}
            placeholder="v2.1.0"
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="featured-edit"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          className="w-4 h-4 accent-primary"
        />
        <label htmlFor="featured-edit" className="text-sm font-medium text-on-surface">
          Destacado en homepage
        </label>
      </div>

      <Button onClick={handleSave} loading={saving}>Guardar metadatos</Button>
    </div>
  );
}

// Pestaña de contenido por idioma
function ContentTab({
  articleId,
  lang,
  existing,
  onSaved,
  onMessage,
  onVerify,
}: {
  articleId: string;
  lang: 'es' | 'en';
  existing?: ArticleContent;
  onSaved: () => void;
  onMessage: (msg: string) => void;
  onVerify: (lang: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    slug: existing?.slug || '',
    title: existing?.title || '',
    summary: existing?.summary || '',
    body: existing?.body || '',
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateArticleContent(articleId, { lang, ...form });
      onSaved();
      onMessage(`Contenido ${lang.toUpperCase()} guardado`);
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      await onVerify(lang);
    } finally {
      setVerifying(false);
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;

      // Extraer y parsear el frontmatter YAML si existe
      let body = content;
      let title = form.title;
      let slug = form.slug;
      let summary = form.summary;

      if (content.startsWith('---')) {
        const endIdx = content.indexOf('\n---', 3);
        if (endIdx !== -1) {
          const frontmatter = content.slice(3, endIdx).trim();
          body = content.slice(endIdx + 4).trimStart();

          // Parseo simple de campos YAML clave: valor
          for (const line of frontmatter.split('\n')) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;
            const key = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (key === 'title') title = value;
            if (key === 'slug') slug = value;
            if (key === 'summary') summary = value;
          }
        }
      }

      setForm({ slug, title, summary, body });
      onMessage('Archivo importado. Revisa los campos antes de guardar.');
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Info de verificación */}
      {existing && (
        <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl text-sm">
          <div>
            <span className="text-on-surface-variant">Última edición: </span>
            <span className="text-on-surface">{new Date(existing.last_edited_at).toLocaleString('es-ES')}</span>
            {existing.last_verified_at && (
              <>
                <span className="text-on-surface-variant ml-4">Verificado: </span>
                <span className="text-on-surface">{new Date(existing.last_verified_at).toLocaleString('es-ES')}</span>
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={handleVerify} loading={verifying}>
            <Icon name="verified" size="sm" />
            Marcar verificado
          </Button>
        </div>
      )}

      {/* Importar .md */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-1.5">
          Importar archivo .md
        </label>
        <input
          type="file"
          accept=".md"
          onChange={handleFileImport}
          className="block text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder={lang === 'es' ? 'que-es-un-agente' : 'what-is-an-agent'}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1.5">Resumen</label>
        <textarea
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          rows={3}
          className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-1.5">
          Cuerpo (Markdown)
        </label>
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={20}
          className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-mono focus:outline-none resize-y"
          placeholder="## Qué es\n\nContenido en markdown..."
        />
      </div>

      <Button onClick={handleSave} loading={saving}>
        Guardar contenido {lang.toUpperCase()}
      </Button>
    </div>
  );
}

// Pestaña de relaciones
function RelationsTab({
  articleId,
  relations,
  onSaved,
  onMessage,
}: {
  articleId: string;
  relations: { related: string[]; prerequisite: string[]; next: string[] };
  onSaved: () => void;
  onMessage: (msg: string) => void;
}) {
  const [toId, setToId] = useState('');
  const [relType, setRelType] = useState('related');

  async function handleAdd() {
    if (!toId.trim()) return;
    try {
      await addRelation(articleId, { to_article_id: toId.trim(), type: relType });
      onSaved();
      onMessage('Relación agregada');
      setToId('');
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleRemove(toArticleId: string, type: string) {
    try {
      await removeRelation(articleId, toArticleId, type);
      onSaved();
      onMessage('Relación eliminada');
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error');
    }
  }

  const relEntries: [string, string[]][] = [
    ['related', relations.related],
    ['prerequisite', relations.prerequisite],
    ['next', relations.next],
  ];

  return (
    <div className="max-w-lg space-y-6">
      {/* Agregar relación */}
      <div className="p-4 bg-surface-container-low rounded-xl space-y-3">
        <h3 className="font-medium text-on-surface">Agregar relación</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="UUID del artículo destino"
            className="flex-1 px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          />
          <select
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
            className="px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          >
            <option value="related">Relacionado</option>
            <option value="prerequisite">Prerrequisito</option>
            <option value="next">Siguiente</option>
          </select>
          <Button size="sm" onClick={handleAdd}>Agregar</Button>
        </div>
      </div>

      {/* Lista de relaciones */}
      {relEntries.map(([type, ids]) => (
        <div key={type}>
          <h3 className="font-medium text-on-surface mb-2 capitalize">{type}</h3>
          {ids.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Sin relaciones</p>
          ) : (
            <div className="space-y-2">
              {ids.map((relId) => (
                <div
                  key={relId}
                  className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl"
                >
                  <span className="text-sm font-mono text-on-surface-variant truncate">{relId}</span>
                  <button
                    onClick={() => handleRemove(relId, type)}
                    className="ml-2 p-1 rounded-lg hover:bg-error/10 text-error transition-colors"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Pestaña de recursos
function ResourcesTab({
  articleId,
  resources,
  onSaved,
  onMessage,
}: {
  articleId: string;
  resources: { id: string; title: string; type: string; url: string; description: string | null }[];
  onSaved: () => void;
  onMessage: (msg: string) => void;
}) {
  const [newResource, setNewResource] = useState({ title: '', type: 'doc', url: '', description: '' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await createResource({ ...newResource, description: newResource.description || null });
      const created = (res?.data as { id: string })?.id;
      if (created) {
        await linkResource(articleId, created);
      }
      onSaved();
      onMessage('Recurso creado y vinculado');
      setShowForm(false);
      setNewResource({ title: '', type: 'doc', url: '', description: '' });
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink(resourceId: string) {
    try {
      await unlinkResource(articleId, resourceId);
      onSaved();
      onMessage('Recurso desvinculado');
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-on-surface">Recursos vinculados ({resources.length})</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <Icon name="add" size="sm" />
          Nuevo recurso
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-surface-container-low rounded-xl space-y-3">
          <input
            type="text"
            value={newResource.title}
            onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
            placeholder="Título del recurso"
            className="w-full px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          />
          <div className="flex gap-3">
            <select
              value={newResource.type}
              onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
              className="px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
            >
              <option value="doc">Documentación</option>
              <option value="video">Video</option>
              <option value="course">Curso</option>
              <option value="article">Artículo</option>
            </select>
            <input
              type="url"
              value={newResource.url}
              onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
              placeholder="https://..."
              className="flex-1 px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={newResource.description}
            onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
            placeholder="Descripción (opcional)"
            className="w-full px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={saving}>Crear y vincular</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Sin recursos vinculados.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">{resource.title}</p>
                <p className="text-xs text-on-surface-variant truncate">{resource.url}</p>
              </div>
              <button
                onClick={() => handleUnlink(resource.id)}
                className="ml-2 p-1 rounded-lg hover:bg-error/10 text-error transition-colors flex-shrink-0"
              >
                <Icon name="link_off" size="sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

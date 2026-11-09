// Gestión de recursos externos del admin
'use client';

import { useState, useEffect } from 'react';
import { listResources, createResource, updateResource, deleteResource } from '@/lib/admin-api-client';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string | null;
  created_at: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState({ title: '', type: 'doc', url: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadResources() {
    try {
      const res = await listResources();
      setResources(res?.data as Resource[] || []);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadResources(); }, []);

  function showMsg(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateResource(editing.id, { ...form, description: form.description || null });
        showMsg('Recurso actualizado');
      } else {
        await createResource({ ...form, description: form.description || null });
        showMsg('Recurso creado');
      }
      await loadResources();
      setShowForm(false);
      setEditing(null);
      setForm({ title: '', type: 'doc', url: '', description: '' });
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este recurso? Se desvinculará de todos los artículos.')) return;
    try {
      await deleteResource(id);
      await loadResources();
      showMsg('Recurso eliminado');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Error');
    }
  }

  function handleEdit(resource: Resource) {
    setEditing(resource);
    setForm({
      title: resource.title,
      type: resource.type,
      url: resource.url,
      description: resource.description || '',
    });
    setShowForm(true);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-orys-sans text-2xl font-bold text-orys-fg">Recursos</h1>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-orys-ok bg-orys-ok-soft px-3 py-1 rounded-full">{message}</span>}
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setForm({ title: '', type: 'doc', url: '', description: '' });
              setShowForm(!showForm);
            }}
          >
            <Icon name="add" size="sm" />
            Nuevo recurso
          </Button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="mb-6 p-6 bg-orys-bg-raised border border-orys-line rounded-orys-2xl space-y-4">
          <h2 className="font-medium text-orys-fg">{editing ? 'Editar recurso' : 'Nuevo recurso'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-orys-fg mb-1.5">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-orys-bg-input border border-orys-line rounded-orys-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-orys-fg mb-1.5">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-orys-bg-input border border-orys-line rounded-orys-xl text-sm focus:outline-none"
              >
                <option value="doc">Documentación</option>
                <option value="video">Video</option>
                <option value="course">Curso</option>
                <option value="article">Artículo</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-orys-fg mb-1.5">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full px-4 py-2.5 bg-orys-bg-input border border-orys-line rounded-orys-xl text-sm focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-orys-fg mb-1.5">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-orys-bg-input border border-orys-line rounded-orys-xl text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-orys-bg-panel border border-orys-line rounded-orys-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-orys-fg-dim">Cargando...</div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-orys-fg-dim">No hay recursos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-orys-bg-raised border-b border-orys-line">
              <tr>
                <th className="text-left p-4 font-semibold text-orys-fg-dim">Título</th>
                <th className="text-left p-4 font-semibold text-orys-fg-dim hidden md:table-cell">Tipo</th>
                <th className="text-left p-4 font-semibold text-orys-fg-dim hidden lg:table-cell">URL</th>
                <th className="text-right p-4 font-semibold text-orys-fg-dim">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orys-line">
              {resources.map((resource) => (
                <tr key={resource.id} className="hover:bg-orys-bg-raised transition-colors">
                  <td className="p-4 font-medium text-orys-fg">{resource.title}</td>
                  <td className="p-4 text-orys-fg-dim hidden md:table-cell capitalize">{resource.type}</td>
                  <td className="p-4 hidden lg:table-cell">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-orys-accent hover:underline truncate max-w-xs block">
                      {resource.url}
                    </a>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(resource)} className="p-2 rounded-orys-lg hover:bg-orys-bg-raised text-orys-fg-dim hover:text-orys-accent transition-colors">
                        <Icon name="edit" size="sm" />
                      </button>
                      <button onClick={() => handleDelete(resource.id)} className="p-2 rounded-orys-lg hover:bg-orys-fail-soft text-orys-fail transition-colors">
                        <Icon name="delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

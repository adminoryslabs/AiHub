// Página de gestión de imágenes del admin
'use client';

import { useState, useRef } from 'react';
import { uploadImage } from '@/lib/admin-api-client';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface UploadedImage {
  url: string;
  key: string;
  size: number;
  mime_type: string;
}

export default function ImagesPage() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<UploadedImage[]>([]);
  const [copied, setCopied] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    for (const file of Array.from(files)) {
      try {
        const res = await uploadImage(file);
        setRecent((prev) => [res.data, ...prev]);
        showMessage(`Imagen subida: ${file.name}`);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Error al subir imagen');
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 2000);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-headline text-xl font-bold text-on-surface">Imágenes</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Sube imágenes a Cloudflare R2 y copia la URL para usarla en artículos.
        </p>
      </div>

      {/* Zona de carga */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-outline-variant/40 rounded-2xl p-12 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="cloud_upload" className="text-on-surface-variant mb-4 !text-4xl" />
        <p className="text-on-surface font-medium mb-1">
          {uploading ? 'Subiendo...' : 'Arrastra imágenes aquí o haz clic para seleccionar'}
        </p>
        <p className="text-sm text-on-surface-variant">PNG, JPG, WebP o SVG. Máximo 5 MB por imagen.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Mensajes de estado */}
      {message && (
        <div className="mt-4 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Lista de imágenes subidas en esta sesión */}
      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="font-medium text-on-surface mb-4">Subidas en esta sesión</h2>
          <div className="space-y-3">
            {recent.map((img) => (
              <div
                key={img.key}
                className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl"
              >
                {/* Miniatura */}
                <div className="w-16 h-16 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden">
                  {img.mime_type !== 'image/svg+xml' ? (
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name="image" className="text-on-surface-variant" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{img.key.split('/').pop()}</p>
                  <p className="text-xs text-on-surface-variant">
                    {img.mime_type} · {formatSize(img.size)}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">{img.url}</p>
                </div>

                {/* Copiar URL */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyUrl(img.url)}
                  className="flex-shrink-0"
                >
                  <Icon name={copied === img.url ? 'check' : 'content_copy'} size="sm" />
                  {copied === img.url ? 'Copiado' : 'Copiar URL'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

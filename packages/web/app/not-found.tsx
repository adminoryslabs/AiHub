// Página 404 — usa el layout raíz (sin <html>/<body> propios)
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-orys-bg text-orys-fg">
      <p className="font-orys-sans font-extrabold text-[120px] sm:text-[160px] leading-none text-orys-line-brand mb-4">
        404
      </p>
      <h1 className="font-orys-sans font-semibold text-3xl text-orys-fg mb-3 tracking-tight">
        Página no encontrada
      </h1>
      <p className="text-[15px] text-orys-fg-dim max-w-md mb-8">
        La ruta que buscás no existe o fue movida. Volvé al inicio para seguir explorando.
      </p>
      <Link
        href="/es"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-orys-md bg-orys-accent text-orys-fg-on-accent font-semibold hover:bg-orys-accent-bright transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

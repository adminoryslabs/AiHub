// Página 404 — estilo "Minimal"
import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="es">
      <body className="bg-surface text-on-surface antialiased font-body">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <p className="font-headline font-extrabold text-[120px] sm:text-[160px] leading-none text-primary-text/20 mb-4">
            404
          </p>
          <h1 className="font-headline font-semibold text-3xl text-on-surface mb-3 tracking-tight">
            Página no encontrada
          </h1>
          <p className="text-[15px] text-on-surface-variant max-w-md mb-8">
            La ruta que buscás no existe o fue movida. Volvé al inicio para seguir explorando.
          </p>
          <Link
            href="/es"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold hover:bg-primary-dim transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}

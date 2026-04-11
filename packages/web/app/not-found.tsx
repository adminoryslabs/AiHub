// Página 404 personalizada
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-headline font-extrabold text-primary/20 mb-4">404</p>
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-3">
          Página no encontrada
        </h1>
        <p className="text-on-surface-variant mb-8">
          El artículo o la página que buscas no existe o no está disponible en este idioma.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/es"
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-semibold hover:bg-primary-dim transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/en"
            className="px-6 py-3 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
          >
            Go to home (EN)
          </Link>
        </div>
      </div>
    </div>
  );
}

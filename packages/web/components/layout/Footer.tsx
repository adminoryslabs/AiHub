// Pie de página
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/15 py-8 px-6 mt-16">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-on-surface-variant">
          © {new Date().getFullYear()} AI Hub — Conocimiento práctico sobre IA generativa
        </p>
        <nav className="flex items-center gap-6" aria-label="Footer">
          <Link href="/es" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            Inicio
          </Link>
          <Link href="/admin" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

// Pie de página — copyright + enlaces a Temas y Admin (mono)
import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-orys-line mt-16">
      <div className="mx-auto max-w-[1220px] py-6 px-6 sm:px-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-orys-fg-dim">
          © {year} AI Hub — conocimiento práctico sobre IA generativa
        </p>
        <nav className="flex gap-5" aria-label="Enlaces del pie">
          <Link
            href="/es"
            className="font-orys-mono text-[12px] text-orys-fg-dim hover:text-orys-fg transition-colors"
          >
            Temas
          </Link>
          <Link
            href="/admin"
            className="font-orys-mono text-[12px] text-orys-fg-dim hover:text-orys-fg transition-colors"
          >
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

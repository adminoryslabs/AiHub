// Pie de página — estilo terminal
import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-outline-variant py-6 px-6 mt-16 font-mono">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[12.5px] text-on-surface-variant">
          © {year} ai-hub — {`conocimiento práctico sobre IA generativa`}
        </p>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <Link href="/es" className="text-[12.5px] text-on-surface-variant hover:text-primary transition-colors">
            inicio
          </Link>
          <Link href="/admin" className="text-[12.5px] text-on-surface-variant hover:text-primary transition-colors">
            admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

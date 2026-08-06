// Layout raíz de la aplicación Next.js
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI Hub — Conocimiento práctico sobre IA generativa',
    template: '%s — AI Hub',
  },
  description:
    'Referencia práctica y enciclopédica sobre IA generativa. Para desarrolladores y builders.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://aihub.example.com'),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Material Symbols Outlined — carga como link para garantizar disponibilidad */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        {/* Script inline para evitar flash de tema incorrecto */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('aihub_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-surface text-on-surface antialiased">
        {children}
        <Script src="/js/analytics.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

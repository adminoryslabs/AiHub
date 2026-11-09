// Layout raíz de la aplicación Next.js
import type { Metadata } from 'next';
import Script from 'next/script';
import themeInit from '@adminoryslabs/design-system/theme-init';
import '@adminoryslabs/design-system/fonts';
import '@adminoryslabs/design-system/css';
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

// Atributos de analytics y endpoint del beacon. No participa del primer pintado.
const analyticsInit = `
  try {
    var path = window.location.pathname;
    var parts = path.split('/').filter(Boolean);
    var lang = parts[0] || 'es';
    var slug = parts.length >= 3 ? parts[parts.length - 1] : null;
    document.documentElement.dataset.lang = lang;
    document.documentElement.dataset.route = path;
    if (slug) document.documentElement.dataset.slug = slug;
    window.__AIHUB_API_URL__ = ${JSON.stringify(process.env.NEXT_PUBLIC_API_URL || '')};
  } catch(e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-line="academy" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Script anti-parpadeo del design system — inline y antes de los estilos */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: analyticsInit }} />
      </head>
      <body className="bg-orys-bg text-orys-fg antialiased">
        {children}
        <Script src="/js/analytics.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}

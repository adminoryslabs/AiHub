// Toggle de tema oscuro/claro — botón cuadrado 34×34, borde outline-variant
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('aihub_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ? (saved as 'light' | 'dark') : prefersDark ? 'dark' : 'light';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function applyTheme(t: 'light' | 'dark') {
    document.documentElement.classList.toggle('dark', t === 'dark');
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('aihub_theme', next);
    applyTheme(next);
  }

  if (!mounted) {
    // Placeholder del mismo tamaño para evitar layout shift
    return <span className="w-[34px] h-[34px] block" aria-hidden="true" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-[34px] h-[34px] flex items-center justify-center bg-surface border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    >
      <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
        {theme === 'light' ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  );
}

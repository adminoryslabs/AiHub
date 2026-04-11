// Toggle de tema oscuro/claro con persistencia en localStorage
'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Leer preferencia guardada o preferencia del sistema
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

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors"
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    >
      <Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size="md" />
    </button>
  );
}

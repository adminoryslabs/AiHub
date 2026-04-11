// Componente client-side que inyecta botones "Copiar" en todos los bloques de código
'use client';

import { useEffect } from 'react';

export function CodeCopyEnhancer() {
  useEffect(() => {
    const pres = document.querySelectorAll<HTMLPreElement>(
      '[data-rehype-pretty-code-figure] pre'
    );

    pres.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;

      const code = pre.querySelector('code');
      if (!code) return;

      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.textContent = 'Copiar';
      btn.setAttribute('aria-label', 'Copiar código');

      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          btn.textContent = '✓ Copiado';
          setTimeout(() => (btn.textContent = 'Copiar'), 2000);
        } catch {
          btn.textContent = 'Error';
          setTimeout(() => (btn.textContent = 'Copiar'), 2000);
        }
      });

      pre.appendChild(btn);
    });
  }, []);

  return null;
}

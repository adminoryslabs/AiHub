// Componente client-side que inicializa los diagramas Mermaid en el artículo.
// Diferimos al siguiente frame para que el DOM esté pintado antes de que Mermaid
// mida dimensiones. Re-renderizamos al cambiar el tema light/dark.
'use client';

import { useEffect } from 'react';

export function MermaidLoader() {
  useEffect(() => {
    let raf: number;

    const init = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(async () => {
        const mermaidDivs = Array.from(document.querySelectorAll<HTMLElement>('.mermaid'));
        if (mermaidDivs.length === 0) return;

        const isDark = document.documentElement.classList.contains('dark');
        const { default: mermaid } = await import('mermaid');

        // Guardar texto original la primera vez
        mermaidDivs.forEach((div) => {
          if (!div.hasAttribute('data-source')) {
            div.setAttribute('data-source', div.textContent?.trim() || '');
          }
        });

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        // Restaurar código fuente y limpiar flag de procesado para poder re-renderizar
        mermaidDivs.forEach((div) => {
          div.textContent = div.getAttribute('data-source') || '';
          div.removeAttribute('data-processed');
        });

        await mermaid.run({ nodes: mermaidDivs });
      });
    };

    init();

    // Re-renderizar al cambiar el tema (clase 'dark' en <html>)
    const observer = new MutationObserver(init);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return null;
}

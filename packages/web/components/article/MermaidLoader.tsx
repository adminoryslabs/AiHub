// Componente client-side que inicializa los diagramas Mermaid en el artículo
// Se re-renderiza automáticamente cuando cambia el tema light/dark
'use client';

import { useEffect } from 'react';

export function MermaidLoader() {
  useEffect(() => {
    const mermaidDivs = Array.from(document.querySelectorAll<HTMLElement>('.mermaid'));
    if (mermaidDivs.length === 0) return;

    // Guardar la fuente original antes del primer render (Mermaid la reemplaza con SVG)
    mermaidDivs.forEach((div) => {
      if (!div.hasAttribute('data-source')) {
        div.setAttribute('data-source', div.textContent?.trim() || '');
      }
    });

    let renderCount = 0;

    const renderAll = async () => {
      renderCount++;
      const currentRender = renderCount;

      const { default: mermaid } = await import('mermaid');

      // Si llegó una nueva solicitud mientras esperábamos, abortar esta
      if (currentRender !== renderCount) return;

      const isDark = document.documentElement.classList.contains('dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, sans-serif',
      });

      await Promise.all(
        mermaidDivs.map(async (div, i) => {
          const source = div.getAttribute('data-source') || '';
          if (!source) return;

          try {
            const { svg } = await mermaid.render(`mermaid-diagram-${i}-${currentRender}`, source);
            if (currentRender === renderCount) {
              div.innerHTML = svg;
            }
          } catch {
            // Fallo silencioso: el diagrama queda como texto plano
          }
        })
      );
    };

    // Renderizar con el tema actual al montar
    renderAll();

    // Observar cambios de clase en <html> para detectar cambios de tema
    const observer = new MutationObserver(renderAll);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

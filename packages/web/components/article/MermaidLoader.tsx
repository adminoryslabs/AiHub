// Componente client-side que inicializa los diagramas Mermaid en el artículo.
// Diferimos al siguiente frame para que el DOM esté completamente pintado antes
// de que Mermaid intente medir dimensiones (necesario en navegación cliente).
'use client';

import { useEffect } from 'react';

export function MermaidLoader() {
  useEffect(() => {
    let raf: number;

    const init = async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
      await mermaid.run();
    };

    raf = requestAnimationFrame(() => { init(); });
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}

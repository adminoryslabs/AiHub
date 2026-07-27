'use client';

import { useEffect, useRef, useState, ComponentType } from 'react';
import { CommunityPopup } from './CommunityPopup';

interface PopupDef {
  id: string;
  Component: ComponentType<{ open: boolean; onClose: () => void }>;
}

const POPUPS: PopupDef[] = [
  { id: 'community-2026-06', Component: CommunityPopup },
];

const POPUP_DELAY_MS = 800;
const storageKey = (id: string) => `aihub:popup:${id}:dismissed`;

// Orquestador de popups. Decide qué popup mostrar y persiste "visto" en localStorage por id.
// Se monta una vez en el layout público. SSR-safe: no toca localStorage hasta después de hidratar.
export function PopupHost() {
  const [mounted, setMounted] = useState(false);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    for (const { id } of POPUPS) {
      if (activePopupId === id) continue;
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(storageKey(id)) !== null;
      } catch {
        // localStorage no disponible (modo privado) — tratamos como no descartado
      }
      if (dismissed) continue;
      const timeoutId = setTimeout(() => {
        setActivePopupId(id);
        timeoutsRef.current.delete(id);
      }, POPUP_DELAY_MS);
      timeoutsRef.current.set(id, timeoutId);
    }
    return () => {
      for (const t of timeoutsRef.current.values()) {
        clearTimeout(t);
      }
      timeoutsRef.current.clear();
    };
  }, [mounted, activePopupId]);

  const handleClose = (id: string) => {
    try {
      localStorage.setItem(storageKey(id), String(Date.now()));
    } catch {
      // localStorage no disponible — el popup volverá a salir la próxima sesión
    }
    setActivePopupId(null);
  };

  if (!mounted) return null;

  return (
    <>
      {POPUPS.map(({ id, Component }) => (
        <Component
          key={id}
          open={activePopupId === id}
          onClose={() => handleClose(id)}
        />
      ))}
    </>
  );
}

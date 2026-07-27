# Sistema de Popups

Modales de novedades para la web pública. El orquestador (`PopupHost`) está montado una vez en `app/(public)/layout.tsx`.

## Cómo agregar un popup nuevo

1. **Crear el contenido** — `NewPopup.tsx` en esta carpeta, usando `Modal` (ver `CommunityPopup.tsx` como referencia).
2. **Registrarlo** — importarlo en `PopupHost.tsx` y agregarlo al array `POPUPS` con un `id` único. Formato sugerido: `<topic>-<YYYY-MM>` (ej. `community-2026-06`).
3. **Listo** — la próxima vez que un usuario sin la clave `aihub:popup:<id>:dismissed` visite una página pública, el popup aparece con un delay de 800ms. No hay que tocar el `Modal`, el layout, ni nada más.

## Comportamiento garantizado por la plataforma

- **Persistencia** — al cerrar el popup por cualquier vía (X, scrim, Esc, CTA, "más tarde") se escribe la clave en `localStorage`. El popup nunca vuelve a salir a ese usuario con ese `id`.
- **Aislamiento** — el `PopupHost` solo está en el layout público, así que las rutas de admin no ven popups.
- **SSR** — el host no toca `localStorage` hasta después de hidratar, así que no hay hydration mismatch.

## Reglas

- Cada CTAs externa debe usar `target="_blank" rel="noopener noreferrer"` (mismo patrón que `CommunityCard`, `SidebarRight`).
- Reutilizar tokens de `globals.css` (`bg-primary`, `text-on-primary`, `bg-surface`, etc.) — nunca colores hardcodeados.

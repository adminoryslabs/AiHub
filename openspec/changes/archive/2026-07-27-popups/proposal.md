# Proposal: Sistema de Popups de Novedades

## Intent

Permitir que AI Hub comunique novedades puntuales a los lectores de la web pública (primer caso: invitación a la comunidad Discord) mediante un modal genérico, reutilizable y accesible, montado una sola vez en el layout público. Construido encima del rediseño Minimal ya aplicado; sin cambios de backend, DB o auth.

## Scope

### In Scope
- Componente Modal genérico (`components/ui/Modal.tsx`) con scrim, tarjeta, franja de acento, X, slots, focus trap, scroll lock, `Esc`, `prefers-reduced-motion`.
- Componente CommunityPopup (`components/popups/CommunityPopup.tsx`) — contenido del primer popup.
- Orquestador PopupHost (`components/popups/PopupHost.tsx`) con regla `localStorage` por `id` (clave `aihub:popup:<id>:dismissed`).
- Layout público `app/(public)/layout.tsx` (nuevo) — único mount del `PopupHost`.
- Handoff canonical copiado a `docs/handoff/popups/`.
- Reutilizar tokens del Minimal ya en `app/globals.css` (cero colores nuevos).

### Out of Scope
- Backend, DB, API, auth.
- Editor de popups desde el panel admin (futuro).
- A/B testing o segmentación por audiencia.
- Persistencia de "visto" en campo de usuario (futuro; hoy solo localStorage).
- Re-mostrar popups ya descartados (decidido: nunca; nuevo `id` para nuevo contenido).

## Capabilities

### New Capabilities
- `popups`: Sistema genérico de popups modales para comunicar novedades en la web pública. Cubre ciclo de vida, persistencia de "visto" por `id`, y accesibilidad (focus trap, scroll lock, `Esc`, `prefers-reduced-motion`).

### Modified Capabilities
- Ninguna. No se modifican `article-structure`, `article-type-system`, `article-url-routing`, `mvp-foundation`, `recursos-por-idioma` ni `roles-y-permisos-editoriales`.

## Approach

- `Modal.tsx`: shell genérico. Props: `open`, `onClose`, `labelledBy`, `children`, opcional `accent` (true por defecto para la franja chartreuse). Sin contenido propio. Toda la accesibilidad vive acá.
- `CommunityPopup.tsx`: contenido del primer popup usando `Modal`. Pasa el `id="community-2026-06"`.
- `PopupHost.tsx`: registry de popups hardcoded en código (id → componente). Lee `localStorage`; si no está `dismissed` para el `id`, agenda mostrar con `setTimeout(~800ms)` post-mount. Cualquier cierre (X / scrim / `Esc` / CTA / "más tarde") marca como visto.
- SSR-safe: `PopupHost` se monta en el layout público (no en root), es client component, y gatea con `useEffect` para evitar hydration mismatch con `localStorage`.
- Trabajar en `feat/ui-minimal` (decisión del usuario). No se crea `feat/popups`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/web/components/ui/Modal.tsx` | New | Shell genérico de modal con a11y completa |
| `packages/web/components/popups/CommunityPopup.tsx` | New | Contenido del popup de comunidad |
| `packages/web/components/popups/PopupHost.tsx` | New | Orquestador + regla localStorage |
| `packages/web/app/(public)/layout.tsx` | New | Único mount del `PopupHost` |
| `docs/handoff/popups/{README.md,AI Hub Minimal.dc.html}` | New | Copia canonical del handoff |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hydration mismatch por leer `localStorage` en server | High | `PopupHost` es client component; gate con `useEffect` + `setMounted(true)` |
| Popup aparece también en admin | High si se monta en root | Mount exclusivamente en `app/(public)/layout.tsx` |
| `localStorage` falla (modo privado Safari) | Med | `try/catch`; fallback a "no visto" (re-aparece por sesión) |
| Focus trap con lectores de pantalla | Med | Implementar con atributo `inert` en siblings; smoke test manual |

## Rollback Plan

Revertir los 4 archivos creados. Sin migración (las claves `aihub:popup:*` en `localStorage` son inertes sin el host; quedan como basura, no como dato).

## Dependencies

- Rediseño Minimal ya commiteado en `feat/ui-minimal` (commit `18f0f2c`).
- Tokens del Minimal en `packages/web/app/globals.css` (ya presentes).

## Success Criteria

- [ ] Modal usa los tokens del sistema Minimal; correcto en light y dark.
- [ ] Franja chartreuse superior; CTA chartreuse con texto tinta oscura; esquinas rectas; borde tinta; scrim con blur.
- [ ] Cierra por X, scrim, `Esc`, CTA y "Quizás más tarde"; todos marcan como visto.
- [ ] No reaparece una vez descartado (cualquier vía de cierre).
- [ ] No sale en cada navegación de página (SPA): una vez por sesión/usuario según la clave.
- [ ] Accesible: `role="dialog"`, `aria-modal`, focus trap, foco devuelto al cerrar, scroll bloqueado, `prefers-reduced-motion` respetado.
- [ ] Arquitectura extensible: agregar un nuevo popup = nuevo `id` + nuevo componente; `PopupHost` no cambia.

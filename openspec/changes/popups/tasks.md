# Tasks: Sistema de Popups de Novedades

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~260 (4 archivos TS nuevos + 2 docs copiados) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single branch (`feat/ui-minimal`), 2 commits |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Handoff canonical

- [x] 1.1 Copiar `docs/design_handoff_popups/README.md` → `docs/handoff/popups/README.md`
- [x] 1.2 Copiar `docs/design_handoff_popups/AI Hub Minimal.dc.html` → `docs/handoff/popups/AI Hub Minimal.dc.html`

## Phase 2: Componentes

- [x] 2.1 Crear `packages/web/components/ui/Modal.tsx` (client component) con props `{ open, onClose, labelledBy, children }`. Incluir: portal a `document.body`, scrim con `backdrop-blur-[3px]` y bg `bg-[rgba(18,20,31,0.32)]` light / `dark:bg-[rgba(4,5,12,0.66)]`, tarjeta `max-w-[432px] bg-surface border border-outline`, franja superior `h-[6px] bg-primary`, botón X 32×32 con `Icon name="close"`, focus trap manual (listener `keydown` en document, query focusables, wrap en extremos), scroll lock con ref counter, `Esc` cierra, click en scrim cierra, restauración de foco, gate `prefers-reduced-motion`.
- [x] 2.2 Crear `packages/web/components/popups/CommunityPopup.tsx` (client component) usando `Modal`. Slots: kicker "NOVEDAD · COMUNIDAD" (`font-mono text-[11px] tracking-[0.14em] text-primary-text uppercase`), título "Únete a la comunidad" (`font-headline text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-on-surface`, con `id="community-popup-title"`), body con `text-[15.5px] leading-[1.55] text-on-surface-variant`, CTA primaria `<a href="https://discord.gg/PLACEHOLDER" onClick={onClose}>` con `bg-primary text-on-primary h-12` + ícono `forum`, CTA secundaria "Quizás más tarde" con `border border-outline-variant h-[42px] text-on-surface-variant`.

## Phase 3: Orquestación

- [x] 3.1 Crear `packages/web/components/popups/PopupHost.tsx` (client component). Const `POPUPS = [{ id: 'community-2026-06', Component: CommunityPopup }]`, `STORAGE_KEY = id => 'aihub:popup:${id}:dismissed'`, `POPUP_DELAY_MS = 800`. State `mounted` (gate SSR), state `activePopupId`. useEffect: si mounted, por cada popup, si no hay key en `localStorage` (try/catch), agendar setTimeout(800) para setActivePopupId. Cleanup: clear all timeouts. `handleClose(id)`: localStorage.setItem(timestamp) + setActivePopupId(null). Render: si no mounted → null; sino, map POPUPS a `<Component open={activePopupId===id} onClose={() => handleClose(id)} />`.
- [x] 3.2 Crear `packages/web/app/(public)/layout.tsx` (server component). Layout mínimo: `<>{children}<PopupHost /></>` para asegurar un solo mount del host en todas las rutas públicas.

## Phase 4: Verificación manual contra el spec

- [ ] 4.1 **Modal a11y**: `pnpm --filter web dev` → abrir el popup → verificar focus trap (Tab/Shift+Tab quedan dentro), Esc cierra, click en scrim cierra, scroll del body bloqueado, foco vuelve al elemento anterior al cerrar, `prefers-reduced-motion` no anima.
- [ ] 4.2 **PopupHost**: dismissar el popup por las 5 vías (X, scrim, Esc, CTA Discord, "Quizás más tarde") → en cada caso verificar `localStorage.getItem('aihub:popup:community-2026-06:dismissed')` retorna un string (timestamp). Recargar la página → popup NO aparece. Navegar a otra página pública → popup NO re-aparece (clave persiste).
- [ ] 4.3 **Admin aislado**: visitar `/admin` → popup NO aparece. Visitar `/admin/*` → tampoco.
- [ ] 4.4 **Light/dark**: togglear tema → popup se ve correcto en ambos (chartreuse, texto tinta, borde, scrim blur).
- [ ] 4.5 **SSR**: `View source` en una página pública → no hay markup del popup antes de hidratar.

## Phase 5: Archive

- [ ] 5.1 Mover `openspec/changes/popups/specs/popups/spec.md` → `openspec/specs/popups/spec.md`.
- [ ] 5.2 Crear entrada en `openspec/changes/archive/2026-07-26-popups/` con `proposal.md`, `design.md`, `tasks.md` (copias).
- [ ] 5.3 Borrer (o vaciar) el directorio `openspec/changes/popups/` (queda solo el archive).

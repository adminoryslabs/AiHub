# Design: Sistema de Popups de Novedades

## Technical Approach

Tres componentes cliente nuevos (`Modal`, `CommunityPopup`, `PopupHost`) + un layout nuevo en `(public)/`. Cero cambios de backend, schema o auth. Reutiliza tokens del Minimal ya en `globals.css` y el componente `Icon` existente. La accesibilidad vive toda dentro de `Modal`; el contenido de cada popup es trivial y solo aporta copy y CTAs.

## Architecture Decisions

### Decision: Custom Modal con React Portal vs `<dialog>` nativo

**Choice**: Componente propio + `createPortal(document.body)`.
**Alternatives**: Elemento `<dialog>` con `showModal()`.
**Rationale**: `<dialog>` nativo trae estilos y pseudo-clases opinionadas (top-layer, backdrop) que pelean con el scrim con blur y la franja chartreuse del Minimal. Un componente custom con Portal es ~100 LOC y da control total sobre la estética y el orden de apilamiento (z-index 60, encima del header sticky). Además, `<dialog>` tiene un quirk en Safari con `backdrop-filter`.

### Decision: Registry de popups en código

**Choice**: `const POPUPS: { id, Component }[]` hardcoded en `PopupHost.tsx`.
**Alternatives**: Config JSON, variable de entorno, admin-managed.
**Rationale**: Hoy hay un solo popup. Code-registry es type-safe, trivial de extender y no requiere infra. Cuando llegue "editor de popups en admin" (out of scope), el host puede cambiar a una fuente runtime sin tocar la API pública (`<PopupHost />`).

### Decision: SSR safety con gate `mounted`

**Choice**: `useState(false)` para `mounted`; `useEffect(() => setMounted(true), [])`. `PopupHost` no renderiza nada hasta estar montado.
**Alternatives**: Guardas `typeof window !== 'undefined'`, dynamic import.
**Rationale**: Garantiza cero acceso a `localStorage` durante SSR (no hay hydration mismatch). Sobrevive a React strict mode (double-mount en dev). Sin flash de popup ni FOUC.

### Decision: Focus trap manual con `keydown` listener

**Choice**: Listener en `document`, query de focusables dentro del dialog, wrap en extremos.
**Alternatives**: Atributo `inert` en siblings, librería `focus-trap-react`.
**Rationale**: ~25 LOC, sin nuevas deps, control total. `inert` es elegante pero todavía tiene inconsistencias entre Safari y Chrome para contenido complejo. Una librería suma bundle weight (~3KB gz) para un único modal.

### Decision: Body scroll lock con ref counter

**Choice**: `useRef(0)` que incrementa al abrir y decrementa al cerrar; solo restaura `body.style.overflow` cuando llega a 0.
**Alternatives**: Boolean toggle.
**Rationale**: Defensivo. Si dos modales quedan abiertos simultáneamente, no se desbloquea el scroll prematuramente.

### Decision: Delay de 800ms antes de mostrar

**Choice**: `setTimeout(800)` desde el `useEffect` post-mount.
**Alternatives**: Inmediato, `requestIdleCallback`, on first user interaction.
**Rationale**: Recomendación del handoff (rango 600–1200ms). 800ms evita competir con el primer paint y da tiempo a que la página "asiente" antes de pedir atención.

### Decision: CTAs externas abren en nueva pestaña

**Choice**: `target="_blank" rel="noopener noreferrer"` en el `<a>` del CTA primaria (Discord).
**Alternatives**: Misma pestaña (`<a>` simple).
**Rationale**: Misma pestaña hace que `onClick={onClose}` escriba la clave de dismissal ANTES de navegar, y al volver con "Atrás" el usuario encuentra la página sin popup (sensación de "lo descarté sin querer"). Nueva pestaña mantiene al usuario en AI Hub, abre Discord aparte, y el popup se cierra limpiamente. Es además el patrón consistente con `CommunityCard`, `SidebarRight` y admin.

## Data Flow

```
[Next.js request]
     │
     ▼
[app/layout.tsx (server)]
     │
     ▼
[app/(public)/[lang]/layout.tsx (server)]
     │ mounts <PopupHost /> alongside {children}
     ▼
[PopupHost (client, mounted=false)]
     │ useEffect → mounted=true
     ▼
[For each popup in POPUPS]
     │   if !localStorage['aihub:popup:<id>:dismissed'] → setTimeout(800)
     ▼
[setActivePopupId(id)]
     ▼
[<CommunityPopup open={true} onClose={...} />]
     │   renders <Modal open onClose labelledBy>
     ▼
[Modal portal to body]
     │
     │ user dismisses (X | scrim | Esc | CTA | "later")
     ▼
[onClose → localStorage.setItem + activePopupId=null]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/web/components/ui/Modal.tsx` | Create | Shell genérico con a11y completa (scrim, focus trap, scroll lock, Esc, `prefers-reduced-motion`) |
| `packages/web/components/popups/CommunityPopup.tsx` | Create | Contenido del popup de comunidad usando `Modal` |
| `packages/web/components/popups/PopupHost.tsx` | Create | Orquestador + registry + `localStorage` |
| `packages/web/app/(public)/layout.tsx` | Create | Mount único del `PopupHost` |
| `docs/handoff/popups/README.md` | Create (copy) | Copia canonical del handoff |
| `docs/handoff/popups/AI Hub Minimal.dc.html` | Create (copy) | Referencia visual |

## Interfaces

```ts
// components/ui/Modal.tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;   // id del <h2> del popup
  children: ReactNode;
}

// components/popups/CommunityPopup.tsx
interface CommunityPopupProps {
  open: boolean;
  onClose: () => void;
}

// components/popups/PopupHost.tsx
// Sin props. Estructura interna:
interface PopupDef {
  id: string;
  Component: React.ComponentType<{ open: boolean; onClose: () => void }>;
}
const POPUPS: PopupDef[] = [
  { id: 'community-2026-06', Component: CommunityPopup },
];
const STORAGE_KEY = (id: string) => `aihub:popup:${id}:dismissed`;
const POPUP_DELAY_MS = 800;
```

## Testing Strategy

`config.yaml` declara *"Frontend: sin testing en MVP"*. La verificación es manual contra los criterios del proposal:

| Capa | Qué probar | Cómo |
|------|------------|------|
| Manual | Tokens (light/dark) | Toggle tema, ambos se ven correctos |
| Manual | Cierre por X / scrim / Esc / CTA / "Quizás más tarde" | Cada vía cierra + persiste |
| Manual | No re-aparece | Dismiss + reload + navegar entre páginas públicas |
| Manual | A11y focus | Tab/Shift+Tab queda dentro del dialog |
| Manual | A11y Esc | Esc cierra |
| Manual | A11y scroll lock | No scrollea el fondo mientras está abierto |
| Manual | A11y focus return | Después de cerrar, foco vuelve al link "Comunidad" |
| Manual | `prefers-reduced-motion` | DevTools → Rendering → Emulate reduced motion → no animation |
| Manual | Admin aislado | Visitar `/admin` → no aparece popup |
| Manual | SSR | View source del HTML público → no hay markup del popup |

## Migration / Rollout

Sin migración. Cambio puramente aditivo. Las claves `aihub:popup:*` en `localStorage` están namespaced y no chocan con nada. Rollout = deploy normal. Rollback = `git revert` del último commit (sin datos que migrar atrás).

## Open Questions

- **Discord URL**: placeholder por ahora (`https://discord.gg/PLACEHOLDER`). El usuario proveerá la URL real cuando esté lista. No bloquea el desarrollo.
- **Re-show manual**: si un usuario descarta por error, hoy NO tiene cómo volver a abrir el popup. Out of scope del proposal; documentado para futuro.

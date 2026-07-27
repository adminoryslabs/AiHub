# Handoff · AI Hub — Sistema de Popups (modal de novedades)

## Qué es esto
Un **sistema de popups de novedades** para la web pública de AI Hub: un modal centrado que
aparece al entrar y comunica algo puntual (una novedad, un anuncio, una invitación). El
**primer popup** es una **invitación a unirse a la comunidad**.

Se entrega como handoff aparte a propósito: el rediseño de UI "Minimal" ya se ejecutó en el
proyecto; esto se **suma encima** sin volver a tocar aquella entrega.

## Archivos de este paquete
- `AI Hub Minimal.dc.html` — prototipo de referencia. La barra superior oscura es andamiaje de
  revisión (NO es parte del diseño); tiene un botón **"Ver popup"** para reabrir el modal, y el
  toggle claro/oscuro para verlo en ambos temas. El popup también aparece solo al cargar.
- `README.md` — esta espec.

> El `.dc.html` es referencia visual, no código de producción. Recrear en `packages/web`
> (Next.js + Tailwind) con los tokens y componentes ya existentes tras el rediseño Minimal.

## Fidelidad
**Alta** para el aspecto del modal (usa los mismos tokens del sistema Minimal ya implementado).
La lógica de "cuándo aparece" es una recomendación razonable — ajústala a tu analítica/producto.

---

## A) El componente Modal (genérico y reutilizable)
Piénsalo como `components/ui/Modal.tsx` + un contenido específico por popup. El sistema debe
soportar **varios popups en el tiempo**; este de comunidad es el primero.

### Estructura visual (mismo lenguaje que la UI Minimal)
- **Scrim / overlay:** cubre el viewport, `backdrop-filter: blur(3px)`.
  - Light: `rgba(18,20,31,.32)`  ·  Dark: `rgba(4,5,12,.66)`.
  - Clic en el scrim = cerrar.
- **Tarjeta:** `max-width: 432px`, ancho 100% con `padding` lateral en móvil. Fondo
  `--color-surface` (var `--bg` del prototipo = fondo de página), **borde `1px` tinta**
  (`--color-outline`), **esquinas afiladas** (0–2px), sombra de elevación
  `0 24px 60px rgba(0,0,0,.28)` (única excepción de sombra, por ser overlay).
- **Franja de acento** superior: barra `height:6px` en chartreuse puro (`--color-primary`).
- **Botón cerrar (X):** arriba-derecha, `32×32`, borde `outline-variant`, fondo `surface`,
  ícono `close` (Material Symbols).

### Contenido (slots)
- **Kicker** (mono, `JetBrains Mono`, MAYÚS, `letter-spacing:0.14em`, color `--color-primary-text`
  = `#4d7c0f` en light / `#a3e635` en dark). Ej: `NOVEDAD · COMUNIDAD`.
- **Título** (`Space Grotesk` 600, ~30px, tracking `-0.03em`).
- **Cuerpo** (`Inter`, ~15.5px, `--color-on-surface-variant`).
- **Acciones** (columna, `gap:10px`):
  - **CTA primaria:** `height:48px`, fondo `--color-primary` (chartreuse), texto
    `--color-on-primary` (tinta oscura `#12141f` — **no** blanco), ícono opcional. Esquinas rectas.
  - **CTA secundaria / descartar:** `height:42px`, transparente, borde `outline-variant`, texto
    `on-surface-variant`.

### Accesibilidad / comportamiento
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` al título.
- **Focus trap** dentro del modal; foco inicial en la tarjeta o el CTA; `Esc` cierra.
- Al abrir, **bloquear el scroll** del fondo (`overflow:hidden` en body).
- Devolver el foco al elemento que lo abrió al cerrar.
- Respetar `prefers-reduced-motion` (sin animación de entrada si está activo). Si animas:
  fade + leve translateY, ~150ms.

---

## B) Contenido del primer popup — "Únete a la comunidad"
- Kicker: `NOVEDAD · COMUNIDAD`
- Título: **Únete a la comunidad**
- Cuerpo: "Resuelve dudas, comparte lo que aprendes y entérate primero de las nuevas guías.
  Cientos de personas explorando la IA generativa, sin humo."
- CTA primaria: **Entrar al Discord** (ícono `forum`) → URL del Discord. Al hacer clic, cerrar +
  marcar como visto.
- CTA secundaria: **Quizás más tarde** → cerrar + marcar como visto.

---

## C) Lógica de "cuándo mostrar" (recomendada)
Piensa cada popup con un **id** y una **regla de frecuencia**, guardado en `localStorage`
(o cookie / campo de usuario si hay login):

- Clave sugerida: `aihub:popup:<id>:dismissed` = timestamp. Este popup: `id = community-2026-06`.
- **Mostrar** si no existe la clave (usuario nuevo o que no lo ha descartado).
- Al **cerrar por cualquier vía** (X, scrim, Esc, CTA, "más tarde"), escribir la clave → no
  vuelve a salir.
- **No** mostrar en cada navegación de página (SPA): solo una vez por sesión/usuario según la
  clave. Idealmente, retrasar ~600–1200ms tras cargar para no competir con el primer paint.
- Para reemplazarlo por el **siguiente** popup en el futuro, basta con un nuevo `id`.
- Nunca borres claves de `localStorage` que no sean de este sistema.

> En el prototipo el popup arranca abierto en cada carga (solo para revisión) y se reabre con el
> botón "Ver popup" del andamiaje. En producción manda la regla de `localStorage` de arriba.

---

## Archivos a tocar (repo `packages/web`)
- `components/ui/Modal.tsx` — **nuevo**: shell genérico (scrim, tarjeta, franja de acento, X,
  focus trap, bloqueo de scroll, `Esc`, slots de contenido).
- `components/popups/CommunityPopup.tsx` — **nuevo**: contenido del popup de comunidad usando el
  Modal.
- `components/popups/PopupHost.tsx` (o un hook `usePopup`) — **nuevo**: decide qué popup mostrar y
  gestiona la regla de `localStorage`. Montado una vez en el layout público.
- `app/(public)/[lang]/layout.tsx` (o el layout público equivalente) — montar el `PopupHost`.
- Reusar tokens ya existentes de `globals.css` (`--color-primary`, `--color-on-primary`,
  `--color-primary-text`, `--color-surface`, `--color-outline`, `--color-outline-variant`,
  `--color-on-surface`, `--color-on-surface-variant`). No definir colores nuevos.

## Criterios de aceptación
1. El modal usa exactamente los tokens del sistema Minimal; se ve correcto en claro y oscuro.
2. Franja chartreuse superior; CTA primaria chartreuse con texto en tinta oscura (no blanco);
   esquinas afiladas; borde tinta; scrim con blur.
3. Cierra por X, scrim, `Esc`, CTA y "Quizás más tarde"; cualquiera marca como visto.
4. No reaparece una vez descartado (regla `localStorage` por `id`); no sale en cada page view.
5. Accesible: `role=dialog`, `aria-modal`, focus trap, foco devuelto, scroll bloqueado,
   `prefers-reduced-motion` respetado.
6. Arquitectura lista para añadir futuros popups cambiando solo el `id` + contenido.

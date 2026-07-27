# Popups Specification

> Source of truth for the `popups` capability. Created from change `popups` on 2026-07-26.

## Purpose

Define a generic, accessible modal system for the public site of AI Hub that can host one-off announcements (first release: community invitation) and persist a "dismissed" state per popup id in `localStorage`.

## Requirements

### Requirement: Generic Modal shell

The system SHALL provide a generic `Modal` component that hosts arbitrary content via children and is responsible for ALL accessibility behavior (focus trap, scroll lock, `Esc`, scrim dismissal, focus return, `prefers-reduced-motion`).

#### Scenario: Closed by default

- GIVEN the Modal is rendered with `open={false}`
- WHEN the parent renders
- THEN the Modal SHALL NOT render any DOM

#### Scenario: Opens with scrim and card

- GIVEN the Modal is rendered with `open={true}`
- WHEN the parent renders
- THEN the Modal SHALL render a scrim covering the viewport AND a centered card with `role="dialog"` and `aria-modal="true"`

#### Scenario: Focus is trapped

- GIVEN the Modal is open
- WHEN the user presses `Tab` repeatedly
- THEN focus SHALL remain within the dialog

#### Scenario: Esc closes

- GIVEN the Modal is open
- WHEN the user presses `Esc`
- THEN `onClose` SHALL be invoked

#### Scenario: Scrim click closes

- GIVEN the Modal is open
- WHEN the user clicks the scrim (outside the card)
- THEN `onClose` SHALL be invoked

#### Scenario: Body scroll is locked

- GIVEN the Modal is open
- WHEN measured
- THEN `document.body` SHALL have `overflow:hidden`

#### Scenario: Focus is restored on close

- GIVEN the Modal was opened while another element had focus
- WHEN the Modal closes
- THEN focus SHALL return to that previously focused element

#### Scenario: Reduced motion respected

- GIVEN the user has `prefers-reduced-motion: reduce`
- WHEN the Modal opens
- THEN the Modal SHALL NOT run any entrance animation

### Requirement: Popup content components

The system SHALL allow popup content components that use the Modal shell. The first content component SHALL be `CommunityPopup` with kicker, title, body, primary CTA (chartreuse, dark-ink text), and secondary CTA.

#### Scenario: Community popup renders the required slots

- GIVEN the `CommunityPopup` is rendered open
- WHEN inspected
- THEN it SHALL contain a kicker "NOVEDAD · COMUNIDAD", a title "Únete a la comunidad", a body paragraph, a primary CTA "Entrar al Discord" in chartreuse with `--color-on-primary` text, and a secondary CTA "Quizás más tarde"

### Requirement: PopupHost orchestrates popups

The system SHALL provide a `PopupHost` that, after mounting, decides which registered popups to show based on per-id dismiss keys in `localStorage`.

#### Scenario: New user sees the registered popup

- GIVEN no key `aihub:popup:community-2026-06:dismissed` exists
- WHEN the `PopupHost` mounts on a public page
- THEN the community popup SHALL appear after a delay (~800ms)

#### Scenario: Dismissed user does not see the popup

- GIVEN a key `aihub:popup:community-2026-06:dismissed` exists in `localStorage`
- WHEN the `PopupHost` mounts on a public page
- THEN the community popup SHALL NOT appear

#### Scenario: Any close path writes the dismiss key

- GIVEN the community popup is open
- WHEN the user dismisses via X, scrim, `Esc`, the primary CTA, or "Quizás más tarde"
- THEN the key `aihub:popup:community-2026-06:dismissed` SHALL be written to `localStorage` AND the popup SHALL close

#### Scenario: Community CTA opens Discord in a new tab

- GIVEN the community popup is open
- WHEN the user clicks the primary CTA "Entrar al Discord"
- THEN the Discord URL SHALL open in a new browser tab (`target="_blank"`)
- AND the popup SHALL close AND the dismiss key SHALL be written

#### Scenario: No re-show within SPA navigation

- GIVEN the community popup is open
- WHEN the user navigates to another public page
- THEN the popup SHALL NOT be re-shown on the new page (single instance per session)

#### Scenario: SSR-safe localStorage access

- GIVEN the server renders the public layout
- WHEN the server response is produced
- THEN `PopupHost` SHALL NOT read `localStorage` on the server (no hydration mismatch)

#### Scenario: localStorage unavailable

- GIVEN `localStorage` access throws (e.g., private mode)
- WHEN the `PopupHost` mounts
- THEN the popup SHALL still be shown (graceful degradation — no crash)

### Requirement: PopupHost mounts in the public layout only

The system SHALL mount `PopupHost` exclusively in the public site layout. The admin panel SHALL NOT trigger popups.

#### Scenario: Public pages can show popups

- GIVEN a request to a public route (e.g., `/es`)
- WHEN the page renders
- THEN `PopupHost` SHALL be present in the React tree

#### Scenario: Admin pages do not show popups

- GIVEN a request to an admin route
- WHEN the page renders
- THEN `PopupHost` SHALL NOT be present in the React tree

### Requirement: First registered popup

The system SHALL register one popup on first release with id `community-2026-06` mapping to the `CommunityPopup` component.

#### Scenario: Registry contains community-2026-06

- GIVEN the `PopupHost` is mounted
- WHEN the registry is read
- THEN it SHALL contain exactly one entry: `{ id: "community-2026-06", Component: CommunityPopup }`

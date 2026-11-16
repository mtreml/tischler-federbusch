# Plan: sticky centered name + permanent white nav bar

## Current behavior

- The name lives in `.landing__lockup` (absolute, centered at 50% of the landing fold).
- `src/components/layout/NameScroll.tsx` animates it with a JS transform:
  travel starts when the logo's bottom crosses the viewport top (`s0`) and ends
  when the name's top reaches the header slot (`s1`). During travel the name is
  translated **left** into the gutter (`dx`) and up; after `s1` it is pinned
  top-left.
- `src/components/layout/Header.tsx` fades in a full-width white background
  (`header__background`) whose opacity is the travel progress, shared via
  `src/lib/landing-scroll.ts`.
- The impressum page mounts `<Header />` as-is: same background layer,
  hamburger, **no name** in the bar.
- The menu overlay shows its own name slot at `--name-header-left`
  (top-left) in `src/styles/menu.css`.

## Goal

1. **Remove the travel animation.** The name scrolls up with the page and
   sticks to the top as soon as its natural top edge reaches the header slot
   (`--name-header-top`). Horizontal position never changes (stays centered).
2. **White nav bar appears when the white part starts.** On the landing
   document, the moment the white works section reaches the viewport top, a
   permanent white bar spans the full width at the top and acts as the
   navigation menu: name in the center (the same pinned name), hamburger on
   the right. It stays for all further scroll positions.
3. **White nav always visible on impressum** (all scroll positions), but not
   on the landing page while the video fold is on screen.

## Changes

### 1. `src/components/layout/NameScroll.tsx` — replace travel with stick

- Drop `dx` and the `s0`/`s1` interpolation entirely.
- Measure the name's resting position (transform cleared) and compute
  `sStick` = the scrollY at which the name's natural top edge reaches
  `--name-header-top`.
- Per frame: `translateY(max(0, scrollY - sStick))` — pure stick, no easing,
  no horizontal component.
- The name's resting x is already centered (lockup at `left: 50%`), so the
  pinned name is automatically the bar's centered name — no second name
  element needed in the landing document.
- Reduced motion: behavior is identical (stick is not an animation).

### 2. `src/lib/landing-scroll.ts` — progress → bar visibility

- The single progress value is replaced by (or supplemented with) a boolean
  `barVisible`: false while the landing fold is on screen, true once the
  white part has started. Same module-store + `useSyncExternalStore` pattern.
- Writer: the same scroll handler (it already measures the document); it
  needs the white section's top. Measure `WorksSection`'s `offsetTop` (or
  the landing section's bottom) on mount + resize.
- Reader: `Header` sets `header__background` opacity to 0/1 from the store.

### 3. `src/components/layout/Header.tsx`

- `header__background` opacity: 0/1 from `barVisible` (landing document) or
  always 1 (page variant). No opacity tied to name travel anymore.
- Page variant (impressum): render a centered `<Name>` in the header slot
  (new CSS: absolute, `top: var(--name-header-top)`, horizontally centered,
  width per the existing `--name-width*` tokens). The name in the landing
  document stays the one sticky element; impressum gets its own static one
  since there is no landing there.
- Simplest shape: `Header` gains a variant prop — `'landing'` (current
  default, name provided externally by the stage) and `'page'` (opaque bar
  + own centered name), used by the impressum page.

### 4. CSS

- `src/styles/landing.css`:
  - `.header__background`: opacity driven by state (e.g.
    `[data-bar='visible']` on the header, or the existing inline-style
    approach with 0/1 values); remove the per-frame opacity linkage.
  - Pinned name: no left offset needed (centered by the lockup).
- `src/config/tokens.css`: `--name-header-left` may become unused for the
  pinned name; keep it only if the menu overlay still uses it (see Q3).
- `src/styles/menu.css`: possibly recenter `.menu__name` — pending Q3.

### 5. Touch points to verify afterwards

- Menu open/close over the white bar (name slot alignment).
- Transition overlay name slot (must not move — it reads the same tokens).
- Impressum: bar visible from first paint, name + hamburger, correct widths
  per breakpoint.
- Resize mid-stick: re-measure keeps the name centered and stuck.
- `prefers-reduced-motion`: no regressions.

## Open questions

1. **Interpretation check:** on the landing document the white bar appears
   exactly when the white works section reaches the viewport top and stays
   ("not on the landing page" = not while the video fold is on screen) — and
   on impressum the bar is always visible **including the centered name**
   (today impressum has no name in the bar). Correct?
2. **Bar appearance:** instant switch when the white part starts, or a short
   fade?
3. **Menu overlay name slot:** currently top-left
   (`--name-header-left`). Should it move to the center now, to match the
   new bar?
4. **Name over the video between stick and white start:** after the name
   sticks to the top center, it sits over the video for the remainder of the
   fold (no bar yet). That is the expected look?

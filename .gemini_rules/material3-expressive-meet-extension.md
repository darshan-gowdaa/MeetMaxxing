# Material 3 Expressive — Google Meet Chrome Extension Guide

> Reference doc for building a Chrome extension UI for Google Meet using Material 3 Expressive (spring-based motion, new components, dynamic color, typography, shape system) and the Manifest V3 patterns needed to inject it safely into a live meet.google.com page. Drop this file into your agent's context (e.g. as `AGENTS.md`, `CLAUDE.md`, a Cursor/Windsurf rules file, or just reference it directly) whenever a task touches the extension's UI.

## Contents

1. [Overview, decision guide & workflow](#overview-decision-guide--workflow)
2. [Motion system](#motion--the-motion-physics-system)
3. [Color, typography, shape](#color-typography-and-shape)
4. [Components](#components--whats-new-whats-updated-where-to-use-it)
5. [Resources](#where-to-get-everything)
6. [Chrome extension architecture](#getting-this-ui-safely-into-a-live-meetgooglecom-page)

---

## Overview, decision guide & workflow

Material 3 Expressive ("M3 Expressive") is Google's current evolution of Material Design — not a new major version, an expansion of Material 3 with a physics-based motion system, 15+ new/updated components, an emphasized type scale, and a 35-shape morphing library. Google Meet, Gmail, and most first-party Google apps have been migrating to this look since 2025. An extension that adopts the same tokens will read as *part of* Meet rather than bolted onto it.

The catch: **Google's official web component library (`@material/web`) is in maintenance mode and does not implement the Expressive layer.** Expressive today lives mainly in Jetpack Compose (Android). For the web you need a mix of a community component library and hand-applied design tokens. This skill exists to fill that gap accurately — don't assume `@material/web` alone gets you the Expressive look.


## Decision guide

| You're building... | Start here |
|---|---|
| A quick popup (click the toolbar icon) | `@m3e/web` components directly — small surface, no collision risk with Meet's own DOM |
| An in-call floating toolbar/overlay injected into the meet.google.com page | the Chrome Extension Architecture section first (shadow DOM is mandatory here), then the Components section for FAB menu / button groups / icon buttons |
| A persistent panel of controls next to the call | Prefer `chrome.sidePanel` API over DOM injection — sidesteps Meet-collision entirely (see the Chrome Extension Architecture section) |
| A settings/options page | Standard M3 components (lists, switches, text fields) at the **Standard** motion scheme, not Expressive — settings screens are dense and utilitarian, save the springy bounce for hero moments |
| Just want the visual language (color/type/shape) without installing a library | the Color/Typography/Shape section + the Motion section give you everything as CSS custom properties |

## Workflow

1. **Pick a seed color.** Either let the user choose one in your popup (the "Material You" personalization move) or seed off Meet's own brand palette. Run it through Material Theme Builder to get full light/dark tonal palettes and color-role tokens as CSS custom properties. (the Resources section → Theme Builder)
2. **Set up type.** Bundle Google Sans Flex (Brand, for headlines/emphasis) and Roboto Flex (Plain, for body/labels) locally — don't rely on a CDN inside a content script. (the Color/Typography/Shape section, the Chrome Extension Architecture section)
3. **Install `@m3e/web`** for the components you actually need (tree-shake the rest), and fall back to `@material/web` or plain HTML for boring, stable components it doesn't cover yet. (the Resources section)
4. **Apply motion tokens** as CSS custom properties (12 tokens: 2 schemes × 2 categories × 3 speeds). Use Expressive for anything that appears/moves inside the call UI; use Standard for dense settings screens. Respect `prefers-reduced-motion`. (the Motion section)
5. **Build the injection layer**: shadow DOM root, locally bundled assets, correct manifest permissions, and a z-index/stacking strategy that survives Meet's own high-stacking video layer. (the Chrome Extension Architecture section)
6. **Check contrast and motion sensitivity** before shipping — custom seed colors need a WCAG re-check even though M3's on-color pairs are contrast-safe by construction.

## The thing to keep repeating to yourself

Expressive is Google's *opinionated* default, not mandatory everywhere. Official guidance is explicit: most of a product should share one motion scheme, and you selectively swap to the other for emphasis. Don't make every single element in the extension bounce — reserve spatial-spring overshoot for the 1-2 interactions per screen that deserve a moment of delight (a FAB menu opening, a call-action confirming), and keep informational/list-heavy surfaces calmer.

---

## Motion — the "motion physics system"

Official spec: https://m3.material.io/styles/motion/

M3 Expressive replaced the old duration+easing-curve model with a **spring-based** model. Instead of tuning `duration` and `cubic-bezier` by hand for every transition, you pick a **token**, and the token already encodes physically-plausible spring behavior (it can overshoot and settle, like a real object).

### The token grid

Two **schemes** × two **categories** × three **speeds** = 12 tokens.

**Schemes**
- **Expressive** — Material's opinionated default. Bouncy, energetic, overshoots noticeably. Use for most product surfaces, especially hero moments and key interactions.
- **Standard** — calmer, minimal/no overshoot. Use for dense, functional, or high-frequency UI (settings lists, data tables) where constant bounce would be fatiguing.

A product should mostly commit to one scheme and swap to the other only for specific moments of emphasis — not mix per-component arbitrarily.

**Categories**
- **Spatial** springs — for anything that *moves*: x/y position, size, rotation, corner radius. These **overshoot** the target and settle back, which is what reads as "springy."
- **Effects** springs — for color and opacity changes. These do **not** overshoot (you don't want a color to "overshoot" past its target and back).

**Speeds**: `fast`, `default`, `slow`. Use `default` for most motion. Use `fast` for small elements (icon buttons, chips). Use `slow` for large elements (full panels, big surfaces). The relative ordering (fast < default < slow) holds across schemes; exact values differ slightly by device class (phone/tablet/wearable/web).

### Practical CSS approximations

The canonical spring parameters live only in the interactive spec page (JS-rendered, not scrapeable as static text) — treat the values below as community-verified **starting points**, not gospel, and eyeball/tune against the live spec if you need pixel-perfect parity:

```css
:root {
  /* --- Expressive scheme --- */
  --m3e-spatial-fast:     0.35s cubic-bezier(0.42, 1.67, 0.21, 0.90);
  --m3e-spatial-default:  0.50s cubic-bezier(0.38, 1.21, 0.22, 1.00);
  --m3e-spatial-slow:     0.65s cubic-bezier(0.39, 1.29, 0.35, 0.98); /* interpolated — verify */

  --m3e-effects-fast:     0.15s cubic-bezier(0.31, 0.94, 0.34, 1.00);
  --m3e-effects-default:  0.20s cubic-bezier(0.34, 0.80, 0.34, 1.00);
  --m3e-effects-slow:     0.30s cubic-bezier(0.34, 0.88, 0.34, 1.00);

  /* --- Standard scheme (calmer, minimal overshoot) --- */
  --m3-std-spatial-fast:    0.35s cubic-bezier(0.27, 1.06, 0.18, 1.00);
  --m3-std-spatial-default: 0.50s cubic-bezier(0.27, 1.06, 0.18, 1.00);
  --m3-std-spatial-slow:    0.75s cubic-bezier(0.27, 1.06, 0.18, 1.00);
}

/* Usage: only animate compositor-friendly properties */
.fab-menu-item {
  transition: transform var(--m3e-spatial-default),
              opacity var(--m3e-effects-default);
}
```

Always animate `transform` and `opacity`, not `width`/`height`/`top`/`left` — this matters more than usual here because the extension shares CPU/GPU with Meet's live video encode, and layout-thrashing animations will visibly stutter during a call.

### When you need a real multi-oscillation spring, not just an overshoot curve

A single `cubic-bezier` can overshoot once, but it can't do a genuine damped oscillation (bounce, settle, bounce again) or **interrupt and re-target mid-flight** the way a true physics spring can (useful for drag gestures, e.g. dragging a floating toolbar). For that, use an actual spring solver instead of CSS transitions:

- **Web Animations API** with a JS-computed keyframe spring (compute positions frame-by-frame with `mass`/`stiffness`/`damping`, feed as keyframes).
- A small spring library (e.g. a Framer-Motion-style spring or `react-spring`, if you're building the UI in React) — you don't need the whole library, most ship a standalone `spring()` easing helper.
- CSS `linear()` easing (modern browsers) can bake an arbitrary spring curve, including multiple oscillations, into a single CSS `transition-timing-function` — this is the closest thing to a "real" CSS spring today. Generate the keyframe list from a spring simulation function and pass it into `linear(...)`.

Typical spring parameter starting points (tune to taste): `stiffness: 300–500`, `damping: 25–35`, `mass: 1`. Higher stiffness = faster/snappier; lower damping = more bounce.

### Where to use which token (cheat sheet)

| Interaction | Token |
|---|---|
| Icon button press / chip select | spatial fast |
| Dialog, sheet, or panel opening | spatial default |
| Full-surface transition (e.g. popup → full settings view) | spatial slow |
| FAB → FAB menu expand | spatial default (the FAB itself), spatial fast (each menu item, staggered) |
| Snackbar/toast in/out | effects default (fade) + spatial fast (slight slide) |
| Hover/focus color change, container tint | effects fast |
| Loading indicator shape morph | effects default, looping |

### Accessibility: respect reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --m3e-spatial-fast: 0.01s linear;
    --m3e-spatial-default: 0.01s linear;
    --m3e-spatial-slow: 0.01s linear;
    /* keep effects (color/opacity) motion — it's not vestibular-triggering —
       but drop spatial overshoot entirely, or swap to the Standard scheme's
       flatter curves instead of killing motion outright */
  }
}
```

---

## Color, typography, and shape

These three, plus motion, are the "levers" Google's own research (46 studies, 18,000+ participants) found actually move usability and emotional response. Use them together, not in isolation.

---

### Color — dynamic color / HCT

M3 doesn't ship fixed hex palettes. Everything derives from a single **seed color** through the **HCT** color space (Hue, Chroma, Tone — a perceptually-uniform model, distinct from HSL/HSB).

- The seed generates 5-6 **tonal palettes** (Primary, Secondary, Tertiary, Neutral, Neutral Variant, Error), each with tones 0 (black) to 100 (white).
- Specific tones are then assigned to ~30 **color roles**: `primary`, `on-primary`, `primary-container`, `on-primary-container`, same pattern for secondary/tertiary/error, plus `surface`, `surface-dim`, `surface-bright`, `surface-container-lowest/low/(default)/high/highest`, `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `inverse-surface`, `inverse-on-surface`, `inverse-primary`, `scrim`, `shadow`.
- Because roles (not raw hexes) drive contrast pairing (`on-primary` is guaranteed readable on `primary`), swapping the whole theme (light↔dark, or a different seed) never breaks contrast — as long as you style by role, not by hand-picked hex.

**For a Meet extension:** two good seed strategies —
1. Let the user pick a seed color in your popup/settings (personal, "Material You" feel), independent of Meet's own theme.
2. Seed from Meet's own brand color so the extension visually belongs to the product it's extending.

Either way, generate the tokens with **Material Theme Builder** (see the Resources section) rather than hand-picking hexes — it exports light+dark CSS custom properties directly.

```css
:root {
  --md-sys-color-primary: #...;
  --md-sys-color-on-primary: #...;
  --md-sys-color-primary-container: #...;
  --md-sys-color-surface: #...;
  --md-sys-color-surface-container-high: #...;
  /* ...full role set from Theme Builder export */
}
```

Detect Meet's own light/dark state (Meet defaults to dark in-call) and `prefers-color-scheme`, and swap your `:root`/`:host` block accordingly — don't hardcode one theme.

---

### Typography — the expressive type scale

- **Roles**: Display, Headline, Title, Body, Label.
- **Sizes**: Large, Medium, Small.
- 5 roles × 3 sizes = **15 baseline styles**.
- The Expressive update added a **parallel emphasized set** — same 15 role/size combinations, but heavier weight and tuned for hierarchy/CTAs (e.g. "Begin recording", unread badges). Baseline and emphasized are meant to be used *together*, not as a replacement — **30 styles total**, each a single design token.

**Two font "slots"** (this is the actual Material approach, not just "pick one font"):
- **Brand** font — more expressive/decorative, used for the moments you want personality (large headlines, hero text, product name).
- **Plain** font — highly legible workhorse, used for body copy, labels, dense UI text.

**Fonts to actually use** (both free, both what Google itself now ships):
- **Google Sans Flex** — Google's own brand variable font, open-sourced under the SIL Open Font License in late 2025 and now on Google Fonts. This is literally the typeface driving the current Material 3 Expressive look across Google's own apps (Meet included). Use it for the **Brand** slot. Variable axes: weight, width, optical size, slant, grade, roundedness.
- **Roboto Flex** — the long-standing Material default, also a free variable font (Apache 2.0 / SIL OFL) on Google Fonts, huge weight/width/optical-size/grade range. Use it for the **Plain** slot (body text, labels — it's tuned for legibility at small sizes).

Bundle both locally in the extension (don't hotlink Google Fonts' CDN from inside a content script — see the Chrome Extension Architecture section).

```css
:root {
  --md-sys-typescale-brand-font: 'Google Sans Flex', system-ui, sans-serif;
  --md-sys-typescale-plain-font: 'Roboto Flex', system-ui, sans-serif;

  --md-sys-typescale-headline-large: 400 32px/40px var(--md-sys-typescale-brand-font);
  --md-sys-typescale-headline-large-emphasized: 500 32px/40px var(--md-sys-typescale-brand-font);
  --md-sys-typescale-body-medium: 400 14px/20px var(--md-sys-typescale-plain-font);
  --md-sys-typescale-label-large-emphasized: 600 14px/20px var(--md-sys-typescale-plain-font);
  /* ...full 30-token set */
}
```

---

### Shape

- **Shape scale** (corner-radius tokens, not raw pixel values): `none` (0), `extra-small` (~4px), `small` (~8px), `medium` (~12px), `large` (~16px), `extra-large` (~28px), `full` (fully rounded/pill — Expressive changed this from "50% of component size" to a literal full-round token, so very large components still get a clean pill rather than a huge radius number).
- **The 35-shape library** (Expressive addition): decorative, morphable non-rectangular shapes — cookie/scallop/clover/burst/pill/arch/sunny and more — available in Figma (Material Shapes library) and as path data. Every shape can morph smoothly into every other shape (shape morph), and morphing is also used to communicate component *state* (selected/pressed/dragged), not just decoration.
- Use shape scale tokens for containers, cards, buttons, sheets — routine UI structure.
- Use the 35-shape library sparingly and intentionally for decorative/branding moments: an avatar frame, an image crop, a background accent, or — a genuinely useful one for a Meet extension — a **loading indicator that morphs between shapes** while an in-extension feature (e.g. an AI summary) is processing. Don't use abstract shapes on core interactive controls; it reduces clarity there.

For the web, you'll typically need to hand-port shape path data from the Figma library into SVG `<clipPath>`/`path` data, or lean on a component library that already ships a morphing loading indicator (see the Resources section — `@m3e/web` includes one).

---

## Components — what's new, what's updated, and where to use it in a Meet extension

Full official catalog: https://m3.material.io/components

### The 5 genuinely new Expressive components

| Component | What it is | Use it in your Meet extension for... |
|---|---|---|
| **Button groups** | A container that holds multiple buttons/icon buttons of varying shapes/sizes and coordinates their shape+motion as a set (works across button sizes XS–XL) | Your in-call floating toolbar (mute/camera/react/leave-style row of actions) — this is the component built for exactly that pattern |
| **FAB menu** | Replaces the old "speed dial"/stacked small-FABs pattern. Opens from any FAB size/color into a set of large, contrasting menu items | A single floating action button that expands into your extension's quick actions (e.g. "Summarize," "Translate," "Take note") during a call |
| **Loading indicator** | A new indeterminate indicator built around shape morphing rather than a plain spinner | Any async extension action — "generating summary," "transcribing" — pairs naturally with the 35-shape library |
| **Split button** | Primary action + attached dropdown for related secondary actions | "Start recording ▾" where the dropdown offers "record audio only," "schedule," etc. |
| **Toolbars** | A dedicated floating/docked toolbar component (distinct from the app bar) — shape, motion, and width behavior tuned for grouped actions | The natural container for your in-call overlay controls, especially combined with Button groups |

### The 9 updated components (already existed, got Expressive treatment)

`App bars`, `Carousel`, `Common buttons`, `Extended FAB`, `FABs`, `Icon buttons`, `Navigation bar`, `Navigation rail`, `Progress indicators` — all gained new shape options, emphasized text support, and motion updates. If your extension has a settings page with navigation, this is where Navigation rail/bar apply.

### Newer (2026) additions worth knowing about

Google's I/O 2026 update layered on top of the original Expressive set:
- **Expressive lists and menus** — updated visual style, motion, and more flexible trailing-icon configuration.
- **Expressive search** — new visual style + motion for search components.
- **Expressive layout system** — a scaffold + **8dp spacing system** for adapting components/layouts across device types and density — worth adopting for consistent spacing between your popup, side panel, and overlay if you want them to feel like one coherent product rather than three separately-designed screens.

### Standard M3 components you'll still need (not Expressive-exclusive, but stable and required)

Text fields, dialogs, switches, checkboxes, radio buttons, menus, tooltips, snackbar, dividers, lists, cards, chips. These didn't get an Expressive-specific redesign in the same way, but they're the load-bearing components for a settings page or any form-heavy surface. Both `@material/web` and `@m3e/web` cover these — use whichever library you've already committed to for consistency.

### Mapping components to extension surfaces

| Surface | Recommended components | Motion scheme |
|---|---|---|
| Toolbar popup (click the icon) | Cards, list items, a couple of buttons, maybe a Split button for a primary action with options | Expressive (small surface, low risk, feels alive) |
| In-call floating overlay | Toolbar + Button groups + Icon buttons for the row of actions, FAB menu if you have >4 quick actions, Loading indicator for async ones, Snackbar for confirmations | Expressive, but spatial-fast/default only — keep it snappy, this sits over live video |
| Side panel (persistent) | Lists, cards, expressive Lists/Menus, tabs if multi-section | Expressive for panel-open/close, Standard for scrolling list interactions |
| Settings / options page | Text fields, switches, radio buttons, navigation rail/bar, dialogs | **Standard** scheme — dense, functional, shouldn't bounce on every toggle |
| Empty/first-run state | A decorative shape from the 35-shape library, Headline (emphasized) + Body text | Expressive, one-time hero moment |

### Practical build note

Reach for `@m3e/web` (see the Resources section) for anything in the "5 genuinely new" table above — that's exactly the gap Google's own web library hasn't filled. For everything in the "standard" table, either library works; pick based on bundle size and how much you've already committed to one dependency.

---

## Where to get everything

### Official documentation (source of truth — start here for exact specs)

- [m3.material.io](https://m3.material.io/) — the full design spec: color, typography, shape, motion, components, foundations.
- [m3.material.io/styles/motion](https://m3.material.io/styles/motion/) — the motion physics system, spring tokens (JS-rendered site — view it live for exact spring parameters rather than trusting scraped/reproduced numbers).
- [m3.material.io/components](https://m3.material.io/components) — every component's spec, anatomy, and usage guidance.
- [design.google](https://design.google/library/expressive-material-design-google-research) — the research behind Expressive (46 studies, 18,000+ participants) and the Google Design blog generally.
- [Android Developers Blog](https://android-developers.googleblog.com/) — component-level implementation guidance; Android-first, but the design rationale transfers directly to web.
- [m3.material.io/blog/whats-new-at-io26](https://m3.material.io/blog/whats-new-at-io26) — the 2026 additions: expressive layout system, spacing system, expressive lists/menus/search.

### Design files (Figma)

- **Material 3 Design Kit** — the official Figma component library/styles file. Search "Material 3 Design Kit" in Figma Community, or use the file linked from m3.material.io.
- **Material Theme Builder** (Figma plugin) — generates full light/dark tonal palettes and color-role tokens from a seed color or source image, exports as Figma styles or code tokens (CSS/XML/Compose/etc.). Also available as a standalone web app and as an [npm/GitHub package](https://github.com/material-foundation/material-theme-builder) if you want to generate tokens programmatically outside Figma (useful for a build step that regenerates your CSS custom properties from a seed color).
- **Material Shapes library** (Figma) — the 35-shape morph library, referenced from the Design Kit.

### Fonts

- [Roboto Flex on Google Fonts](https://fonts.google.com/specimen/Roboto+Flex) — variable, Apache 2.0 / SIL OFL, Material's long-standing default. Use for the "Plain" type slot (body/labels).
- [Google Sans Flex on Google Fonts](https://fonts.google.com/specimen/Google+Sans+Flex) — Google's brand variable font, open-sourced under SIL OFL in late 2025. This is the actual typeface behind the current Expressive look in Meet/Gmail/Workspace. Use for the "Brand" type slot (headlines/emphasis). Free for commercial use, no attribution required.
- **Material Symbols** — [fonts.google.com/icons](https://fonts.google.com/icons) — the current icon system (successor to Material Icons). Variable font, three styles (Outlined/Rounded/Sharp), four axes (Fill, Weight, Grade, Optical Size) so icon weight can match your type weight.

### Code libraries (web), ranked for this project

1. **[`@m3e/web`](https://github.com/matraic/m3e)** (+ `@m3e/react` if you're building in React, `@m3e/icons`) — a community-built, actively maintained (MIT-licensed, releases roughly monthly) set of genuine Material 3 **Expressive** web components: dialog, FAB menu, loading indicator with shape morph, split button, top app bar, list, snackbar, tabs, text field, tooltip, and more. This is currently the most complete way to get the actual new Expressive components on the web, since Google's own library doesn't have them yet. **Primary recommendation** for the "5 genuinely new" components in the Components section.
2. **[`@material/web`](https://github.com/material-components/material-web)** (Google's official library, `material-web.dev`) — solid, accessible implementation of **standard** M3 (buttons, text fields, dialogs, switches, checkboxes, menus). Explicitly noted by the maintainers as being in maintenance mode pending new maintainers, and it does not implement the Expressive shape/motion/typography layer. Fine as a base for the boring, stable components; don't expect Expressive polish from it.
3. **Hand-rolled CSS tokens** (the Motion section, the Color/Typography/Shape section in this doc) — needed regardless of which library you pick, since neither library ships the literal token values as ready-made CSS custom properties out of the box. Also your only option if you want a near-zero-dependency content script.
4. **[`@banegasn/*` packages](https://github.com/Banegasn/components)** — individual, cherry-pickable Expressive web components (`m3-fab-menu`, `m3-loading-indicator`, `m3-split-button`, `m3-snackbar`, `m3-dialog`, etc.) if you'd rather install just one or two components than a whole library.
5. **[`material-expressive-react`](https://github.com/prudhviraj5/material-expressive-react)** — a React-specific wrapper layering Expressive-ish styling/motion on top of `@material/web`'s custom elements, built explicitly to fill the same gap. Worth a look if you're React-only and want ergonomic props instead of raw custom elements.

**Status check before you commit:** official Expressive support for the web is a moving target — before starting, skim the [open feature request on `material-web`](https://github.com/material-components/material-web/issues/5888) and the `@m3e/web` release notes to confirm the above is still accurate; Google could ship official support at any point.

### Inspiration (for the design pass, before you start implementing)

Search Dribbble/Behance for: `"Material 3 Expressive"`, `"Material You expressive"`, `"spring animation mobile"`, `"morphing shapes UI"` — good for calibrating how much bounce/shape-play feels right before you start tuning cubic-beziers by hand.

---

## Getting this UI safely into a live meet.google.com page

Meet is a large, actively re-rendering Angular-ish app with its own Material-derived styles. Your extension UI has to coexist with that without either side breaking the other. This is as important as the visual design — a beautiful component tree that fights Meet's CSS or gets torn down mid-call is a worse outcome than something plainer that's stable.

### Pick your injection surface first

| Surface | How | When to use it |
|---|---|---|
| **Toolbar popup** | `action.default_popup` in the manifest, a completely separate small HTML page | Anything that doesn't need to overlay the call itself |
| **`chrome.sidePanel`** (MV3, Chrome 114+) | `"side_panel"` permission + `sidePanel.setOptions` | **Prefer this over DOM injection whenever the feature doesn't strictly require sitting on top of the video.** It runs in its own document, so you get zero collision risk with Meet's DOM/CSS, and it persists across tab navigation |
| **Content-script overlay injected into the page** | `content_scripts` in the manifest, building a UI tree and appending it to `document.body` | Only when you genuinely need to float over the video (e.g. a reaction bar, live captions overlay) — this is the highest-risk, highest-payoff option, and the rest of this file is mostly about doing it safely |

### Shadow DOM is not optional for content-script overlays

Attach a shadow root and mount every component inside it:

```js
const host = document.createElement('div');
host.id = 'my-ext-root';
host.style.cssText = 'position:fixed; inset:auto 16px 16px auto; z-index:2147483647;';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });
// mount your components, stylesheet, and design tokens inside `shadow`, not on `host`
```

Why this matters specifically here: Meet's own stylesheet is large and uses broad selectors; without a shadow boundary, your CSS resets can clobber Meet's layout and Meet's styles can silently override yours (e.g. your buttons inheriting Meet's font-size or box-sizing). A shadow root gives you a clean slate for your own M3 tokens and stops leakage in both directions. Note: CSS injected via the manifest's `content_scripts.css` or `chrome.scripting.insertCSS` does **not** cross into a shadow root — inject your component stylesheet directly inside the shadow root instead (a `<style>` tag or a Lit component's own `styles`).

### Bundle everything locally — don't fetch remotely at runtime

MV3's default CSP blocks remote code execution and inline scripts/`eval`. That means:
- Install `@m3e/web` (or whichever library) as an npm dependency and bundle it with esbuild/Vite/webpack into your content script — don't `<script src="https://...">` it in.
- Bundle Google Sans Flex / Roboto Flex font files and Material Symbols locally too; list them under `web_accessible_resources` in the manifest and reference via `chrome.runtime.getURL('fonts/...')` inside your shadow root's `@font-face`.
- If your component library is Lit-based (both `@m3e/web` and `@material/web` are), you're already CSP-friendly — Lit doesn't use `eval` or inline event-handler attributes.
- Tree-shake: only import the specific `@m3e/web` components you use (e.g. `@m3e/web/fab-menu.js`) rather than the whole package, to keep the content-script bundle small — content scripts load on every matching page load, so size matters more than it would for a normal web app.

### Manifest shape (illustrative)

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "sidePanel"],
  "host_permissions": ["https://meet.google.com/*"],
  "content_scripts": [{
    "matches": ["https://meet.google.com/*"],
    "js": ["dist/content.js"],
    "run_at": "document_idle",
    "world": "ISOLATED"
  }],
  "web_accessible_resources": [{
    "resources": ["fonts/*", "icons/*"],
    "matches": ["https://meet.google.com/*"]
  }],
  "side_panel": { "default_path": "sidepanel.html" }
}
```

Stay in the `ISOLATED` world unless you specifically need to call into Meet's own page-level JS — isolated worlds protect you from Meet's own scripts interfering with yours (and vice versa), at the cost of not sharing JS state with the page.

### Theme sync with Meet

Meet is dark by default in an active call. Read `prefers-color-scheme` **and**, if you can identify a reliable signal from Meet's own DOM (e.g. a class on `<html>`/`<body>`), prefer matching Meet's actual current theme over the OS setting, since a user can be in light-OS/dark-Meet or vice versa. Generate both light and dark token sets up front (Theme Builder does this in one pass) and swap the CSS custom property block on your shadow host, not by loading two separate stylesheets.

### Performance during a live call

The tab is already spending significant CPU/GPU on video encode/decode. Two rules:
- Animate only `transform` and `opacity` (compositor-only properties) — see the Motion section. Anything that touches layout (`width`, `top`, `left`) will compete with the call for main-thread time and visibly stutter.
- Avoid continuous/looping animations except where they're communicating real state (a loading indicator while something is actually processing) — a decorative idle animation is a bad trade against call quality.

### Stacking and layout

- Meet uses very high z-index stacking contexts for its video grid. Give your shadow host `position: fixed` and a maximal `z-index` (`2147483647`), and append it as a late child of `document.body` so it isn't accidentally trapped inside one of Meet's own lower stacking contexts.
- Leave a safe margin from Meet's own control bar (bottom-center) and the "more options" corner menus — don't assume you own the whole viewport.
- Test after Meet's own UI re-layouts (entering/leaving a call, toggling grid/sidebar view, screen share) — content scripts don't get re-run automatically on Meet's internal route changes, so make sure your overlay survives Meet's DOM churn (use a `MutationObserver` on a stable ancestor if you need to re-anchor after Meet re-renders its call-frame container).

### Accessibility

- Trap focus inside an open FAB menu / dialog; return focus to the trigger on close.
- Give the Snackbar an `aria-live="polite"` region.
- Respect `prefers-reduced-motion` (see the Motion section) — don't force spring overshoot on users who've asked their OS to minimize motion.
- Keep your overlay fully keyboard-operable; a call-overlay is exactly the kind of surface a screen-reader or keyboard-only user still needs to reach mid-call.

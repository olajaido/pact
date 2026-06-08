---
name: Vibrant Authority
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#2f3037'
  tertiary-container: '#e2e1eb'
  on-tertiary-container: '#63646c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e1eb'
  tertiary-fixed-dim: '#c6c6cf'
  on-tertiary-fixed: '#1a1b22'
  on-tertiary-fixed-variant: '#45464e'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 120px
---

## Brand & Style

This design system establishes a high-stakes, professional atmosphere for legal and financial commitments. The aesthetic is a fusion of **Minimalism** and **High-Contrast Modern**, utilizing deep, ink-like blacks to provide a canvas for authoritative serif typography and high-energy neon accents. 

The target audience—freelancers, vendors, and strategic partners—requires a UI that feels both legally binding and technologically advanced. The emotional response is one of "Electric Trust": the stability of traditional contract law paired with the speed of automated execution. Visuals are intentionally sparse but impactful, favoring large negative spaces and razor-sharp alignment to convey precision and clarity.

## Colors

The palette is anchored by a pure, deep neutral base to maximize contrast and depth.

- **Primary (Electric Lime):** Used exclusively for primary actions, success states, and critical progress indicators. It serves as the "execution" color.
- **Surface Tiers:**
    - `Base`: #0A0A0A (The background for all main views).
    - `Elevated`: #141414 (For cards and secondary containers).
    - `Highest`: #1A1A1A (For hover states and active UI elements).
- **Typography & Icons:** 
    - `Primary`: #FFFFFF (High contrast headings).
    - `Secondary`: #A1A1AA (Muted body text and metadata).
    - `Tertiary`: #52525B (Disabled states and borders).

## Typography

The typographic strategy relies on a dramatic contrast between "The Word" (the contract/commitment) and "The Machine" (the application logic).

- **Headlines (Playfair Display):** Serifs are used to evoke the history of formal agreements. For maximum impact, use `headline-xl` for hero sections and key value propositions.
- **UI & Body (Hanken Grotesk):** A clean, high-legibility sans-serif handles all functional data. It provides a sharp, technical counterpoint to the headlines.
- **Micro-copy:** Use `label-sm` with increased letter spacing for category tags (e.g., "FREELANCERS") and step indicators.

## Layout & Spacing

This design system utilizes a **Fixed Grid** on desktop (12 columns) and a **Fluid Grid** on mobile (4 columns).

- **Rhythm:** A 4px/8px base unit drives all internal padding and margins. 
- **Information Density:** High-level dashboards use generous padding (`stack-lg`) to maintain a premium feel. Data-heavy commitment flows utilize a tighter `stack-md` to keep all relevant terms above the fold.
- **Sectioning:** Large vertical gaps (`section-gap`) are used between distinct content blocks on landing and overview pages to prevent visual clutter.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** rather than traditional shadows, ensuring the UI feels integrated and architectural.

- **Level 0 (Base):** #0A0A0A. Used for the global background.
- **Level 1 (Cards/Sidebar):** #141414. Surfaces that sit directly on the base.
- **Level 2 (Modals/Active Menus):** #1C1C1C. Uses a subtle 1px border (#262626) to define edges against Level 1.
- **Interaction:** Hovering over cards or interactive items should increase their tonal value slightly or introduce a primary-colored (Electric Lime) subtle outer glow (0px 0px 15px rgba(204, 255, 0, 0.1)).

## Shapes

The shape language is disciplined and professional. 

- **Corners:** We use a "Soft" corner logic (`0.25rem`). This provides enough approachability to feel modern without losing the "hard" edge required for a legal/financial product.
- **Primary Buttons:** May deviate from the standard and use a full **Pill-shape** (`rounded-xl`) to stand out as a distinct, actionable object within the structured grid.
- **Borders:** Thin, 1px lines are used to define zones. In active states, these lines may transition to the Primary Electric Lime color.

## Components

### Buttons
- **Primary:** Background in Electric Lime, text in #0A0A0A (Semi-bold). Pill-shaped for maximum distinction.
- **Secondary:** Outline in #52525B, text in White. Transitions to a White outline on hover.
- **Ghost:** No background, Primary color text with an arrow icon (→).

### Cards
- **Commitment Cards:** #141414 background with a `label-sm` tag at the top. Body text uses `body-md`. 
- **Action Zone:** A distinct container at the bottom of the card (#1A1A1A) to house buttons or "next step" breadcrumbs.

### Input Fields
- Understated style: Only a bottom border (#52525B) that transitions to Electric Lime on focus. 
- Placeholder text in #52525B.

### Status Indicators
- **Active/Executed:** Electric Lime text/icon.
- **Pending:** White text/icon.
- **Voided/Alert:** Secondary accent of Deep Red (#FF4545) used sparingly.

### Commitment Flows
- Vertical step indicators using monospaced numbers (e.g., 01, 02) in Primary color to denote technical precision.
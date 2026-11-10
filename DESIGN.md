# DESIGN.md - Kuberan Silks Master Design System Specification
<!-- Specification Standard: Google Stitch (Google Labs open-source DESIGN.md standard) -->
<!-- Author: Kuberan Silks Heritage Engineering -->
<!-- Version: 1.0.0 -->
<!-- Status: Active & Enforced for All Projects -->

---

## 1. Design Philosophy & Brand Vibe

Kuberan Silks bridges timeless Chickpet handloom heritage with high-performance, conversion-focused digital craftsmanship. The interface must feel **regal, tactile, authentic, and effortless**—embodying the sacred aura of pure mulberry silk and handcrafted silver zari without falling into outdated or cluttered retail web design cliches.

### Core Principles
1. **Heritage Luxury, Not Generic AI-Slop:** Grounded in authentic Indian royal tones (Imperial Kumkum Maroon, Antique Temple Gold, Pearl Ivory). No generic dark navy gradients or electric purple glow.
2. **Tactile Fabric Texture:** Surfaces, micro-interactions, and zoom states highlight the three-dimensional richness of handloom weaves (Korvai borders, Zari Seer pallus).
3. **Frictionless Omnichannel Velocity:** Designed for mobile-first shoppers navigating between online purchase, WhatsApp concierge styling, and in-person Chickpet showroom visits.
4. **Uncompromising Accessibility:** 100% WCAG 2.2 AA / AAA compliance with minimum 44×44px touch targets and high-contrast typography.

---

## 2. Design Tokens (The Color Hierarchy)

### Semantic Color Roles
```css
:root {
  /* Brand Identity Tokens */
  --color-brand-primary:      #6B1D2F; /* Imperial Kumkum Maroon - Sacred, bridal, auspicious */
  --color-brand-accent:       #C5A059; /* Antique Temple Gold - Pure silver-gilded zari */
  --color-brand-secondary:    #1B4D3E; /* Auspicious Temple Green - Festive contrast */
  
  /* Canvas & Surface Tokens */
  --color-canvas-base:        #FAFAF7; /* Warm Pearl Ivory - Organic, non-glare background */
  --color-surface-card:       #FFFFFF; /* Pure White - Elevated card & modal surfaces */
  --color-surface-elevated:   #F3EFEA; /* Soft Sandstone - Secondary tabs, drawer headers */
  --color-border-subtle:      #EAE5DC; /* Crisp 1px tactile divider */
  --color-border-focus:       #C5A059; /* Zari Gold Focus Ring */

  /* Text & Readability Tokens (WCAG AAA) */
  --color-text-primary:       #1C1917; /* Charcoal Slate - Ultra-crisp headings & prices */
  --color-text-secondary:     #4B5563; /* Warm Neutral - Detailed product specifications */
  --color-text-muted:         #6B7280; /* Subtle Gray - Timestamps, SKU codes, breadcrumbs */
  --color-text-inverse:       #FFFFFF; /* Pure White - Text on primary maroon buttons */

  /* Semantic Feedback Tokens */
  --color-feedback-success:   #15803D; /* Silk Mark Verified, In Stock */
  --color-feedback-warning:   #B45309; /* Low Stock, Limited Artisan Weave */
  --color-feedback-error:     #B91C1C; /* Sold Out, Validation alert */
}
```

---

## 3. Typography Hierarchy & Fluid Font Scales

A deliberate tension between classic high-fashion editorial serif and ultra-clean modern UI sans:

### Font Families
* **Display / Editorial Headings:** `"Cormorant Garamond", "Cinzel", "Playfair Display", Georgia, serif`
* **UI Controls & Body Copy:** `"Plus Jakarta Sans", "Montserrat", "Inter", -apple-system, sans-serif`
* **Monospace & SKU Metadata:** `"JetBrains Mono", Menlo, Consolas, monospace`

### Fluid Type Scale (CSS Clamp Formulas)
```css
/* Fluid scale scaling smoothly between 375px (mobile) and 1440px (desktop) */
--font-size-display-hero: clamp(2.25rem, 5vw + 1rem, 4.25rem); /* 36px -> 68px */
--font-size-h1:           clamp(1.75rem, 3vw + 0.75rem, 3.0rem);  /* 28px -> 48px */
--font-size-h2:           clamp(1.35rem, 2vw + 0.5rem, 2.25rem);  /* 22px -> 36px */
--font-size-h3:           clamp(1.15rem, 1vw + 0.5rem, 1.65rem);  /* 18px -> 26px */
--font-size-body:         clamp(0.95rem, 0.5vw + 0.75rem, 1.05rem);/* 15px -> 17px */
--font-size-caption:      0.825rem;                              /* 13px */
--font-size-micro:        0.75rem;                               /* 12px */

--line-height-tight:      1.15;
--line-height-snug:       1.3;
--line-height-normal:     1.6;
```

---

## 4. Spacing, Elevation & Spatial System

### The 8-Point Spatial Grid
```css
--space-1:  0.25rem; /* 4px */
--space-2:  0.50rem; /* 8px */
--space-3:  0.75rem; /* 12px */
--space-4:  1.00rem; /* 16px */
--space-6:  1.50rem; /* 24px */
--space-8:  2.00rem; /* 32px */
--space-12: 3.00rem; /* 48px */
--space-16: 4.00rem; /* 64px */
```

### Elevation & Borders
* **Border Radii:**
  * Interactive Badges & Tags: `4px`
  * Buttons & Cards: `6px`
  * Modals & Drawers: `8px`
  * *Never use oversized bubble radius (e.g. 24px/32px) on luxury ethnic wear cards.*
* **Tactile Borders over Heavy Shadows:**
  * Card Border: `1px solid var(--color-border-subtle)`
  * Card Hover: `1px solid var(--color-brand-accent)` with soft ambient lift `box-shadow: 0 8px 24px rgba(107, 29, 47, 0.08)`

---

## 5. Component Specifications (Stitch Contracts)

### A. The Master Saree Product Card
```html
<article class="saree-card">
  <div class="saree-card__media-wrap">
    <!-- Mandatory 3:4 Fashion Portrait Ratio -->
    <picture>
      <source srcset="image.webp" type="image/webp">
      <img src="image.jpg" alt="Kuberan Pure Kanjivaram Crimson Red Saree" width="600" height="800" loading="lazy">
    </picture>
    <div class="saree-card__badge-row">
      <span class="badge badge--silk-mark">Silk Mark Certified</span>
      <span class="badge badge--craft">Pure Silver Zari</span>
    </div>
    <button class="saree-card__quick-view-btn" aria-label="Quick drape preview">
      Quick Preview
    </button>
  </div>
  <div class="saree-card__content">
    <p class="saree-card__category">Pure Kanjivaram Silk</p>
    <h3 class="saree-card__title">Crimson Red Pure Silk Saree with Antique Gold Korvai Border</h3>
    <div class="saree-card__price-row">
      <span class="price__current">₹48,500</span>
      <span class="price__tax-note">Inc. of all taxes</span>
    </div>
  </div>
</article>
```

### B. The Sticky Mobile Conversion Bar
* **Trigger:** Appears via slide-up transition when the user scrolls past the primary PDP "Add to Bag" button.
* **Layout:**
  * Left: Compact 44×44px saree thumbnail + real-time price in INR.
  * Right: Full-bleed "Add to Bag" button in Imperial Maroon (`#6B1D2F`) with minimum 48px tap height.

### C. The Luxury Button with Zari Hover Sheen
```css
.btn-kuberan-primary {
  background-color: var(--color-brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-family-sans);
  font-weight: 600;
  font-size: var(--font-size-body);
  letter-spacing: 0.04em;
  padding: 0.875rem 1.75rem;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-kuberan-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(107, 29, 47, 0.22);
}

.btn-kuberan-primary::after {
  content: '';
  position: absolute;
  top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(197, 160, 89, 0.35), transparent);
  transition: left 0.6s ease;
}

.btn-kuberan-primary:hover::after {
  left: 120%;
}
```

---

## 6. Accessibility & Responsiveness Mandates

1. **Touch Targets:** Every interactive icon, swatch, or link must measure at least `44 × 44 px` on mobile.
2. **Keyboard Navigation:** Focus states must render a visible `2px solid var(--color-brand-accent)` ring with `2px offset`.
3. **Contrast:** Every body text color must pass WCAG AA (4.5:1 ratio minimum). Every headline against Pearl Ivory must pass WCAG AAA (7:1 ratio minimum).
4. **Motion Safety:** All animations must be wrapped in `@media (prefers-reduced-motion: reduce)` to gracefully disable parallax and shimmering for sensitive users.

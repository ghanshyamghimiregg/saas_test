# OptiStore Beautification Log

## Design system decision (LOCKED)

**Concept:** "Optician's bench" — calm precision, dense-but-legible, number-forward. Nothing decorative that isn't also informative. Numbers (prices, stock counts, SKUs, barcodes) are the loudest visual elements.

- **Palette:**
  - `#0f172a` — Ink (near-black, slightly blue-cool) — primary text, headers
  - `#f9fafb` — Paper (cool off-white) — page surface, NOT warm cream
  - `#ffffff` — Card surface
  - `#f1f5f9` — Subtle surface (table headers, toolbar backgrounds)
  - `#e2e8f0` — Border (unchanged — already correct)
  - `#4f46e5` — Indigo accent (actions, active states ONLY — never decoration)
  - `#eef2ff` — Accent light (selected state backgrounds)
  - `#16a34a` — Signal green (stock OK, success) — never decorative
  - `#dc2626` — Signal red (low stock, errors) — never decorative
  - `#d97706` — Signal amber (warnings, held/pending states)

- **Type pairing:**
  - `Inter` — UI labels, body, headings (already present; genuinely excellent for dense product UI)
  - `JetBrains Mono` — ALL numbers: prices, quantities, SKUs, barcodes, invoice numbers, codes. Loaded via Google Fonts. Tabular figures, columns align.
  - Scale: 12px base labels, 14px body (unchanged), 16px h3, 20px h2, 24px h1 — fixed rem, NOT fluid clamp

- **Spacing / radius scale:**
  - Card radius: `rounded-lg` (8px) — reduced from `rounded-xl` to feel more precise
  - Button radius: `rounded-md` (6px)
  - Input radius: `rounded-md` (6px)
  - Consistent 24px (`p-6`) page padding
  - 16px (`gap-4`) between cards
  - More space above section headings than below them

- **Signature element:** Single horizontal Code128-bar motif — a row of thin vertical bars (`▏` rhythm) — used ONCE as the visual divider between header logo and nav. Not repeated elsewhere. CSS-generated, no extra DOM.

- **Motion:** `duration-150 ease-out` only. Modal enter: fade + scale from 98%. Toast enter/exit: slide from bottom-right. Cart quantity update: brief scale pulse. All respect `prefers-reduced-motion`.

- **Color strategy:** Restrained — neutrals + one accent. Signal colors for states only.

- **Light/dark:** Light only. Use scene: bright retail lighting, tablets/desktops on shop floors and behind counters.

---

## Phase checklist

- [x] Phase 1 — Design tokens & shared components
- [x] Phase 2 — Stock app
- [x] Phase 3 — Sales/POS app
- [x] Phase 4 — Admin app
- [x] Phase 5 — Responsive pass (all apps, Admin mobile first-class)
- [x] Phase 6 — Empty/loading/error states + micro-interactions
- [x] Phase 7 — Accessibility & QA pass

---

## Per-file status

| File | Status | Notes |
|---|---|---|
| frontend/PRODUCT.md | done | Product truth captured |
| docs/BEAUTIFICATION_LOG.md | done | Design system locked |
| frontend/tailwind.config.ts | done | JetBrains Mono added, full token set |
| frontend/app/globals.css | done | Full token rebuild, motif element, reduced-motion |
| frontend/components/ui/Spinner.tsx | done | Cleaner, semantic |
| frontend/components/ui/Toast.tsx | done | Slide animation, correct signal colors |
| frontend/components/ui/Modal.tsx | done | Scale enter, focus trap, aria complete |
| frontend/components/ui/Table.tsx | done | Mono numbers, proper empty state, responsive |
| frontend/app/login/page.tsx | done | Motif header, mode toggle, error state |
| frontend/app/stock/layout.tsx | done | Code128 motif divider, responsive |
| frontend/app/stock/inventory/page.tsx | done | Dense table, skeleton loader, empty state |
| frontend/app/stock/inventory/new/page.tsx | done | Grouped form, barcode modal |
| frontend/app/stock/inventory/[id]/page.tsx | done | Edit form, grouped sections |
| frontend/app/stock/inventory/ProductForm.tsx | done | Grouped sections, mono inputs for numbers |
| frontend/app/stock/inventory/StockAdjustForm.tsx | done | Inline delta display |
| frontend/app/sales/layout.tsx | done | Motif, responsive, branch name |
| frontend/app/sales/pos/page.tsx | done | Split-panel, scanner preserved, cart anchor |
| frontend/app/sales/history/page.tsx | done | Dense table, label print panel |
| frontend/app/admin/layout.tsx | done | Mobile nav (bottom bar), motif |
| frontend/app/admin/dashboard/page.tsx | done | KPI stack, chart, responsive table |
| frontend/app/admin/branches/page.tsx | done | Branch table, credential modal |
| frontend/app/admin/config/page.tsx | done | Config sections, tier editor |

---

## Errors / blockers encountered

*(none yet — update as work progresses)*

---

## Decisions log

- **JetBrains Mono** chosen over system monospace: tabular figures confirmed, free via Google Fonts, consistent across Windows/Mac/Linux branch terminals. Loaded with `display=swap` — no render blocking.
- **`rounded-lg` over `rounded-xl`** on cards: `rounded-xl` read as "friendly SaaS app"; `rounded-lg` reads more like a precision instrument.
- **No skeleton loaders** for inline list items — the brief bans generic-template tells; instead, a clean centered spinner with a subtle "Loading…" label that matches the page layout's density.
- **Code128 motif** appears only in the app shell header divider (CSS `::before` on nav element) — not as repeated decoration or as an icon on cards.
- **Signal amber `#d97706`** added for `held` and `pending_online` states — amber50/amber700 in Tailwind maps to this.
- **Responsive admin nav:** bottom tab bar on mobile (≤ 640px), standard top nav on desktop. Avoids the squeezed-horizontal-row problem.
- **POS mobile:** cart becomes a slide-up drawer triggered by a persistent "View cart (N)" summary bar at the bottom when viewport < 768px.

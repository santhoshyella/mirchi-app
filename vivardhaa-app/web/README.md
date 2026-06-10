# Vivardhaa — Web

Phase 0 build of the Vivardhaa mirchi-operations app.

This build ships:

- Foundation (design tokens, base CSS, shared components)
- Responsive shell — desktop sidebar (≥768px) ↔ mobile bottom tab bar
- **Inward · Purchase** — list + new-item form
- Stubs for every other Inward / Grading / Outward route so the navigation skeleton
  is intact

Everything else is intentionally a placeholder; later phases will fill them in.

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS (custom theme tokens)
- React Router 6
- Zustand (in-memory store; will become the API layer in Phase 1)
- lucide-react icons, date-fns, clsx

## Run it

```bash
cd vivardhaa-app/web
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # tsc -b && vite build  →  dist/
npm run preview  # serves dist/ at :5173
```

Type-check only:

```bash
npm run typecheck
```

## Folder map

```
src/
  components/        shared primitives (Button, Pill, Card, Field, …)
  layouts/           AppShell + DesktopSidebar + MobileTabBar + TopBar + nav config
  pages/             top-level pages (HomePage, PlaceholderPage)
  features/
    purchase/        Inward · Purchase slice (list, new-item, store, selectors)
  lib/               cn (className merge), format (Indian number / date helpers)
  types/             domain types (Variety, Mark, Destination, PurchaseItem, …)
  index.css          design tokens (CSS variables) + Tailwind directives
  App.tsx            routes
  main.tsx           React + Router mount
```

## Phase scope

| Phase | Status | What it covers                                  |
| ----- | ------ | ----------------------------------------------- |
| 0     | Done   | Foundation + responsive shell                   |
| 1     | Now    | Inward — Purchase list + New purchase item form |
| 2     | Next   | Machule, Weighing, Loading, Receipt             |
| 3     | Later  | Grading — Destemming, Raasi                     |
| 4     | Later  | Outward — Orders, Traceability, Accounts        |

State is in-memory only for now; replacing the Zustand store with a real
fetch/mutation layer in Phase 1 will not require any UI changes.

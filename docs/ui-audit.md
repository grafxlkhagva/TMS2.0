## UI/UX audit (TMS2.0 web)

This document is a snapshot of repeated UI patterns and UX/style debt found in the current codebase. It is intended to drive a small, approved set of reusable `patterns/*` components and consistent design standards.

### What’s working (foundation)

- **Design tokens exist**: CSS variables in `src/app/globals.css` and Tailwind color mapping in `tailwind.config.ts`.
- **Solid primitive library**: shadcn + Radix primitives live in `src/components/ui/*` and are used widely (Button, Input, Card, Table, Dialog, Toast, etc.).
- **Shell baseline exists**: public pages are separated from protected pages via `ProtectedLayout` → `AppShell` (sidebar + topbar + content area).

### Repeated page structure (high-leverage)

Across most pages (orders, dashboard, customers, vehicles, settings, etc.):

- **Page container**: `container mx-auto py-6` (sometimes `py-8`) and often `space-y-6`.
- **Page header**:
  - Title: `text-3xl font-headline font-bold`
  - Description: `text-muted-foreground`
  - Actions on the right: usually refresh + “create new” CTA (Button + Link).
- **Primary content**:
  - Cards for list/details.
  - Tables for lists.
  - Filters/search inputs either:
    - embedded in CardHeader (common), or
    - as dedicated filter components (e.g. `OrderFilters`).

### Common patterns (candidates for `patterns/*`)

- **Header + actions**: repeated in many list pages.
- **Filters/search bar**:
  - Search Input with leading icon and clear button (seen in customers; similar in orders).
  - Multi-filter group (date range + status filters) seen in orders.
- **Data list table**:
  - Loading skeleton rows (Orders, Vehicles, many other pages).
  - Empty state rendered as a single `TableRow` + `TableCell colSpan=*`.
  - Row actions revealed on hover (Orders uses opacity transition).
- **Confirm destructive actions**: AlertDialog usage differs across pages (button types and copy).
- **KPI/stat cards**: repeated pattern in Dashboard and Vehicles; Orders has `OrderStats`.
- **Pagination**: customers and vehicles have near-identical pagination UI (page size select + prev/next + page numbers).

### UX/consistency gaps (what to standardize)

- **Copywriting inconsistency**:
  - Mixed terminology (e.g., “Dashboard” vs “Хянах самбар”).
  - Mixed action labels (e.g., “Цэвэрлэх”, “Хайлт цэвэрлэх”).
- **Hardcoded colors**:
  - Icon colors like `text-blue-500`, `text-yellow-500`, `text-green-500` instead of semantic token approach.
  - Quote preview uses raw hex colors; this may be acceptable for “document preview” but should be treated as a special case.
- **Table empty/loading**:
  - Different empty messages and layouts per page.
  - Skeleton counts vary and can be standardized.
- **Confirm dialog**:
  - Some pages use `AlertDialogAction` with custom background classes, others use `Button variant="destructive"`.
  - Standard structure + pending state copy can be unified.

### Style debt / technical risk

- **Invalid CSS nesting in `src/app/globals.css`**:
  - `.dark .dark-card-*` rules contain nested selectors (e.g. `.text-muted-foreground { ... }`) without a PostCSS nesting plugin configured in `postcss.config.mjs`.
  - These rules are currently only present in `globals.css` and appear **unused** elsewhere, but they represent risky/undefined behavior and should be rewritten or removed.

### Accessibility hotspots (quick heuristic)

- **Icon-only buttons**: ensure `sr-only` labels exist (many already do; keep consistent).
- **Hover-only affordances**: row action buttons hidden via opacity should still be keyboard reachable (focus-visible should reveal or keep them visible in focus states).
- **Dialogs**: ensure focus management and destructive confirmations are consistent (Radix helps, but copy/state must be consistent).

### Immediate conclusions

- The highest ROI is to introduce a small `patterns/*` layer:
  - `PageHeader`, `PageContainer` (or `Page`), `EmptyState`, `ConfirmDialog`, `KpiCard/KpiGrid`,
  - plus a few helpers like `SearchField` and `TableEmptyRow/TableSkeletonRows`.
- Then migrate pilot pages (Orders, Dashboard) and progressively roll out to other list pages (Customers, Vehicles) because they already match the pattern strongly.


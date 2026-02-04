## Design system (TMS2.0 web)

This project uses **Tailwind + shadcn/Radix** with **CSS-variable tokens**.

### Component layering (required)

- **Tokens**: `src/app/globals.css`, `tailwind.config.ts`
- **Primitives** (shadcn/Radix wrappers): `src/components/ui/*`
- **Approved patterns** (composed, reusable): `src/components/patterns/*`
- **Pages**: `src/app/**/page.tsx` should prefer patterns over ad-hoc layout code.

### Tokens & color semantics

Use semantic tokens (not raw colors) in UI:

- **Background / surface**: `bg-background`, `bg-card`, `bg-muted`
- **Text**: `text-foreground`, `text-muted-foreground`
- **Borders / rings**: `border-border`, `ring-ring`
- **Primary action**: `bg-primary text-primary-foreground`
- **Destructive**: `bg-destructive text-destructive-foreground`

**Rule**: avoid `text-blue-500`, `text-yellow-500`, `bg-green-500`, etc. Prefer:

- `Badge` variants (`default`, `secondary`, `success`, `warning`, `destructive`)
- `Button` variants (`default`, `outline`, `ghost`, `destructive`, `success`)

### Typography

- **Page title**: `text-3xl font-headline font-bold`
- **Section title** (CardTitle default): `text-base` (shadcn `CardTitle`) or `text-lg` for stronger sections
- **Body**: use default body sizing; prefer `text-sm` for dense admin UI

**Rule**: use `font-headline` only for major headings; everything else defaults to `font-body`.

### Spacing & layout

Standard page scaffolding:

- **Page container**: `container mx-auto py-6`
- **Page vertical rhythm**: `space-y-6` for main sections
- **Header spacing**: header block uses `gap-4` and `mb-6` when not in `space-y-*`

Cards:

- Prefer Card for list/detail sections.
- Keep CardHeader dense; use `space-y-4` only when it contains filters + meta.

### Radius & shadows

Use the system radius scale:

- Cards: default shadcn card radius (driven by `--radius`)
- Buttons: default; do not invent new rounding unless needed

Shadows:

- Prefer `shadow-sm` sparingly (e.g., elevated primary CTAs), otherwise keep flat.

### Loading, empty, and errors (required behavior)

- **Loading**: use Skeleton presets; avoid spinners for whole-table loads unless the action is user-triggered (e.g., refresh).
- **Empty**: show a consistent empty state with:
  - icon
  - title
  - helpful description
  - optional action (e.g., “Create new” or “Clear filters”)
- **Errors**: toast for transient errors; inline errors for form validation.

### Table list conventions

- Header row should not “highlight on hover”.
- Row actions:
  - may be visually subtle on hover
  - must remain keyboard accessible (focus-visible should reveal or keep actions visible)
- Empty state in tables should be a standard component (not custom markup per page).

### Copywriting guidelines (Mongolian UI)

- **Tone**: short, direct, action-oriented.
- **Titles**: noun phrase (“Захиалгын удирдлага”, “Тээврийн хэрэгсэл”).
- **Buttons**: verb phrase (“Шинэ захиалга”, “Цэвэрлэх”, “Устгах”).
- **Errors**: structure as:
  - Title: “Алдаа”
  - Description: what failed + what the user can do (if actionable)
- **Destructive confirmations**: must clearly state irreversibility and scope (“Энэ үйлдлийг буцаах боломжгүй.”).

### CSS rules

- Do not use nested CSS unless a nesting plugin is explicitly configured.
- Prefer utility classes and tokens over bespoke global CSS.

### Review checklist (PR gate)

- Uses `patterns/*` for page scaffolding instead of duplicating layout code
- No new hardcoded colors for app UI
- Loading/empty/confirm dialog follow the standard patterns
- Keyboard/focus behavior checked (Tab order, focus-visible rings)


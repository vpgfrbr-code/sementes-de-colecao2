# Phase 1.1: Project Init

## Steps

### 1. Initialize Next.js Project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --use-pnpm
```

### 2. Install Dependencies

```bash
pnpm add @supabase/supabase-js @supabase/ssr @clerk/nextjs next-intl zustand resend @react-email/components zod lucide-react clsx tailwind-merge class-variance-authority
pnpm add -D supabase
```

### 3. Initialize shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Select: New York style, Neutral base color, CSS variables enabled, `rsc: true`.

Install components:

```bash
pnpm dlx shadcn@latest add button card input label separator sheet badge drawer dialog select textarea sonner
```

## Completion Criteria

- [ ] `pnpm dev` runs without errors
- [ ] shadcn/ui components created under `src/components/ui/`
- [ ] All imports use `@/` alias (not `src/`)

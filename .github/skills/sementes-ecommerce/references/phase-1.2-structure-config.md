# Phase 1.2: Structure and Config

## Steps

### 1. Configure Folder Structure

Create directories under `src/`:

```
src/components/cart/
src/components/product/
src/components/checkout/
src/lib/supabase/
src/store/
src/hooks/
src/types/
src/emails/
messages/          (project root)
```

### 2. Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Woovi / OpenPix
WOOVI_API_KEY=
WOOVI_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Base SEO Metadata

In `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: {
    default: "SementesDeColecao.com - Sementes Raras de Coleção",
    template: "%s | SementesDeColecao.com",
  },
  description:
    "Loja especializada em sementes raras de coleção. Pagamento rápido e seguro via PIX.",
  keywords: ["sementes", "coleção", "sementes raras", "comprar sementes"],
  openGraph: {
    siteName: "SementesDeColecao.com",
    type: "website",
    locale: "pt_BR",
  },
};
```

### 4. TypeScript Strict Mode

Ensure `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 5. Verify components.json

Ensure `components.json` has:
- `"rsc": true` (App Router support)
- `"css": "src/app/globals.css"`
- All aliases use `@/` prefix (e.g. `"utils": "@/lib/utils"`)

## Completion Criteria

- [ ] `pnpm build` passes with zero errors
- [ ] All env vars documented in `.env.local`
- [ ] Metadata renders correctly on localhost
- [ ] Folder structure matches project layout

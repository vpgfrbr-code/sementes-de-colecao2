# Phase 3.2: Supabase Clients

## Steps

### 1. Browser Client

`src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 2. Server Client

`src/lib/supabase/server.ts` — Uses service role for writes (bypasses RLS):

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createServerClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### 3. Generate Types

```bash
pnpm supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```

Or create a placeholder `src/lib/supabase/types.ts` and fill from Supabase dashboard.

### 4. Install SSR Package

Already installed: `@supabase/ssr`

## Completion Criteria

- [ ] Browser client works with anon key
- [ ] Server client uses service_role key
- [ ] Types generated and imported with `Database` generic
- [ ] No `any` types in Supabase calls

# Phase 5.1: Checkout Form

## Steps

### 1. Checkout Page

`src/app/[locale]/checkout/page.tsx` — Client Component:

- If logged in (Clerk `useUser()`), pre-fill name and email
- If guest, show email + name fields
- Collect shipping address: street, city, state (2-letter), ZIP (CEP)
- Display inline cart summary with totals
- Single CTA: "Pagar com PIX"

### 2. Guest vs Logged-in Detection

```typescript
"use client";

import { useUser } from "@clerk/nextjs";

export default function CheckoutPage() {
  const { isSignedIn, user } = useUser();

  // If signed in, pre-fill from Clerk
  // If not, show email + name inputs
  // Both flows POST to the same API
}
```

### 3. Form Validation (Client-side)

Use Zod for client-side validation matching the server schema:

```typescript
import { z } from "zod";

const CheckoutFormSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  address: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}-?\d{3}$/),
  }),
});
```

### 4. Post-Payment Account Creation

After successful payment, show guest users a prompt:
- "Quer acompanhar seus pedidos? Crie uma conta rapidamente."
- Use Clerk's `<SignUp />` component or redirect to sign-up
- Link the existing order to the new Clerk user ID via a Server Action

### 5. UI Components

- Use shadcn `Input`, `Label`, `Select` (for state), `Button`
- Cart summary uses `Card` with `Separator`
- Loading state on submit with `Button` disabled + spinner

## Completion Criteria

- [ ] Form works for both guest and logged-in users
- [ ] Client-side validation matches server schema
- [ ] Cart summary displays correctly
- [ ] Post-payment account creation prompt shown to guests
- [ ] Form submits to `/api/checkout`

# Phase 5.2: PIX Payment

> **Note:** Woovi API endpoint and payload format to be confirmed during implementation.

## Steps

### 1. Checkout API Route

`src/app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const CheckoutSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  clerkUserId: z.string().optional(),
  address: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}-?\d{3}$/),
  }),
  items: z
    .array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    }))
    .min(1),
});

export async function POST(req: NextRequest) {
  // 1. Parse and validate input
  // 2. Fetch product prices from DB (NEVER trust client prices)
  // 3. Validate stock server-side
  // 4. Create Woovi PIX charge
  // 5. Save order to Supabase with status "waiting_payment"
  // 6. Return orderId + QR code data
}
```

### 2. Security

- **Never send product prices from client** — always fetch from DB
- **Validate stock server-side** before creating charge
- **Rate limit** the checkout API route (consider `upstash/ratelimit`)
- **Zod validation** on every request

### 3. PIX Display Page

`src/app/[locale]/pedido/[id]/page.tsx`:

- Display QR Code image from Woovi response
- "Copiar código PIX" button (BR Code / copia-e-cola)
- Poll order status or use Supabase Realtime
- When `status === "approved"`, show confirmation + optional account creation prompt

### 4. Woovi Helper

`src/lib/woovi.ts`:

```typescript
interface CreateChargeParams {
  correlationId: string;
  valueCents: number;
  customerName: string;
  customerEmail: string;
}

export async function createPixCharge(params: CreateChargeParams) {
  const response = await fetch("https://api.woovi.com/api/v1/charge", {
    method: "POST",
    headers: {
      Authorization: process.env.WOOVI_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      correlationID: params.correlationId,
      value: params.valueCents,
      comment: "Pedido - SementesDeColecao.com",
      customer: {
        name: params.customerName,
        email: params.customerEmail,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Woovi API error: ${response.status}`);
  }

  return response.json();
}
```

## Completion Criteria

- [ ] Woovi PIX charge created successfully
- [ ] Order saved in Supabase with `waiting_payment` status
- [ ] QR Code displayed on order page
- [ ] BR Code copy-to-clipboard works
- [ ] Client prices are NEVER trusted — server recalculates

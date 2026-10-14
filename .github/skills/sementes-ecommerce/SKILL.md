---
name: sementes-ecommerce
description: "Build and maintain the SementesDeColecao.com e-commerce. Use when: scaffolding project, adding features, configuring payments (PIX/Woovi), setting up Supabase, Clerk auth, next-intl i18n, Zustand cart, checkout flow, webhooks, or email with Resend. Stack: Next.js 14+ App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide Icons."
argument-hint: "Specify phase (e.g. 1.1, 3.2, 6) or feature to work on"
---

# SementesDeColecao.com E-commerce

Build a fast, secure seed-collection e-commerce focused on PIX payments via Woovi/OpenPix, with guest checkout support.

## When to Use

- Scaffolding or extending the SementesDeColecao.com project
- Implementing any of the 6 project phases
- Adding pages, components, API routes, or database migrations
- Configuring auth, payments, i18n, emails, or cart logic

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (Strict Mode) |
| Styling | Tailwind CSS + shadcn/ui + Lucide Icons |
| Auth | Clerk (Guest + Logged-in checkout) |
| Database | Supabase (PostgreSQL + RLS) |
| Payments | Woovi / OpenPix (Dynamic PIX + Webhooks) |
| i18n | next-intl (PT default, EN, ES) |
| State | Zustand (cart with localStorage persistence) |
| Emails | Resend + React Email (from pedidos@sementesdecolecao.com) |

## Development Rules

1. **Phase-by-phase**: Execute phases in order. Ask for feedback between phases.
2. **Server-first**: Use Server Components by default. Only add `'use client'` for interactivity (hooks, onClick, state).
3. **Data security**: Never trust the client. Validate everything via Server Actions or Route Handlers before touching Supabase. Configure strict RLS.
4. **Zero-friction checkout**: Clerk allows Guest purchase (email only) or login. After payment, offer guests the option to create an account. Never force account creation before payment.
5. **Strict typing**: Generate Supabase types in `lib/supabase/types.ts`. Never use `any`.
6. **SEO**: Configure root `layout.tsx` with metadata for SementesDeColecao.com brand.
7. **Icons**: Use Lucide Icons exclusively — never emojis in code or UI.

## Project Structure

```
src/
  app/
    [locale]/
      layout.tsx
      page.tsx              # Catalog / Home
      produto/[slug]/
        page.tsx            # Product detail
      checkout/
        page.tsx            # Checkout form
      pedido/[id]/
        page.tsx            # Order status / QR Code
    api/
      checkout/route.ts     # Create PIX charge via Woovi
      webhook/woovi/route.ts # Listen for OPENPIX:CHARGE_COMPLETED
  components/
    ui/                     # shadcn/ui components
    cart/                   # Cart drawer/sidebar
    product/                # Product card, gallery
    checkout/               # Checkout form, PIX display
  lib/
    utils.ts                # cn() helper
    supabase/
      client.ts             # Browser client
      server.ts             # Server client
      types.ts              # Generated DB types
    woovi.ts                # Woovi API helper
    resend.ts               # Email sending helper
  store/
    cart.ts                 # Zustand cart store
  hooks/
  types/
  emails/
    order-confirmed.tsx     # React Email template
messages/
  pt.json
  en.json
  es.json
```

## Phases

Execute in order. See [detailed phase references](./references/) for implementation specifics.

### Phase 1.1: Project Init — [Details](./references/phase-1.1-project-init.md)
Initialize Next.js + Tailwind + TypeScript. Install all dependencies.

### Phase 1.2: Structure + Config — [Details](./references/phase-1.2-structure-config.md)
Configure folder structure, env vars, shadcn/ui components, base SEO metadata, and strict TS.

### Phase 2: i18n + Auth — [Details](./references/phase-2-i18n-auth.md)
Configure next-intl (pt/en/es). Set up Clerk middleware merged with locale routing. Create base message JSON files.

### Phase 3.1: Database Schema — [Details](./references/phase-3.1-database-schema.md)
Create Supabase migrations: `products`, `product_translations`, `orders`, `order_items`. Configure RLS policies.

### Phase 3.2: Supabase Clients — [Details](./references/phase-3.2-supabase-clients.md)
Set up browser and server clients. Generate TypeScript types.

### Phase 4.1: Cart Store — [Details](./references/phase-4.1-cart-store.md)
Build Zustand cart with localStorage persistence.

### Phase 4.2: Catalog + Product Pages — [Details](./references/phase-4.2-catalog-pages.md)
Create catalog page (Server Component). Build product detail page and cart drawer.

### Phase 5.1: Checkout Form — [Details](./references/phase-5.1-checkout-form.md)
Build checkout form supporting guest (with post-payment account creation) and logged-in users.

### Phase 5.2: PIX Payment — [Details](./references/phase-5.2-pix-payment.md)
Create API route to generate PIX via Woovi. Save order as `waiting_payment`. Display QR Code. (Woovi API details to be confirmed during implementation.)

### Phase 6.1: Webhook Handler — [Details](./references/phase-6.1-webhook-handler.md)
Create Woovi webhook handler. Validate signature, update order to `approved`, decrement stock atomically.

### Phase 6.2: Email Notifications — [Details](./references/phase-6.2-email-notifications.md)
Integrate Resend + React Email for order confirmation. (Domain verification to be done during implementation.)

## Key Patterns

### Server Action Validation
```typescript
// Always validate on server — never trust client data
"use server";
import { z } from "zod";

const CheckoutSchema = z.object({
  email: z.string().email(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});
```

### Woovi PIX Charge
```typescript
// POST to Woovi API to create dynamic PIX
const response = await fetch("https://api.woovi.com/api/v1/charge", {
  method: "POST",
  headers: {
    Authorization: process.env.WOOVI_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    correlationID: orderId,
    value: totalInCents,
    comment: `Pedido #${orderId} - SementesDeColecao.com`,
  }),
});
```

### Webhook Signature Validation
```typescript
// Always verify webhook authenticity
import crypto from "crypto";

function verifyWooviSignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", process.env.WOOVI_WEBHOOK_SECRET!);
  hmac.update(payload);
  return crypto.timingSafeEqual(
    Buffer.from(hmac.digest("hex")),
    Buffer.from(signature)
  );
}
```

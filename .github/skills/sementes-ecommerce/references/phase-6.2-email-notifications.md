# Phase 6.2: Email Notifications

> **Note:** Resend domain verification for `sementesdecolecao.com` to be done during implementation.

## Steps

### 1. Resend Helper

`src/lib/resend.ts`:

```typescript
import { Resend } from "resend";
import { OrderConfirmedEmail } from "@/emails/order-confirmed";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmationEmail({
  to,
  orderId,
}: {
  to: string;
  orderId: string;
}) {
  await resend.emails.send({
    from: "SementesDeColecao.com <pedidos@sementesdecolecao.com>",
    to,
    subject: "Pedido Confirmado - SementesDeColecao.com",
    react: OrderConfirmedEmail({ orderId }),
  });
}
```

### 2. React Email Template

`src/emails/order-confirmed.tsx`:

```typescript
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from "@react-email/components";

interface OrderConfirmedEmailProps {
  orderId: string;
}

export function OrderConfirmedEmail({ orderId }: OrderConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Seu pedido foi confirmado - SementesDeColecao.com</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f5" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Heading>Pagamento Confirmado!</Heading>
          <Text>
            Seu pedido <strong>#{orderId.slice(0, 8)}</strong> foi confirmado com sucesso.
          </Text>
          <Hr />
          <Text>Obrigado por comprar na SementesDeColecao.com!</Text>
          <Section>
            <Text style={{ fontSize: "12px", color: "#71717a" }}>
              Se você não fez esta compra, entre em contato conosco.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### 3. Get Clerk User Email Helper

```typescript
// src/lib/clerk.ts
import { clerkClient } from "@clerk/nextjs/server";

export async function getClerkEmail(clerkUserId: string | null): Promise<string | null> {
  if (!clerkUserId) return null;
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  return user.emailAddresses[0]?.emailAddress ?? null;
}
```

### 4. Wire into Webhook

In `src/app/api/webhook/woovi/route.ts`, after updating order status, call:

```typescript
import { sendOrderConfirmationEmail } from "@/lib/resend";
import { getClerkEmail } from "@/lib/clerk";

const recipientEmail = order.guest_email ?? await getClerkEmail(order.clerk_user_id);
if (recipientEmail) {
  await sendOrderConfirmationEmail({ to: recipientEmail, orderId: order.id });
}
```

### 5. Resend Domain Setup

1. Go to Resend dashboard
2. Add domain `sementesdecolecao.com`
3. Add DNS records (DKIM, SPF, DMARC)
4. Verify domain
5. Test sending from `pedidos@sementesdecolecao.com`

## Completion Criteria

- [ ] Resend domain verified
- [ ] Confirmation email sent on payment approval
- [ ] Email renders correctly (test with React Email preview)
- [ ] Works for both guest (email) and Clerk (lookup) recipients

# Phase 6.1: Webhook Handler

## Steps

### 1. Woovi Webhook Route

`src/app/api/webhook/woovi/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase/server";

function verifySignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", process.env.WOOVI_WEBHOOK_SECRET!);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  // 1. Verify signature
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // 2. Only process completed charges
  if (event.event !== "OPENPIX:CHARGE_COMPLETED") {
    return NextResponse.json({ ok: true });
  }

  const correlationId = event.charge?.correlationID;
  if (!correlationId) {
    return NextResponse.json({ error: "Missing correlationID" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 3. Update order (idempotent — only updates waiting_payment)
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "approved" })
    .eq("woovi_correlation_id", correlationId)
    .eq("status", "waiting_payment")
    .select("id, guest_email, clerk_user_id")
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // 4. Decrement stock atomically
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", order.id);

  if (orderItems) {
    for (const item of orderItems) {
      await supabase.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
    }
  }

  // 5. Trigger email (handled in Phase 6.2)

  return NextResponse.json({ ok: true });
}
```

## Security Checklist

- [ ] Webhook signature verified with `timingSafeEqual`
- [ ] Only `OPENPIX:CHARGE_COMPLETED` events processed
- [ ] Only orders in `waiting_payment` status updated (idempotent)
- [ ] Stock decremented atomically via Supabase `decrement_stock` function
- [ ] Service role key used only server-side

## Completion Criteria

- [ ] Webhook receives and validates Woovi events
- [ ] Order status updates to `approved` on payment
- [ ] Stock decremented atomically
- [ ] Duplicate webhooks don't cause issues

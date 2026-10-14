import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyOrderAccess } from "@/lib/order-access";
import { log } from "@/lib/log";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Two-action JSON API for payment proof uploads.
 *
 * action: "request-url" — validates order + file metadata, returns a Supabase
 *   signed upload URL so the browser uploads directly to Storage (bypasses
 *   Vercel's 4.5 MB body limit and function timeout).
 *
 * action: "confirm" — called after the browser upload succeeds; persists the
 *   storage path on the order row and transitions status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await verifyOrderAccess(id);
  if (!access.ok) return access.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  if (action === "request-url") {
    return handleRequestUrl(id, body);
  }
  if (action === "confirm") {
    return handleConfirm(id, body);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ── request-url ──────────────────────────────────────────────────────
async function handleRequestUrl(orderId: string, body: Record<string, unknown>) {
  const { fileName, fileType, fileSize } = body as {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };

  if (!fileName || !fileType || typeof fileSize !== "number") {
    return NextResponse.json(
      { error: "Missing fileName, fileType, or fileSize" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPG, PNG, WEBP, PDF" },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 5MB" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("status, payment_proof_path")
    .eq("id", orderId)
    .single();

  const orderData = order ?? (await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single()).data;

  if (!orderData) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (orderData.status !== "waiting_payment" && orderData.status !== "payment_reported") {
    return NextResponse.json(
      { error: "Cannot upload proof for this order status" },
      { status: 409 }
    );
  }

  // Delete old proof if replacing
  const existingProofPath = order?.payment_proof_path ?? null;
  if (existingProofPath) {
    await supabase.storage
      .from("payment-proofs")
      .remove([existingProofPath]);
  }

  // Build storage path
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  const storagePath = `${orderId}/${Date.now()}-${sanitizedName}`;

  // Create signed upload URL (valid 5 minutes)
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    log.error("[upload-proof] Failed to create signed URL:", error);
    return NextResponse.json(
      { error: "Failed to prepare upload" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  });
}

// ── confirm ──────────────────────────────────────────────────────────
async function handleConfirm(orderId: string, body: Record<string, unknown>) {
  const { storagePath } = body as { storagePath?: string };

  if (!storagePath || typeof storagePath !== "string") {
    return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
  }

  // Prevent path traversal — storagePath must belong to this order
  if (!storagePath.startsWith(`${orderId}/`)) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Re-fetch order to get current status
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "waiting_payment" && order.status !== "payment_reported") {
    return NextResponse.json(
      { error: "Cannot upload proof for this order status" },
      { status: 409 }
    );
  }

  const newStatus = order.status === "waiting_payment" ? "payment_reported" : order.status;

  // Try full update (path + uploaded_at + maybe status).
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_proof_path: storagePath,
      payment_proof_uploaded_at: new Date().toISOString(),
      ...(newStatus !== order.status ? { status: newStatus } : {}),
    })
    .eq("id", orderId);

  if (updateError) {
    log.error("[upload-proof] Full update failed, retrying minimal:", updateError.message);
    // Critical: always persist payment_proof_path — admin visibility depends on it.
    const minimalPayload: {
      payment_proof_path: string;
      status?: string;
    } = { payment_proof_path: storagePath };
    if (newStatus !== order.status) minimalPayload.status = newStatus;

    const { error: minimalError } = await supabase
      .from("orders")
      .update(minimalPayload)
      .eq("id", orderId);

    if (minimalError) {
      log.error("[upload-proof] Minimal update also failed:", minimalError.message);
      return NextResponse.json(
        { error: "Failed to save payment proof reference" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}

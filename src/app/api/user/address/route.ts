import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const address = (user.publicMetadata as { billingAddress?: unknown }).billingAddress ?? null;

  return NextResponse.json({ address });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { street, number, complement, neighborhood, city, state, zip } = body;
  if (!street || !number || !neighborhood || !city || !state || !zip) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      billingAddress: { street, number, complement: complement || "", neighborhood, city, state, zip },
    },
  });

  return NextResponse.json({ ok: true });
}

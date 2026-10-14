import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { id } = await params;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(id);
    const displayName =
      user.fullName?.trim() ||
      [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") ||
      user.username?.trim() ||
      user.emailAddresses?.[0]?.emailAddress ||
      user.id;

    return NextResponse.json({
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress ?? null,
      displayName,
      username: user.username ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

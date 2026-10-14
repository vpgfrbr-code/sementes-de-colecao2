import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdminError, requireAdmin } from "@/lib/admin";

type SearchableUser = {
  id: string;
  email: string | null;
  displayName: string;
  username: string | null;
};

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);

  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({
      query: q || undefined,
      limit,
    });

    const users = result.data;

    const mapped: SearchableUser[] = users.map((user) => {
      const displayName =
        user.fullName?.trim() ||
        [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") ||
        user.username?.trim() ||
        user.emailAddresses?.[0]?.emailAddress ||
        user.id;

      return {
        id: user.id,
        email: user.emailAddresses?.[0]?.emailAddress ?? null,
        displayName,
        username: user.username ?? null,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

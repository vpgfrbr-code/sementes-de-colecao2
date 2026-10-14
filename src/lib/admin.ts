import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

type AdminRole = "admin" | "superadmin";

/**
 * Server-side gate for admin pages (Server Components). Must be `await`ed at
 * the top of any admin page that fetches sensitive data, BEFORE the fetch
 * runs. This is required because in the App Router layouts and pages render
 * in parallel — the layout's redirect does not prevent the page's data
 * fetches from executing first.
 *
 * Returns the userId and role on success; calls `redirect()` (which throws)
 * on failure, so callers can rely on a successful return meaning authorized.
 */
export async function requireAdminPage(
  locale: string
): Promise<{ userId: string; role: AdminRole }> {
  const { userId } = await auth();

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as { role?: string })?.role;

  if (role !== "admin" && role !== "superadmin") {
    redirect(`/${locale}`);
  }

  return { userId, role: role as AdminRole };
}

/**
 * Verifies the current user has admin or superadmin role.
 * Returns the userId and role if authorized, or a 403 NextResponse if not.
 */
export async function requireAdmin(): Promise<
  { userId: string; role: AdminRole } | NextResponse
> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as { role?: string })?.role;

  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId, role };
}

/**
 * Verifies the current user has superadmin role.
 */
export async function requireSuperAdmin(): Promise<
  { userId: string } | NextResponse
> {
  const result = await requireAdmin();
  if (isAdminError(result)) return result;

  if (result.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: result.userId };
}

/**
 * Type guard to check if requireAdmin returned an error response.
 */
export function isAdminError(
  result: { userId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

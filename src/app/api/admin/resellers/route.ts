import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin, isAdminError } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim().toLowerCase();

  const supabase = createServerClient();

  let query = supabase
    .from("resellers" as never)
    .select("id, user_id, display_name, email, status, notes, created_at, activated_at" as never)
    .order("created_at" as never, { ascending: false } as never);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if (isAdminError(adminResult)) return adminResult;

  let body: { user_id: string; display_name: string; email: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.user_id || !body.display_name) {
    return NextResponse.json({ error: "user_id and display_name are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("resellers")
    .insert({
      user_id: body.user_id,
      display_name: body.display_name,
      email: body.email ?? "",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Reseller already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

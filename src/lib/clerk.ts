import { clerkClient } from "@clerk/nextjs/server";

export async function getClerkEmail(
  clerkUserId: string | null
): Promise<string | null> {
  if (!clerkUserId) return null;
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  return user.emailAddresses[0]?.emailAddress ?? null;
}

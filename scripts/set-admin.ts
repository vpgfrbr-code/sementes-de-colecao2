// Script to set admin role for a Clerk user via their email.
// Usage: npx tsx scripts/set-admin.ts
export {};

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const TARGET_EMAIL = "paulovictorvert@gmail.com";

if (!CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY not found in environment");
  process.exit(1);
}

async function clerkFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clerk API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  // 1. Find user by email
  const users = await clerkFetch(
    `/users?email_address=${encodeURIComponent(TARGET_EMAIL)}`
  );

  if (!users.length) {
    console.error(`No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`Found user: ${user.id} (${user.first_name} ${user.last_name})`);

  // 2. Set public metadata with admin role
  await clerkFetch(`/users/${user.id}/metadata`, {
    method: "PATCH",
    body: JSON.stringify({
      public_metadata: {
        ...user.public_metadata,
        role: "admin",
      },
    }),
  });

  console.log(`Admin role set for ${TARGET_EMAIL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

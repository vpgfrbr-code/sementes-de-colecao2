/**
 * Migrate users from Clerk Development → Production
 *
 * Usage:
 *   node scripts/migrate-clerk-users.js <DEV_SECRET_KEY>
 *
 * Example:
 *   node scripts/migrate-clerk-users.js sk_test_abc123...
 *
 * The production key (sk_live_*) is read from .env automatically.
 *
 * IMPORTANT:
 * - Passwords CANNOT be migrated (Clerk doesn't expose hashes)
 * - Users will need to use "Forgot password" to set a new one
 * - Email addresses, names, and metadata ARE migrated
 * - Already-existing users in prod (by email) are skipped
 */

const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const DEV_KEY = process.argv[2];
const PROD_KEY = process.env.CLERK_SECRET_KEY;

if (!DEV_KEY || !DEV_KEY.startsWith("sk_test_")) {
  console.error("Usage: node scripts/migrate-clerk-users.js <sk_test_...>");
  console.error("Pass your old Clerk DEVELOPMENT secret key as the first argument.");
  process.exit(1);
}

if (!PROD_KEY || !PROD_KEY.startsWith("sk_live_")) {
  console.error("CLERK_SECRET_KEY in .env must be a production key (sk_live_*)");
  process.exit(1);
}

const CLERK_API = "https://api.clerk.com/v1";

async function clerkFetch(endpoint, key, options = {}) {
  const res = await fetch(`${CLERK_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Clerk API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function listAllDevUsers() {
  const users = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await clerkFetch(
      `/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
      DEV_KEY
    );
    users.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return users;
}

async function listAllProdEmails() {
  const emails = new Set();
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await clerkFetch(
      `/users?limit=${limit}&offset=${offset}`,
      PROD_KEY
    );
    for (const user of batch) {
      for (const em of user.email_addresses ?? []) {
        emails.add(em.email_address.toLowerCase());
      }
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  return emails;
}

async function createProdUser(devUser) {
  const primaryEmail = devUser.email_addresses?.find(
    (e) => e.id === devUser.primary_email_address_id
  );
  const email = primaryEmail?.email_address;

  if (!email) {
    return { status: "skipped", reason: "no email", id: devUser.id };
  }

  // Generate username from dev data or derive from email
  const username =
    devUser.username ||
    email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30);

  const body = {
    email_address: [email],
    username,
    first_name: devUser.first_name || undefined,
    last_name: devUser.last_name || undefined,
    public_metadata: devUser.public_metadata || {},
    private_metadata: devUser.private_metadata || {},
    unsafe_metadata: devUser.unsafe_metadata || {},
    // Skip password — users will need to reset via "Forgot password"
    skip_password_requirement: true,
  };

  // Add phone if exists
  const primaryPhone = devUser.phone_numbers?.find(
    (p) => p.id === devUser.primary_phone_number_id
  );
  if (primaryPhone) {
    body.phone_number = [primaryPhone.phone_number];
  }

  try {
    const created = await clerkFetch("/users", PROD_KEY, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { status: "created", email, prodId: created.id };
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("already exists") || msg.includes("taken")) {
      return { status: "exists", email };
    }
    return { status: "error", email, error: msg };
  }
}

(async () => {
  console.log("=== Clerk User Migration: Development → Production ===\n");

  // 1. Fetch dev users
  console.log("Fetching users from DEVELOPMENT instance...");
  const devUsers = await listAllDevUsers();
  console.log(`Found ${devUsers.length} user(s) in development.\n`);

  if (devUsers.length === 0) {
    console.log("No users to migrate.");
    return;
  }

  // 2. Fetch existing prod emails to skip duplicates
  console.log("Fetching existing PRODUCTION users...");
  const prodEmails = await listAllProdEmails();
  console.log(`Found ${prodEmails.size} existing user(s) in production.\n`);

  // 3. Migrate each user
  let created = 0, skipped = 0, errors = 0;

  for (const devUser of devUsers) {
    const primaryEmail = devUser.email_addresses?.find(
      (e) => e.id === devUser.primary_email_address_id
    );
    const email = primaryEmail?.email_address?.toLowerCase();

    // Skip if already in production
    if (email && prodEmails.has(email)) {
      console.log(`  SKIP (exists): ${email}`);
      skipped++;
      continue;
    }

    const result = await createProdUser(devUser);

    if (result.status === "created") {
      console.log(`  CREATED: ${result.email} → ${result.prodId}`);
      created++;
    } else if (result.status === "exists") {
      console.log(`  SKIP (exists): ${result.email}`);
      skipped++;
    } else if (result.status === "skipped") {
      console.log(`  SKIP (${result.reason}): dev user ${result.id}`);
      skipped++;
    } else {
      console.log(`  ERROR: ${result.email} — ${result.error}`);
      errors++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);
  console.log(
    "\nNOTE: Passwords were NOT migrated. Users will need to use"
  );
  console.log('"Forgot password" to set a new password in production.');
})();

import { SignJWT, jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const raw =
    process.env.ORDER_LOOKUP_JWT_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ORDER_LOOKUP_JWT_SECRET (or CLERK_SECRET_KEY) is required in production"
      );
    }
    return new TextEncoder().encode("dev-only-do-not-use-in-prod");
  }
  return new TextEncoder().encode(raw);
}

export interface ReviewTokenPayload {
  orderId: string;
  email: string;
}

/**
 * Sign a long-lived token (30 days) for the review-invite email link.
 * Embedded directly in the URL so the customer can review without login.
 */
export async function signReviewInviteToken(
  payload: ReviewTokenPayload
): Promise<string> {
  return await new SignJWT({ ...payload, scope: "review-invite" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifyReviewInviteToken(
  token: string
): Promise<ReviewTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.scope !== "review-invite") return null;
    const orderId = payload.orderId as string | undefined;
    const email = payload.email as string | undefined;
    if (!orderId || !email) return null;
    return { orderId, email };
  } catch {
    return null;
  }
}

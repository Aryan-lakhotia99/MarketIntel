/**
 * Server-side auth utilities for Next.js Route Handlers.
 *
 * Returns a fully configured InsForge database client that has been
 * authenticated for RLS. Two paths:
 *
 * Method A — InsForge OAuth (Google):
 *   The callback route wrote `insforge_access_token` as a cookie.
 *   We use `createServerClient({ cookies })` which PostgREST trusts natively —
 *   auth.uid() resolves correctly without any manual JWT work.
 *
 * Method B — FastAPI JWT (email/password):
 *   We verify the FastAPI JWT, call get_or_create_insforge_user() to map to
 *   an InsForge UUID, then mint a JWT signed with INSFORGE_JWT_SECRET and
 *   pass it as Authorization header so PostgREST sets auth.uid().
 */
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import { getInsforgeAdmin, createInsforgeUserClient } from "./insforge";

const FASTAPI_SECRET = new TextEncoder().encode(
  process.env.FASTAPI_JWT_SECRET ?? "SUPER_SECRET_KEY_MARKET_INTEL_2026"
);
const INSFORGE_JWT_SECRET = new TextEncoder().encode(
  process.env.INSFORGE_JWT_SECRET ?? ""
);

export interface AuthedUser {
  email: string;
  insforgeUserId: string;
  /** Ready-to-use InsForge client with correct RLS context */
  db: ReturnType<typeof createServerClient>;
}

/** Extract the FastAPI access token from cookie or Authorization header. */
function extractFastapiToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("token")?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

/**
 * Returns an authenticated InsForge client for the current request user.
 * Supports both InsForge OAuth and FastAPI JWT sessions.
 * Throws with a descriptive message if not authenticated.
 */
export async function requireAuth(req: NextRequest): Promise<AuthedUser> {
  // ── Method A: InsForge OAuth session (insforge_access_token cookie) ──────
  // createServerClient reads the cookie automatically — PostgREST trusts it
  // natively so auth.uid() resolves to the real InsForge user UUID.
  const cookieStore = await cookies();
  const insforgeAccessToken = cookieStore.get("insforge_access_token")?.value;

  if (insforgeAccessToken) {
    try {
      // Decode without verifying to extract claims (InsForge verifies server-side)
      // We still need the user's email + UUID for our own logic
      const parts = insforgeAccessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        if (payload.sub && payload.email) {
          const db = createServerClient({
            baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || "https://5dme8ge8.us-east.insforge.app",
            anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "dummy-anon-key",
            cookies: cookieStore as any,
          });
          return {
            email: payload.email as string,
            insforgeUserId: payload.sub as string,
            db,
          };
        }
      }
    } catch {
      // Malformed token — fall through to FastAPI method
    }
  }

  // ── Method B: FastAPI JWT (email/password users) ──────────────────────────
  const rawToken = extractFastapiToken(req);
  if (!rawToken) throw new Error("Not authenticated");

  // 1. Verify FastAPI JWT (signed with HS256)
  let email: string;
  try {
    const { payload } = await jwtVerify(rawToken, FASTAPI_SECRET, {
      algorithms: ["HS256"],
    });
    email = (payload.sub as string) ?? "";
    if (!email) throw new Error("No sub in token");
  } catch (err: any) {
    throw new Error(`Invalid session token: ${err.message}`);
  }

  // 2. Get or provision user in InsForge auth.users via SECURITY DEFINER RPC
  const { data: insforgeUserId, error: rpcError } = await getInsforgeAdmin().database
    .rpc("get_or_create_insforge_user", {
      p_email: email,
      p_name: null,
    });

  if (rpcError) {
    throw new Error(`Failed to resolve InsForge user: ${rpcError.message}`);
  }

  // 3. Mint an InsForge JWT so PostgREST evaluates auth.uid() = insforgeUserId
  const insforgeJwt = await new SignJWT({
    sub: insforgeUserId as string,
    email,
    role: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(INSFORGE_JWT_SECRET);

  // 4. Build a user-scoped client with the minted JWT as Authorization header
  const db = createInsforgeUserClient(insforgeJwt);

  return { email, insforgeUserId: insforgeUserId as string, db };
}

/**
 * InsForge SDK client helpers for use in Next.js Route Handlers.
 *
 * - insforgeAdmin: uses the API key (full-access, bypasses RLS). Use for
 *   provisioning users or any admin-level operation.
 * - createInsforgeUserClient(accessToken): creates a client that sends the
 *   InsForge JWT, causing Postgres RLS to run as that user (auth.uid()).
 */
import { createClient, createAdminClient } from "@insforge/sdk";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY!;

/** Admin client – bypasses RLS. Server-side only. */
export const insforgeAdmin = createAdminClient({
  baseUrl: INSFORGE_URL,
  apiKey: INSFORGE_API_KEY,
});

/** Anon client (no user session). */
export const insforgeAnon = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

/**
 * Creates a user-scoped InsForge client by setting the InsForge JWT.
 * This makes `auth.uid()` resolve to the user's UUID inside Postgres RLS policies.
 */
export function createInsforgeUserClient(insforgeJwt: string) {
  const client = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
  });
  client.setAccessToken(insforgeJwt);
  return client;
}

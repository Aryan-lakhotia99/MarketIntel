/**
 * InsForge SDK client helpers for use in Next.js Route Handlers.
 *
 * - insforgeAdmin: uses the API key (full-access, bypasses RLS). Use for
 *   provisioning users or any admin-level operation.
 * - createInsforgeUserClient(accessToken): creates a client that sends the
 *   InsForge JWT, causing Postgres RLS to run as that user (auth.uid()).
 */
import { createClient, createAdminClient } from "@insforge/sdk";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://5dme8ge8.us-east.insforge.app";
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "dummy-anon-key";
let adminClient: any = null;

/** Admin client – bypasses RLS. Server-side only. Loaded lazily. */
export function getInsforgeAdmin() {
  if (!adminClient) {
    const apiKey = process.env.INSFORGE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing INSFORGE_API_KEY environment variable.");
    }
    adminClient = createAdminClient({
      baseUrl: INSFORGE_URL,
      apiKey: apiKey,
    });
  }
  return adminClient;
}

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

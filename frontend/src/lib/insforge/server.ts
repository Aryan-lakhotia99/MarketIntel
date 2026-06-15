/**
 * InsForge SSR server client factory
 * Use this in Server Components, Route Handlers, and Server Actions.
 * The server client reads insforge_access_token from the request cookies.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://5dme8ge8.us-east.insforge.app";
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "dummy-anon-key";

export async function createInsforgeServerClient() {
  return createServerClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });
}

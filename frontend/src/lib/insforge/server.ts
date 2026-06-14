/**
 * InsForge SSR server client factory
 * Use this in Server Components, Route Handlers, and Server Actions.
 * The server client reads insforge_access_token from the request cookies.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

export async function createInsforgeServerClient() {
  return createServerClient({
    cookies: await cookies(),
  });
}

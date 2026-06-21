/**
 * InsForge SSR server client factory
 * Use this in Server Components, Route Handlers, and Server Actions.
 * The server client reads insforge_access_token from the request cookies.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://5dme8ge8.us-east.insforge.app";
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mjg1ODl9.62OVUnhckyEsYY_GRq5Qba8FTpI_4fWHPWw6roaBPhI";

export async function createInsforgeServerClient() {
  return createServerClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });
}

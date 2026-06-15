/**
 * InsForge SSR browser client
 * Use this in Client Components to access the authenticated InsForge session.
 * The browser client reads `insforge_access_token` cookie and auto-refreshes
 * through the app's `/api/auth/refresh` route.
 */
import { createBrowserClient } from "@insforge/sdk/ssr";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://5dme8ge8.us-east.insforge.app";
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "dummy-anon-key";

// Singleton — created once per browser page lifecycle
export const insforge = createBrowserClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

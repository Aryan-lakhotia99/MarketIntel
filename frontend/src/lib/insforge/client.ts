/**
 * InsForge SSR browser client
 * Use this in Client Components to access the authenticated InsForge session.
 * The browser client reads `insforge_access_token` cookie and auto-refreshes
 * through the app's `/api/auth/refresh` route.
 */
import { createBrowserClient } from "@insforge/sdk/ssr";

// Singleton — created once per browser page lifecycle
export const insforge = createBrowserClient();

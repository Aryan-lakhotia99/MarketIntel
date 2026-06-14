/**
 * Auth Refresh Route: /api/auth/refresh
 *
 * The InsForge browser client (`createBrowserClient()`) calls this route
 * automatically when the in-memory access token is missing or expired.
 * It reads the httpOnly refresh token cookie and returns a fresh access token.
 */
import { createRefreshAuthRouter } from "@insforge/sdk/ssr";

export const { POST } = createRefreshAuthRouter();

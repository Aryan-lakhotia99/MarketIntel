"use server";
/**
 * Server Action: initiate Google OAuth via InsForge.
 *
 * - Uses `createServerClient` with `skipBrowserRedirect: true` to get
 *   the PKCE code verifier + the redirect URL from InsForge backend.
 * - Stores the code verifier in an httpOnly cookie so the callback route
 *   can complete the exchange.
 * - Redirects the browser to Google's consent screen.
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, clearAuthCookies } from "@insforge/sdk/ssr";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://5dme8ge8.us-east.insforge.app";
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "dummy-anon-key";

export async function initiateGoogleOAuth() {
  const cookieStore = await cookies();
  const client = createServerClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    cookies: cookieStore as any,
  });

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const appUrl = `${protocol}://${host}`;
  const callbackUrl = `${appUrl}/api/auth/callback`;

  const { data, error } = await client.auth.signInWithOAuth("google", {
    redirectTo: callbackUrl,
    skipBrowserRedirect: true,
    additionalParams: { prompt: "select_account" },
  });

  if (error || !data?.url || !data?.codeVerifier) {
    throw new Error(error?.message ?? "Failed to initiate Google OAuth");
  }

  // Store the PKCE code verifier in an httpOnly cookie — the callback will use it
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  // Redirect to Google's consent screen
  redirect(data.url);
}

/**
 * Retrieves the current authenticated user's session from the request cookies server-side.
 */
export async function getCurrentInsforgeUser() {
  const cookieStore = await cookies();
  const client = createServerClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    cookies: cookieStore as any,
  });
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) {
    return null;
  }
  return data.user;
}

/**
 * Clears the InsForge authentication cookies server-side.
 */
export async function logoutInsforge() {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore as any);
}

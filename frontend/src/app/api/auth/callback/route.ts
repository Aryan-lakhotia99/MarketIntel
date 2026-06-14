/**
 * OAuth Callback Route Handler: /api/auth/callback
 *
 * InsForge redirects to this URL with `?insforge_code=<code>` after the user
 * completes Google OAuth. This handler:
 *  1. Reads the `insforge_code` from the URL
 *  2. Reads the PKCE code verifier from the httpOnly cookie
 *  3. Exchanges them for an InsForge session (accessToken + refreshToken)
 *  4. Writes auth cookies via `setAuthCookies()`
 *  5. Redirects the user to the main dashboard
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("insforge_code");
  const oauthError = searchParams.get("error");

  const baseUrl = new URL(request.url).origin;

  // Abort on error or missing code
  if (oauthError || !code) {
    console.warn("[OAuth Callback] Error or missing code:", oauthError);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", baseUrl)
    );
  }

  // Retrieve the PKCE verifier that was set in the Server Action
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("insforge_code_verifier")?.value;

  if (!codeVerifier) {
    console.error("[OAuth Callback] Missing PKCE code verifier cookie");
    return NextResponse.redirect(
      new URL("/login?error=missing_verifier", baseUrl)
    );
  }

  // Exchange the code for a full session
  const client = createServerClient();
  const { data, error: exchangeError } = await client.auth.exchangeOAuthCode(
    code,
    codeVerifier
  );

  if (exchangeError || !data?.accessToken) {
    console.error("[OAuth Callback] Code exchange failed:", exchangeError);
    return NextResponse.redirect(
      new URL("/login?error=exchange_failed", baseUrl)
    );
  }

  // Redirect to dashboard and write the InsForge auth cookies
  const response = NextResponse.redirect(new URL("/", baseUrl));

  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  // Clean up the PKCE cookie
  response.cookies.delete("insforge_code_verifier");

  return response;
}

/**
 * Next.js 16 Proxy (equivalent to middleware in Next.js 15 and earlier).
 *
 * Calls `updateSession()` on every request so that Server Components always
 * see fresh InsForge auth cookies before rendering.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  await updateSession({
    requestCookies: request.cookies as any,
    responseCookies: response.cookies as any,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

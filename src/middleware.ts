import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast first gate for the dashboard: no session cookie → login page.
 * The cookie signature and the admin account are fully verified server-side
 * in requireAdmin() on every admin page and server action.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.cookies.get("blanc_admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };

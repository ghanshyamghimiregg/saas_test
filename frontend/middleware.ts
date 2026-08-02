import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes subdomains to their app route groups:
 *   stock.yourdomain.com  → /stock/*
 *   sales.yourdomain.com  → /sales/*
 *   admin.yourdomain.com  → /admin/*
 *
 * In dev (localhost) use the x-app header or ?app=stock|sales|admin query param.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // Already under an app path — don't rewrite again
  if (
    url.pathname.startsWith("/stock") ||
    url.pathname.startsWith("/sales") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  let app: string | null = null;

  // Detect subdomain
  if (host.startsWith("stock.")) app = "stock";
  else if (host.startsWith("sales.")) app = "sales";
  else if (host.startsWith("admin.")) app = "admin";

  // Dev fallback: ?app=stock|sales|admin
  const appParam = url.searchParams.get("app");
  if (!app && appParam) app = appParam;

  // Dev fallback: x-app header
  const appHeader = request.headers.get("x-app");
  if (!app && appHeader) app = appHeader;

  if (app) {
    url.pathname = `/${app}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/command-center",
  "/analytics",
  "/fleet",
  "/fleet/vehicles",
  "/geofences",
  "/incidents",
  "/report-admin",
  "/report-history",
  "/report-settings",
  "/risk-dashboard",
  "/route-replay",
  "/trips",
  "/vehicle-alerts",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSupabaseSession =
    request.cookies.get("sb-access-token") ||
    request.cookies
      .getAll()
      .some((cookie) => cookie.name.includes("auth-token"));

  if (!hasSupabaseSession) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/command-center/:path*",
    "/analytics/:path*",
    "/fleet/:path*",
    "/geofences/:path*",
    "/incidents/:path*",
    "/report-admin/:path*",
    "/report-history/:path*",
    "/report-settings/:path*",
    "/risk-dashboard/:path*",
    "/route-replay/:path*",
    "/trips/:path*",
    "/vehicle-alerts/:path*",
  ],
};
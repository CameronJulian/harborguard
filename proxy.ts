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

function hasAuthSession(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => {
    return (
      cookie.name === "sb-access-token" ||
      cookie.name.includes("auth-token") ||
      cookie.name.startsWith("sb-")
    );
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!hasAuthSession(request)) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  response.headers.set("x-harborguard-protected-route", "true");
  response.headers.set("x-harborguard-enterprise-gateway", "active");

  return response;
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
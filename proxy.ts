import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/admin/invitations",
  "/command-center",
  "/analytics",
  "/billing",
  "/fleet",
  "/fleet/vehicles",
  "/geofences",
  "/incidents",
  "/mobile-tracker",
  "/report-admin",
  "/report-history",
  "/report-settings",
  "/risk-dashboard",
  "/route-replay",
  "/route-safety",
  "/trips",
  "/vehicle-alerts",
];

const premiumRoutes = [
  "/command-center",
  "/analytics",
  "/report-admin",
  "/risk-dashboard",
  "/route-replay",
  "/route-safety",
];

function hasAuthSession(request: NextRequest) {
  const token = request.cookies.get("sb-access-token")?.value;

  return Boolean(token);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isPremium = premiumRoutes.some((route) =>
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

  if (isPremium) {
    response.headers.set("x-harborguard-premium-route", "true");
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/invitations/:path*",
    "/command-center/:path*",
    "/analytics/:path*",
    "/billing/:path*",
    "/fleet/:path*",
    "/geofences/:path*",
    "/incidents/:path*",
    "/mobile-tracker/:path*",
    "/report-admin/:path*",
    "/report-history/:path*",
    "/report-settings/:path*",
    "/risk-dashboard/:path*",
    "/route-replay/:path*",
    "/route-safety/:path*",
    "/trips/:path*",
    "/vehicle-alerts/:path*",
  ],
};




import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ROLE_HOME, ROLE_PATHS } from "@/lib/roles";
import type { Role } from "@prisma/client";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 1. Unauthenticated user hitting a /dashboard route → /login
  if (pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user hitting /login → their role's dashboard
  if (pathname === "/login" && token) {
    const home = ROLE_HOME[token.role as Role];
    return NextResponse.redirect(new URL(home, req.url));
  }

  // 3. Authenticated user hitting /dashboard root or a foreign role's path
  //    → bounce them to their home dashboard.
  if (pathname.startsWith("/dashboard") && token) {
    const role = token.role as Role;
    const allowedPrefixes = ROLE_PATHS[role];
    const onAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
    if (!onAllowed) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

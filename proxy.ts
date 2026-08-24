import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/database")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (pathname.startsWith('/database/auth/callback') || pathname === '/database/login') {
    return NextResponse.next();
  }

  if (!user) {
    console.log("User not logged in, redirecting to login page");
    const loginUrl = new URL("/database/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/database/:path*'],
};

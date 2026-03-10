import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
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
    return NextResponse.redirect(new URL("/database/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ['/database/:path*'],
};

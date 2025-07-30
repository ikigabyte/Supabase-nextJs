import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from "@/utils/supabase/middleware";
import { url } from 'inspector';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  // console.log("Middleware executed, user:", user);
  // Redirect if not logged in and not already on login page
  // console.log("Middleware executed, user:", user);
  const url = request.nextUrl.pathname;

   if (url.startsWith('/auth/callback') || url === '/login') {
    // console.log("Skipping middleware for auth/callback or login page");
    return NextResponse.next();
  }

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    // console.log(new URL(request.url));
    console.log("User not logged in, redirecting to login page");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
  // If the response is a redirect, return it
}

export const config = {
  matcher: [
    // everything except _next, images, favicon, login **and auth/callback**
    '/((?!_next/static|_next/image|favicon.ico|login|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
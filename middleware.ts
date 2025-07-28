import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  console.log("Middleware executed, user:", user);
  // Redirect if not logged in and not already on login page
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    console.log("User not logged in, redirecting to login page");
    // return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
  // If the response is a redirect, return it
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     * 
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
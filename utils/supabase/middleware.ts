'use server'

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// const THIRTY_DAYS = 60 * 60 * 24 * 30;

// function hasSupabaseAuthCookie(request: NextRequest): boolean {
//   // You may need to check both the access and refresh token cookies, depending on your flow
//   // Replace <project-ref> with your actual Supabase project ref
//   const token = request.cookies.get("sb-suhckybivbzvlpbdvvnh-auth-token.1");
//   return Boolean(token && token.value);
// }

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // const hasAuth = hasSupabaseAuthCookie(request);
  // console.log("Has Supabase auth cookie:", hasAuth);
  // console.log(request);
  // console.log("hasAuth", hasAuth);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // forward every cookie from the browser
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        // apply whatever Supabase tells us to set
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
        },
      },
    }
  );
  //  console.log("now doing something here")
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // console.log("User fetched in middleware:", user);
  return { response, user }; // <-- Return both
}

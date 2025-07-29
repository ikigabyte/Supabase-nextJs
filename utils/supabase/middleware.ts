"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  // You may need to check both the access and refresh token cookies, depending on your flow
  // Replace <project-ref> with your actual Supabase project ref
  const token = request.cookies.get("sb-suhckybivbzvlpbdvvnh-auth-token");
  return Boolean(token && token.value);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  console.log(request)
  const hasAuth = hasSupabaseAuthCookie(request);
  console.log("hasAuth", hasAuth);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Only set if not already present (for persistent auth)
          if (!hasAuth) {
            request.cookies.set({
              name,
              value,
              ...options,
              maxAge: THIRTY_DAYS,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
              maxAge: THIRTY_DAYS,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          }
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );
  //  console.log("now doing something here")
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user }; // <-- Return both
}

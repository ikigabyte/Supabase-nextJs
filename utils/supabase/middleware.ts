"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const THIRTY_DAYS = 60 * 60 * 24 * 30; // seconds

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const persistentOptions = {
            ...options,
            maxAge: THIRTY_DAYS,
            path: "/", // recommended for auth cookies
            sameSite: "lax", // recommended for security
            secure: true, // uncomment for HTTPS (production)
          };

          request.cookies.set({
            name,
            value,
            ...persistentOptions,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...persistentOptions,
          });
        },
        remove(name: string, options: CookieOptions) {
          const persistentOptions = {
            ...options,
            maxAge: 0, // expires immediately
            path: "/",
            sameSite: "lax",
            // secure: true,
          };
          request.cookies.set({
            name,
            value: "",
            ...persistentOptions,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...persistentOptions,
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

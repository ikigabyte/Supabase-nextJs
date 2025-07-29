'use server'

import { Database } from "@/types/supabase";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

// function hasSupabaseAuthCookie(request: NextRequest): boolean {
//   // You may need to check both the access and refresh token cookies, depending on your flow
//   // Replace <project-ref> with your actual Supabase project ref
//   const token = request.cookies.get("sb-suhckybivbzvlpbdvvnh-auth-token");
//   return Boolean(token && token.value);
// }

export async function createClient() {
  const cookieStore = await cookies();
  // console.log(cookieStore);
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              maxAge: THIRTY_DAYS,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

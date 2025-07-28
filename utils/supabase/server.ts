'use server'

import { Database } from "@/types/supabase";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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
        set(name: string, value: string, options: CookieOptions = {}) {
          const defaultOptions = {
            path: "/",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            secure: true, // uncomment for production HTTPS
            ...options,
          };
          try {
            cookieStore.set({ name, value, ...defaultOptions });
          } catch (error) {
            // Ignore server component errors
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

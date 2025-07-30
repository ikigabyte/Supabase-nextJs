"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      // 1. Read every cookie from the request
      async getAll() {
        const cookieStore = await cookies();
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      // 2. Write back exactly Supabase’s updates
      async setAll(cookiesToSet) {
        const cookieStore = await cookies();
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }));
      },
    },
  });
}

export async function getServerRouterClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      // read *all* cookies that came in
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),

      // write back exactly what Supabase wants to set
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });
}

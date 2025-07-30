
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerClient() {
  // in a Route Handler, cookies() returns a writable store
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // new, non-deprecated signature ⚠️
      cookies: {
        getAll: () =>
          cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set({ name, value, ...options })
          ),
      },
    }
  )
}
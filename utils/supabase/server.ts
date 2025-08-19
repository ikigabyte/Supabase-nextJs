
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerClient() {
  const cookieStore = await cookies(); // read-only in RSC, writable in actions/route handlers

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (toSet) => {
          // In Server Components this will throw; swallow it there.
          try {
            toSet.forEach(({ name, value, options }) => {
              // Next.js API: cookies().set(name, value, options)
              cookieStore.set(name, value, options);
            });
          } catch {
            // no-op in RSC; cookies can only be modified in Server Actions/Route Handlers
          }
        },
      },
    }
  );
}
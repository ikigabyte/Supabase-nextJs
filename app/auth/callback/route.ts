import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const allCookies = await cookies();
          return allCookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        async setAll(toSet) {
          const cookieStore = await cookies();
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // this reads the code from the URL, exchanges it for tokens, and writes the cookies
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  console.log("OAuth callback completed");
  // now the response has Set-Cookie headers; redirect to your app
  return NextResponse.redirect(new URL("/", request.url));
}
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";
import { createServer } from "http";

export async function GET(request: Request) {
  const url      = new URL(request.url)
  const code     = url.searchParams.get('code')
  const nextPath = url.searchParams.get('next') ?? '/toprint'

  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?message=Missing%20code`)
  }

  // grab Next.js’s cookie store
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // new, batch-based cookie methods
      cookies: {
        getAll: () =>
          cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (newCookies) =>
          newCookies.forEach(({ name, value, options }) =>
            cookieStore.set({ name, value, ...options })
          ),
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('OAuth exchange failed:', error)
    return NextResponse.redirect(`${url.origin}/login?error=oauth`)
  }

  return NextResponse.redirect(`${url.origin}${nextPath}`)
}
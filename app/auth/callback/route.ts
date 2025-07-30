import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url  = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/login', url))
  }

  // 1) do the OAuth exchange _without_ an automatic redirect:
  const supabase = await getServerClient()
  // this overload gives us the raw response under `.response`
  const { error, ...rest } =
    await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth exchange failed:', error)
    return NextResponse.redirect(new URL('/login?error=oauth', url))
  }

  // 2) pull out every Set-Cookie Supabase just emitted
  const setCookies: string[] =
    (rest as any).response.headers.getSetCookie?.() ?? []

  // 3) build your redirect _and_ re-attach those cookies
  const res = NextResponse.redirect(new URL('/', url))
  setCookies.forEach((c) => res.headers.append('Set-Cookie', c))

  return res
}
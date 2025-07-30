import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url  = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login', url))

  // disable Supabase’s auto-redirect so we can pull cookies
  const supabase = await getServerClient()
  const { error, ...rest } =
    await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/login?error=oauth', url))

  // grab all Set-Cookie headers Supabase just generated
  const setCookies = (rest as any).response.headers.getSetCookie?.() ?? []
  const res = NextResponse.redirect(new URL('/', url))
  setCookies.forEach((c: string) => res.headers.append('Set-Cookie', c))
  return res
}
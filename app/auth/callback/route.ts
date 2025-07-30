import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // optional “next” redirect path
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'

  if (code) {
    const supabase = await getServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // handle local vs. proxied host
      const isDev = process.env.NODE_ENV === 'development'
      const host = isDev
        ? origin
        : request.headers.get('x-forwarded-host') 
          ? `https://${request.headers.get('x-forwarded-host')}`
          : origin
      return NextResponse.redirect(`${host}${next}`)
    }
  }

  // fallback on error
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
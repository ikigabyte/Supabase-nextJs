import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerRouterClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login', url))

  const supabase = await getServerRouterClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('Auth exchange failed', error)
    return NextResponse.redirect(new URL('/login?error=oauth', url))
  }

  return NextResponse.redirect(new URL('/', url))
}
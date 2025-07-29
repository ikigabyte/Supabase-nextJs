import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await getServerClient();

  // this reads the code from the URL, exchanges it for tokens, and writes the cookies
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  console.log("OAuth callback received code:", code);
  if (!code) {
    // handle missing code…
    console.error("No code provided in the request");
    return NextResponse.redirect(new URL("/login", request.url));
  }
  console.log("OAuth callback received code:", code);
  // 2. Call the old signature
  await supabase.auth.exchangeCodeForSession(code);
  console.log("OAuth callback completed");
  // now the response has Set-Cookie headers; redirect to your app
  return NextResponse.redirect(new URL("/", request.url));
}

import { NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";
import { createServer } from "http";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next")?.startsWith("/") ? searchParams.get("next") : "/";

  if (!code) {
    console.error("Missing OAuth code");
    return NextResponse.redirect(`${origin}/database/login?error=missing_code`);
  }

  // ← server-side client that reads/writes Supabase cookies
  const supabase = await getServerClient();
  // console.log("Supabase client created for OAuth exchange");
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth exchange failed:", error);
    return NextResponse.redirect(`${origin}/database/auth/auth-code-error`);
  }
  // console.log("OAuth exchange successful, data:", data);
  // success → redirect to wherever the user came from (or “/”)
  return NextResponse.redirect(`${origin}${nextPath}`);
}
// export async function GET(request: Request) {
//   const url = new URL(request.url);
//   const code = url.searchParams.get("code");
//   const nextPath = url.searchParams.get("next") ?? "/database/toprint";
//   console.log("Next path for redirect:", nextPath);
//   if (!code) {
//     return NextResponse.redirect(`${url.origin}/database/login?message=Missing%20code`);
//   }
//   console.log("Code received for OAuth:", code);
//   // grab Next.js’s cookie store
//   const cookieStore = await cookies();
//   console.log("cookieStore", cookieStore);
//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       // new, batch-based cookie methods
//       cookies: {
//         getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
//         setAll: (newCookies) =>
//           newCookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options })),
//       },
//     }
//   );
//   console.log("Supabase client created for OAuth exchange");

//   const { error } = await supabase.auth.exchangeCodeForSession(code);
//   if (error) {
//     console.error("OAuth exchange failed:", error);
//     return NextResponse.redirect(`${url.origin}/database/login?error=oauth`);
//   }

//   return NextResponse.redirect(`${url.origin}${nextPath}`);
// }

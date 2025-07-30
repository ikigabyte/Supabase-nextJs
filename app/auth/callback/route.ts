import { NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { getServerClient } from "@/utils/supabase/server";
import { createServer } from "http";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) next = "/";

  console.log("Next path for redirect:", next);
  console.log("Code received for OAuth:", code);
  if (code) {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  console.error("OAuth exchange failed or no code provided");
  // fall-back – show an error page of your choice
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

// export async function GET(request: Request) {
//   const url = new URL(request.url);
//   const code = url.searchParams.get("code");
//   const nextPath = url.searchParams.get("next") ?? "/toprint";
//   console.log("Next path for redirect:", nextPath);
//   if (!code) {
//     return NextResponse.redirect(`${url.origin}/login?message=Missing%20code`);
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
//     return NextResponse.redirect(`${url.origin}/login?error=oauth`);
//   }

//   return NextResponse.redirect(`${url.origin}${nextPath}`);
// }

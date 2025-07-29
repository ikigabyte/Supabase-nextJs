import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/todos"; // Default redirect url

  if (token_hash && type) {
    const supabase = await getServerClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      console.log("now going to the next page since we managed to verify the OTP");
      // redirect user to specified redirect URL or root of app
      redirect(next);
    }
  }
  console.log("Error verifying OTP, redirecting to login");

  // redirect the user to an error page with some instructions
  redirect("/login?message=Could not veriy OTP");
}

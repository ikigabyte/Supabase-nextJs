'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerClient } from "@/utils/supabase/server";

// Email and password for formData
export async function emailLogin(formData: FormData) {
  const supabase = await getServerClient();
  console.log("Supabase client initialized:", supabase);
  // type-casting here for convenience
  // in practice, you should validate your inputs

  // todo Form validation methods
  const info = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { data, error } = await supabase.auth.signInWithPassword(info);
  // console.log("Data being sent to Supabase:", data);
  if (error) {
    console.error("Error logging in", error);
    redirect("/database/login?message=Could not authenticate user");
  }
  revalidatePath("/", "layout"); // * Clearing the cache here
  console.log("VALID USER LOGGING IN NOW");
  redirect("/database/toprint"); // * Redirecting to the todos page
}

export async function signup(formData: FormData) {
  const supabase = await getServerClient(); // *Very important from the supabase server file
  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signUp(data);
  if (error) {
    redirect("/database/login?message=Check your email for the confirmation link");
  }
  revalidatePath("/", "layout");
  redirect("/database/login?message=Check your email for the confirmation link");
}

export async function signOut() {
  const supabase = await getServerClient(); // *Very important from the supabase server file
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.provider_token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(session.provider_token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) console.error("Supabase signOut failed:", error.message);
  redirect("/database/login?message=You have been signed out");

  // 3️⃣ Redirect back to your login page
  // window.location.href = "/database/login";
}

// export async function oAuthSignIn(provider: Provider) {
//   console.log("oAuthSignIn called with provider:", provider);
//   if (!provider) {
//     console.log("No provider selected");
//     return redirect("/database/login?message=No provider selected");
//   }
//   // await supabase.auth.signOut(); // * Sign out the user before signing in with OAuth
//   // console.log("working here so far")
//   const supabase = await getServerClient();

//   const redirectUrl = getURL("/database/auth/callback");
//   console.log("Redirect URL for OAuth:", redirectUrl);
//   // console.log("working here so far");
//   console.log("redirectUrl", redirectUrl);
//   const { data, error } = await supabase.auth.signInWithOAuth({
//     provider: provider,
//     options: {
//       redirectTo: redirectUrl,
//     },
//   });
//   if (error) {
//     console.error("Error during OAuth sign-in:", error);
//     // return redirect("/database/login?message=Could not authenticate user");
//   }
//   console.log("Data from OAuth sign-in:", data);
//   console.log("Data URL from OAuth sign-in:", data.url);
//   if (!data.url) {
//     console.error("No URL returned from OAuth sign-in");
//     return;
//     // return redirect("/database/login?message=Could not authenticate user");
//   }
//   // return NextResponse.json({ code, headers: Object.fromEntries(request.headers) })

//   console.log("Redirecting to OAuth URL:", data.url);
//   return redirect(data.url);
// }

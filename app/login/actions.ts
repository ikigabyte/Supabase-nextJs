"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerClient } from "@/utils/supabase/server";
import { Provider } from "@supabase/supabase-js";
import { getURL } from "@/utils/helpers";

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
  console.log("Data being sent to Supabase:", data);
  if (error) {
    console.error("Error logging in", error);
    redirect("/login?message=Could not authenticate user");
  }
  revalidatePath("/", "layout"); // * Clearing the cache here
  console.log("VALID USER LOGGING IN NOW");
  redirect("/toprint"); // * Redirecting to the todos page
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
    redirect("/login?message=Check your email for the confirmation link");
  }
  revalidatePath("/", "layout");
  redirect("/login?message=Check your email for the confirmation link");
}

export async function signOut() {
  const supabase = await getServerClient(); // *Very important from the supabase server file
  await supabase.auth.signOut();
  console.log("succesfully signed out");
  redirect("/login");
}

export async function oAuthSignIn(provider: Provider) {
  if (!provider) {
    console.log("No provider selected");
    return redirect("/login?message=No provider selected");
  }

  // console.log("working here so far")
  const supabase = await getServerClient();
  const redirectUrl = getURL("/auth/callback");
  console.log("working here so far");
  console.log("redirectUrl", redirectUrl);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: redirectUrl,
    },
  });
  if (error) {
    return redirect("/login?message=Could not authenticate user");
  }

  console.log("Data from OAuth sign-in:", data);
  console.log("Data URL from OAuth sign-in:", data.url);
  if (!data.url) {
    console.error("No URL returned from OAuth sign-in");
    return redirect("/login?message=Could not authenticate user");
  }
  return redirect(data.url);
}

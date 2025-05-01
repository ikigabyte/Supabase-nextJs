'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Provider } from "@supabase/supabase-js";
import { getURL } from "@/utils/helpers";

// Email and password for formData
export async function emailLogin(formData: FormData) {
  const supabase = await createClient();
  // type-casting here for convenience
  // in practice, you should validate your inputs

  // todo Form validation methods
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) {
    console.error("Error logging in", error);
    redirect("/login?message=Could not authenticate user");
  }
  revalidatePath("/", "layout"); // * Clearing the cache for new cache entries with the user logging in
  console.log("VALID USER LOGGING IN NOW");
  // console.logdata.
  redirect("/toprint"); // * Redirecting to the todos page
  // console.log("going in now")
}

export async function signup(formData: FormData) {
  const supabase = await createClient(); // *Very important from the supabase server file
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
  const supabase = await createClient(); // *Very important from the supabase server file
  await supabase.auth.signOut();
  console.log("succesfully signed out");
  redirect("/login");
}

export async function oAuthSignIn(provider: Provider) {
  if (!provider) {
    console.log('No provider selected')
    return redirect("/login?message=No provider selected");
  }

  // console.log("working here so far")
  const supabase = await createClient();
  console.log("working here so far");
  const redirectUrl = getURL("/auth/callback");
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

  return redirect(data.url);
}

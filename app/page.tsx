'use server'

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not found, redirecting to login");
    redirect("/login");
  }
  redirect("/toprint?rush");
  // const userLoggedIn = false; // Replace with actual user authentication logic
  // if (userLoggedIn) {
  //   redirect("/toprint");
  // } else {
  //   redirect("/login");
  // }
  return null;
}

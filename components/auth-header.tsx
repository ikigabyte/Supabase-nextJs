'use server'
import Header from "./header";
import { getServerClient } from "@/utils/supabase/server";

export default async function AuthHeader() {
  const supabase = await getServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    // no session → render nothing
    return null;
  }
  // console.log("Session in AuthHeader:", session);
  // session exists → show the header
  return <Header />;
}
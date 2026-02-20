'use server'

import { redirect } from "next/navigation";
import { getServerClient } from "@/utils/supabase/server";

export default async function DatabaseHome() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/database/login");
  }

  redirect("/database/toprint?rush");
}

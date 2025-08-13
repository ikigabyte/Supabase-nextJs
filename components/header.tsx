"use client";

import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
// import { getServerClient } from "@/utils/supabase/server";

import Link from "next/link";
import { Input } from "./ui/input";
import { count } from "console";
import { OrderTypes } from "@/utils/orderTypes";
import { Order } from "@/types/custom";
import Form from "next/form";
import type { Session } from "@supabase/supabase-js";

// import {}
// import { SearchBar } from "./search-bar";
// import { redirect } from "next/dist/server/api-utils";

// import { redirect } from 'next/navigation'
import { redirect } from "next/navigation";
import { NavBarElement } from "./navbar-element";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/utils/supabase/client";

// function getProductionCounts(orders: Order[], orderTypes: OrderTypes[]): Record<string, number> {
//   return orderTypes.reduce((acc, category) => {
//     const count = orders.filter((order) => order.material?.toLowerCase() === category.toLowerCase()).length;
//     acc[category] = count;
//     return acc;
//   }, {} as Record<string, number>);
// }

const getInitals = (name: string) => {
  return name[0].charAt(0).toUpperCase();
};

export default function Header() {
  // const [user, setUser] = useState<any>(null);
  const supabase = getBrowserClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    fetchUser();
  }, [supabase]);

  console.log("User in Header:", user);
  const email = user?.email ?? null;
  // const [session, setSession] = useState<Session | null>(null);
  // const user = session?.user ?? null;
  // const
  // const { user} = supabase.auth.getUser();
  // const [user, setUser] = useState<any>(null);

  // useEffect(() => {
  //   async function fetchUser() {
  //     const supabase = getBrowserClient();
  //     const { data } = await supabase.auth.getUser();
  //     setUser(data.user);
  //   }
  //   fetchUser();
  // }, [supabase]);

  // useEffect(() => {
  //   async function fetchUser() {
  //     const supabase = getBrowserClient();
  //     const {
  //       data: { user },
  //     } = await supabase.auth.getUser();
  //     if (!user) {
  //       // redirect("/login");
  //     } else {
  //       setUser(user);
  //     }
  //   }
  //   fetchUser();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);
  // console.log("User in Header:", user);

  return (
    <header className="z-10 sticky top-0 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <nav className="flex items-center space-x-4 lg:space-x-3">
          <a className="mr-5 flex items-center space-x-2" href="/">
            <img src="/stickerbeat-logo.png" alt="Stickerbeat Logo" className="h-8 w-8" />
          </a>
          <div className="flex flex-1 items-center justify-end space-x-12">
            {user !== null ? <NavBarElement /> : <Link href="/login"></Link>}
          </div>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user ? (
            <>
              <Form action={signOut} formMethod="POST" className="flex items-center gap-2">
                <Button asChild className="h-8 w-8 rounded-full">
                  <Link href="/user">{(email[0] ?? "").toUpperCase()}</Link>
                </Button>
                <Button type="submit" size="sm">
                  {" "}
                  Sign Out
                </Button>
              </Form>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

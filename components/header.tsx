"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Form from "next/form";
import type { Session } from "@supabase/supabase-js";

import { signOut } from "@/app/database/login/actions";
import { Button } from "@/components/ui/button";
import { NavBarElement } from "./navbar-element";
import { getBrowserClient } from "@/utils/supabase/client";
import { convertUsableColor } from "@/lib/utils";

type ProfileSummary = {
  color: string | null;
  role: string | null;
  position: string | null;
};

export async function fetchUserProfileById(supabase: any, userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("color, role, position")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user profile:", error);
    return null;
  }

  return (data as ProfileSummary | null) ?? null;
}

const getInitials = (email: string) =>
  email
    .slice(0, 2).toUpperCase();

export default function Header() {
  const supabase = getBrowserClient();

  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<string | null>(null);
  const [profileLabel, setProfileLabel] = useState<string>("");
  const [databaseVersion, setDatabaseVersion] = useState<string | null>(null);

  // const { data, error } = await supabase.from("profiles").select("id, identifier, color, role, position");supabase
  // const { data: ordersData, error: ordersError } = await supabase
  //   .from("orders")
  //   .select("*")
  //   .eq("order_id", 0)
  //   .maybeSingle();

  // console.log("Orders data in Header:", ordersData, ordersError);
  // useEffect(() => {
  //   if (ordersData && ordersData.name_id) {
  //     setDatabaseVersion(ordersData.name_id);
  //   }
  // }, [ordersData]);

  // Keep session/email in sync
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session ?? null);
      setEmail(data.session?.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setEmail(newSession?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch profile details when session is known
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = session?.user?.id;
      if (!userId) {
        if (!cancelled) {
          setMyColor(null);
          setProfileLabel("");
        }
        return;
      }

      const profile = await fetchUserProfileById(supabase, userId);
      const color = profile?.color ? convertUsableColor(profile.color) : "#000000ff";
      const labelValue = (profile?.position ?? profile?.role ?? "").trim();

      if (!cancelled) {
        setMyColor(color);
        setProfileLabel(labelValue);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, session]);

  const userInitials = email ? getInitials(email) : "";
  const userBackgroundColor = myColor ?? "#ffffff";

  return (
    <header className="z-50 w-full border-b border-border bg-white supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-7">
        <nav className="flex items-center space-x-4 lg:space-x-3">
          <a className="mr-3 flex items-center space-x-2" href="/">
            <img src="/stickerbeat-logo.png" alt="Stickerbeat Logo" className="h-8 w-8" />
            <p id="version-p" className="text-xs font-bold">SB Database</p>
          </a>
          <div className="flex items-center justify-end space-x-12">
            {session ? <NavBarElement /> : <Link href="/database/login" />}
          </div>
        </nav>

        <div className="flex items-center space-x-3 ml-auto">
          {session ? (
            <>
              <div className="relative">
                <Button asChild className="h-8 w-8 rounded-full" style={{ backgroundColor: userBackgroundColor }}>
                  <Link href="/database/user">{userInitials}</Link>
                </Button>
                {profileLabel && (
                  <span className="absolute right-full top-1/2 mr-2 -translate-y-1/2 bg-transparent px-0 py-0 text-[10px] font-medium leading-none capitalize">
                    {profileLabel.toUpperCase()}
                  </span>
                )}
              </div>

              <Form action={signOut} formMethod="POST" className="flex items-center gap-2">
                <Button type="submit" size="sm">
                  Sign Out
                </Button>
              </Form>
            </>
          ) : (
            <Button asChild>
              <Link href="/database/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Form from "next/form";
import type { Session } from "@supabase/supabase-js";

import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { NavBarElement } from "./navbar-element";
import { getBrowserClient } from "@/utils/supabase/client";
import { convertUsableColor } from "@/lib/utils";

// helper stays the same
export async function fetchUserColorByIdentifier(supabase: any, identifier: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("color")
    .eq("identifier", identifier)
    .maybeSingle();
    
    if (error) {
      console.error("Failed to fetch user color:", error);
      return null;
    }
  if (data.color) {
    return convertUsableColor(data.color);
  } else {
    return "#000000ff"; // default white with full opacity
  }
}

const getInitials = (email: string) =>
  email
    .slice(0, 2).toUpperCase();

export default function Header() {
  const supabase = getBrowserClient();

  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<string | null>(null);

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

  // Fetch color when email is known (this is the part that was broken)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!email) {
        if (!cancelled) setMyColor(null);
        return;
      }
      const color = await fetchUserColorByIdentifier(supabase, email);
      if (!cancelled) setMyColor(color);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, email]);

  const userInitials = email ? getInitials(email) : "";
  const userBackgroundColor = myColor ?? "#ffffff";

  return (
    <header className="z-50 w-full border-b border-border bg-white supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-7">
        <nav className="flex items-center space-x-4 lg:space-x-3">
          <a className="mr-3 flex items-center space-x-2" href="/">
            <img src="/stickerbeat-logo.png" alt="Stickerbeat Logo" className="h-8 w-8" />
            <p className="text-xs">v.22</p>
          </a>
          <div className="flex items-center justify-end space-x-12">
            {session ? <NavBarElement /> : <Link href="/login" />}
          </div>
        </nav>

        <div className="flex items-center space-x-3 ml-auto">
          {session ? (
            <>
              <Button asChild className="h-8 w-8 rounded-full" style={{ backgroundColor: userBackgroundColor }}>
                <Link href="/user">{userInitials}</Link>
              </Button>

              <Form action={signOut} formMethod="POST" className="flex items-center gap-2">
                <Button type="submit" size="sm">
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
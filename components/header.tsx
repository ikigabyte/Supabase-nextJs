"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Form from "next/form";
import type { Session } from "@supabase/supabase-js";
import { Menu, X } from "lucide-react";

import { signOut } from "@/app/database/login/actions";
import { Button } from "@/components/ui/button";
import { NavBarElement } from "./navbar-element";
import { getBrowserClient } from "@/utils/supabase/client";
import { convertUsableColor } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ProfileSummary = {
  color: string | null;
  role: string | null;
  position: string | null;
  latest_version_review: string | null;
};

export async function fetchUserProfileById(supabase: any, userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("color, role, position, latest_version_review")
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
  const [updateNotes, setUpdateNotes] = useState<string | null>(null);
  const [latestVersionReview, setLatestVersionReview] = useState<string | null>(null);
  const [profileReviewLoaded, setProfileReviewLoaded] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          setLatestVersionReview(null);
          setProfileReviewLoaded(false);
        }
        return;
      }

      setProfileReviewLoaded(false);
      const profile = await fetchUserProfileById(supabase, userId);
      const color = profile?.color ? convertUsableColor(profile.color) : "#000000ff";
      const labelValue = (profile?.position ?? profile?.role ?? "").trim();

      if (!cancelled) {
        setMyColor(color);
        setProfileLabel(labelValue);
        setLatestVersionReview(profile?.latest_version_review ?? null);
        setProfileReviewLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, session]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("name_id, notes")
        .eq("order_id", 0)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch the latest database update:", error);
        return;
      }

      if (!cancelled) {
        setDatabaseVersion(data?.name_id ?? null);
        setUpdateNotes(data?.notes ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const openLatestUpdates = async () => {
    setUpdatesOpen(true);

    const { data: orderZero, error: orderZeroError } = await supabase
      .from("orders")
      .select("name_id, notes")
      .eq("order_id", 0)
      .maybeSingle();

    if (orderZeroError) {
      console.error("Failed to fetch the latest database update:", orderZeroError);
      return;
    }

    const currentVersion = orderZero?.name_id ?? null;
    setDatabaseVersion(currentVersion);
    setUpdateNotes(orderZero?.notes ?? null);

    const userId = session?.user?.id;
    if (!userId || !currentVersion) return;

    const { error } = await supabase
      .from("profiles")
      .update({ latest_version_review: currentVersion })
      .eq("id", userId);

    if (error) {
      console.error("Failed to mark the latest database update as reviewed:", error);
      return;
    }

    setLatestVersionReview(currentVersion);
  };

  const userInitials = email ? getInitials(email) : "";
  const emailUsername = email?.split("@")[0] ?? "";
  const userBackgroundColor = myColor ?? "#ffffff";
  const hasNewUpdate = Boolean(profileReviewLoaded && databaseVersion && latestVersionReview !== databaseVersion);

  return (
    <header className="z-50 w-full border-b border-border bg-white supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full min-w-0 items-center gap-2 px-2 text-[10px] sm:px-4 sm:text-[11px] md:px-7 md:text-xs">
        {session && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 xl:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <nav className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="mr-1 flex shrink-0 items-center gap-1 rounded-sm sm:mr-2 sm:gap-2"
            aria-label="View latest SB Database updates"
            onClick={openLatestUpdates}
          >
            <img src="/images/stickerbeat-logo.png" alt="Stickerbeat Logo" className="h-7 w-7 md:h-8 md:w-8" />
            <p className="whitespace-nowrap text-[inherit] font-bold">
              SB Database{databaseVersion ? ` ${databaseVersion}` : ""}
            </p>
            {hasNewUpdate && (
              <span className="rounded border border-red-600 bg-red-600 px-1 py-0.5 text-[8px] font-bold leading-none text-white sm:text-[9px]">
                NEW
              </span>
            )}
          </button>
          <div
            className={`${
              mobileMenuOpen ? "fixed inset-0 z-50 block xl:static xl:inset-auto" : "hidden"
            } xl:block xl:min-w-0 xl:flex-1 xl:overflow-hidden`}
          >
            <button
              type="button"
              className="fixed inset-0 bg-black/40 xl:hidden"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed bottom-0 left-0 top-0 z-10 w-72 max-w-[85vw] border-r border-border bg-white p-4 shadow-xl xl:static xl:w-auto xl:max-w-none xl:border-r-0 xl:bg-transparent xl:p-0 xl:shadow-none">
              <div className="mb-4 flex items-center justify-between xl:hidden">
                <span className="text-sm font-bold">SB Database</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {session ? <NavBarElement onNavigate={() => setMobileMenuOpen(false)} /> : <Link href="/database/login" />}
            </div>
          </div>
        </nav>

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-2 bg-white pl-2 sm:gap-3">
          {session ? (
            <>
              <div className="flex items-center gap-2">
                {(emailUsername || profileLabel) && (
                  <div className="max-w-24 truncate text-right leading-tight sm:max-w-32">
                    {emailUsername && (
                      <p className="truncate text-[10px] font-semibold normal-case sm:text-[11px]">
                        {emailUsername}
                      </p>
                    )}
                    {profileLabel && (
                      <p className="truncate text-[9px] font-medium capitalize sm:text-[10px]">
                        role: {profileLabel}
                      </p>
                    )}
                  </div>
                )}
                <Button asChild className="h-8 w-8 rounded-full" style={{ backgroundColor: userBackgroundColor }}>
                  <Link href="/database/user">{userInitials}</Link>
                </Button>
              </div>

              <Form action={signOut} formMethod="POST" className="flex items-center gap-2">
                <Button type="submit" size="sm" className="px-2 text-[10px] sm:px-3 sm:text-xs">
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
      <Dialog open={updatesOpen} onOpenChange={setUpdatesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Latest SB Database Updates{databaseVersion ? ` — ${databaseVersion}` : ""}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap text-sm text-foreground">
              {updateNotes?.trim() || "No update notes have been added yet."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </header>
  );
}

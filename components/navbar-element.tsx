"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { getBrowserClient } from "@/utils/supabase/client";
import { DialogSearch } from "./search-dialog";
// import SearchResults from "@/components/searchresults";
import type { Session } from "@supabase/supabase-js";
import { Search } from "lucide-react";

const DELAY_BETWEEN_UPDATES = 2000; // 1.5 seconds

export function NavBarElement() {
  // const router = useRouter();
  const [counts, setCounts] = useState<{
    print: number | string;
    cut: number | string;
    pack: number | string;
    prepack: number | string;
    ship: number | string;
  }>({
    print: "...",
    cut: "...",
    prepack: "...",
    pack: "...",
    ship: "...",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = getBrowserClient();

  // function onSearch(searchTerm: string) {
  //   router.push(`/search?query=${encodeURIComponent(searchTerm)}`);
  // }

  // Populate session before the counts/channel effect triggers
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSession(data.session ?? null);
    })();

    // Keep session in sync with auth state changes
    const { data: auth } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      auth?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Resolve admin role
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userRes.user.id).single();
      if (!cancelled) setIsAdmin(profile?.role === "admin" || profile?.role === "manager");
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // fetchCounts moved out, memoized on supabase
  const timeoutRef = useRef<number | null>(null);
  const fetchCounts = useCallback(async () => {
    const statuses = ["print", "cut", "pack", "prepack", "ship"] as const;

    const newCounts: Record<(typeof statuses)[number], number> = {
      print: 0,
      cut: 0,
      pack: 0,
      prepack: 0,
      ship: 0,
    };

    const { data, error } = await supabase.from("orders").select("production_status").in("production_status", statuses);

    if (error) {
      console.error(error);
    } else {
      for (const row of data ?? []) {
        const s = row.production_status as (typeof statuses)[number];
        if (s in newCounts) newCounts[s] += 1;
      }
    }

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCounts(newCounts), DELAY_BETWEEN_UPDATES);
  }, [supabase]);
  // Counts + channel effect; depends on supabase and session
  useEffect(() => {
    if (session === null) return;

    // initial run
    fetchCounts();

    // single wildcard listener for all events on orders
    const channel = supabase
      .channel("orders_counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchCounts)
      .subscribe();

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, session]); // memoized fetchCounts uses supabase; session gate prevents early run

  // Open DialogSearch on Ctrl+F or Cmd+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-5 text-xs font-medium">
      <Link id="to-print" href="/toprint?rush">
        To Print ({counts.print})
      </Link>
      <Link id="to-cut" href="/tocut?regular">
        To Cut ({counts.cut})
      </Link>
      <Link id="to-prepack" href="/toprepack?regular">
        To Prepack ({counts.prepack})
      </Link>
      <Link id="to-pack" href="/topack?regular">
        To Pack ({counts.pack})
      </Link>
      <Link id="to-ship" href="/toship?regular">
        To Ship ({counts.ship})
      </Link>
      <Link id="history" href="/history">
        History <span className="text-red-500">[NEW]</span>
      </Link>
      <Link id="completed" href="/completed">
        Completed
      </Link>
      <Link id="timeline" href="/timeline">
        Timeline
      </Link>
      {isAdmin && (
        <Link id="admin" href="/admin" className="text-red-900">
          Admin
        </Link>
      )}
      <Link href="#" onClick={() => setDialogOpen(true)} className="flex items-center gap-1">
        <Search size={14} className="cursor-pointer" />
        <span>Search Log</span>
      </Link>
      <DialogSearch open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

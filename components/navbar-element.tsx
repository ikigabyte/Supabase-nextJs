"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/utils/supabase/client";
import { DialogSearch } from "./search-dialog";
import SearchResults from "@/components/searchresults";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const DELAY_BETWEEN_UPDATES = 1500; // 1.5 seconds

export function NavBarElement() {
  const router = useRouter();
  const [counts, setCounts] = useState<{
    print: number | string;
    cut: number | string;
    pack: number | string;
    ship: number | string;
  }>({
    print: "...",
    cut: "...",
    pack: "...",
    ship: "...",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = getBrowserClient();

  function onSearch(searchTerm: string) {
    router.push(`/search?query=${encodeURIComponent(searchTerm)}`);
  }

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userRes.user.id)
        .single();

      if (!cancelled) setIsAdmin(profile?.role === "admin");
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // fetchCounts moved out, memoized on supabase
  const timeoutRef = useRef<number | null>(null);
  const fetchCounts = useCallback(async () => {
    const statuses = ["print", "cut", "pack", "ship"] as const;
    const newCounts: Record<(typeof statuses)[number], number> = {
      print: 0,
      cut: 0,
      pack: 0,
      ship: 0,
    };

    await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true }) // no rows returned
          .eq("production_status", status);
        newCounts[status] = count ?? 0;
      })
    );

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCounts(newCounts);
    }, DELAY_BETWEEN_UPDATES);
  }, [supabase]);

  // Counts + channel effect; depends on supabase and session
  useEffect(() => {
    if (session === null) return;

    // initial run
    fetchCounts();

    // single wildcard listener for all events on orders
    const channel = supabase
      .channel("orders_counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        fetchCounts
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, session]); // memoized fetchCounts uses supabase; session gate prevents early run

  // Open DialogSearch on Ctrl+F or Cmd+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
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
      <Link id="to-pack" href="/topack?regular">
        To Pack ({counts.pack})
      </Link>
      <Link id="to-ship" href="/toship?regular">
        To Ship ({counts.ship})
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
      <DialogSearch
        onSearch={onSearch}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
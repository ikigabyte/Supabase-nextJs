"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { getBrowserClient } from "@/utils/supabase/client";
import { subscribeToOrders } from "@/utils/supabase/orders-realtime";
import { createCoalescedRefresh } from "@/utils/coalesced-refresh";
import { DialogSearch } from "./search-dialog";
// import SearchResults from "@/components/searchresults";
import type { Session } from "@supabase/supabase-js";
import { Search } from "lucide-react";

const DELAY_BETWEEN_UPDATES = 2000;
const ALLOWED_POSITIONS = new Set(["prepress", "printing"]);

type NavBarElementProps = {
  onNavigate?: () => void;
};

export function NavBarElement({ onNavigate }: NavBarElementProps = {}) {
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
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [userPosition, setUserPosition] = useState<string | null>(null);
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
        if (!cancelled) {
          setIsAdmin(false);
          setIsAdminRole(false);
          setUserPosition(null);
        }
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, position")
        .eq("id", userRes.user.id)
        .single();
      if (!cancelled) {
        setUserPosition(profile?.position ?? null);
        setIsAdmin(profile?.role === "admin" || profile?.role === "manager");
        setIsAdminRole(profile?.role === "admin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const normalizedPosition = (userPosition ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  
  const canViewHistory = isAdmin || ALLOWED_POSITIONS.has(normalizedPosition);
  useEffect(() => {
    if (!session?.user.id) return;
    const statuses = ["print", "cut", "pack", "prepack", "ship"] as const;
    let statusByNameId = new Map<string, string>();
    let loaded = false;

    const refresh = createCoalescedRefresh(async () => {
      const nextStatuses = new Map<string, string>();
      const newCounts = { print: 0, cut: 0, pack: 0, prepack: 0, ship: 0 };
      // Page the small projection so counts do not stop at the API row limit.
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("orders")
          .select("name_id, production_status")
          .in("production_status", statuses)
          .order("name_id")
          .range(from, from + 999);
        if (error) throw error;
        for (const row of data ?? []) {
          const status = row.production_status as (typeof statuses)[number];
          nextStatuses.set(row.name_id, status);
          newCounts[status] += 1;
        }
        if (!data || data.length < 1000) break;
      }
      return () => {
        statusByNameId = nextStatuses;
        loaded = true;
        setCounts(newCounts);
      };
    }, DELAY_BETWEEN_UPDATES);

    refresh.request(true);
    const unsubscribe = subscribeToOrders((payload) => {
      const row = payload.eventType === "DELETE" ? payload.old : payload.new;
      const oldNameId = ("name_id" in payload.old ? payload.old.name_id : undefined) ?? row.name_id;
      if (!loaded || !row.name_id || !oldNameId) {
        refresh.request();
        return;
      }
      const previousStatus = statusByNameId.get(oldNameId);
      const nextStatus = payload.eventType !== "DELETE" &&
        statuses.includes(row.production_status as (typeof statuses)[number])
        ? row.production_status : undefined;
      statusByNameId.delete(oldNameId);
      if (nextStatus) statusByNameId.set(row.name_id, nextStatus);
      if (previousStatus !== nextStatus || oldNameId !== row.name_id) refresh.request();
    }, (status) => {
      if (status === "SUBSCRIBED") refresh.request(true);
    });

    return () => {
      refresh.cancel();
      unsubscribe();
    };
  }, [supabase, session?.user.id]);

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
    <div className="flex flex-col gap-1 text-sm font-medium lg:min-w-max lg:flex-row lg:items-center lg:gap-5 lg:text-[inherit]">
      <Link id="to-print" href="/database/toprint?rush" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        To Print ({counts.print})
      </Link>
      <Link id="to-cut" href="/database/tocut?regular" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        To Cut ({counts.cut})
      </Link>
      <Link id="to-prepack" href="/database/toprepack?regular" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        To Prepack ({counts.prepack})
      </Link>
      <Link id="to-pack" href="/database/topack?regular" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        To Pack ({counts.pack})
      </Link>
      <Link id="to-ship" href="/database/toship?regular" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        To Ship ({counts.ship})
      </Link>
      {canViewHistory && !isAdmin && (
        <Link id="history" href="/database/admin#history" onClick={onNavigate} className="flex items-center gap-1 whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
          History
          <span className="text-red-600">NEW</span>
        </Link>
      )}
      <Link id="completed" href="/database/completed" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        Completed
      </Link>
      <Link id="timeline" href="/database/timeline" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
        Timeline
      </Link>
      {isAdmin && (
        <Link id="admin" href="/database/admin" onClick={onNavigate} className="whitespace-nowrap rounded px-3 py-2 text-red-900 hover:bg-gray-100 lg:px-0 lg:py-0 lg:hover:bg-transparent">
          Admin
        </Link>
      )}
      <Link
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setDialogOpen(true);
          onNavigate?.();
        }}
        className="flex items-center gap-1 whitespace-nowrap rounded border border-gray-200 px-3 py-2 hover:bg-gray-100 lg:px-3 lg:hover:bg-transparent"
      >
        <Search size={14} className="cursor-pointer" />
        <span>Search Log</span>
      </Link>
      <DialogSearch open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

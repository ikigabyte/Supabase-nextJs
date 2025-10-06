"use client";

import React, { Fragment, useEffect, useState, useMemo, useCallback, useRef } from "react";
// import { getbrow, type Session } from "@supabase/supabase-js";
import { useRouter, usePathname, redirect, useSearchParams } from "next/navigation";
import { type SupabaseClient } from "@supabase/supabase-js";
import { Table } from "@/components/ui/table";
import { Order } from "@/types/custom";
import { OrderTableHeader } from "./order-table-header";
import { OrderTableBody } from "./order-table-body";
import { OrderInputter } from "./order-inputter";
import { groupOrdersByOrderType } from "@/utils/grouper";
import { ButtonOrganizer } from "./button-organizer";
import { getBrowserClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";

// lib/supabase.ts

import { getButtonCategories } from "@/types/buttons";
import {
  updateOrderStatus,
  updateOrderNotes,
  removeOrderLine,
  removeOrderAll,
  createCustomOrder,
  addOrderViewer,
  assignOrderToUser,
} from "@/utils/actions";
import { Separator } from "./ui/separator";
import { getMaterialHeaders } from "@/types/headers";
import { ScrollAreaDemo } from "./scroll-area";
import { orderKeys } from "@/utils/orderKeyAssigner";
import { OrderTypes } from "@/utils/orderTypes";
import { ContextMenu } from "./context-menu";
import { OrderViewer } from "./order-viewer";
import { ViewersDropdown } from "./viewers";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { RefreshCcw } from "lucide-react"
// import { actionAsyncStorage } from "next/dist/server/app-render/action-async-storage.external";
// import { Description } from "@radix-ui/react-toast";
// import { ScrollArea } from "@radix-ui/react-scroll-area";
// import { ScrollBar } from "./ui/scroll-area";
import { convertToSpaces } from "@/lib/utils";
import { UserSearchIcon } from "lucide-react";
import { setDefaultAutoSelectFamilyAttemptTimeout } from "net";

type Counts = Record<OrderTypes, number>;
type UserProfileRow = { id: string; role: string; color: string | null };

const STATUSES: readonly OrderTypes[] = ["print", "cut", "pack", "ship"] as const;
const draggingThreshold = 1; // px

const ACTIVE_MS = 30 * 60 * 1000 // 30 minutes
const IDLE_MS   = 3 * 60 * 60 * 1000 // 2 hours

const MAX_RETRIES_FOR_SCROLL = 10;
// const TIME_BETWEEN_FORCED_REFRESHES = 5 * 60 * 1000; // 5 minutes
const TIME_BETWEEN_FORCED_REFRESHES = 15 * 1000; // 5 minutes
const handleNewProductionStatus = (status: string | null, reverse: boolean) => {
  if (reverse) {
    switch (status) {
      case "completed":
        return "ship";
      case "ship":
        return "pack";
      case "pack":
        return "cut";
      case "cut":
        return "print";
      default:
        return status;
    }
  } else {
    switch (status) {
      case "print":
        return "cut";
      case "cut":
        return "pack";
      case "pack":
        return "ship";
      case "ship":
        return "completed";
      default:
        return status;
    }
  }
};

const laminationHeaderColors = {
  matte: "text-purple-500",
  gloss: "text-blue-500",
};

// function extractDashNumber(name: string): number {
//   const match = name.match(/-(\d+)-/);
//   return match ? parseInt(match[1], 10) : Infinity;
// }

// function sortOrders(a: Order, b: Order) {
//   // 1. Group by order number
//   if (a.order_id !== b.order_id) return a.order_id - b.order_id;

//   // 2. Within group, sort by due date ascending
//   const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
//   if (dateDiff !== 0) return dateDiff;

//   // 3. Within group and date, sort by dash number (if any)
//   const aNum = extractDashNumber(a.name_id);
//   const bNum = extractDashNumber(b.name_id);
//   return aNum - bNum;
// }


function getCategoryCounts(orders: Order[], categories: string[], orderType: OrderTypes): Record<string, number> {
  return categories.reduce((acc, category) => {
    const lowerCat = category.toLowerCase();
    let count = 0;
    if (orderType === "print") {
      if (lowerCat === "sheets") {
        // **Sheets count logic takes priority over rush**
        count = orders.filter(
          (order) => order.production_status === orderType && order.shape?.toLowerCase() === "sheets"
        ).length;
      } else if (lowerCat === "rush") {
        // Count only rush orders matching the current status
        count = orders.filter((order) => order.production_status === orderType && order.rush === true).length;
      } else if (lowerCat === "special") {
        count = orders.filter((order) => order.production_status === orderType && order.orderType === 2).length;
      } else if (lowerCat === "regular") {
        count = orders.filter(
          (order) =>
            order.production_status === orderType && order.rush !== true && order.material?.toLowerCase() !== "roll"
        ).length;
      } else {
        count = orders.filter(
          (order) =>
            order.production_status === orderType && order.rush !== true && order.material?.toLowerCase() === lowerCat
        ).length;
      }
    } else {
      if (lowerCat === "rush") {
        // Ignore rush for non-print statuses
        count = 0;
      } else if (lowerCat === "regular") {
        count = orders.filter(
          (order) => order.production_status === orderType && order.material?.toLowerCase() !== "roll"
        ).length;
      } else {
        count = orders.filter(
          (order) => order.production_status === orderType && order.material?.toLowerCase() === lowerCat
        ).length;
      }
    }
    acc[category] = count;
    return acc;
  }, {} as Record<string, number>);
}

function parsePgTs(ts: string | undefined): Date {
  if (!ts) return new Date(NaN);
  // "2025-08-14 15:07:44.897299+00" -> ISO-like
  const [d, t] = ts.split(" ");
  if (!t) return new Date(ts);
  // match time + offset like +00 or +03 or +0330
  const m = t.match(/^(\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})(\d{2})?$/);
  if (m) {
    const [, time, hh, mm] = m;
    return new Date(`${d}T${time}${hh}:${mm ?? "00"}`);
  }
  return new Date(`${d}T${t}`);
}

async function fetchOrdersByStatus(
  supabase: SupabaseClient,
  status: OrderTypes,
  chunkSize = 1000
): Promise<Array<Pick<Order, "order_id" | "name_id">>> {
  const collected: Array<Pick<Order, "order_id" | "name_id">> = [];
  let from = 0;
  let more = true;

  while (more) {
    const { data, error } = await supabase
      .from("orders")
      .select("order_id, name_id")
      .eq("production_status", status)
      .range(from, from + chunkSize - 1);

    if (error) {
      throw error;
    }

    const page = (data as Array<Pick<Order, "order_id" | "name_id">>) ?? [];
    collected.push(...page);

    if (page.length < chunkSize) {
      more = false;
    } else {
      from += chunkSize;
    }
  }

  return collected;
}

async function ensureOrdersInLog(params: {
  supabase: SupabaseClient;
  orderType: OrderTypes;
  localOrders: Order[];
}): Promise<{
  missingInClient: Array<Pick<Order, "order_id" | "name_id">>;
  missingInSupabase: Array<Pick<Order, "order_id" | "name_id">>;
}> {
  const { supabase, orderType, localOrders } = params;
  const remoteOrders = await fetchOrdersByStatus(supabase, orderType);
  const localOrdersForStatus = localOrders.filter((o) => o.production_status === orderType);

  const localNameIds = new Set(localOrdersForStatus.map((o) => o.name_id));
  const remoteNameIds = new Set(remoteOrders.map((o) => o.name_id));

  const missingInClient = remoteOrders.filter((row) => !localNameIds.has(row.name_id));
  const missingInSupabase = localOrdersForStatus
    .filter((order) => !remoteNameIds.has(order.name_id))
    .map((order) => ({ order_id: order.order_id, name_id: order.name_id }));

  if (missingInClient.length > 0) {
    console.warn(
      `[ensureOrdersInLog] ${missingInClient.length} orders exist in Supabase but are missing from the client state for ${orderType}:`,
      missingInClient.map((row) => ({ order_id: row.order_id, name_id: row.name_id }))
    );
  } else {
    console.warn(`[ensureOrdersInLog] No Supabase orders missing from client state for ${orderType}.`);
  }

  if (missingInSupabase.length > 0) {
    console.warn(
      `[ensureOrdersInLog] ${missingInSupabase.length} orders exist in client state but not in Supabase for ${orderType}:`,
      missingInSupabase
    );
  } else {
    console.warn(`[ensureOrdersInLog] No client orders missing from Supabase for ${orderType}.`);
  }

  return { missingInClient, missingInSupabase };
}

// function convertDateStringtoTime(dateString : string) : Date{
// }


export async function checkTotalCountsForStatus(
  source?: { orders?: Order[]; supabase?: SupabaseClient },
  productionStatus?: OrderTypes
): Promise<number> {
  if (!productionStatus || !STATUSES.includes(productionStatus)) {
    console.error("Invalid or missing productionStatus");
    return 0;
  }

  // 1) Local path (fastest)
  if (source?.orders && Array.isArray(source.orders)) {
    return source.orders.filter((o) => o.production_status === productionStatus).length;
  }

  // 2) Remote path (head counts)
  const sb = source?.supabase ?? getBrowserClient();
  const { count, error } = await sb
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("production_status", productionStatus);

  if (error) {
    console.error(`Count failed for ${productionStatus}`, error);
    return 0;
  }

  return count ?? 0;
}

export async function filterOutOrderCounts(source?: { orders?: Order[]; supabase?: SupabaseClient }): Promise<Counts> {
  // 1) Local path (fastest)
  if (source?.orders && Array.isArray(source.orders)) {
    const counts: Counts = { print: 0, cut: 0, pack: 0, ship: 0 };
    for (const o of source.orders) {
      const s = o.production_status as OrderTypes;
      if (STATUSES.includes(s)) counts[s] += 1;
    }
    return counts;
  }

  // 2) Remote path (head counts)
  const sb = source?.supabase ?? getBrowserClient();
  const results = await Promise.all(
    STATUSES.map((status) =>
      sb.from("orders").select("id", { count: "exact", head: true }).eq("production_status", status)
    )
  );

  const counts: Counts = { print: 0, cut: 0, pack: 0, ship: 0 };
  results.forEach(({ count, error }, i) => {
    if (error) console.error(`Count failed for ${STATUSES[i]}`, error);
    counts[STATUSES[i]] = count ?? 0;
  });
  return counts;
}

export function updateOrderCountersDom(counts: Counts, attempt = 0) {
  if (typeof document === "undefined") return;

  const labels: Record<OrderTypes, string> = {
    print: `To Print (${counts.print})`,
    cut: `To Cut (${counts.cut})`,
    pack: `To Pack (${counts.pack})`,
    ship: `To Ship (${counts.ship})`,
  };

  const idMap: Record<OrderTypes, string[]> = {
    print: ["to-print-counter", "to-print"],
    cut: ["to-cut-counter", "to-cut"],
    pack: ["to-pack-counter", "to-pack"],
    ship: ["to-ship-counter", "to-ship"],
  };

  let updatedAny = false;
  (Object.keys(labels) as OrderTypes[]).forEach((k) => {
    for (const id of idMap[k]) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = labels[k];
        updatedAny = true;
        break;
      }
    }
  });

  // If navbar not mounted yet, retry a few times.
  if (!updatedAny && attempt < 20) {
    setTimeout(() => updateOrderCountersDom(counts, attempt + 1), 100);
  }
}
// function updateOrderCounts(orderCounts: Record<string, number>) {
//   console.log("this is the order counts", orderCounts);
//   Object.entries(orderCounts).forEach(([orderType, count]) => {
//     const id = `to-${orderType}`;
//     const update = () => {
//       const navElement = document.getElementById(id);
//       if (navElement) {
//         const title = `To ${orderType.charAt(0).toUpperCase()}${orderType.slice(1)}`;
//         navElement.textContent = `${title} (${count})`;
//       } else {
//         requestAnimationFrame(update);
//       }
//     };
//     requestAnimationFrame(update);
//   });
// }
// const cookieHeader = req.headers.cookie || "";

// supabase.auth.getSession().then(({ data, error }) => {
//   console.log('Session data:', data);
// });
// console.log("here is the supabase client" , supabase);

type OrderViewerRow = { name_id: string; user_id: string; last_updated: string; user_email: string };

export function OrderOrganizer({ orderType, defaultPage }: { orderType: OrderTypes; defaultPage: string }) {
  const supabase = getBrowserClient();
  // console



  // console.log("Supabase client initialized:", supabase.auth.getUser());

  async function fetchAllOrders() {
    const allOrders = [];
    let from = 0;
    const chunkSize = 1000;
    let more = true;

    while (more) {
      const { data, error, count } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .range(from, from + chunkSize - 1);

      if (error) {
        console.error("Error fetching orders:", error);
        break;
      }
      allOrders.push(...(data ?? []));
      if (!data || data.length < chunkSize) {
        more = false;
      } else {
        from += chunkSize;
      }
    }

    return allOrders;
  }

  if (supabase === null) {
    console.error("Supabase client is null");
    redirect("/login");
    return null; // or handle the error as needed
  }
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // console.log("Session:", session, "Error:", error);
      setSession(session);
    });
  }, []);

  // Track orders for which we want to ignore the next real-time update
  const ignoreUpdateIds = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dragging, setDragging] = useState(false);
  const [scrollPosition, setScrollPosition] = useState<number>(0); // Temporary
  // Move these hooks above useEffect so they're in scope in subscription handlers
  const [isRowHovered, setIsRowHovered] = useState<boolean>(false);
  const [displayDropdown, setDisplayDropdown] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRowClicked, setIsRowClicked] = useState<boolean>(false);
  const rowRefs = useRef<{ [name_id: string]: HTMLTableRowElement | null }>({});
  const [currentRowClicked, setCurrentRowClicked] = useState<Order | null>(null);
  const [multiSelectedRows, setMultiSelectedRows] = useState<Map<string, string | null>>(new Map());
  const [hashValue, setHashValue] = useState<string | null>(null);
  const pendingRemovalIds = useRef<Set<string>>(new Set());
  const [userRows, setUserRows] = useState<Map<string, string>>(new Map());
  const [updateCounter, forceUpdate] = useState(0);
  const searchParams = useSearchParams();
  // const [updateCounter, forceUpdate] = useState(0);
  const dragSelections = useRef<
    Map<HTMLTableElement, { startRow: number; endRow: number /* , startCol: number; endCol: number */ }>
  >(new Map());

  // 2) ----- inside OrderOrganizer component state block -----
  const [profilesById, setProfilesById] = useState<
    Map<string, { name: string; color?: string | null; identifier?: string | null }>
  >(new Map());

  const [viewersByUser, setViewersByUser] = useState<Map<string, Date>>(new Map());

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    // console.log("Now tick updated:", nowTick);
    const id = setInterval(() => setNowTick(Date.now()), 60_000); // every 1 min
    return () => clearInterval(id);
  }, []);

  // 3) ----- replace your existing profiles fetch effect to enrich profiles -----
  // BEFORE: select("identifier, color")
  // AFTER:
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("id, identifier, color");
      if (error) {
        console.error("Failed to load profiles:", error);
        return;
      }
      if (!cancelled) {
        const idMap = new Map<string, { name: string; color?: string | null; identifier?: string | null }>();
        const userColorMap = new Map<string, string>();
        (data ?? []).forEach((row: any) => {
          idMap.set(row.id, {
            name: row.identifier ?? row.id,
            color: row.color ?? null,
            identifier: row.identifier ?? null,
          });
          userColorMap.set(row.identifier ?? "", row.color ?? "");
        });
        setProfilesById(idMap);
        setUserRows(userColorMap);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    async function checkMatchingCounts() {
      if (!orders || orders.length === 0) {
        console.log("Orders are not loaded yet, waiting...");
        return;
      }
      const counts = categoryCounts;
      const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
      console.log("Total count of all categories:", totalCount);
      const totalProductionCount = await checkTotalCountsForStatus({ orders, supabase }, orderType);
      if (totalCount !== totalProductionCount) {
        console.warn(
          `[checkMatchingCounts] Mismatch detected for ${orderType}: categories total ${totalCount}, Supabase total ${totalProductionCount}. Investigating...`
        );
        try {
          await ensureOrdersInLog({ supabase, orderType, localOrders: orders });
        } catch (err) {
          console.error("[checkMatchingCounts] Failed to ensure orders are present in the log:", err);
        }
      }
      console.log(rowRefs.current)
      console.log(`Category total: ${totalCount}, Production status total: ${totalProductionCount}`);
    }

    // Run immediately, then every 5 minutes
    checkMatchingCounts();
    const interval = setInterval(checkMatchingCounts, TIME_BETWEEN_FORCED_REFRESHES);

    return () => clearInterval(interval);
  }, [orders, supabase, orderType]);

  // 4) ----- subscribe to order_viewers + initial load -----
  // ---- 3) subscribe to INSERT + UPDATE (replace your current order_viewers channel) ----
  useEffect(() => {
    let cancelled = false;

    const upsert = (row: OrderViewerRow) => {
      setViewersByUser((prev) => {
        const next = new Map(prev);
        const d = parsePgTs(row.last_updated);
        // KEY: use the same key you use in profilesById (prefer user_id)
        const key = row.user_id; // <- if your profilesById is keyed by profile id
        const cur = next.get(key);
        if (!cur || d > cur) next.set(key, d);
        return next;
      });
    };

    (async () => {
      const { data, error } = await supabase.from("order_viewers").select("user_id, last_updated, name_id");
      if (!error && !cancelled) {
        const map = new Map<string, Date>();
        (data as OrderViewerRow[]).forEach((r) => {
          const d = parsePgTs(r.last_updated);
          const key = r.user_id; // keep keys consistent
          const prev = map.get(key);
          if (!prev || d > prev) map.set(key, d);
        });
        setViewersByUser(map);
      } else if (error) {
        console.error("order_viewers init error:", error);
      }
    })();

    const ch = supabase
      .channel("order_viewers_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_viewers" }, // INSERT + UPDATE (+ DELETE if you ever need)
        (payload) => {
          // console.log("order_viewers change:", payload.eventType, payload.new || payload.old);
          if (payload.new) upsert(payload.new as OrderViewerRow);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [supabase]);

  // console.log(userRows)
  // 5) ----- derive active/idle lists -----
  // Viewer activity thresholds (in ms)

  const { activeViewers, idleViewers } = useMemo(() => {
    const now = nowTick;
    const active: { user_id: string; last: Date }[] = [];
    const idle: { user_id: string; last: Date }[] = [];

    viewersByUser.forEach((last, user_id) => {
      const delta = now - last.getTime();
      if (delta <= ACTIVE_MS) active.push({ user_id, last });
      else if (delta <= IDLE_MS) idle.push({ user_id, last });
      // else offline -> hidden
    });

    active.sort((a, b) => b.last.getTime() - a.last.getTime());
    idle.sort((a, b) => b.last.getTime() - a.last.getTime());
    return { activeViewers: active, idleViewers: idle };
  }, [viewersByUser, nowTick]);

  const totalRecentViewers = activeViewers.length + idleViewers.length;

  // 6) ----- small renderer for an item -----

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartTime = useRef<number>(0);
  const pendingDragSelections = useRef<Map<HTMLTableElement, { startRow: number; endRow: number }>>(new Map());
  const [circlePos, setCirclePos] = useState<{ top: number; right: number; height: number } | null>(null);
  // const [counts, setCounts] = useState<Counts>({ print: 0, cut: 0, pack: 0, ship: 0 });

  const scrollToOrder = (name_id: string) => {
    const rowEl = rowRefs.current[name_id];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("identifier, color"); // email & color only

      if (error) {
        console.error("Failed to load profiles:", error);
        return;
      }
      if (!cancelled) {
        // Store as a Map<string, string | null>
        const userColorMap = new Map<string, string>();
        (data ?? []).forEach((row) => {
          userColorMap.set(row.identifier ?? "", row.color ?? "");
        });
        setUserRows(userColorMap);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      toast("Orders refreshed", {
        description: "The orders have been successfully refreshed.",
      });
      // console.log("Manual refresh triggered");
      const all = await fetchAllOrders();
      console.log(`Fetched ${all.length} orders from server`);
      setOrders(all);
      // optional: keep navbar counters in sync
      // const counts = await filterOutOrderCounts({ supabase });
      // updateOrderCountersDom(counts);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Initial load
    setLoading(true);
    fetchAllOrders().then((allOrders) => {
      // const takeOutOrderIds = allOrders.filter(order => order.production_status === "to_take_out").map(order => order.id);
      setOrders(allOrders);
    });
    
    const channel = supabase
      .channel("orders_all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = payload.new as Order;
        const ns = newOrder.production_status as OrderTypes;

        // Remove from multiSelectedRows if present
        if (multiSelectedRows.has(newOrder.name_id)) {
          setMultiSelectedRows((prev) => {
            const next = new Map(prev);
            next.delete(newOrder.name_id);
            return next;
          });
        }
        if (ignoreUpdateIds.current.has(newOrder.name_id)) {
          ignoreUpdateIds.current.delete(newOrder.name_id);
          return;
        }
        if (pendingRemovalIds.current.has(newOrder.name_id)) {
          if (newOrder.production_status !== orderType) {
            return;
          } else {
            pendingRemovalIds.current.delete(newOrder.name_id);
          }
        }

        if (newOrder.production_status === orderType) {
          setOrders((prev) => {
            const next = [newOrder, ...prev];
            // If the inserted order is our clicked/hovered row, clear selection
            if (currentRowClicked?.name_id === newOrder.name_id) {
              setIsRowClicked(false);
              setCurrentRowClicked(null);
            }
            if (isRowHovered) {
              setIsRowHovered(false);
            }
            // Always sort by due_date (ascending)
            return next.slice();
          });
        } else {
          // console.log("New order does not match orderType:", newOrder.production_status, orderType);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        // const oldStatus = (payload.old as Order).production_status as OrderTypes | null;
        const oldRow = payload.old as Order;
        const updated = payload.new as Order;

        // 1) COUNTS + DOM: bump/decrement only if status actually changed
        const oldStatus = oldRow.production_status as OrderTypes | null;
        const newStatus = updated.production_status as OrderTypes | null;
        // if (oldStatus !== newStatus) {
        //   const oldTracked = !!oldStatus && STATUSES.includes(oldStatus);
        //   const newTracked = !!newStatus && STATUSES.includes(newStatus);

        //   if (oldTracked || newTracked) {
        //     setCounts((prev) => {
        //       const next = { ...prev };
        //       if (oldTracked) next[oldStatus!] = Math.max(0, (next[oldStatus!] ?? 0) - 1);
        //       if (newTracked) next[newStatus!] = (next[newStatus!] ?? 0) + 1;
        //       updateOrderCountersDom(next);
        //       return next;
        //     });
        //   }
        // }
        // Remove from multiSelectedRows if present
        if (multiSelectedRows.has(updated.name_id)) {
          setMultiSelectedRows((prev) => {
            const next = new Map(prev);
            next.delete(updated.name_id);
            return next;
          });
        }
        if (ignoreUpdateIds.current.has(updated.name_id)) {
          ignoreUpdateIds.current.delete(updated.name_id);
          return;
        }

        if (pendingRemovalIds.current.has(updated.name_id)) {
          if (updated.production_status !== orderType) {
            return;
          } else {
            pendingRemovalIds.current.delete(updated.name_id);
          }
        }

        // console.log("UPDATE event payload.old:", payload.old);
        // console.log("UPDATE event payload.new:", payload.new);
        // If only notes changed, update that field
        if (oldRow.name_id === updated.name_id && oldRow.notes !== updated.notes) {
          // console.log("Notes changed for order", updated.name_id);
          // console.log(updated.notes);
          setOrders((prev) =>
            prev.map((o) => (o.name_id === updated.name_id ? { ...o, notes: updated.notes } : o)).slice()
          );
          // Clear selection/hover on notes update
          if (currentRowClicked?.name_id === updated.name_id) {
            setIsRowClicked(false);
            setCurrentRowClicked(null);
          }
          if (isRowHovered) setIsRowHovered(false);
          return;
        }
        if (updated.production_status === orderType) {
          setOrders((prev) => {
            const next = prev.some((o) => o.name_id === updated.name_id)
              ? prev.map((o) => (o.name_id === updated.name_id ? updated : o))
              : [updated, ...prev];
            // Clear selection/hover on status change
            if (currentRowClicked?.name_id === updated.name_id) {
              setIsRowClicked(false);
              setCurrentRowClicked(null);
            }
            if (isRowHovered) setIsRowHovered(false);
            // Always sort by due_date (ascending)
            return next.slice();
          });
        } else {
          setOrders((prev) => {
            const next = prev.filter((o) => o.name_id !== updated.name_id);
            // Clear selection/hover on removal
            if (currentRowClicked?.name_id === updated.name_id) {
              setIsRowClicked(false);
              setCurrentRowClicked(null);
            }
            if (isRowHovered) setIsRowHovered(false);
            // Always sort by due_date (ascending)
            return next.slice();
          });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const removed = payload.old as Order;
        const os = removed.production_status as OrderTypes;
        // Remove from multiSelectedRows if present
        if (multiSelectedRows.has(removed.name_id)) {
          setMultiSelectedRows((prev) => {
            const next = new Map(prev);
            next.delete(removed.name_id);
            return next;
          });
        }
        if (ignoreUpdateIds.current.has(removed.name_id)) {
          ignoreUpdateIds.current.delete(removed.name_id);
          return;
        }

        if (pendingRemovalIds.current.has(removed.name_id)) {
          if (removed.production_status !== orderType) {
            return;
          } else {
            pendingRemovalIds.current.delete(removed.name_id);
          }
        }

        setOrders((prev) => {
          const next = prev.filter((o) => o.name_id !== removed.name_id);
          // Clear selection/hover if the removed order was selected/hovered
          if (currentRowClicked?.name_id === removed.name_id) {
            setIsRowClicked(false);
            setCurrentRowClicked(null);
          }
          if (isRowHovered) setIsRowHovered(false);
          // Always sort by due_date (ascending)
          return next.slice();
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderType, currentRowClicked, isRowHovered]);

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (dragSelections.current.size === 0) {
        return;
      }
      let values = [] as string[];
      dragSelections.current.forEach((selection, table) => {
        const tbody = table.querySelector("tbody");
        if (!tbody) return;
        // Only data rows (exclude separators)
        const dataRows = Array.from(tbody.children).filter(
          (el) => el.nodeName === "TR" && el.getAttribute("datatype") === "data"
        );
        const rowStart = Math.min(selection.startRow, selection.endRow);
        const rowEnd = Math.max(selection.startRow, selection.endRow);
        for (let i = rowStart; i <= rowEnd; i++) {
          const row = dataRows[i];
          if (!row) continue;
          const cells = Array.from(row.children).slice(0, 3) as HTMLTableCellElement[];
          const types = cells.map((cell) => cell.getAttribute("datatype") || cell.innerText.toUpperCase());
          console.log("Selected row columns:", types);
          const valuesRow = cells.map((cell) => cell.innerText.toUpperCase() + "   ");
          values.push(valuesRow.join(""));
        }
      });
      console.log(values);
      e.preventDefault();
      e.clipboardData?.setData("text/plain", values.join("\n"));
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, []);

  // useEffect(() => {
  //   // Temporarily deactivating the circles
  //   if (true) return;
  //   // const targetNameId = "99889-TESTA-ORDER-2";
  //   // const rowEl = rowRefs.current[targetNameId];
  //   // const containerEl = containerRef.current;
  //   // if (rowEl && containerEl) {
  //   //   const rowRect = rowEl.getBoundingClientRect();
  //   //   const containerRect = containerEl.getBoundingClientRect();
  //   //   setCirclePos({
  //   //     top: rowRect.top - containerRect.top,
  //   //     right: containerRect.right - rowRect.right,
  //   //     height: rowRect.height,
  //   //   });
  //   // } else {
  //   //   setCirclePos(null);
  //   // }
  // }, [orders]);

  // dragSelections.current.clear();
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.buttons === 1) {
        dragSelections.current.clear();
        pendingDragSelections.current.clear();
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        dragStartTime.current = Date.now();

        // --- Add this block to initialize pendingDragSelections ---
        const cell = (e.target as HTMLElement).closest("td");
        if (cell) {
          const row = cell.parentElement as HTMLTableRowElement | null;
          if (row) {
            const table = row.closest("table") as HTMLTableElement | null;
            if (table) {
              let rowIndex = -1;
              const tbody = row.parentElement;
              if (tbody && tbody.nodeName === "TBODY") {
                const allRows = Array.from(tbody.children).filter((el) => el.nodeName === "TR");
                const dataRows = allRows.filter((el) => el.getAttribute("datatype") === "data");
                const rowType = row.getAttribute("datatype");

                if (rowType === "data") {
                  rowIndex = dataRows.indexOf(row);
                } else {
                  // If separator, get the next data row after this separator
                  const sepIdx = allRows.indexOf(row);
                  let found = false;
                  for (let i = sepIdx + 1; i < allRows.length; i++) {
                    if (allRows[i].getAttribute("datatype") === "data") {
                      rowIndex = dataRows.indexOf(allRows[i]);
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    rowIndex = dataRows.length - 1;
                  }
                }
              }
              // Only set if we have a valid index
              if (rowIndex !== -1) {
                pendingDragSelections.current.set(table, {
                  startRow: rowIndex,
                  endRow: rowIndex,
                });
              }
            }
          }
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragStartPos.current) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        const dy = Math.abs(e.clientY - dragStartPos.current.y);
        if ((dx > draggingThreshold || dy > draggingThreshold) && !dragging) {
          // This is a drag
          // hoveredCells.current.clear();
          document.body.style.cursor = "grabbing";
          document.body.style.setProperty("user-select", "none", "important");
          setDragging(true);
          // handleDragging(e, true);
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      // console.log(e.button);
      if (e.button !== 0) {
        return;
      }
      // console.log(dragSelections.current);
      // console.log("Mouse up event detected");
      const target = e.target as HTMLElement;
      //  console.log(target.getAttribute("datatype"));
      if (target.getAttribute("datatype") === "menu-option") {
        console.log("Clicked on a menu option, not resetting selections");
        return;
      }
      if (!target.closest("table")) {
        // console.log("Clicked outside of table, resetting selections");
        setIsRowClicked(false);
        setCurrentRowClicked(null);
      }
      document.body.style.cursor = "";
      // console.log(pendingDragSelections.current);
      dragSelections.current = new Map(pendingDragSelections.current);
      forceUpdate((n) => n + 1); // Dummy state to re-render
      if (dragging) {
        // console.log(dragSelections.current)
        setDragging(false);
        // handleDragging(null, false);
      } else {
        // dragSelections.current.clear();
        // dragSelections.current = new Map(); // Clear selections on mouse up
        // console.log("This was a click, not a drag");
        pendingDragSelections.current.clear();
        dragSelections.current.clear();
        const cell = (e.target as HTMLElement).closest("td");
        if (!cell) {
          forceUpdate((n) => n + 1);
          return;
        }
        const row = cell.parentElement as HTMLTableRowElement | null;
        if (!row) {
          forceUpdate((n) => n + 1);
          return;
        }
        const table = row.closest("table") as HTMLTableElement | null;
        if (!table) {
          forceUpdate((n) => n + 1);
          return;
        }

        // This is a click (not a drag)
        // You can handle click here if needed
        console.log("This was a click, not a drag");
        let rowIndex = -1;
        const tbody = row.parentElement;
        if (tbody && tbody.nodeName === "TBODY") {
          const allRows = Array.from(tbody.children).filter((el) => el.nodeName === "TR");
          const dataRows = allRows.filter((el) => el.getAttribute("datatype") === "data");
          const rowType = row.getAttribute("datatype");

          if (rowType === "data") {
            rowIndex = dataRows.indexOf(row);
          } else {
            // If separator, get the next data row after this separator
            const sepIdx = allRows.indexOf(row);
            let found = false;
            for (let i = sepIdx + 1; i < allRows.length; i++) {
              if (allRows[i].getAttribute("datatype") === "data") {
                rowIndex = dataRows.indexOf(allRows[i]);
                found = true;
                break;
              }
            }
            if (!found) {
              rowIndex = dataRows.length - 1;
            }
          }
        }

        // If valid, set selection for that single row in that table
        if (rowIndex !== -1) {
          dragSelections.current.set(table, {
            startRow: rowIndex,
            endRow: rowIndex,
          });
          // addOrderViewer([])
        }
        forceUpdate((n) => n + 1);
      }

      document.body.style.removeProperty("user-select");
      dragStartPos.current = null;
      dragStartTime.current = 0;
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const cell = (e.target as HTMLElement).closest("td");
      if (!cell) return;
      const row = cell.parentElement as HTMLTableRowElement | null;
      if (!row) return;
      const table = row.closest("table") as HTMLTableElement | null;
      if (!table) return;
      let rowIndex = -1;
      // Get row and column indices
      const tbody = row.parentElement;
      if (tbody && tbody.nodeName === "TBODY") {
        const allRows = Array.from(tbody.children).filter((el) => el.nodeName === "TR");
        const dataRows = allRows.filter((el) => el.getAttribute("datatype") === "data");
        const rowType = row.getAttribute("datatype");
        // console.log("Row type:", rowType, "Data rows:", dataRows.length);
        if (rowType === "data") {
          rowIndex = dataRows.indexOf(row);
        } else {
          // If separator, get the next data row after this separator
          const sepIdx = allRows.indexOf(row);
          let found = false;
          for (let i = sepIdx + 1; i < allRows.length; i++) {
            if (allRows[i].getAttribute("datatype") === "data") {
              rowIndex = dataRows.indexOf(allRows[i]);
              found = true;
              break;
            }
          }
          if (!found) {
            // If no data row after, set to last row
            rowIndex = dataRows.length - 1;
          }
        }
      }
      // console.log(rowIndex);
      if (!pendingDragSelections.current.has(table)) {
        pendingDragSelections.current.set(table, {
          startRow: rowIndex,
          endRow: rowIndex,
        });
      } else {
        const prev = pendingDragSelections.current.get(table)!;
        pendingDragSelections.current.set(table, {
          startRow: prev.startRow,
          endRow: rowIndex,
        });
      }
    }

    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [dragging]);

  //   useEffect(() => {
  //   (async () => {
  //     const counts = await filterOutOrderCounts({ orders, supabase });
  //     console.log("Fetched initial order counts:", counts);
  //     updateOrderCountersDom(counts)
  //     // updateOrderCountersDom(counts);
  //   })();
  // }, [orders]);

  // useEffect(() => {
  //   const counts = filterOutOrderCounts(orders);
  //   console.log("Fetched initial order counts:", counts);
  //   // updateOrderCounts(counts);
  // }, [orders]);

  useEffect(() => {
    // console.log("Drag selections changed:", dragSelections.current);
    const selectedNameIds: string[] = [];
    dragSelections.current.forEach((selection, table) => {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      const dataRows = Array.from(tbody.children).filter(
        (el) => el.nodeName === "TR" && el.getAttribute("datatype") === "data"
      );
      const rowStart = Math.min(selection.startRow, selection.endRow);
      const rowEnd = Math.max(selection.startRow, selection.endRow);

      for (let i = rowStart; i <= rowEnd; i++) {
        const row = dataRows[i];
        // console.log("Selected row:", row.key);
        if (!row) continue;
        const nameId = row.getAttribute("name-id");
        // console.log("Selected row name_id:", nameId);
        if (nameId) {
          selectedNameIds.push(nameId);
        }

        // const nameId = rowRefs.current[row.getAttribute("name_id") || ""]?.getAttribute("name_id");
        // if (nameId) selectedNameIds.push(nameId);
        // console.log("Selected row name_id:", nameId);
        // console.log("Selected row columns:", row.getAttribute("name_id"));
      }
    });
    // console.log("Selected name_ids:", selectedNameIds);
    if (selectedNameIds.length > 0) {
      // console.log("Selected name_ids:", selectedNameIds);
      addOrderViewer(selectedNameIds);
    }
  }, [updateCounter]);

  // Hash values
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      let value = null;
      // console.log("Current search:", search);
      const eqIndex = search.indexOf("=");
      if (eqIndex !== -1) {
        // console
        value = decodeURIComponent(search.substring(eqIndex + 1));
      }
      setHashValue(value);
      // console.log("Hash value set to:", value);
    }
  }, []);

  const grouped = useMemo(() => groupOrdersByOrderType(orderType, orders), [orderType, orders]);
  const designatedCategories = useMemo(() => getButtonCategories(orderType)!, [orderType]);
  // const designatedColors = useMemo(() => getButtonColors(orderType)!, [orderType]);
  const categoryCounts = useMemo(
    () => getCategoryCounts(orders, designatedCategories, orderType),
    [orders, designatedCategories]
  );

  if (!designatedCategories) {
    console.error("designatedCategories is undefined");
    return null; // or handle the error as needed
  }

  // todo add it here so the first visible groups is the default category
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultPage);
  const [headers, setHeaders] = useState<string[]>(() => getMaterialHeaders(orderType, defaultPage));
  // const [scrollAreaName, setScrollAreaName] = useState<string>(orderType);
  const [rowHistory, setRowHistory] = useState<string[] | null>(null);
  const [clickedTables, setClickedTables] = useState<Set<string>>(new Set());
  // const [users, setUsers] = useState<Set<string>>(new Set());
  const [scrollAreaName, setScrollAreaName] = useState<string>("History");
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const groupKeys = Object.keys(grouped);
    if (groupKeys.length > 0 && Object.keys(visibleGroups).length === 0) {
      const initial = groupKeys.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setVisibleGroups(initial);
    }
  }, [grouped, visibleGroups]);

  // console.log("this is the visible groups", visibleGroups);

  const convertKeyToTitle = (key: string) => {
    return key
      .split("-") // Split the key by "-"
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join the words with a space
  };

  const handleCategoryClick = useCallback(
    (category: string, ignoreRefresh?: boolean) => {
      setSelectedCategory(category);
      setHeaders(getMaterialHeaders(orderType, category.toLowerCase()));
      if (!ignoreRefresh) {
        router.push(`${pathname}?${category.toLowerCase()}`);
      }
      const lowerCategory = category.toLowerCase();
      setVisibleGroups((prev) => {
        const newVisibility = {} as Record<string, boolean>;
        Object.keys(prev).forEach((key) => {
          // Compare first segment of each group key
          const prefix = key.split("-")[0];
          newVisibility[key] = prefix === lowerCategory;
        });
        return newVisibility;
      });
    },
    [pathname, orderType, designatedCategories]
  );
  useEffect(() => {
    const first = Array.from(searchParams.entries())[0] ?? [];
    const [key, rawVal] = first as [string | undefined, string | undefined];

    // If first key is a real category, hydrate state without navigating.
    if (key && designatedCategories.some((c) => c.toLowerCase() === key.toLowerCase()) && key !== selectedCategory) {
      handleCategoryClick(key, true);
      return;
    }

    // Non-category param (e.g., clear=...)
    if (key) {
      // URLSearchParams already decodes %23 → '#', but guard anyway.
      const decoded = decodeURIComponent(rawVal ?? "");
      const withHash = decoded.replace(/%23/gi, "#");
      // Final name: only convert literal "u00A0" → real NBSP. Do NOT trim. Do NOT turn NBSP into space.
      console.log("Raw value from URLSearchParams:", withHash);
      const finalName = withHash;
      console.log("Scrolling to order:", finalName);
      if (finalName) {
        let tries = 0;
        const find = () => {
          const el = rowRefs.current[finalName];
          if (el) scrollToOrder(finalName);
          else if (tries++ < MAX_RETRIES_FOR_SCROLL) setTimeout(find, 300);
        };
        find();
      }
    }
  }, [pathname, searchParams, handleCategoryClick, designatedCategories, selectedCategory]);

  const handleCheckboxClick = useCallback(async (order: Order) => {
    // Ignore real-time updates for this order, to prevent flicker
    // setMultiSelectedRows((prev) => {
    //   const next = new Map(prev);
    //   next.delete(order.name_id);
    //   return next;
    // });

    setCurrentRowClicked(null);
    setIsRowClicked(false);
    dragSelections.current.clear();
    ignoreUpdateIds.current.add(order.name_id);
    pendingRemovalIds.current.add(order.name_id);
    // console.log("Order clicked:", order.name_id, "Status:", order.production_status);
    // console.log(`Order clicked: ${order.name_id}`);

    setOrders((prev) => prev.filter((o) => o.name_id !== order.name_id));
    updateOrderStatus(order, false);
    toast("Order updated", {
      description: `Order ${order.name_id} has been moved to ${handleNewProductionStatus(
        order.production_status,
        false
      )}`,
      action: {
        label: "Undo",
        onClick: () => {
          revertStatus(order);
        },
      },
    });

    // setTimeout(() => {
    // }, 1000);
  }, []);
  // const createNewOrder = useCallback(async (Record<stringify, string) => {
  //   // console.log("Reverting status for order", order.name_id);
  //   // Optimistically update local state
  //   // setOrders((prev) => prev.map((o) => (o.name_id === order.name_id ? { ...o, production_status: orderType } : o)));
  //   // Persist change
  //   console.log("Creating new order", order.name_id);
  //   // if (ignoreUpdateIds.current.has(order.name_id)) {
  //   //   console.log("Deleting the order here from the ignoreUpdateIds section", order.name_id);
  //   //   ignoreUpdateIds.current.delete(order.name_id);
  //   // }
  //   await updateOrderStatus(order, false, orderType);
  // }, []);

  const handleNewOrderSubmit = useCallback(
    async (form: Record<string, any>) => {
      // Accepts either flat fields or an 'entries' array
      let payload: any = form;
      if (Array.isArray(form.entries)) {
        // Check at least one entry
        if (form.entries.length === 0) {
          toast("Order failed to insert", {
            description: "One entry at least needed",
          });
          return;
        }
        // Check that all entries have non-blank name_id
        const hasBlankNameId = form.entries.some((entry: any) => !entry.name_id || entry.name_id.trim() === "");
        if (hasBlankNameId) {
          toast("Order failed to insert", {
            description: "Each entry must have a non-blank name_id",
          });
          return;
        }
        payload = form.entries;
      }
      // Logging for debug
      if (form.due_date == "" || form.order_id == "") {
        toast("Order failed to insert", {
          description: "Order Id or Due Date was missing",
        });
        return;
      }
      const result = await createCustomOrder(payload, form.order_id, form.due_date, form.ihd_date);
      if (result.result === false) {
        toast("Error creating order", {
          description: `${result.message}`,
        });
        return;
      } else {
        toast("Creation Succesfull! ", {
          description: `Order has been created with ID: ${form.order_id}`,
        });
        setScrollAreaName("History");
      }
    },
    [orderType, session]
  );

  const handleDoubleClick = useCallback(
    async (fileName: string) => {
      // if (orderType === "print") {
      //   return;
      // }
      // Read clipboard text (requires permissions in some browsers)
      // const clipboardText = await navigator.clipboard.readText();
      // if (clipboardText === String(fileName)) {
      //   return;
      // }
      toast("Copied to clipboard", {
        description: `${fileName} has been copied to the clipboard.`,
      });
      // Write text here to the clipboard
      try {
        await navigator.clipboard.writeText(String(fileName));
      } catch (err) {
        console.error("Failed to write to clipboard:", err);
      }
      // e.preventDefault();
      // Clipboard
    },
    [orderType]
  );

  const revertStatus = useCallback(async (order: Order) => {
    console.log("Reverting status for order", order.name_id);
    // Optimistically update local state
    // setOrders((prev) => prev.map((o) => (o.name_id === order.name_id ? { ...o, production_status: orderType } : o)));
    // Persist change

    if (ignoreUpdateIds.current.has(order.name_id)) {
      console.log("Deleting the order here from the ignoreUpdateIds section", order.name_id);
      ignoreUpdateIds.current.delete(order.name_id);
    }
    if (pendingRemovalIds.current.has(order.name_id)) {
      console.log("Deleting the order here from the pendingRemovalIds section", order.name_id);
      pendingRemovalIds.current.delete(order.name_id);
    }

    await updateOrderStatus(order, false, orderType);
  }, []);

  const handleNoteChange = useCallback(async (order: Order, newNotes: string) => {
    // console.log("Updating notes for order", order.name_id, "to", newNotes);
    // Optimistically update local state
    setOrders((prev) => prev.map((o) => (o.name_id === order.name_id ? { ...o, notes: newNotes } : o)));
    // Persist change
    await updateOrderNotes(order, newNotes);
  }, []);

  const handleMenuOptionClick = useCallback(
    async (option: string) => {
      if (currentRowClicked == null) {
        console.warn("No row clicked, skipping menu option handling.");
        return;
      }
      if (option == "revert") {
        await updateOrderStatus(currentRowClicked!, true);
        toast(
          "Order reverted",
          {
            description: `Order ${currentRowClicked!.name_id} has been moved back to ${orderType}`,
            action: {
              label: "Undo",
              onClick: (e) => {
                // e.stopPropagation();
                revertStatus(currentRowClicked!);
              },
            },
          }
          // toast({
        );
        setIsRowClicked(false);
        setCurrentRowClicked(null);
        return;
      }
      if (option == "delete") {
        console.log("Deleting line:", currentRowClicked);
        await removeOrderLine(currentRowClicked!);
        toast("Order line deleted", {
          description: `Deleted line ${currentRowClicked!.name_id}.`,
          action: {
            label: "Undo",
            onClick: () => {},
          },
        });
        // toast({
        //   title: "Order line deleted",
        //   description: `Deleted line ${currentRowClicked!.name_id}.`,
        //   // action: <ToastAction altText="Undo delete">Undo</ToastAction>,
        // });
        return;
      }
      if (option == "deleteAll") {
        console.log("Deleting line:", currentRowClicked);
        await removeOrderAll(currentRowClicked?.order_id!);
        toast("All orders deleted", {
          description: `Deleted all items for order ${currentRowClicked!.order_id}.`,
          action: {
            label: "Undo",
            onClick: () => {},
          },
        });
        // toast({
        //   title: "All orders deleted",
        //   description: `Deleted all items for order ${currentRowClicked!.order_id}.`,
        //   // action: <ToastAction altText="Undo delete all">Undo</ToastAction>,
        // });
        return;
      }
      // Example async operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.open(`https://stickerbeat.zendesk.com/agent/tickets/${currentRowClicked?.order_id}`, "_top");
    },
    [currentRowClicked, orderType]
  );

  if (headers.length === 0) {
    console.error("Headers are not defined, please add some headers for these buttons here");
    return null;
  }

  const handleAsigneeClick = useCallback(
    async (row: Order) => {
      if (!session?.user?.email) return;
      const me = session.user.email;

      // 1) Optimistically update client‐side:
      setOrders((prev) => prev.map((o) => (o.name_id === row.name_id ? { ...o, asignee: me } : o)));

      // 2) Fire off the real request:
      try {
        assignOrderToUser(row);
      } catch (err) {
        console.error("assign failed", err);
        // 3) (optional) roll back if it errored:
        setOrders((prev) => prev.map((o) => (o.name_id === row.name_id ? { ...o, asignee: row.asignee } : o)));
        // toast("Couldn’t assign order", { type: "error" });
      }
    },
    [session, setOrders]
  );
  const handleRowClick = useCallback(
    (rowEl: HTMLTableRowElement, row: Order | null, copiedText: boolean) => {
      if (!row) {
        console.warn("Row is null, skipping click handling.");
        return;
      }
      console.log("Row clicked:", row.name_id);
      // console.log("Row clicked:", row);
      // Use the provided row element directly
      if (rowEl) {
        // console.log("Row element:", rowEl);
        const rect = rowEl.getBoundingClientRect();
        setMenuPos({ x: rect.right, y: rect.bottom });
        // console.log("setting the menu pos", rect.right, rect.bottom);
      }
      const safeName = convertToSpaces(row.name_id);
      if (copiedText) {
        toast("Copied to clipboard", {
          description: `Copied ${safeName} to clipboard.`,
        });
      }

      if (!isRowClicked) {
        console.log("setting row clicked");
        setIsRowClicked(true);
      }
      setCurrentRowClicked(row);
    },
    [isRowClicked, toast, setMenuPos, setIsRowClicked, setCurrentRowClicked]
  );

  // if (!loading) {
  //   return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  // }

  // console.log(dragSelections.current)
  // console.log(multiSelectedRows);
  // Ensure we render a table for every possible key, even if group is empty
  const allKeys = orderKeys[orderType] || [];
  // console.log(activeViewers);

  // const ViewerRow = useCallback(
  //   ({ user_id, faded }: { user_id: string; faded?: boolean }) => {
  //     // console.log(profilesById)
  //     const p = profilesById.get(user_id);
  //     // console.log(p)
  //     const name = p?.name ?? p?.identifier ?? user_id;
  //     let color = p?.color ?? "#e5e7eb";
  //     console.log("this is the color", color, " for ", user_id);
  //     // Convert "rgb 102/255/102" to "rgb(102,255,102)"
  //     if (typeof color === "string" && color.startsWith("rgb ")) {
  //       color = "rgb(" + color.slice(4).split("/").join(",") + ")";
  //     }

  //     // faded = false
  //     const initials = name
  //       .split(/\s+/)
  //       .map((w) => w[0])
  //       .join("")
  //       .slice(0, 2)
  //       .toUpperCase();
  //     return (
  //       <div
  //         className={`flex items-center space-x-2 px-2 py-1 ${faded ? "opacity-50" : ""}`}
  //         data-testid={`viewer-${user_id}`}
  //       >
  //         {p?.avatar ? (
  //           <img src={p.avatar} className="w-6 h-6 rounded-full object-cover" alt={name} />
  //         ) : (
  //           <div
  //             className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black/70"
  //             style={{ backgroundColor: String(color) }}
  //           >
  //             {initials}
  //           </div>
  //         )}
  //         <span className="text-sm">{name}</span>
  //       </div>
  //     );
  //   },
  //   [profilesById]
  // );

  // console.log('active viewers:', activeViewers);
  // console.log('idle viewers:', idleViewers);
  // const viewers = [];
  // console.log(grouped);
  return (
    <>
      <div className="relative" ref={containerRef}>
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex-shrink-0">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {"To " + orderType.charAt(0).toUpperCase() + orderType.slice(1)} -{" "}
              {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="max-w-xs">
              <ViewersDropdown
                activeViewers={activeViewers}
                idleViewers={idleViewers}
                totalRecentViewers={totalRecentViewers}
                profilesById={profilesById}
              />
            </div>

            <Button onClick={refreshOrders} disabled={false}>
              <RefreshCcw className="w-full h-full" />
            </Button>
          </div>
        </div>

        <Separator className="w-full mb-10" />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {selectedCategory.toLowerCase() === "special" && (
            <OrderInputter onSubmit={handleNewOrderSubmit}></OrderInputter>
            // <OrderInputter tableHeaders={headers} onSubmit={createNewOrder}></OrderInputter>
          )}
        </div>
        {!loading && orders.length === 0 && (
          <div className="mb-4 text-yellow-700 bg-yellow-100 p-2 rounded">
            ⚠️ Orders are unable to be loaded - Please check your internet connection or contact support.
          </div>
        )}
        <Fragment>
          {allKeys.map((key) => {
            // console.log("this is the key", key);
            const group = grouped[key] || [];
            // console.log(group);
            const keySplit = key.split("-");
            var headerColor = "";
            if (keySplit.length > 1 && (keySplit.includes("gloss") || keySplit.includes("matte"))) {
              // console.log("this has the matte or gloss thing here");
              const laminationType = keySplit[keySplit.length - 2];
              headerColor = laminationHeaderColors[laminationType as keyof typeof laminationHeaderColors];
            }
            // console.log("this is the header color", headerColor);
            return (
              <Fragment key={key}>
                {selectedCategory.toLowerCase() === key.split("-")[0] && (
                  <>
                    <h2 className={`font-bold text-lg ${headerColor}`}>{convertKeyToTitle(key)}</h2>
                    <Table className="mb-5">
                      <OrderTableHeader tableHeaders={headers} productionStatus={orderType} />
                      <OrderTableBody
                        data={group}
                        productionStatus={orderType}
                        onOrderClick={handleCheckboxClick}
                        onNotesChange={handleNoteChange}
                        setIsRowHovered={setIsRowHovered}
                        setMousePos={setMousePos}
                        setRowHistory={setRowHistory}
                        setScrollAreaName={setScrollAreaName}
                        onRowClick={handleRowClick}
                        selectedNameId={currentRowClicked?.name_id || null}
                        multiSelectedRows={multiSelectedRows}
                        setMultiSelectedRows={setMultiSelectedRows} // Inactive for now
                        hashValue={hashValue}
                        handleDoubleClick={handleDoubleClick}
                        dragSelections={dragSelections}
                        getRowRef={(name_id: string) => (el: HTMLTableRowElement | null) => {
                          rowRefs.current[name_id] = el;
                        }}
                        onAsigneeClick={handleAsigneeClick}
                        userColors={userRows}
                      />
                    </Table>
                  </>
                )}
              </Fragment>
            );
          })}
        </Fragment>
        {/* Pass both categories and onCategoryClick to ButtonOrganizer */}

        {/* Render circle if position is found */}
        {circlePos && (
          <div
            style={{
              position: "absolute",
              top: circlePos.top + circlePos.height / 2,
              right: circlePos.right - 40, // 40px gap from the table's right edge
              transform: "translateY(-50%)",
              width: `${circlePos.height}px`,
              height: `${circlePos.height}px`,
              background: "red",
              borderRadius: "50%",
              zIndex: 100,
            }}
          />
        )}

        <ButtonOrganizer
          categories={designatedCategories}
          counts={categoryCounts}
          onCategoryClick={handleCategoryClick}
          categoryViewing={selectedCategory}
        />

        {isRowHovered && (
          <div
            style={{
              position: "fixed",
              top: mousePos.y + 10,
              left: mousePos.x + 10,
              pointerEvents: "none",
            }}
          >
            <ScrollAreaDemo historySteps={rowHistory ?? undefined} scrollName={scrollAreaName} />
          </div>
        )}
        {isRowClicked && (
          <div
            className="context-menu"
            style={{
              position: "fixed",
              top: menuPos.y,
              left: menuPos.x - 150,
              zIndex: 1000,
            }}
          >
            <ContextMenu handleMenuOptionClick={handleMenuOptionClick} orderType={orderType} />
          </div>
        )}
        {/* <This is for dialaying the notifications */}
      </div>
      {/* <DropdownAsignee/> */}
      {[...dragSelections.current.values()].reduce((acc, sel) => acc + Math.abs(sel.endRow - sel.startRow) + 1, 0) >
        1 && <OrderViewer dragSelections={dragSelections} />}
      <Toaster theme={"dark"} richColors={true} />

      {/* <DropdownAsignee asignees={Array.from(users)} /> */}
    </>
  );
}

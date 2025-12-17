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
  assignMultiOrderToUser,
} from "@/utils/actions";
import { Separator } from "./ui/separator";
import { getMaterialHeaders } from "@/types/headers";
import { HoverInformation } from "./hover-area";
import { orderKeys } from "@/utils/orderKeyAssigner";
import { OrderTypes } from "@/utils/orderTypes";
import { OptionsMenu } from "./context-menu";
import { OrderViewer } from "./order-viewer"; 
import { ViewersDropdown } from "./viewers";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { RefreshCcw } from "lucide-react";
import { Info } from "lucide-react";
// import { actionAsyncStorage } from "next/dist/server/app-render/action-async-storage.external";
// import { Description } from "@radix-ui/react-toast";
// import { ScrollArea } from "@radix-ui/react-scroll-area";
// import { ScrollBar } from "./ui/scroll-area";
import { convertToSpaces } from "@/lib/utils";
// import { UserSearchIcon } from "lucide-react";
// import { setDefaultAutoSelectFamilyAttemptTimeout } from "net";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { set } from "date-fns";

type Counts = Record<OrderTypes, number>;
type UserProfileRow = { id: string; role: string; color: string | null };

const STATUSES: readonly OrderTypes[] = ["print", "cut", "prepack", "pack", "ship"] as const;
const draggingThreshold = 1; // px

const ACTIVE_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_MS = 3 * 60 * 60 * 1000; // 2 hours

const MAX_RETRIES_FOR_SCROLL = 10;
const TIME_BETWEEN_FORCED_REFRESHES = 5 * 60 * 1000; // 5 minutes
// const TIME_BETWEEN_FORCED_REFRESHES = 15 * 1000; // 5 minutes
const handleNewProductionStatus = (status: string | null, reverse: boolean) => {
  if (reverse) {
    switch (status) {
      case "completed":
        return "ship";
      case "ship":
        return "pack";
      case "pack":
        return "prepack";
      case "prepack":
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
        return "prepack";
      case "prepack":
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

type DragSel = {
  startRow: number;
  endRow: number;
  extras?: Set<number>; // non-contiguous added rows
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

export const getTextColor = (category: string) => {
  switch (category) {
    case "rush":
      return "text-red-800";
    case "white":
      return "text-gray-800";
    case "glitter":
      return "text-yellow-400";
    case "holographic":
      return "text-green-500";
    case "clear":
      return "text-pink-300";
    case "20ptmag":
      return "text-green-800";
    case "30ptmag":
      return "text-blue-800";
    case "sheets":
      return "text-blue-600";
    case "arlon":
      return "text-teal-500";
    case "floor":
      return "text-yellow-800";
    case "roll":
      return "text-yellow-900";
    case "cling":
      return "text-red-300";
    case "arlon":
      return "text-teal-500";
    case "reflective":
      return "text-green-300";
    case "floor":
      return "text-brown-200";
    case "special":
      return "text-yellow-500";

    default:
      return "text-black";
  }
};

function getCategoryCounts(orders: Order[], categories: string[], orderType: OrderTypes): Record<string, number> {
  return categories.reduce((acc, category) => {
    const lowerCat = category.toLowerCase();
    let count = 0;

    if (orderType === "print") {
      if (lowerCat === "rush") {
        // Rush takes priority over everything else (including sheets)
        count = orders.filter((o) => o.production_status === orderType && o.rush === true).length;

      } else if (lowerCat === "sheets") {
        // Exclude rush sheets so they don't double-count
        count = orders.filter(
          (o) =>
            o.production_status === orderType &&
            o.rush !== true &&
            o.shape?.toLowerCase() === "sheets"
        ).length;

      } else if (lowerCat === "special") {
        count = orders.filter((o) => o.production_status === orderType && o.orderType === 2).length;

      } else if (lowerCat === "regular") {
        count = orders.filter(
          (o) =>
            o.production_status === orderType &&
            o.rush !== true &&
            o.material?.toLowerCase() !== "roll" &&
            o.shape?.toLowerCase() !== "sheets"
        ).length;

      } else {
        count = orders.filter(
          (o) =>
            o.production_status === orderType &&
            o.rush !== true &&
            o.material?.toLowerCase() === lowerCat &&
            o.shape?.toLowerCase() !== "sheets"
        ).length;
      }

    } else {
      if (lowerCat === "rush") {
        count = 0;
      } else if (lowerCat === "regular") {
        count = orders.filter((o) => o.production_status === orderType && o.material?.toLowerCase() !== "roll").length;
      } else {
        count = orders.filter((o) => o.production_status === orderType && o.material?.toLowerCase() === lowerCat).length;
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

// at top-level inside OrderOrganizer (before the useEffect)
function clearAllSelection() {
  // Clear normal text selection
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    sel.removeAllRanges();
  }

  // Clear selection inside focused input/textarea
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    const el = active as HTMLInputElement | HTMLTextAreaElement;
    // collapse to end (no visible selection)
    const len = el.value?.length ?? 0;
    try {
      el.setSelectionRange(len, len);
    } catch {
      // ignore if not supported
    }
  }
}

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
    const counts: Counts = { print: 0, cut: 0, prepack: 0, pack: 0, ship: 0 };
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

  const counts: Counts = { print: 0, cut: 0, prepack: 0, pack: 0, ship: 0 };
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
    prepack: `To Prepack (${counts.prepack})`,
    pack: `To Pack (${counts.pack})`,
    ship: `To Ship (${counts.ship})`,
  };

  const idMap: Record<OrderTypes, string[]> = {
    print: ["to-print-counter", "to-print"],
    cut: ["to-cut-counter", "to-cut"],
    prepack: ["to-prepack-counter", "to-prepack"],
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
  async function fetchAllOrders() {
    const allOrders = [];
    let from = 0;
    const chunkSize = 1000; // at one time
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

    // Filter out any order with order_id === 0
    return allOrders.filter((order) => order.order_id !== 0);
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

  // const me = session?.user?.email || "";
  const ignoreUpdateIds = useRef<Set<string>>(new Set());
  const ignoreRushIds = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dragging, setDragging] = useState(false);
  const [me, setMe] = useState<string>("");
  const [scrollPosition, setScrollPosition] = useState<number>(0); // Temporary
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultPage);
  const [isRowHovered, setIsRowHovered] = useState<boolean>(false);
  const [displayDropdown, setDisplayDropdown] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRowClicked, setIsRowClicked] = useState<boolean>(false);
  const [userSelected, setUserSelected] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const rowRefs = useRef<{ [name_id: string]: HTMLTableRowElement | null }>({});
  const [currentRowClicked, setCurrentRowClicked] = useState<Order | null>(null);
  const [multiSelectedRows, setMultiSelectedRows] = useState<Map<string, string | null>>(new Map());
  const [hashValue, setHashValue] = useState<string | null>(null);
  const pendingRemovalIds = useRef<Set<string>>(new Set());
  const [userRows, setUserRows] = useState<Map<string, string>>(new Map());
  const [updateCounter, forceUpdate] = useState(0);
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const shiftDown = useRef(false);
  const [selectionVersion, bumpSelectionVersion] = useState(0);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  // const shiftDown = useRef(false); // you can delete this if you don't use it elsewhere
  const lastUrlSelectedNameId = useRef<string | null>(null);
  const pendingUrlNameId = useRef<string | null>(null);

  async function copyPrintData() {
    let values = [] as string[];
    console.log("Copying print data from selections");
    if (dragSelections.current.size === 0) {
      toast("No print data", {});
      // console.warn("No selections to copy");
      return;
    }
    dragSelections.current.forEach((selection, table) => {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      // Only data rows (exclude separators)
      const dataRows = Array.from(tbody.children).filter(
        (el) => el.nodeName === "TR" && el.getAttribute("datatype") === "data"
      );
      const rowStart = Math.min(selection.startRow, selection.endRow);
      const rowEnd = Math.max(selection.startRow, selection.endRow);

      const picked = new Set<number>();
      for (let i = rowStart; i <= rowEnd; i++) picked.add(i);
      (selection.extras ?? new Set()).forEach((i) => picked.add(i));

      [...picked]
        .sort((a, b) => a - b)
        .forEach((i) => {
          const row = dataRows[i];
          if (!row) return;
          const cells = Array.from(row.children).slice(1, 4) as HTMLTableCellElement[];
          const types = cells.map((cell) => cell.getAttribute("datatype") || cell.innerText.toUpperCase());
          // console.log("Selected row columns:", types);
          const valuesRow = cells.map((cell) => cell.innerText.toUpperCase() + "   ");
          values.push(valuesRow.join(""));
        });
    });
    // console.log(values);
    toast("Copied Print Data", {
      description: `For orders selected (${values.length} rows).`,
    });
    // Write text here to the clipboard
    try {
      await navigator.clipboard.writeText(values.join("\n") || "");
    } catch (err) {
      console.error("Failed to write to clipboard:", err);
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftDown(true);
        shiftDown.current = true;
        // console.log("Shift key down, now disabling the text selection");
        clearAllSelection();
        document.body.style.userSelect = "none"; // Disable text selection seems to be working good
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftDown(false);
        shiftDown.current = false;
        document.body.style.userSelect = ""; // Re-enable text selection
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      // document.body.style.userSelect = ""; // Ensure text selection is re-enabled on cleanup
    };
  }, []);

  // const [updateCounter, forceUpdate] = useState(0);
  const dragSelections = useRef<Map<HTMLTableElement, DragSel>>(new Map());

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("id, identifier, color, role");
      if (error) {
        console.error("Failed to load profiles:", error);
        return;
      }
      if (!cancelled) {
        const idMap = new Map<
          string,
          { name: string; color?: string | null; identifier?: string | null; role?: string | null }
        >();
        const userColorMap = new Map<string, string>();

        (data ?? []).forEach((row: any) => {
          idMap.set(row.id, {
            name: row.identifier ?? row.id,
            color: row.color ?? null,
            identifier: row.identifier ?? null,
            role: row.role ?? null,
          });
          userColorMap.set(row.identifier ?? "", row.color ?? "");
        });

        setProfilesById(idMap);
        setUserRows(userColorMap);
        setMe(session?.user?.email ?? "");
        setUserSelected(session?.user?.email ?? "");

        // derive isAdmin from session email and idMap
        const myEmail = session?.user?.email ?? null;
        if (myEmail) {
          let meProfile = undefined as
            | { name: string; color?: string | null; identifier?: string | null; role?: string | null }
            | undefined;

          for (const profile of idMap.values()) {
            if (profile.identifier === myEmail) {
              meProfile = profile;
              break;
            }
          }
          setIsAdmin(meProfile?.role === "admin");
        } else {
          setIsAdmin(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, session]); // <- depend on session, not me/userSelected

  useEffect(() => {
    async function checkMatchingCounts() {
      if (!orders || orders.length === 0) {
        // console.log("Orders are not loaded yet, waiting...");
        return;
      }
      const counts = { ...categoryCounts };
      delete counts["sheets"];
      const totalCount = Object.values(counts).reduce((sum, count) => (sum) + count, 0); // for the order tracker
      // console.log("Total count of all categories (excluding 'sheets'):", totalCount);
      const totalProductionCount = await checkTotalCountsForStatus({ orders, supabase }, orderType);
      if (totalCount !== totalProductionCount) {
        // console.log("There is a mismatch in counts, refreshing orders...");
        const all = await fetchAllOrders();
        setOrders(all);
      }
      // console.log(
      //   `Category total (excluding 'sheets'): ${totalCount}, Production status total: ${totalProductionCount}`
      // );
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
  const pendingDragSelections = useRef<Map<HTMLTableElement, DragSel>>(new Map());
  const [circlePos, setCirclePos] = useState<{ top: number; right: number; height: number } | null>(null);
  // const [counts, setCounts] = useState<Counts>({ print: 0, cut: 0, pack: 0, ship: 0 });

  const selectRowByNameId = useCallback(
    (nameId: string) => {
      const id = pendingUrlNameId.current;
      if (!id) return;

      // If the DOM row doesn’t exist yet, just wait for the next render
      const rowEl = rowRefs.current[id];
      if (!rowEl) {
        return;
      }

      const table = rowEl.closest("table") as HTMLTableElement | null;
      if (!table) {
        console.log("No table found for row", nameId);
        return;
      }

      const tbody = rowEl.parentElement;
      if (!tbody || tbody.nodeName !== "TBODY") {
        console.log("Row is not inside a TBODY", nameId);
        return;
      }

      const allRows = Array.from(tbody.children).filter((el) => el.nodeName === "TR");
      const dataRows = allRows.filter((el) => el.getAttribute("datatype") === "data");

      const rowIndex = dataRows.indexOf(rowEl);
      if (rowIndex === -1) {
        console.log("Row not found in dataRows for", nameId);
        return;
      }

      // Clear previous selection if you want
      dragSelections.current.clear();
      pendingDragSelections.current.clear();

      dragSelections.current.set(table, {
        startRow: rowIndex,
        endRow: rowIndex,
      });
      console.log("Selected row", nameId, "at index", rowIndex);
      forceUpdate((n) => n + 1); // trigger re-render so highlight applies
    },
    [forceUpdate]
  );

  // any deps that change once tables/rows are in place

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
    // setLoading(true);
    try {
      toast("Orders refreshed", {
        description: "The orders have been successfully refreshed.",
      });
      // console.log("Manual refresh triggered");
      const all = await fetchAllOrders();
      setOrders(all);
      // optional: keep navbar counters in sync
      // const counts = await filterOutOrderCounts({ supabase });
      // updateOrderCountersDom(counts);
    } finally {
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
            const currentUrl = window.location.href; // full URL
            const hasRoll = currentUrl.includes("roll");
            if (newOrder.rush == true && !ignoreRushIds.current.has(newOrder.name_id) && !hasRoll) {
              const correctedName = convertToSpaces(newOrder.name_id);
              toast.error("New Order has entered Rush!", {
                description: `${correctedName} has been added to ${orderType} and is marked as RUSH.`,
                duration: 10000,
              });
              ignoreRushIds.current.add(newOrder.name_id);
            }
            // ignoreUpdateIds.current.delete(newOrder.name_id);
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
        // const oldStatus = oldRow.production_status as OrderTypes | null;
        // const newStatus = updated.production_status as OrderTypes | null;
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

        // If only notes changed, update that field
        if (oldRow.name_id === updated.name_id && oldRow.notes !== updated.notes) {
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
      setLoading(false);
    };
  }, [orderType, currentRowClicked, isRowHovered]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey && e.key === "c") && orderType == "print" ) {
        // console.log("Ctrl+C detected, copying print data...");
        copyPrintData();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left button only

      const target = e.target as HTMLElement;
      if (target.closest("[data-ignore-selection='true']")) {
        // console.log("Click on ignore-selection element, not starting drag");
        dragStartPos.current = null;
        dragStartTime.current = 0;
        return;
      }

      if (e.buttons === 1) {
        if (!e.shiftKey) {
          dragSelections.current.clear();
          pendingDragSelections.current.clear();
        }
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        dragStartTime.current = Date.now();
        // clearOrderValueFromUrl();

        // --- existing initialization of pendingDragSelections here ---
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
              if (rowIndex === -1) return;
              pendingDragSelections.current.set(table, {
                startRow: rowIndex,
                endRow: rowIndex,
                extras: dragSelections.current.get(table)?.extras ?? new Set(),
              });

              // If shift is down and there is an existing selection in this table, extend it
              // const existing = dragSelections.current.get(table);
              // if (e.shiftKey && existing) {
              //   const start = Math.min(existing.startRow, existing.endRow, rowIndex);
              //   const end = Math.max(existing.startRow, existing.endRow, rowIndex);
              //   pendingDragSelections.current.set(table, { startRow: start, endRow: end });
              // } else {
              //   pendingDragSelections.current.set(table, { startRow: rowIndex, endRow: rowIndex });
              // }
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
          if (!e.shiftKey) return;
          // clearOrderValueFromUrl(); // ⬅ strip `=name_id` from URL
          // console.log("Starting drag operation");
          document.body.style.cursor = "grabbing";
          // document.body.style.setProperty("user-select", "none", "important");
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
      const target = e.target as HTMLElement;
      if (target.closest("[data-ignore-selection='true']")) {
        // Just finalize any active drag, but do NOT clear or overwrite selection
        document.body.style.cursor = "";
        if (dragging) {
          bumpSelectionVersion((v) => v + 1);
          dragSelections.current = new Map(pendingDragSelections.current);
          pendingDragSelections.current.clear();
          setDragging(false);
          forceUpdate((n) => n + 1);
        }

        dragStartPos.current = null;
        dragStartTime.current = 0;
        return;
      }

      if (target.getAttribute("datatype") === "menu-option") {
        // console.log("Clicked on a menu option, not resetting selections");
        return;
      }
      if (!target.closest("table")) {
        // console.log("Clicked outside of table, resetting selections");
        setIsRowClicked(false);
        setCurrentRowClicked(null);
      }
      document.body.style.cursor = "";
      forceUpdate((n) => n + 1); // Dummy state to re-render
      if (dragging) {
        bumpSelectionVersion((v) => v + 1);
        dragSelections.current = new Map(pendingDragSelections.current);
        pendingDragSelections.current.clear();
        setDragging(false);
        forceUpdate((n) => n + 1);
        // handleDragging(null, false);
      } else {
        if (!e.shiftKey) {
          pendingDragSelections.current.clear();
          dragSelections.current.clear();
        } else {
          // keep current selection, we are adding/extending
        }
        const cell = (e.target as HTMLElement).closest("td");
        if (!cell) {
          forceUpdate((n) => n + 1);
          // console.log("No cell found on click");
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
        // console.log("This was a click, not a drag");
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
          const prev = dragSelections.current.get(table);

          if (e.shiftKey) {
            const next: DragSel = prev
              ? { ...prev, extras: new Set(prev.extras ?? []) }
              : { startRow: rowIndex, endRow: rowIndex, extras: new Set<number>() };

            // toggle this index
            if (next.extras!.has(rowIndex)) next.extras!.delete(rowIndex);
            else next.extras!.add(rowIndex);

            // do not destroy the range; keep it as-is
            dragSelections.current.set(table, next);
          } else {
            // normal click selects only this row (reset)
            dragSelections.current.set(table, { startRow: rowIndex, endRow: rowIndex, extras: new Set() });
          }
        }
        forceUpdate((n) => n + 1);
      }
      

      // document.body.style.removeProperty("user-select");
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
        const prev = pendingDragSelections.current.get(table);
        pendingDragSelections.current.set(table, {
          startRow: prev ? prev.startRow : rowIndex,
          endRow: rowIndex,
          extras: prev?.extras ?? new Set(),
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

  const [headers, setHeaders] = useState<string[]>(() => getMaterialHeaders(orderType, defaultPage));
  // const [scrollAreaName, setScrollAreaName] = useState<string>(orderType);
  const [rowHistory, setRowHistory] = useState<string[] | null>(null);

  // const [clickedTables, setClickedTables] = useState<Set<string>>(new Set());
  // const [users, setUsers] = useState<Set<string>>(new Set());
  const [scrollAreaName, setScrollAreaName] = useState<string>("History");
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const id = pendingUrlNameId.current;
    if (!id) return;

    const rowEl = rowRefs.current[id];
    if (!rowEl) {
      return;
    }

    // Now we know the table + row exist → safe to select
    selectRowByNameId(id);
    lastUrlSelectedNameId.current = id;
    pendingUrlNameId.current = null; // consume it
  }, [grouped, selectedCategory, orders.length]);

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

  // const onColorSelect = (color: string) => {
  //   console.log("Color selected:", color);
  //   setColorSelected(color);
  // };

  const handleCategoryClick = useCallback(
    (category: string, ignoreRefresh?: boolean) => {
      console.log("Category clicked:", category);
      const lowerCategory = category.toLowerCase();

      if (!ignoreRefresh) {
        // Ensure we strip any existing query from the path
        const basePath = pathname.split("?")[0];

        // This yields: /toprint?special, /toprint?white, etc.
        router.push(`${basePath}?${lowerCategory}`);
      }
    },
    [pathname, router]
  );

  // *  Finding a different way to search
  // * URL → state: category, headers, visible groups
  useEffect(() => {
    // Get first key from ?category style URL, e.g. /toprint?special
    const first = Array.from(searchParams.entries())[0] ?? [];
    const [key, value] = first as [string | undefined, string | undefined];

    if (value && value.length > 0) {
      const decoded = decodeURIComponent(value);

      // Only queue if different from last used
      if (decoded !== lastUrlSelectedNameId.current) {
        pendingUrlNameId.current = decoded; // <-- defer selection
      }
    } else {
      // No value (e.g. /toprint?clear) → reset
      lastUrlSelectedNameId.current = null;
      pendingUrlNameId.current = null;
    }

    // If no key in URL, fall back to defaultPage
    const urlCategoryRaw = key ?? defaultPage;
    if (!urlCategoryRaw) return;

    // Make sure the URL category is one of the designatedCategories
    const urlCategoryMatch = designatedCategories.find((c) => c.toLowerCase() === urlCategoryRaw.toLowerCase());
    // console.log("URL category match:", urlCategoryMatch);
    if (!urlCategoryMatch) {
      // If it's invalid, you could optionally reset URL here, but for now just bail
      return;
    }

    const normalized = urlCategoryMatch.toLowerCase();

    // Only update if different from current to avoid useless re-renders
    if (normalized !== selectedCategory.toLowerCase()) {
      setSelectedCategory(urlCategoryMatch);
      setHeaders(getMaterialHeaders(orderType, normalized));

      // Rebuild visibleGroups so only groups with matching prefix are visible
      setVisibleGroups(() => {
        const newVisibility: Record<string, boolean> = {};
        Object.keys(grouped).forEach((groupKey) => {
          const prefix = groupKey.split("-")[0];
          newVisibility[groupKey] = prefix === normalized;
        });
        return newVisibility;
      });
    }
  }, [searchParams, designatedCategories, defaultPage, grouped, orderType, selectedCategory]);

  const handleCheckboxClick = useCallback(async (order: Order) => {
    setCurrentRowClicked(null);
    setIsRowClicked(false);
    dragSelections.current.clear();
    pendingDragSelections.current.clear(); // this clears out as well 
    ignoreUpdateIds.current.add(order.name_id);
    pendingRemovalIds.current.add(order.name_id);
    setOrders((prev) => prev.filter((o) => o.name_id !== order.name_id));
    updateOrderStatus(order, false);
    toast.success("Order updated", {
      description: `Order ${convertToSpaces(order.name_id)} has been moved to ${handleNewProductionStatus(
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
  }, []);

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
      if (orderType === "print") {
        return;
      }
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
  // console.log(selectedCategory);
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
    // toast.info("Updating notes...", { duration: 2000 });
    setOrders((prev) => prev.map((o) => (o.name_id === order.name_id ? { ...o, notes: newNotes } : o)));
    // Persist change
    await updateOrderNotes(order, newNotes);
    toast(`Updated note for ${order.name_id}`, {
      description: `Note: ${newNotes}`,
    });
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
        return;
      }
      if (option == "deleteAll") {
        console.log("Deleting line:", currentRowClicked);
        await removeOrderAll(currentRowClicked?.order_id!);
        toast.warning("Order Deleted", {
          description: `Deleted all items for order ${currentRowClicked!.order_id}.`,
          action: {
            label: "Undo",
            onClick: () => {},
          },
          duration: 3000,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.open(`https://stickerbeat.zendesk.com/agent/tickets/${currentRowClicked?.order_id}`, "_blank");
    },
    [currentRowClicked, orderType]
  );

  if (headers.length === 0) {
    console.error("Headers are not defined, please add some headers for these buttons here");
    return null;
  }
  const handleAsigneeClick = useCallback(
    async (row: Order) => {
      // console.log(userSelected);
      // if (!session?.user?.email) return;
      // const me = session.user.email; // use this to find out if the user is an admin
      try {
        // console.log(dragSelections.current.size); 
        if (dragSelections.current.size > 0) {
          // console.log("Handling multi-row assignment");
          const nameIds: string[] = [];
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
              if (!row) continue;
              const nameId = row.getAttribute("name-id");
              if (nameId) {
                nameIds.push(nameId);
              }
            }
          });
          // console.log(colorSelected);
          // Optimistically update the orders for all selected nameIds
          toast(`Assigning orders to ${userSelected}`, {
            description: `${nameIds.length} orders changed`,
          });
          assignMultiOrderToUser(nameIds, userSelected);
          setOrders((prev) => prev.map((o) => (nameIds.includes(o.name_id) ? { ...o, asignee: userSelected } : o)));
          return;
        }; 
        //   toast(`Assigning orders to ${userSelected}`, {
        //   description: `For ${row.name_id}.`,
        // });
        setOrders((prev) => prev.map((o) => (o.name_id === row.name_id ? { ...o, asignee: userSelected } : o))); // optimistic update
        assignOrderToUser(row, userSelected);
      } catch (err) {
        console.error("assign failed", err);
        // 3) (optional) roll back if it errored:
        // setOrders((prev) => prev.map((o) => (o.name_id === row.name_id ? { ...o, asignee: row.asignee } : o)));
        // toast("Couldn’t assign order", { type: "error" });
      }
    },
    [session, setOrders, userSelected]
  );
  const handleRowClick = useCallback(
    (rowEl: HTMLTableRowElement, row: Order | null, copiedText: boolean) => {
      if (!row) {
        console.warn("Row is null, skipping click handling.");
        return;
      }
      setMenuAnchorEl(rowEl);
      if (rowEl) {
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
        setIsRowClicked(true);
      }
      setCurrentRowClicked(row);
    },
    [isRowClicked, toast, setMenuPos, setIsRowClicked, setCurrentRowClicked]
  );

  const allKeys = orderKeys[orderType] || [];
  const textColor = getTextColor(selectedCategory);
  // console.log(dragSelections);
  return (
    <>
      <div className="relative" ref={containerRef}>
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex-shrink-0">
            <h1 className={`scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${textColor}`}>
              {"To " + orderType.charAt(0).toUpperCase() + orderType.slice(1)} -{" "}
              {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h1>
          </div>
          <div className="w-full flex justify-end gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Shortcuts</DialogTitle>
                  <DialogDescription className="text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <ul className="list-di+sc list-inside text-xs">
                          <li>[SHIFT] + [F] = Search for Orders</li>
                          <li>[SHIFT] + [HOLD] = Multi select Rows</li>
                          <li>[CMD] + [C] = Copy File Name + Quantity for Print</li>
                        </ul>
                      </div>
                      <div>
                        <ul className="list-disc list-inside text-xs">
                          <li>Double Click = Quickly copy file name</li>
                          <li>[SHIFT] + [CMD] = Multi select Rows</li>
                          <li></li>
                        </ul>
                      </div>
                    </div>
                  </DialogDescription>
                  <DialogDescription className="text-sm">
                    <ul className="list-disc list-inside">
                      <li>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-302"></span>
                        Monday
                      </li>
                      <li>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-305"></span>
                        Tuesday
                      </li>
                      <li>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-303"></span>
                        Wednesday
                      </li>
                      <li>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-302"></span>
                        Thursday
                      </li>
                      <li>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-301"></span>
                        Friday
                      </li>
                    </ul>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
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
            <Button
              onClick={async () => {
                if (refreshed) return;
                setRefreshed(true);
                await refreshOrders();
                await new Promise((resolve) => setTimeout(resolve, 3000)); // 3-second cooldown
                setRefreshed(false);
              }}
              disabled={refreshed}
              className="flex items-center gap-2"
            >
              {refreshed ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-200" />
              ) : (
                <RefreshCcw className="w-5 h-5" />
              )}
              Force Refresh
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Info />
            </Button>
          </div>
        </div>
        <Separator className="w-full mb-10" />
        <div className="flex items-center gap-2 mb-6 h-1">
          <Button disabled={!isShiftDown} className="rounded-sm px-2 py-2 bg-gray-200 text-gray-700 cursor-default">
            SHIFT
          </Button>
          <p>Multi select rows by holding [SHIFT] and dragging your mouse</p>
        </div>
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
                      <OrderTableHeader tableHeaders={headers} />
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
                        isShiftDown={isShiftDown}
                      />
                    </Table>
                  </>
                )}
              </Fragment>
            );
          })}
        </Fragment>
        {/* Pass both categories and onCategoryClick to ButtonOrganizer */}

        {/* Render circle if position is found comming soon not yet integrated*/}
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
          dragSelections={dragSelections} // maybe change this to something else
          isAdmin={isAdmin}
          userRows={userRows}
          currentUserSelected={userSelected}
          setCurrentUser={setUserSelected}
          copyPrintData={copyPrintData}
          selectionVersion={selectionVersion}
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
            <HoverInformation historySteps={rowHistory ?? undefined} scrollName={scrollAreaName} />
          </div>
        )}
      </div>
      {/* <DropdownAsignee/> */}
      {isRowClicked && (
        <OrderViewer
          currentRow={currentRowClicked}
          status={orderType}
          isAdmin={isAdmin}
          onRevertStatus={() => handleMenuOptionClick("revert")}
          onViewZendesk={() => handleMenuOptionClick("view")}
          onDeleteLine={() => handleMenuOptionClick("delete")}
          onDeleteAll={() => handleMenuOptionClick("deleteAll")}
        />
      )}
      <Toaster theme={"dark"} richColors={true} />
    </>
  );
}

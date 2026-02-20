"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getBrowserClient } from "@/utils/supabase/client";

type Step = {
  name: string;
  date: string;
  done: boolean;
  active?: boolean;
};

const TIMELINE_STEP_NAMES = [
  "Order Received",
  "Proof Sent",
  "Proof Approved",
  "Print File Created",
  "Printing",
  "Cutting",
  "QA Checks and Count",
  "Packing",
  "Label Created",
  "Tracking Sent",
] as const;

const STATUS_TO_PROGRESS_INDEX: Record<string, number> = {
  // order received
  new_order: 0,
  new_orders: 0,
  // proof sent
  out_for_approval: 1,
  // proof approved + print file created
  approved: 3,
  // printing
  to_print: 4,
  // cutting
  to_cut: 5,
  // qa checks and count
  pre_pack: 6,
  prepack: 6,
  // packing
  to_pack: 7,
  // label created + tracking sent
  shipped: 9,
};

const STATUS_TO_DATE_STEPS: Record<string, number[]> = {
  new_order: [0],
  new_orders: [0],
  out_for_approval: [1],
  approved: [2, 3],
  to_print: [4],
  to_cut: [5],
  pre_pack: [6],
  prepack: [6],
  to_pack: [7],
  shipped: [8, 9],
};

const STATUS_ROW_HEIGHT_REM = 5;
const STATUS_MARKER_CENTER_OFFSET_REM = 0.95;

function normalizeStatus(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatHistoryDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toItemArray(value: unknown): any[] {
  const parsed = parseMaybeJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function getItemTitle(item: Record<string, unknown>, idx: number) {
  const raw =
    item.item_name ??
    item.itemName ??
    item.name ??
    item.title ??
    item.product_name ??
    item.productName ??
    item.sku;
  const text = String(raw ?? "").trim();
  return text || `Item ${idx + 1}`;
}

function getItemFile(item: Record<string, unknown>) {
  const raw = item.file_name ?? item.fileName ?? item.file ?? item.pdf ?? item.filename;
  return String(raw ?? "").trim() || "-";
}

function getItemNotes(item: Record<string, unknown>) {
  const raw = item.notes ?? item.note ?? item.description;
  return String(raw ?? "").trim() || "-";
}

function getItemProperties(item: Record<string, unknown>) {
  const props: string[] = [];
  const keys: Array<[string, string]> = [
    ["finish", "Finish"],
    ["peel", "Peel"],
    ["shape", "Shape"],
    ["material", "Material"],
    ["size", "Size"],
    ["quantity", "Qty"],
  ];

  for (const [key, label] of keys) {
    const value = item[key];
    if (value === undefined || value === null || String(value).trim() === "") continue;
    props.push(`${label}: ${String(value)}`);
  }

  return props.length ? props.join(", ") : "-";
}


function getStatusHelpText(stepName: string) {
  if (stepName === "Order Received") return "Order was received during this date";
  if (stepName === "Proof Sent") return "proof sent means when the proof was sent";
  return `${stepName.toLowerCase()} means this is the current production step.`;
}



export default function TrackingResultPage() {
  const params = useParams<{ result: string }>();
  const rawSegment = params?.result ?? "";
  const parsedOrderNumber = decodeURIComponent(rawSegment).replace(/^result=/, "").trim().replace(/\D/g, "");
  const orderNumberForQuery = Number(parsedOrderNumber);
  const hasValidOrderId = Number.isFinite(orderNumberForQuery) && orderNumberForQuery > 0;

  const [trackingOrder, setTrackingOrder] = useState<Record<string, unknown> | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTrackingOrder = async () => {
      setLoadingTracking(true);
      setTrackingError(null);

      if (!hasValidOrderId) {
        if (!mounted) return;
        setTrackingOrder(null);
        setLoadingTracking(false);
        return;
      }

      const supabase = getBrowserClient() as any;
      const allTrackingOrdersRes = await supabase.from("tracking_orders").select("*");
      console.log("tracking_orders rows:", allTrackingOrdersRes.data);
      if (allTrackingOrdersRes.error) {
        console.error("tracking_orders debug fetch error:", allTrackingOrdersRes.error);
      }

      let data: any = null;
      let error: any = null;

      // 1) Primary source: tracking_orders (single row per order expected)
      const trackingRes = await supabase
        .from("tracking_orders")
        .select("*")
        .eq("order_id", orderNumberForQuery)
        .maybeSingle();

      data = trackingRes.data;
      error = trackingRes.error;

      // 2) Fallback for existing production data that may still live in `orders`
      if (!data && !error) {
        const ordersRes = await supabase
          .from("orders")
          .select("*")
          .eq("order_id", orderNumberForQuery)
          .order("inserted_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        data = ordersRes.data;
        error = ordersRes.error;
      }

      if (!mounted) return;

      if (error) {
        setTrackingError(error.message ?? "Failed to load tracking order");
        setTrackingOrder(null);
      } else {
        setTrackingOrder(data ?? null);
      }

      setLoadingTracking(false);
    };

    loadTrackingOrder();
    return () => {
      mounted = false;
    };
  }, [hasValidOrderId, orderNumberForQuery]);

  const liveOrderId = trackingOrder?.order_id ? String(trackingOrder.order_id) : "";
  const liveItemCount =
    typeof trackingOrder?.items_count === "number"
      ? trackingOrder.items_count
      : typeof trackingOrder?.item_count === "number"
        ? trackingOrder.item_count
        : 0;
  const liveEta =
    (trackingOrder?.est_arrival_date as string | undefined) ??
    (trackingOrder?.arrival_date as string | undefined) ??
    "";
  const liveShipping = (trackingOrder?.shipping_method as string | undefined) ?? "";

  const liveSteps = useMemo(() => {
    const rawHistory = trackingOrder?.history;
    const parsedHistory: any = parseMaybeJson(rawHistory);

    const historyEntries = Array.isArray(parsedHistory?.productionChangeHistory)
      ? parsedHistory.productionChangeHistory
      : [];
    const currentStatus = normalizeStatus(parsedHistory?.productionChange?.value);
    const activeIndex = STATUS_TO_PROGRESS_INDEX[currentStatus];

    if (typeof activeIndex !== "number") {
      return TIMELINE_STEP_NAMES.map((name) => ({ name, date: "", done: false, active: false }));
    }

    const latestDateByStep = new Map<number, string>();
    for (const entry of historyEntries) {
      const status = normalizeStatus(entry?.value);
      const indices = STATUS_TO_DATE_STEPS[status];
      if (!indices?.length) continue;
      const formatted = formatHistoryDate(entry?.updated_at);
      if (!formatted) continue;
      for (const idx of indices) {
        latestDateByStep.set(idx, formatted);
      }
    }

    return TIMELINE_STEP_NAMES.map((name, idx) => ({
      name,
      date: latestDateByStep.get(idx) ?? "",
      done: idx < activeIndex,
      active: idx === activeIndex,
    }));
  }, [trackingOrder]);

  const liveItems = useMemo(() => {
    const candidates = [
      trackingOrder?.items,
      trackingOrder?.order_items,
      trackingOrder?.line_items,
      parseMaybeJson(trackingOrder?.history as unknown)?.productionChange?.items,
    ];

    for (const candidate of candidates) {
      const array = toItemArray(candidate);
      if (array.length > 0) return array;
    }

    return [];
  }, [trackingOrder]);

  const activeStepIndex = liveSteps.findIndex((step) => step.active);
  const orderDoesNotExist = !loadingTracking && !trackingError && (!hasValidOrderId || !trackingOrder);

  return (
    <div className="min-h-screen bg-zinc-50 font-archivo">
      <header className="w-full bg-[#76C043] px-6 py-4 text-white">
        <div className="grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <img src="/images/stickerbeat-logo-white.png" alt="Stickerbeat Logo" className="h-12 w-auto" />
          </div>
          <h1 className="text-center text-4xl tracking-tight">Order Tracker</h1>
          <div className="flex justify-end">
            <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white/15">
              <Link href="/database">View Orders</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 py-8">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="space-y-8 p-6">
            {orderDoesNotExist ? (
              <p className="text-lg">Order doesn't exist</p>
            ) : (
              <>
            <div className="flex flex-wrap items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Order #{liveOrderId}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Order</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>#{liveOrderId}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <section className="space-y-2">
              <div className="flex items-center gap-8 text-lg">
                <p className="text-lg">Order #{liveOrderId}</p>
                <p className="text-lg">{liveItemCount} Item</p>
              </div>
              <p className="text-lg">• Est. Arrival Date: by {liveEta || "-"}</p>
              <p className="text-lg">• Shipping Method: {liveShipping || "-"}</p>
              <p className="text-lg text-zinc-600">
                {loadingTracking && `Loading tracking_orders row for order_id=${orderNumberForQuery}...`}
                {!loadingTracking && trackingOrder && "Loaded from Supabase table: tracking_orders"}
                {!loadingTracking && trackingError && `Supabase error: ${trackingError}`}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg">Status</h2>
              <div className="rounded-3xl border border-zinc-200 p-6">
                <div className="relative">
                  {activeStepIndex >= 0 && (
                    <span
                      className="absolute left-[10px] top-0 w-1 bg-black"
                      style={{ height: `calc(${activeStepIndex} * ${STATUS_ROW_HEIGHT_REM}rem + ${STATUS_MARKER_CENTER_OFFSET_REM}rem)` }}
                    />
                  )}
                  {liveSteps.map((step, index) => (
                    <div key={step.name} className="grid h-20 grid-cols-[24px_1fr] items-start gap-4">
                      <div className="relative flex w-6 justify-center self-stretch">
                        {activeStepIndex >= 0 && index === activeStepIndex && (
                          <span className="absolute left-1/2 top-[0.95rem] h-4 w-4 -translate-x-1/2 -translate-y-1/2">
                            <span className="absolute inset-0 rounded-full bg-[#76C043]" />
                            <span className="active-pulse-ring absolute inset-0 rounded-full border-2 border-[#76C043]" />
                          </span>
                        )}
                      </div>
                      <div className="grid flex-1 gap-1 sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg">{step.name}</p>
                            {step.active && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-400 text-xs text-zinc-700"
                                    aria-label={`Status info for ${step.name}`}
                                  >
                                    ?
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent>{getStatusHelpText(step.name)}</HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                          {step.date && <p className="text-lg">{step.date}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg">Items ({liveItems.length})</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-lg">Item</TableHead>
                    <TableHead className="text-lg">File</TableHead>
                    <TableHead className="text-lg">Notes</TableHead>
                    <TableHead className="text-lg">Properties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveItems.map((rawItem, idx) => {
                    const item = (rawItem ?? {}) as Record<string, unknown>;
                    return (
                      <TableRow key={`item-${idx}`}>
                        <TableCell className="text-lg text-[#76C043]">{getItemTitle(item, idx)}</TableCell>
                        <TableCell className="text-lg">{getItemFile(item)}</TableCell>
                        <TableCell className="text-lg">{getItemNotes(item)}</TableCell>
                        <TableCell className="text-lg">{getItemProperties(item)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .active-pulse-ring {
          animation: activePulse 3s ease-out infinite;
        }

        @keyframes activePulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          30% {
            transform: scale(2);
            opacity: 0;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

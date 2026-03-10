"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capitalizeFirstLetter } from "@/utils/stringfunctions";
type Step = {
  name: string;
  description: string;
  date: string;
  done: boolean;
  active?: boolean;
};

const TIMELINE_STEPS = [
  {
    name: "Order Received",
    description: "Thank you for making a purchase with Stickerbeat.",
  },
  {
    name: "Proof Sent",
    description: "A digital proof has been sent for this order. Please approve it at your earliest convenience.",
  },
  {
    name: "Proof Approved",
    description: "We have received confirmation of your proof approval. The production timeline starts now.",
  },
  {
    name: "Print File Created",
    description: "A print file has been created from the approved digital proof.",
  },
  {
    name: "Printing",
    description: "Printing has begun. This is the first stage of production. Changes to this order can no longer be made.",
  },
  {
    name: "Cutting",
    description: "Your order has begun cutting. This is the longest stage of our production.",
  },
  {
    name: "QA Checks and Count",
    description: "We are reviewing the production quality as well as the total sticker count. If there are any shorts, you may see this tracker go back to “Printing”.",
  },
  {
    name: "Packing",
    description: "The count has been verified. This order is now being shrink wrapped and packed.",
  },
  {
    name: "Label Created",
    description: "This order has been packed and a shipping label has been created.",
  },
  {
    name: "Tracking Sent",
    description: "This order has been completed. Tracking will fully activate when FedEx first scans this package around 5:30PM EST.",
  },
] as const;

const STATUS_TO_PROGRESS_INDEX: Record<string, number> = {
  new_order: 0,
  new_orders: 0,
  out_for_approval: 1,
  approved: 3,
  to_print: 4,
  to_cut: 5,
  to_prepack: 6,
  to_pack: 7,
  to_ship: 8,
  pack_and_ship: 9,
  shipped: 9,
};

const STATUS_TO_DATE_STEPS: Record<string, number[]> = {
  new_order: [0],
  new_orders: [0],
  out_for_approval: [1],
  approved: [2, 3],
  to_print: [4],
  to_cut: [5],
  to_prepack: [6],
  to_pack: [7],
  to_ship: [8],
  pack_and_ship: [9],
  shipped: [9],
};

const STATUS_ROW_HEIGHT_REM = 4;
const STATUS_MARKER_CENTER_OFFSET_REM = 0.95;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeStatus(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatHistoryDate(value: unknown) {
  if (!value) return "";
  const raw = String(value).trim();
  let date = new Date(raw);
  if (Number.isNaN(date.getTime()) && raw.includes(" ")) {
    date = new Date(raw.replace(" ", "T"));
  }
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

function toHistoryArray(value: unknown): Record<string, unknown>[] {
  const parsed = parseMaybeJson(value);

  if (Array.isArray(parsed)) {
    return parsed.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[];
  }

  if (!parsed || typeof parsed !== "object") return [];

  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.productionChangeHistory)) {
    return record.productionChangeHistory.filter((entry) => entry && typeof entry === "object") as Record<
      string,
      unknown
    >[];
  }

  const entries = Object.entries(record);
  const looksLikeIndexedHistory =
    entries.length > 0 &&
    entries.every(([key, entry]) => /^\d+$/.test(key) && entry && typeof entry === "object");

  if (looksLikeIndexedHistory) {
    return entries.sort(([a], [b]) => Number(a) - Number(b)).map(([, entry]) => entry as Record<string, unknown>);
  }

  if ("value" in record || "updated_at" in record) {
    return [record];
  }

  return [];
}

function toItemArray(value: unknown): any[] {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    const entries = Object.entries(record);
    const looksLikeIndexedObject =
      entries.length > 0 && entries.every(([key, item]) => /^\d+$/.test(key) && item && typeof item === "object");

    if (looksLikeIndexedObject) {
      const sorted = entries.sort(([a], [b]) => Number(a) - Number(b));
      return sorted.map(([, item]) => item);
    }

    return [record];
  }
  return [];
}

function getFieldValue(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (!(key in item)) continue;
    const value = item[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text) continue;
    return text;
  }
  return "";
}

function getItemTitle(item: Record<string, unknown>, idx: number) {
  const text = getFieldValue(item, [
    "Title",
    "title",
    "item_name",
    "itemName",
    "name",
    "product_name",
    "productName",
    "sku",
  ]);
  return text || `Item ${idx + 1}`;
}

function getItemFile(item: Record<string, unknown>) {
  return getFieldValue(item, ["FileName", "fileName", "file_name", "filename", "file", "pdf"]) || "-";
}

function getItemNotes(item: Record<string, unknown>) {
  return getFieldValue(item, ["Notes", "notes", "note", "description"]) || "-";
}

function getItemProperties(item: Record<string, unknown>) {
  const props: string[] = [];

  const allowedProperties: Array<[string, string[]]> = [
    ["Peel", ["Peel", "peel"]],
    ["Shape", ["Shape", "shape"]],
    ["Finish", ["Finish", "finish"]],
    ["Material", ["Material", "material"]],
  ];

  for (const [label, keys] of allowedProperties) {
    const value = getFieldValue(item, keys);
    if (!value) continue;
    props.push(`${label}: ${capitalizeFirstLetter(value)}`);
  }

  return props.length ? props.join("\n") : "-";
}

export default function TrackingResultPage() {
  const params = useParams<{ result: string }>();
  const rawSegment = Array.isArray(params?.result) ? params.result[0] : params?.result ?? "";
  const trackingToken = decodeURIComponent(rawSegment).trim();
  const hasValidToken = UUID_V4_REGEX.test(trackingToken);

  const [trackingOrder, setTrackingOrder] = useState<Record<string, unknown> | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTrackingOrder = async () => {
      setLoadingTracking(true);
      setTrackingError(null);

      if (!hasValidToken) {
        if (!mounted) return;
        setTrackingOrder(null);
        setTrackingError("Invalid tracking token");
        setLoadingTracking(false);
        return;
      }

      let data: Record<string, unknown> | null = null;
      let errorMessage: string | null = null;
      try {
        const response = await fetch(`/api/track?token=${encodeURIComponent(trackingToken)}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) {
          errorMessage = payload?.error ?? "Failed to load tracking order";
        } else {
          data = payload?.data ?? payload ?? null;
        }
      } catch {
        errorMessage = "Failed to load tracking order";
      }

      if (!mounted) return;

      if (errorMessage) {
        setTrackingError(errorMessage);
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
  }, [hasValidToken, trackingToken]);

  const liveOrderId = trackingOrder?.order_id ? String(trackingOrder.order_id) : "";
  console.log("trackingOrder", trackingOrder, "liveOrderId", liveOrderId);
  const liveItems = useMemo(() => {
    const candidates = [
      trackingOrder?.items,
      parseMaybeJson(trackingOrder?.history as unknown)?.productionChange?.items,
    ];

    for (const candidate of candidates) {
      const array = toItemArray(candidate);
      if (array.length > 0) return array;
    }

    return [];
  }, [trackingOrder]);
  const liveItemCount =
    liveItems.length > 0
      ? liveItems.length
      : typeof trackingOrder?.items_count === "number"
        ? trackingOrder.items_count
        : typeof trackingOrder?.item_count === "number"
          ? trackingOrder.item_count
          : 0;
  const liveShipDate = (trackingOrder?.ship_date as string | undefined) ?? "";
  const liveProvidedDate = (trackingOrder?.provided_date as string | undefined) ?? "";
  const liveShipping = (trackingOrder?.shipping_method as string | undefined) ?? "";
  // const liveProvidedDate = (trackingOrder?.eta as string | undefined) ?? "";

  const liveSteps = useMemo(() => {
    const rawHistory = trackingOrder?.history;
    const parsedHistory: any = parseMaybeJson(rawHistory);
    const historyEntries = toHistoryArray(parsedHistory);
    const latestHistoryEntry = historyEntries[historyEntries.length - 1] ?? null;
    const currentStatus = normalizeStatus(latestHistoryEntry?.value ?? parsedHistory?.productionChange?.value);
    const activeIndex = STATUS_TO_PROGRESS_INDEX[currentStatus];

    if (typeof activeIndex !== "number") {
      return TIMELINE_STEPS.map((step) => ({ ...step, date: "", done: false, active: false }));
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

    const currentStatusDates = historyEntries
      .filter((entry) => normalizeStatus(entry?.value) === currentStatus)
      .map((entry) => formatHistoryDate(entry?.updated_at))
      .filter(Boolean);
    const currentStatusDate =
      currentStatusDates[currentStatusDates.length - 1] ?? formatHistoryDate(latestHistoryEntry?.updated_at) ?? "";

    return TIMELINE_STEPS.map((step, idx) => ({
      ...step,
      date:
        latestDateByStep.get(idx) ??
        (idx <= activeIndex && currentStatusDate ? currentStatusDate : ""),
      done: idx < activeIndex,
      active: idx === activeIndex,
    }));
  }, [trackingOrder]);

  const activeStepIndex = liveSteps.findIndex((step) => step.active);
  const activeStep = activeStepIndex >= 0 ? liveSteps[activeStepIndex] : null;
  const showErrorState = !loadingTracking && !!trackingError;
  const orderDoesNotExist = !loadingTracking && !trackingError && (!hasValidToken || !trackingOrder);

  return (
    <div className="min-h-screen overscroll-none bg-zinc-50 font-archivo">
      <header className="sticky top-0 z-50 w-full bg-[#76C043] px-6 py-4 text-white">
        <div className="grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <img src="/images/stickerbeat-logo-white.png" alt="Stickerbeat Logo" className="h-12 w-auto" />
          </div>
          <h1 className="text-center text-4xl tracking-tight">Order Tracker</h1>
          <div className="flex justify-end">
            <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white/15">
              <Link href="/tracking/">Track Order</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 py-8">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="space-y-8 p-6">
            {showErrorState ? (
              <p className="text-lg">{trackingError}</p>
            ) : orderDoesNotExist ? (
              <p className="text-lg">Order doesn't exist</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild variant="outline">
                    <Link href="/tracking">Track Another</Link>
                  </Button>
                </div>

                <section className="space-y-2">
                  <div className="flex items-center gap-8 text-lg">
                    <p className="text-lg">Order #{liveOrderId}</p>
                    <p className="text-lg">{liveItemCount} Item</p>
                  </div>
                      <p className="text-lg"><span className="font-bold">Est. Ship Date:</span> {liveShipDate || "-"}</p>
                      <p className="text-lg"><span className="font-bold">Original Provided Date:</span> {liveProvidedDate || "-"}</p>
                      <p className="text-lg"><span className="font-bold">Shipping Method:</span> {capitalizeFirstLetter(liveShipping) || "-"}</p>
                      <p className="text-lg"><span className="font-bold">Tracking Link:</span> { "N/a" }</p>
                </section>

                <section className="space-y-4">
                  <h2 className="text-2xl font-medium">Status Updates</h2>
                  <div className="rounded-3xl border border-zinc-200 p-10">
                    <div className="relative">
                      {activeStepIndex >= 0 && (
                        <span
                          className="absolute left-1.5 w-0.5 rounded-full bg-gray-400"
                          style={{
                            top: `${STATUS_MARKER_CENTER_OFFSET_REM}rem`,
                            height: `calc(${activeStepIndex} * ${STATUS_ROW_HEIGHT_REM}rem)`,
                          }}
                        />
                      )}
                      {liveSteps.map((step, index) => (
                        <div key={step.name} className="grid h-[4rem] grid-cols-[24px_1fr] items-start gap-4">
                          <div className="relative flex w-3 justify-center self-stretch">
                            {activeStepIndex >= 0 && index === activeStepIndex && (
                              <span className="absolute left-1/2 top-[0.95rem] h-4 w-4 -translate-x-1/2 -translate-y-1/2">
                                <span className="absolute inset-0 rounded-full bg-[#76C043]" />
                                <span className="active-pulse-ring absolute inset-0 rounded-full border-2 border-[#76C043]" />
                              </span>
                            )}
                          </div>
                          <div className="grid flex-10 sm:items-center">
                            <div className="py-1">
                              <div className="relative z-10 flex items-center">
                                <p className="bg-white px-2 text-xl font-medium font-bold">{step.name}</p>
                                {step.date && (
                                  <>
                                    <span className="px-2 text-lg text-zinc-500">•</span>
                                    <p className="text-lg text-zinc-700">{step.date}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeStep && (
                      <div className="mt-8 rounded-2xl bg-zinc-100 px-6 py-5">
                        <p className="text-lg text-zinc-700">{activeStep.description}</p>
                      </div>
                    )}
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
                            <TableCell className="whitespace-pre-line text-lg">{getItemProperties(item)}</TableCell>
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

"use client";
// import * as React from "react"
import React, { useState, useEffect, useRef, useCallback } from "react";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { redirect } from "next/navigation";
// import { OrderTypes } from "@/utils/orderTypes";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { TimelineOrder } from "@/types/custom";
// import { OrderTableHeader } from "@/components/order-table-header";
// import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Removed dialog imports since orders will render inline under each row
import { Order } from "@/types/custom";
import { getBrowserClient } from "@/utils/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, Info, Plus, Minus, ExternalLink, CalendarIcon, RefreshCcw, X } from "lucide-react";
import { capitalizeFirstLetter } from "@/utils/stringfunctions";
// import { Toaster } from "@/components/ui/sonner";
// const supabase = createClientComponentClient();
// import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const NOTE_COOLDOWN_MS = 10 * 1000;
const ZENDESK_TICKET_BASE_URL = "https://stickerbeat.zendesk.com/agent/tickets";

import { forceUpdateTimeline, updateOrderNotes, sendOrderShipped, updateTrackingOrderSpecialColor } from "@/utils/actions";
// import { forceRefreshTimeline } from "@/utils/google-functions";

const TIMELINE_COLUMNS = [
  { label: "", width: "44px", minWidth: "44px" },
  { label: "Order #", width: "104px", minWidth: "104px" },
  { label: "Due", width: "76px", minWidth: "76px" },
  { label: "IHD", width: "72px", minWidth: "72px" },
  { label: "Shipping Method", width: "112px", minWidth: "96px" },
  { label: "Creatives", width: "220px", minWidth: "140px" },
  { label: "Status", width: "92px", minWidth: "80px" },
  { label: "Material", width: "92px", minWidth: "80px" },
  { label: "Shape", width: "92px", minWidth: "80px" },
  { label: "Notes", width: "240px", minWidth: "220px" },
  { label: "Shipped", width: "72px", minWidth: "64px" },
] as const;



type TimelineItem = {
  FileName?: string;
  Title?: string;
  Status?: string;
  StatusColor?: string | null;
  Material?: string;
  Shape?: string;
  Notes?: string;
  DueDate?: string;
  IHDDate?: string;
  itemIndex?: number | string;
};

type DragSel = {
  startRow: number;
  endRow: number;
  extras?: Set<number>;
};

type TrackingTimelineMetadata = {
  items: TimelineItem[];
  specialColor?: string | null;
};

const TIMELINE_HEADER_ROW_CLASS = "h-.5 [&>th]:py-0 text-xs bg-gray-500 hover:bg-gray-500";
const TIMELINE_HEAD_CLASS = "border-r border-gray-200 font-bold text-white truncate text-[11px]";
const TIMELINE_ROW_CLASS =
  "[&>td]:py-1 align-top max-h-[14px] text-xs whitespace-nowrap break-all border-y-2 border-white";
const TIMELINE_CELL_CLASS = "px-3 py-1 font-semibold align-middle truncate";
const TIMELINE_PRIORITY_CELL_CLASS = "px-2 py-1 font-semibold align-middle whitespace-nowrap";
const TIMELINE_NOTES_CELL_CLASS =
  "px-3 py-1 font-semibold align-top whitespace-normal break-words [overflow-wrap:anywhere]";
const draggingThreshold = 1;
const ORDER_NUMBER_SPECIAL_COLOR = "#b0006d";
const STATUS_COLOR_OPTIONS = [
  { label: "Blue", value: "#00c8ff" },
  { label: "Green", value: "#15fb69" },
  { label: "Pink", value: "#ff36de" },
  { label: "Deep magenta", value: ORDER_NUMBER_SPECIAL_COLOR },
] as const;
const ACTIVE_STATUSES = new Set([
  "approved",
  "to_print",
  "to_cut",
  "to_prepack",
  "to_pack",
  "to_ship",
  "bda_production",
  "pack_and_ship",
]);

const TRACKING_LOOKBACK_DAYS = 14;
const SHIPPED_VISIBLE_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRODUCTION_STATUS_ORDER = ["bda_production", "print", "cut", "prepack", "pack", "ship"] as const;
type ProductionStatus = (typeof PRODUCTION_STATUS_ORDER)[number];

function formatLastUpdated(isoString: string) {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Format time as h:mm am/pm
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  // Format date as MM-DD
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${time} on ${month}-${day}`;
}

function parseTimelineDate(value: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value);
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

function getTimelineDayStart(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function getDefaultTimelineDateRange(): DateRange {
  const from = getTimelineDayStart(new Date());
  return { from, to: addDays(from, 7) };
}

function areTimelineDateRangesEqual(left?: DateRange, right?: DateRange) {
  if (!left?.from || !right?.from) return false;

  const leftFrom = getTimelineDayStart(left.from).getTime();
  const rightFrom = getTimelineDayStart(right.from).getTime();
  const leftTo = getTimelineDayStart(left.to ?? left.from).getTime();
  const rightTo = getTimelineDayStart(right.to ?? right.from).getTime();

  return leftFrom === rightFrom && leftTo === rightTo;
}

function formatTimelineMonthDay(dateValue?: string | Date | null) {
  const date = parseTimelineDate(dateValue ?? null);
  if (!date || Number.isNaN(date.getTime())) return "-";
  return format(date, "MM-dd");
}

function formatTimelineDateRange(range?: DateRange) {
  if (!range?.from) return "Pick a date range";
  if (!range.to) return formatTimelineMonthDay(range.from);
  return `${formatTimelineMonthDay(range.from)} - ${formatTimelineMonthDay(range.to)}`;
}

function isTimelineDateWithinRange(dateValue: string | Date | null, range?: DateRange) {
  const date = parseTimelineDate(dateValue);
  if (!date || Number.isNaN(date.getTime()) || !range?.from) return false;

  const day = getTimelineDayStart(date).getTime();
  const from = getTimelineDayStart(range.from).getTime();
  const to = getTimelineDayStart(range.to ?? range.from).getTime();
  const start = Math.min(from, to);
  const end = Math.max(from, to);

  return start <= day && day <= end;
}

function getTimelineDateStatus(dateA: string | Date, dateB: string | Date): "past" | "today" | "future" {
  const a = parseTimelineDate(dateA);
  const b = parseTimelineDate(dateB);
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "future";
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  if (a.getTime() < b.getTime()) return "past";
  if (a.getTime() === b.getTime()) return "today";
  return "future";
}

function getTimelineDayDiff(dateA: string | Date | null, dateB: string | Date) {
  const a = parseTimelineDate(dateA);
  const b = parseTimelineDate(dateB);
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

function isSameTimelineDay(dateA: string | Date | null, dateB: Date) {
  const a = parseTimelineDate(dateA);
  if (!a || Number.isNaN(a.getTime())) return false;
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() === b.getTime();
}

function getTimelineDayKey(dateValue: string | Date | null) {
  const date = parseTimelineDate(dateValue);
  if (!date || Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return format(date, "yyyy-MM-dd");
}

function getTimelineDayLabel(dateKey: string) {
  return formatTimelineMonthDay(dateKey);
}

function getTimelineTableTitleDate(dateKey: string) {
  const date = parseTimelineDate(dateKey);
  if (!date || Number.isNaN(date.getTime())) return getTimelineDayLabel(dateKey);
  return format(date, "MMMM - d");
}

function getTimelineDueDayLabel(dateKey: string, activeDate: Date) {
  const date = parseTimelineDate(dateKey);
  if (!date) return getTimelineDayLabel(dateKey);
  const label = formatTimelineMonthDay(date);
  return isSameTimelineDay(date, activeDate) ? `${label} - Due` : label;
}

function normalizeTimelineItems(items: unknown): TimelineItem[] {
  if (!items || typeof items !== "object") return [];

  const rawItems = Array.isArray(items) ? items : Object.values(items as Record<string, unknown>);
  return rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      FileName: typeof item.FileName === "string" ? item.FileName : undefined,
      Title: typeof item.Title === "string" ? item.Title : undefined,
      Status: typeof item.Status === "string" ? item.Status : undefined,
      Material: typeof item.Material === "string" ? item.Material : undefined,
      Shape: typeof item.Shape === "string" ? item.Shape : undefined,
      Notes: typeof item.Notes === "string" ? item.Notes : undefined,
      itemIndex:
        typeof item.itemIndex === "number" || typeof item.itemIndex === "string" ? item.itemIndex : undefined,
    }))
    .sort((a, b) => Number(a.itemIndex ?? 0) - Number(b.itemIndex ?? 0));
}

function formatTimelineItemValue(value?: string) {
  if (!value) return "-";
  const normalizedValue = value.replace(/_/g, " ").replace(/\bto\b/gi, "").replace(/\s+/g, "").trim();
  if (!normalizedValue) return "-";
  return capitalizeFirstLetter(normalizedValue);
}

function getMixedSummary(items: TimelineItem[], field: "Status" | "Material" | "Shape") {
  const values = Array.from(
    new Set(items.map((item) => item[field]?.trim()).filter((value): value is string => !!value)),
  );
  if (values.length === 0) return "-";
  if (values.length > 1) return "Mixed";
  return formatTimelineItemValue(values[0]);
}

function getTimelineStatusCellBackground(fallbackItems: TimelineItem[], overrideColor?: string | null) {
  if (overrideColor !== undefined) return overrideColor ?? undefined;

  const itemColors = fallbackItems.map((item) => item.StatusColor?.trim()).filter((color): color is string => !!color);
  const colors = Array.from(new Set(itemColors));

  if (colors.length === 0) return undefined;
  if (colors.length === 1) return colors[0];

  const segmentSize = 100 / colors.length;
  return `linear-gradient(90deg, ${colors
    .map((color, index) => `${color} ${index * segmentSize}%, ${color} ${(index + 1) * segmentSize}%`)
    .join(", ")})`;
}

function isOrderNumberSpecialColor(color?: string | null) {
  return color?.trim().toLowerCase() === ORDER_NUMBER_SPECIAL_COLOR.toLowerCase();
}

function normalizeTrackingStatus(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeProductionStatus(value?: string | null): ProductionStatus | null {
  const normalized = normalizeTrackingStatus(value).replace(/^to_/, "").replace(/^to\s+/, "");
  if (normalized === "pack_and_ship") return "pack";
  return PRODUCTION_STATUS_ORDER.includes(normalized as ProductionStatus) ? (normalized as ProductionStatus) : null;
}

function getLowerTimelineStatus(items: TimelineItem[], fallbackStatus?: string | null) {
  const statuses = items
    .map((item) => normalizeProductionStatus(item.Status))
    .filter((status): status is ProductionStatus => !!status);

  const fallbackProductionStatus = normalizeProductionStatus(fallbackStatus);
  if (fallbackProductionStatus) statuses.push(fallbackProductionStatus);

  if (statuses.length === 0) return fallbackStatus ?? undefined;

  return statuses.reduce((lowest, status) =>
    PRODUCTION_STATUS_ORDER.indexOf(status) < PRODUCTION_STATUS_ORDER.indexOf(lowest) ? status : lowest,
  );
}

function isBeforePack(status?: string | null) {
  const productionStatus = normalizeProductionStatus(status);
  return !!productionStatus && PRODUCTION_STATUS_ORDER.indexOf(productionStatus) < PRODUCTION_STATUS_ORDER.indexOf("pack");
}

type TimelineProductionWarning = "normal" | "warning" | "important";

function getTimelineProductionWarning(status: string | undefined, shipDate?: string | Date | null): TimelineProductionWarning {
  if (!isBeforePack(status)) return "normal";
  const dayDiff = getTimelineDayDiff(shipDate ?? null, new Date());
  if (dayDiff === null) return "normal";
  if (dayDiff < 0) return "important";
  if (dayDiff === 1) return "warning";
  return "normal";
}

function getTimelineProductionWarningClassName(warning: TimelineProductionWarning) {
  if (warning === "important") return "text-red-600";
  if (warning === "warning") return "text-yellow-600";
  return "";
}

function toTimelineTime(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function hasTimelineShipDate(order: TimelineOrder) {
  return toTimelineTime(order.ship_date) !== null;
}

function isTimelineTicketSolved(order: TimelineOrder) {
  return normalizeTrackingStatus(order.ticket_status) === "solved" || normalizeTrackingStatus(order.current_status) === "closed";
}

function isTimelineOrderRecentlyShipped(order: TimelineOrder, now = Date.now()) {
  const shippedTime = toTimelineTime(order.shipped_stamp);
  if (shippedTime === null) return false;

  const age = now - shippedTime;
  return age >= 0 && age <= SHIPPED_VISIBLE_WINDOW_MS;
}

function isTimelineOrderActive(order: TimelineOrder) {
  return (
    hasTimelineShipDate(order) &&
    !isTimelineTicketSolved(order) &&
    ACTIVE_STATUSES.has(normalizeTrackingStatus(order.current_status))
  );
}

function isTimelineOrderShipped(order: TimelineOrder) {
  if (!hasTimelineShipDate(order)) return false;
  return isTimelineTicketSolved(order) && isTimelineOrderRecentlyShipped(order);
}

function shouldParseTrackingOrder(order: TimelineOrder, oldestShipDate: Date) {
  const shipTime = toTimelineTime(order.ship_date);
  if (shipTime === null) return false;

  const shipDate = new Date(shipTime);
  shipDate.setHours(0, 0, 0, 0);

  return shipDate.getTime() >= oldestShipDate.getTime();
}

function getCreativeSummary(items: TimelineItem[]) {
  if (items.length === 0) return "unknown";
  return `${items.length} creatives`;
}

function formatCreativeName(fileName?: string, title?: string) {
  const name = (fileName || title || "-").replace(/(^|-)BDO[A-Za-z0-9]*-/g, "$1");
  if (name.length <= 60) return name;

  return `${name.slice(0, 52)}...${name.slice(-5)}`;
}

function getTimelineNotesSummary(rows: Order[]) {
  const notes = Array.from(
    new Set(rows.map((row) => row.notes?.trim()).filter((note): note is string => !!note)),
  );

  if (notes.length === 0) return "-";
  return notes.join(" | ");
}

function TimelineNoteInput({ note, onCommit }: { note: string; onCommit: (value: string) => void }) {
  const [value, setValue] = useState(note);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCommittedRef = useRef<string>(note);
  const commitLockRef = useRef(false);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(note);
      lastCommittedRef.current = note;
    }
  }, [note]);

  const resizeInput = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    resizeInput();
  };

  useEffect(() => {
    resizeInput();
  }, [value]);

  const commitOnce = (nextValue: string) => {
    if (commitLockRef.current || nextValue === lastCommittedRef.current) return;

    commitLockRef.current = true;
    lastCommittedRef.current = nextValue;
    onCommit(nextValue);

    queueMicrotask(() => {
      commitLockRef.current = false;
    });
  };

  return (
    <Textarea
      ref={inputRef}
      className="min-h-0 resize-none overflow-y-hidden border-0 bg-transparent px-0 py-0 text-[11px] font-semibold focus:bg-gray-200"
      value={value}
      rows={1}
      onInput={handleInput}
      onChange={handleInput}
      onBlur={() => commitOnce(value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          commitOnce(value);
          inputRef.current?.blur();
        }
      }}
    />
  );
}

function getZendeskTicketUrl(orderId: number) {
  return `${ZENDESK_TICKET_BASE_URL}/${orderId}`;
}

function getTimelineDataRows(table: HTMLTableElement) {
  const tbody = table.querySelector("tbody");
  if (!tbody) return [];
  return Array.from(tbody.children).filter(
    (row): row is HTMLTableRowElement =>
      row instanceof HTMLTableRowElement && row.getAttribute("datatype") === "data",
  );
}

function getTimelineRowIndex(row: HTMLTableRowElement) {
  const table = row.closest("table");
  if (!table) return -1;
  return getTimelineDataRows(table).indexOf(row);
}

function clearBrowserSelection() {
  const selection = window.getSelection();
  if (selection?.rangeCount) {
    selection.removeAllRanges();
  }
}

function isEditableElement(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element?.closest("input, textarea, [contenteditable='true']");
}

function collectSelectedTimelineOrderIds(selectionMap: Map<HTMLTableElement, DragSel>) {
  const selectedIds = new Set<number>();

  selectionMap.forEach((selection, table) => {
    const dataRows = getTimelineDataRows(table);
    const rowStart = Math.min(selection.startRow, selection.endRow);
    const rowEnd = Math.max(selection.startRow, selection.endRow);

    for (let index = rowStart; index <= rowEnd; index++) {
      const orderId = Number(dataRows[index]?.getAttribute("data-order-id"));
      if (Number.isFinite(orderId)) selectedIds.add(orderId);
    }

    selection.extras?.forEach((index) => {
      const orderId = Number(dataRows[index]?.getAttribute("data-order-id"));
      if (Number.isFinite(orderId)) selectedIds.add(orderId);
    });
  });

  return selectedIds;
}

// const formatDate = (dateString: string | null) => {
//   if (!dateString || dateString == null) {
//     return "";
//   }
//   const date = new Date(dateString);
//   const options: Intl.DateTimeFormatOptions = {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   };
//   return date.toLocaleDateString("en-US", options);
// };

const supabase = getBrowserClient();

export function TimelineOrders() {
  const [combinedOrders, setCombinedOrders] = useState<TimelineOrder[]>([]);
  // const [futureOrders, setFutureOrders] = useState<TimelineOrder[]>([]);
  const lastClickTime = useRef<number>(0);
  const [timeUpdated, setTimeUpdated] = useState<string>("");
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  // at top of component state
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggleOpen = (id: number, open: boolean) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      open ? next.add(id) : next.delete(id);
      return next;
    });

  const isRefreshingRef = useRef(false);

  // Inline orders rendering state: map order_id -> array of orders
  const [ordersById, setOrdersById] = useState<Record<number, Order[]>>({});
  const [trackingMetadataByOrderId, setTrackingMetadataByOrderId] = useState<Record<number, TrackingTimelineMetadata>>({});
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const [openTabsDialogOpen, setOpenTabsDialogOpen] = useState(false);
  const [pendingOpenOrderIds, setPendingOpenOrderIds] = useState<number[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(() => getDefaultTimelineDateRange());
  const [pendingSelectedDateRange, setPendingSelectedDateRange] = useState<DateRange | undefined>(selectedDateRange);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showShippedOrders, setShowShippedOrders] = useState(false);
  const [selectedTimelineOrderIds, setSelectedTimelineOrderIds] = useState<Set<number>>(new Set());
  const [statusColorOverridesByOrderId, setStatusColorOverridesByOrderId] = useState<Record<number, string | null>>({});
  const [dragging, setDragging] = useState(false);
  const dragSelections = useRef<Map<HTMLTableElement, DragSel>>(new Map());
  const pendingDragSelections = useRef<Map<HTMLTableElement, DragSel>>(new Map());
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const noteCooldownUntilRef = useRef<Record<string, number>>({});
  const noteInFlightRef = useRef<Record<string, boolean>>({});
  const shipActionInFlightRef = useRef(false);
  const [shipOrderInFlightId, setShipOrderInFlightId] = useState<number | null>(null);

  const [refreshDisabled, setRefreshDisabled] = useState(true);
  const [refreshHint, setRefreshHint] = useState<string>("Checking last refresh...");
  const [lastRefreshMs, setLastRefreshMs] = useState<number | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [cooldownOpen, setCooldownOpen] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState("");

  const parseLastRefreshMs = (value?: string | null): number | null => {
    if (!value) return null;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  };

  const formatRemaining = (ms: number) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const openZendeskOrderTabs = (orderIds: number[]) => {
    orderIds.forEach((orderId) => {
      window.open(getZendeskTicketUrl(orderId), "_blank");
    });
  };

  const handleOpenSelectedOrders = () => {
    const orderIds = Array.from(selectedTimelineOrderIds).filter((orderId) => Number.isFinite(orderId)).sort((a, b) => a - b);
    if (orderIds.length === 0) return;

    if (orderIds.length > 3) {
      setPendingOpenOrderIds(orderIds);
      setOpenTabsDialogOpen(true);
      return;
    }

    openZendeskOrderTabs(orderIds);
  };

  const handleStatusColorSelect = async (color: string | null) => {
    const selectedOrderIds = Array.from(selectedTimelineOrderIds);
    if (selectedOrderIds.length === 0) return;

    const previousOverrides = statusColorOverridesByOrderId;
    const previousTrackingMetadata = trackingMetadataByOrderId;

    setStatusColorOverridesByOrderId((prev) => {
      const next = { ...prev };
      selectedOrderIds.forEach((orderId) => {
        next[orderId] = color;
      });
      return next;
    });
    setTrackingMetadataByOrderId((prev) => {
      const next = { ...prev };
      selectedOrderIds.forEach((orderId) => {
        next[orderId] = {
          items: next[orderId]?.items ?? [],
          specialColor: color,
        };
      });
      return next;
    });

    try {
      const result = await updateTrackingOrderSpecialColor(selectedOrderIds, color);
      if (!result.ok) {
        toast.error(result.message);
        setStatusColorOverridesByOrderId(previousOverrides);
        setTrackingMetadataByOrderId(previousTrackingMetadata);
      }
    } catch (error) {
      console.error("Failed to assign timeline status color:", error);
      toast.error("Could not update status color.");
      setStatusColorOverridesByOrderId(previousOverrides);
      setTrackingMetadataByOrderId(previousTrackingMetadata);
    }
  };

  const fetchTimelineOrderRows = useCallback(async () => {
    const allIds = Array.from(
      new Set([...combinedOrders].map((o) => Number(o.order_id)).filter((id) => Number.isFinite(id)) as number[]),
    );

    if (allIds.length === 0) {
      setOrdersById({});
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);

    const base: Record<number, Order[]> = {};
    for (const id of allIds) base[id] = [];

    const { data, error } = await supabase
      .from("orders")
      .select("name_id, production_status, material, shape, order_id, notes")
      .in("order_id", allIds);

    if (error) {
      console.error("Error fetching orders for timeline:", error);
      setOrdersById(base);
      setOrdersLoading(false);
      return;
    }

    const grouped: Record<number, Order[]> = { ...base };
    (data ?? []).forEach((row: any) => {
      const id = Number(row.order_id);
      if (!Number.isFinite(id)) return;
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push(row as Order);
    });

    setOrdersById(grouped);
    setOrdersLoading(false);
  }, [combinedOrders]);

  const handleShipTimelineOrder = async (orderId: number) => {
    console.log("[timeline shipped] ship click received", {
      orderId,
      inFlight: shipActionInFlightRef.current,
    });

    if (shipActionInFlightRef.current) {
      console.log("[timeline shipped] blocked duplicate ship action", { orderId });
      toast.error("Please wait for the current ship action to finish.");
      return;
    }

    shipActionInFlightRef.current = true;
    setShipOrderInFlightId(orderId);

    try {
      console.log("[timeline shipped] calling sendOrderShipped", { orderId });
      const result = await sendOrderShipped(orderId);
      console.log("[timeline shipped] sendOrderShipped completed", { orderId, result });
      console.log("[timeline shipped] refreshing timeline order rows", { orderId });
      await fetchTimelineOrderRows();
      console.log("[timeline shipped] refreshed timeline order rows", { orderId });
    } catch (error) {
      console.error("[timeline shipped] failed", { orderId, error });
    } finally {
      console.log("[timeline shipped] ship action finished", { orderId });
      shipActionInFlightRef.current = false;
      setShipOrderInFlightId(null);
    }
  };

  const handleTimelineNoteChange = async (order: Order, newNotes: string) => {
    const nameId = order.name_id;
    const orderId = Number(order.order_id);
    const now = Date.now();
    const cooldownUntil = noteCooldownUntilRef.current[nameId] ?? 0;
    const inFlight = noteInFlightRef.current[nameId] ?? false;

    if (inFlight || now < cooldownUntil) {
      toast.error("Please wait before updating notes again.", {
        description: "You can only update notes every 10 seconds, please try again shortly",
        duration: 3000,
      });
      return;
    }

    const previousRows = ordersById[orderId] ?? [];
    setOrdersById((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] ?? []).map((row) =>
        row.name_id === nameId ? { ...row, notes: newNotes } : row,
      ),
    }));

    noteCooldownUntilRef.current[nameId] = now + NOTE_COOLDOWN_MS;
    noteInFlightRef.current[nameId] = true;

    try {
      await updateOrderNotes(order, newNotes);
      toast.success("Notes updated", {
        description: `Notes for ${(order.order_id ?? "")} have been updated.`,
      });
    } catch (error) {
      console.error("Failed to update timeline notes:", error);
      delete noteCooldownUntilRef.current[nameId];
      setOrdersById((prev) => ({
        ...prev,
        [orderId]: previousRows,
      }));
      toast.error("Could not update notes.");
    } finally {
      noteInFlightRef.current[nameId] = false;
    }
  };

  const handleConfirmSelectedDate = () => {
    const nextRange = pendingSelectedDateRange ?? getDefaultTimelineDateRange();
    setSelectedDateRange(nextRange);
    setDatePickerOpen(false);
  };

  const handleClearSelectedDate = () => {
    const defaultRange = getDefaultTimelineDateRange();
    setSelectedDateRange(defaultRange);
    setPendingSelectedDateRange(defaultRange);
    setDatePickerOpen(false);
  };


  const scheduleEnableWhenReady = (lastMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const now = Date.now();
    const nextAllowed = lastMs + REFRESH_COOLDOWN_MS;
    const remaining = nextAllowed - now;

    if (remaining <= 0) {
      setRefreshDisabled(false);
      setRefreshHint("Ready");
      return;
    }

    setRefreshDisabled(true);
    setRefreshHint(`Available in ${formatRemaining(remaining)}`);

    refreshTimerRef.current = setTimeout(() => {
      setRefreshDisabled(false);
      setRefreshHint("Ready");
    }, remaining);
  };

  const handleForceRefresh = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Hard guard: prevents spam even before React state updates
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      const now = Date.now();

      // If still disabled, show blocked popup ONCE
      if (refreshDisabled) {
        setCooldownMessage("Orders can only be refreshed every 10 minutes");
        setCooldownOpen(true);
        return;
      }
      // Disable immediately and start cooldown locally
      setRefreshDisabled(true);
      setCooldownMessage("A request to update the orders has been sent, this might take a couple of minutes. ");
      setCooldownOpen(true);
      setRefreshHint(`Available in ${formatRemaining(REFRESH_COOLDOWN_MS)}`);
      setLastRefreshMs(now);
      scheduleEnableWhenReady(now);

      // toast("Refresh requested", {
      //   description: "Timeline refresh has been triggered.",
      // });

      forceUpdateTimeline();

      // toast("Refresh accepted", {
      //   description: "Zendesk scan should update soon.",
      // });
    } catch (e) {
      // toast("Refresh failed", {
      //   description: "Request did not complete. Try again.",
      // });

      // Optional: re-enable immediately on failure
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      setRefreshDisabled(false);
      setRefreshHint("Ready");
    } finally {
      const base = lastRefreshMs ?? Date.now();
      const remaining = base + REFRESH_COOLDOWN_MS - Date.now();

      if (remaining > 0) {
        setTimeout(() => {
          isRefreshingRef.current = false;
        }, remaining);
        return;
      }

      isRefreshingRef.current = false;
    }
  };

  // Fetch all orders for the visible timeline (due + future) in bulk and group by order_id
  useEffect(() => {
    void fetchTimelineOrderRows();
  }, [fetchTimelineOrderRows]);

  useEffect(() => {
    const nextMetadataByOrderId: Record<number, TrackingTimelineMetadata> = {};
    combinedOrders.forEach((row) => {
      const orderId = Number(row.order_id);
      if (!Number.isFinite(orderId)) return;

      nextMetadataByOrderId[orderId] = {
        items: normalizeTimelineItems(row.items),
        specialColor: typeof row.special_color === "string" ? row.special_color : null,
      };
    });
    setTrackingMetadataByOrderId(nextMetadataByOrderId);
  }, [combinedOrders]);

  useEffect(() => {
    const visibleOrderIds = new Set(
      combinedOrders.map((order) => Number(order.order_id)).filter((id) => Number.isFinite(id)),
    );

    if (visibleOrderIds.size === 0) return;

    const channel = supabase
      .channel("timeline_orders_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = payload.new as Order;
        const orderId = Number(newOrder.order_id);
        if (!visibleOrderIds.has(orderId)) return;

        setOrdersById((prev) => {
          const existingRows = prev[orderId] ?? [];
          if (existingRows.some((row) => row.name_id === newOrder.name_id)) {
            return {
              ...prev,
              [orderId]: existingRows.map((row) => (row.name_id === newOrder.name_id ? newOrder : row)),
            };
          }

          return {
            ...prev,
            [orderId]: [...existingRows, newOrder],
          };
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = payload.new as Order;
        const orderId = Number(updated.order_id);
        if (!visibleOrderIds.has(orderId)) return;

        setOrdersById((prev) => {
          const existingRows = prev[orderId] ?? [];
          if (existingRows.length === 0) {
            return {
              ...prev,
              [orderId]: [updated],
            };
          }

          return {
            ...prev,
            [orderId]: existingRows.map((row) => (row.name_id === updated.name_id ? updated : row)),
          };
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const deleted = payload.old as Partial<Order>;
        const orderId = Number(deleted.order_id);
        if (!visibleOrderIds.has(orderId)) return;

        setOrdersById((prev) => {
          const existingRows = prev[orderId] ?? [];
          return {
            ...prev,
            [orderId]: existingRows.filter((row) => row.name_id !== deleted.name_id),
          };
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Timeline orders realtime subscription failed:", status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [combinedOrders]);

  useEffect(() => {
    const applySelection = (selectionMap: Map<HTMLTableElement, DragSel>) => {
      setSelectedTimelineOrderIds(collectSelectedTimelineOrderIds(selectionMap));
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-ignore-selection='true']")) {
        dragStartPos.current = null;
        return;
      }

      const row = target.closest("tr[datatype='data']") as HTMLTableRowElement | null;
      if (!row) return;
      const table = row.closest("table") as HTMLTableElement | null;
      if (!table) return;
      const rowIndex = getTimelineRowIndex(row);
      if (rowIndex === -1) return;

      if (event.shiftKey) {
        event.preventDefault();
        clearBrowserSelection();
        document.body.classList.add("multi-select-mode");
      }

      if (!event.shiftKey) {
        dragSelections.current.clear();
        pendingDragSelections.current.clear();
      }

      dragStartPos.current = { x: event.clientX, y: event.clientY };
      pendingDragSelections.current.set(table, {
        startRow: rowIndex,
        endRow: rowIndex,
        extras: dragSelections.current.get(table)?.extras ?? new Set(),
      });
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!dragStartPos.current) return;

      const dx = Math.abs(event.clientX - dragStartPos.current.x);
      const dy = Math.abs(event.clientY - dragStartPos.current.y);
      if ((dx > draggingThreshold || dy > draggingThreshold) && !dragging) {
        if (!event.shiftKey) return;
        event.preventDefault();
        clearBrowserSelection();
        document.body.classList.add("multi-select-mode", "is-dragging");
        document.body.style.cursor = "grabbing";
        setDragging(true);
      }

      if (!dragging) return;
      const target = event.target as HTMLElement;
      const row = target.closest("tr[datatype='data']") as HTMLTableRowElement | null;
      if (!row) return;
      const table = row.closest("table") as HTMLTableElement | null;
      if (!table) return;
      const rowIndex = getTimelineRowIndex(row);
      if (rowIndex === -1) return;

      const prev = pendingDragSelections.current.get(table);
      pendingDragSelections.current.set(table, {
        startRow: prev?.startRow ?? rowIndex,
        endRow: rowIndex,
        extras: prev?.extras ?? new Set(),
      });
      applySelection(pendingDragSelections.current);
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      document.body.style.cursor = "";
      document.body.classList.remove("is-dragging");

      if (target.closest("[data-ignore-selection='true']")) {
        if (dragging) {
          dragSelections.current = new Map(pendingDragSelections.current);
          applySelection(dragSelections.current);
        }
        pendingDragSelections.current.clear();
        dragStartPos.current = null;
        setDragging(false);
        return;
      }

      if (dragging) {
        dragSelections.current = new Map(pendingDragSelections.current);
        applySelection(dragSelections.current);
      } else {
        const row = target.closest("tr[datatype='data']") as HTMLTableRowElement | null;
        const table = row?.closest("table") as HTMLTableElement | null;
        const rowIndex = row ? getTimelineRowIndex(row) : -1;

        if (!row || !table || rowIndex === -1) {
          if (!event.shiftKey) {
            dragSelections.current.clear();
            setSelectedTimelineOrderIds(new Set());
          }
        } else if (event.shiftKey) {
          const prev = dragSelections.current.get(table);
          const next: DragSel = prev
            ? { ...prev, extras: new Set(prev.extras ?? []) }
            : { startRow: rowIndex, endRow: rowIndex, extras: new Set<number>() };

          if (next.extras?.has(rowIndex)) next.extras.delete(rowIndex);
          else next.extras?.add(rowIndex);
          dragSelections.current.set(table, next);
          applySelection(dragSelections.current);
        } else {
          dragSelections.current.clear();
          dragSelections.current.set(table, { startRow: rowIndex, endRow: rowIndex, extras: new Set() });
          applySelection(dragSelections.current);
        }
      }

      pendingDragSelections.current.clear();
      dragStartPos.current = null;
      setDragging(false);
    };

    const onSelectStart = (event: Event) => {
      if (!document.body.classList.contains("multi-select-mode") || isEditableElement(event.target)) return;
      event.preventDefault();
      clearBrowserSelection();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;
      document.body.classList.remove("multi-select-mode", "is-dragging");
      document.body.style.cursor = "";
      clearBrowserSelection();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectstart", onSelectStart);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      document.body.style.cursor = "";
      document.body.classList.remove("multi-select-mode", "is-dragging");
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectstart", onSelectStart);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dragging]);

  // const [user, setUser] = useState<string>("Guest");
  // const clientUser = supabase.auth.getUser();

  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data }) => {
  //     setUser(data.user?.email ?? "Guest");
  //   });
  // }, [user]);

  if (supabase === null) {
    console.error("Supabase client is null");
    redirect("/database/login");
    return null; // or handle the error as needed
  }

  useEffect(() => {
    let cancelled = false;

    const compareNullableTime = (a: number | null, b: number | null): number => {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    };

    const shippingMethodOrder = (method?: string | null) => {
      const m = (method ?? "").toLowerCase();
      if (m === "express") return 0;
      if (m === "rush_shipping") return 1;
      if (m === "standard") return 2;
      return 3;
    };

    const sortAllOrders = (orders: TimelineOrder[]) => {
      return [...orders].sort((a, b) => {
        const shipCmp = compareNullableTime(toTimelineTime(a.ship_date), toTimelineTime(b.ship_date));
        if (shipCmp !== 0) return shipCmp;

        const providedDateCmp = compareNullableTime(toTimelineTime(a.provided_date), toTimelineTime(b.provided_date));
        if (providedDateCmp !== 0) return providedDateCmp;

        return shippingMethodOrder(a.shipping_method) - shippingMethodOrder(b.shipping_method);
      });
    };

    const fetchTrackingTimelineOrders = () => {
      const oldestShipDate = addDays(getTimelineDayStart(new Date()), -TRACKING_LOOKBACK_DAYS);

      supabase
        .from("tracking_orders")
        .select("*")
        .gte("ship_date", format(oldestShipDate, "yyyy-MM-dd"))
        .order("ship_date", { ascending: false })
        .then(({ data, error }) => {
          if (cancelled) return;

          if (error) {
            console.error("Error fetching tracking timeline orders:", error);
            setCombinedOrders([]);
            return;
          }

          const nextOrders = sortAllOrders(
            ((data ?? []) as TimelineOrder[]).filter((order) => shouldParseTrackingOrder(order, oldestShipDate)),
          );

          setCombinedOrders(nextOrders);
        });
    };

    fetchTrackingTimelineOrders();

    const channel = supabase
      .channel("tracking_timeline_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_orders" }, () => {
        fetchTrackingTimelineOrders();
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Tracking timeline realtime subscription failed:", status);
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setRefreshDisabled(false);
    setRefreshHint("Ready");

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const HEADER_COLS = TIMELINE_COLUMNS.length;

  // const handleClick = (orderId: string | number) => {
  //   navigator.clipboard.writeText(String(orderId));
  //   // alert(`Double clicked on Order ID: ${orderId}`);
  //   toast("Copied to clipboard", {
  //     description: `The order ${orderId} has been copied to clipboard.`,
  //   });
  //   // await new Promise((resolve) => setTimeout(resolve, 1000));
  // };

  const visibleTimelineOrders = combinedOrders.filter((order) => {
    if (isTimelineTicketSolved(order)) return showShippedOrders && isTimelineOrderShipped(order);
    return isTimelineOrderActive(order);
  });

  const isCurrentWeekView = areTimelineDateRangesEqual(selectedDateRange, getDefaultTimelineDateRange());
  const pastDueOrders = visibleTimelineOrders.filter(
    (order) => order.ship_date && getTimelineDateStatus(order.ship_date, new Date()) === "past",
  );
  const upcomingOrders = visibleTimelineOrders.filter(
    (order) => !!order.ship_date && isTimelineDateWithinRange(order.ship_date, selectedDateRange),
  );
  const upcomingOrdersByDay = upcomingOrders.reduce<Record<string, TimelineOrder[]>>((groups, order) => {
    const dayKey = getTimelineDayKey(order.ship_date);
    if (!dayKey) return groups;
    groups[dayKey] = [...(groups[dayKey] ?? []), order];
    return groups;
  }, {});
  const upcomingDayKeys = Object.keys(upcomingOrdersByDay).sort();
  const currentDateRangeLabel = formatTimelineDateRange(selectedDateRange);

  const renderTimelineTable = (title: string, orders: TimelineOrder[], emptyMessage: string) => (
    <section className="flex flex-col gap-2">
      <h2 className="font-bold text-lg">
        {title} ({orders.length})
      </h2>
      <div className="w-full overflow-x-auto">
        <Table className="mb-5 w-full min-w-[1056px] table-fixed">
          <colgroup>
            {TIMELINE_COLUMNS.map((column) => (
              <col key={column.label} style={{ width: column.width, minWidth: column.minWidth }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className={TIMELINE_HEADER_ROW_CLASS}>
              {TIMELINE_COLUMNS.map((column) => (
                <TableHead
                  key={column.label}
                  className={TIMELINE_HEAD_CLASS}
                  style={{ width: column.width, minWidth: column.minWidth }}
                >
                  {column.label.toUpperCase()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="py-5">
          {orders.length === 0 && (
            <TableRow className={`${TIMELINE_ROW_CLASS} bg-gray-50 hover:bg-gray-50 h-6`}>
              <TableCell colSpan={HEADER_COLS} className="px-3 py-2 text-xs font-medium text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {orders.map((order) => {
            const orderIdNum = Number(order.order_id);
            const rows = ordersById[orderIdNum] ?? [];
            const trackingMetadata = trackingMetadataByOrderId[orderIdNum];
            const metadataItems = trackingMetadata?.items ?? [];
            const orderItems: TimelineItem[] = rows.map((row, index) => ({
              FileName: row.name_id,
              Status: row.production_status ?? undefined,
              Material: row.material ?? undefined,
              Shape: row.shape ?? undefined,
              Notes: row.notes ?? undefined,
              itemIndex: index + 1,
            }));
            const items = orderItems.length > 0 ? orderItems : metadataItems;
            const hasRows = !ordersLoading && rows.length > 0;
            const hasCreatives = items.length > 0;
            const dueDateStatus = order.ship_date ? getTimelineDateStatus(order.ship_date, new Date()) : "future";
            const dueDateRowClass =
              dueDateStatus === "past"
                ? "bg-red-200 hover:bg-red-200"
                : dueDateStatus === "today"
                ? "bg-yellow-100 hover:bg-yellow-100"
                : "bg-gray-200 hover:bg-gray-200";
            const notesSummary = hasRows ? getTimelineNotesSummary(rows) : "-";
            const notesByNameId = new Map(rows.map((row) => [row.name_id, row.notes?.trim() || "-"]));
            const isOpen = openIds.has(orderIdNum);
            const creativeSummary = getCreativeSummary(items);
            const lowerStatus = getLowerTimelineStatus(items, order.current_status);
            const statusSummary = formatTimelineItemValue(lowerStatus);
            const productionWarning = getTimelineProductionWarning(lowerStatus, order.ship_date);
            const hasProductionWarning = productionWarning !== "normal";
            const statusTitle = hasProductionWarning ? `${statusSummary} - Production warning` : statusSummary;
            const hasPendingStatusColorOverride = Object.prototype.hasOwnProperty.call(
              statusColorOverridesByOrderId,
              orderIdNum,
            );
            const specialColor = hasPendingStatusColorOverride
              ? statusColorOverridesByOrderId[orderIdNum]
              : trackingMetadata?.specialColor;
            const shouldColorOrderNumberCell = isOrderNumberSpecialColor(specialColor);
            const statusCellBackground = getTimelineStatusCellBackground(
              items,
              shouldColorOrderNumberCell ? undefined : specialColor,
            );
            const orderNumberCellBackground = shouldColorOrderNumberCell ? specialColor ?? undefined : undefined;
            const materialSummary = getMixedSummary(items, "Material");
            const shapeSummary = getMixedSummary(items, "Shape");
            const isSelected = selectedTimelineOrderIds.has(orderIdNum);
            const isShipped = isTimelineOrderShipped(order);

            return (
              <React.Fragment key={`due-group-${orderIdNum}`}>
                <TableRow
                  datatype="data"
                  data-order-id={orderIdNum}
                  className={`${TIMELINE_ROW_CLASS} ${dueDateRowClass} h-6 ${
                    isSelected ? "bg-blue-100 hover:bg-blue-100" : ""
                  } ${isShipped ? "text-gray-500" : ""}`}
                >
                  <TableCell className="px-1 py-1 text-center align-middle whitespace-nowrap">
                    <Button
                      data-ignore-selection="true"
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!hasCreatives}
                      aria-label={`${isOpen ? "Hide" : "Show"} creatives for order ${orderIdNum || "unknown"}`}
                      className={`h-6 w-6 p-0 hover:bg-white/40 disabled:cursor-not-allowed disabled:opacity-40 ${
                        isShipped ? "text-gray-500" : "text-black"
                      }`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!hasCreatives) return;
                        toggleOpen(orderIdNum, !isOpen);
                      }}
                    >
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell
                    className={`${TIMELINE_PRIORITY_CELL_CLASS} ${orderNumberCellBackground ? "text-white" : ""}`}
                    style={{ background: orderNumberCellBackground }}
                  >
                    {orderIdNum ? (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-ignore-selection="true"
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={`flex h-6 max-w-full items-center gap-1 px-2 text-xs font-bold ${
                                orderNumberCellBackground ? "text-white hover:bg-black/10" : "hover:bg-white/50"
                              }`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                window.open(getZendeskTicketUrl(orderIdNum), "_blank", "noopener,noreferrer");
                              }}
                            >
                              <span>{orderIdNum}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">View on Zendesk</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span>—</span>
                    )}
                  </TableCell>
                  <TableCell className={TIMELINE_PRIORITY_CELL_CLASS}>
                    {formatTimelineMonthDay(order.ship_date)}
                  </TableCell>
                  <TableCell className={TIMELINE_PRIORITY_CELL_CLASS}>
                    {formatTimelineMonthDay(order.provided_date)}
                  </TableCell>
                  <TableCell className={TIMELINE_CELL_CLASS}>
                    {formatTimelineItemValue(order.shipping_method ?? undefined)}
                  </TableCell>
                  <TableCell className={TIMELINE_CELL_CLASS}>
                    {creativeSummary}
                  </TableCell>
                  <TableCell
                    className={`${TIMELINE_CELL_CLASS} ${getTimelineProductionWarningClassName(productionWarning)}`}
                    title={statusTitle}
                    style={{ background: statusCellBackground }}
                  >
                    {hasProductionWarning ? `${statusSummary} ⚠` : statusSummary}
                  </TableCell>
                  <TableCell className={TIMELINE_CELL_CLASS}>
                    {materialSummary}
                  </TableCell>
                  <TableCell className={TIMELINE_CELL_CLASS}>
                    {shapeSummary}
                  </TableCell>
                  <TableCell className={TIMELINE_NOTES_CELL_CLASS} title={notesSummary}>
                    {notesSummary}
                  </TableCell>
                  <TableCell className="px-1 py-1 text-center align-middle" data-ignore-selection="true">
                    <Checkbox
                      checked={isShipped}
                      disabled={ordersLoading || shipOrderInFlightId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onCheckedChange={(checked) => {
                        if (checked !== true) return;
                        void handleShipTimelineOrder(orderIdNum);
                      }}
                    />
                  </TableCell>
                </TableRow>
                {hasCreatives && isOpen &&
                  items.map((item, index) => {
                    const creativeName = item.FileName || item.Title || "-";
                    const sourceRow = item.FileName
                      ? rows.find((row) => row.name_id === item.FileName)
                      : rows[index];
                    const itemNotes = sourceRow?.notes ?? item.Notes ?? notesByNameId.get(item.FileName ?? "") ?? "";

                    return (
                      <TableRow
                        key={`${orderIdNum}-${item.itemIndex ?? index}-${item.FileName ?? item.Title ?? "creative"}`}
                        className={`${TIMELINE_ROW_CLASS} bg-gray-50 hover:bg-gray-50 h-6`}
                      >
                        <TableCell className="px-1 py-1 align-middle whitespace-nowrap" />
                        <TableCell
                          className={`${TIMELINE_PRIORITY_CELL_CLASS} ${orderNumberCellBackground ? "text-white" : ""}`}
                          style={{ background: orderNumberCellBackground }}
                        >
                          {orderIdNum || "—"}
                        </TableCell>
                        <TableCell className={TIMELINE_PRIORITY_CELL_CLASS}>
                          {formatTimelineMonthDay(order.ship_date)}
                        </TableCell>
                        <TableCell className={TIMELINE_PRIORITY_CELL_CLASS}>
                          {formatTimelineMonthDay(order.provided_date)}
                        </TableCell>
                        <TableCell className={TIMELINE_CELL_CLASS}>
                          {formatTimelineItemValue(order.shipping_method ?? undefined)}
                        </TableCell>
                        <TableCell className={TIMELINE_CELL_CLASS} title={creativeName}>
                          {formatCreativeName(item.FileName, item.Title)}
                        </TableCell>
                        <TableCell
                          className={TIMELINE_CELL_CLASS}
                          title={item.Status ?? "-"}
                          style={{ background: statusCellBackground }}
                        >
                          {formatTimelineItemValue(item.Status)}
                        </TableCell>
                        <TableCell className={TIMELINE_CELL_CLASS}>{formatTimelineItemValue(item.Material)}</TableCell>
                        <TableCell className={TIMELINE_CELL_CLASS}>{formatTimelineItemValue(item.Shape)}</TableCell>
                        <TableCell
                          className={TIMELINE_NOTES_CELL_CLASS}
                          title={itemNotes || "-"}
                          data-ignore-selection="true"
                        >
                          {sourceRow ? (
                            <TimelineNoteInput
                              note={itemNotes}
                              onCommit={(value) => {
                                void handleTimelineNoteChange(sourceRow, value);
                              }}
                            />
                          ) : (
                            itemNotes || "-"
                          )}
                        </TableCell>
                        <TableCell className="px-1 py-1 align-middle" />
                      </TableRow>
                    );
                  })}
              </React.Fragment>
            );
          })}
          </TableBody>
        </Table>
      </div>
    </section>
  );

  // console.log("Timeline Orders:", orders);

  // console.log("Due Orders:", dueOrders);
  // console.log("Future Orders:", futureOrders);

  // console.log(orders);
  // How do we get the last updated thing, maybe we keep just an order
  return (
    <>
      <Toaster theme="dark" richColors={true} />
      <Dialog open={cooldownOpen} onOpenChange={setCooldownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Locked</DialogTitle>
            <DialogDescription>{cooldownMessage}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={openTabsDialogOpen} onOpenChange={setOpenTabsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Orders</DialogTitle>
            <DialogDescription>
              You're about to open {pendingOpenOrderIds.length} orders on new tabs
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenTabsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                openZendeskOrderTabs(pendingOpenOrderIds);
                setOpenTabsDialogOpen(false);
                setPendingOpenOrderIds([]);
              }}
            >
              Open Tabs
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="p-2 pt-10 w-[96%] max-w-none flex flex-col gap-2">
        <h1 className="font-bold text-5xl "> Daily List </h1>
        <p className="text-sm font-medium text-zinc-700">Current range: {currentDateRangeLabel}</p>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <span className="relative h-4 w-4">
            <span className="absolute inset-0 rounded-full bg-[#76C043]" />
            <span className="active-pulse-ring absolute inset-0 rounded-full border-2 border-[#76C043]" />
          </span>
          <span>Realtime status: ACTIVE</span>
        </div>
        <div className="flex w-full items-center justify-end gap-2">
          <div className="flex gap-2">
            <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium">
              <Checkbox
                checked={showShippedOrders}
                onCheckedChange={(checked) => setShowShippedOrders(checked === true)}
              />
              <span>Show shipped orders</span>
            </label>

            {/* <Popover
              open={datePickerOpen}
              onOpenChange={(open) => {
                setDatePickerOpen(open);
                if (open) setPendingSelectedDateRange(selectedDateRange);
              }}
            >
              <PopoverTrigger asChild>
                <Button type="button" variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatTimelineDateRange(selectedDateRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={pendingSelectedDateRange?.from}
                  selected={pendingSelectedDateRange}
                  onSelect={setPendingSelectedDateRange}
                  numberOfMonths={2}
                />
                <div className="flex items-center justify-end gap-2 border-t p-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDatePickerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleConfirmSelectedDate}>
                    Confirm
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              type="button"
              variant={isCurrentWeekView ? "secondary" : "ghost"}
              className={isCurrentWeekView ? "border border-gray-400 font-semibold" : ""}
              onClick={handleClearSelectedDate}
            >
              {isCurrentWeekView ? "Current week" : "Clear"}
            </Button>
             */}
          </div>
        </div>
        {renderTimelineTable("Past Due", pastDueOrders, "No past due orders.")}
        {upcomingDayKeys.length === 0
          ? renderTimelineTable(
              `Orders - ${formatTimelineDateRange(selectedDateRange)}`,
              [],
              "No orders in this date range.",
            )
          : upcomingDayKeys.map((dayKey) => (
              <React.Fragment key={dayKey}>
                {renderTimelineTable(
                  getTimelineTableTitleDate(dayKey),
                  upcomingOrdersByDay[dayKey],
                  "No upcoming orders.",
                )}
              </React.Fragment>
            ))}
      </section>
      {selectedTimelineOrderIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-gray-200 shadow-lg" data-ignore-selection="true">
          <div className="flex h-14 w-full items-center gap-3 px-4">
            <div className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">Selected: {selectedTimelineOrderIds.size}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {STATUS_COLOR_OPTIONS.map((color) => (
                <Button
                  key={color.value}
                  type="button"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full border border-gray-500 hover:opacity-80"
                  style={{ backgroundColor: color.value }}
                  aria-label={`Set ${isOrderNumberSpecialColor(color.value) ? "order number" : "status"} cell color ${color.label}`}
                  onClick={() => handleStatusColorSelect(color.value)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full bg-white hover:bg-gray-100"
                aria-label="Clear status cell color"
                onClick={() => handleStatusColorSelect(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="default"
              className="flex h-8 shrink-0 items-center gap-2 rounded-full px-3"
              aria-label="View selected orders"
              onClick={handleOpenSelectedOrders}
            >
              <Eye className="h-4 w-4 shrink-0" />
              <span>View On Zendesk</span>
            </Button>
          </div>
        </div>
      )}
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
    </>
  );
}

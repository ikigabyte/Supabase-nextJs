
'use client'

import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";
import { assignKeyType } from "./orderKeyAssigner";


// function primarySort(a: Order, b: Order) {
//   // Group by order_id
//   if (a.order_id !== b.order_id) return a.order_id - b.order_id;
//   // Within group, by dash-number
//   const aDash = extractDashNumber(a.name_id);
//   const bDash = extractDashNumber(b.name_id);
//   return aDash - bDash;
// }

// function secondarySort(a: Order, b: Order) {
//   // Just due date
//   const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
//   return dateDiff;
// }


// function insertedSort(a: Order, b: Order) {
//   const aDate = a.inserted_date ? new Date(a.inserted_date).getTime() : 0;
//   const bDate = b.inserted_date ? new Date(b.inserted_date).getTime() : 0;
//   return aDate - bDate;
// }


function extractDashNumber(name: string): number {
  const match = name.match(/-(\d+)-/);
  return match ? parseInt(match[1], 10) : Infinity; // no dash goes to bottom
}



function parsePgTimestamptzToMs(ts?: string | null): number {
  if (!ts) return NaN;

  // "2025-12-18 20:30:41.17918+00"
  const [d, t] = String(ts).split(" ");
  if (!t) {
    const v = Date.parse(ts);
    return Number.isFinite(v) ? v : NaN;
  }

  const m = t.match(/^(\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})(\d{2})?$/);
  if (m) {
    const [, time, hh, mm] = m;
    const iso = `${d}T${time}${hh}:${mm ?? "00"}`;
    const v = Date.parse(iso);
    return Number.isFinite(v) ? v : NaN;
  }

  const v = Date.parse(`${d}T${t}`);
  return Number.isFinite(v) ? v : NaN;
}



function dueMs(v?: string | null): number {
  // due_date like "2025-12-24" parses fine in JS
  const ms = v ? Date.parse(v) : NaN;
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

export function groupOrdersByOrderType(orderType: OrderTypes, orders: Order[]) {
  const filtered = orders.filter((o) => o.production_status === orderType);

  // 1) ticket-level earliest inserted date (per order_id)
  const ticketInserted = new Map<number, number>();
  for (const o of filtered) {
    const ms = parsePgTimestamptzToMs(o.inserted_date);
    if (!Number.isFinite(ms)) continue;
    const prev = ticketInserted.get(o.order_id);
    if (prev == null || ms < prev) ticketInserted.set(o.order_id, ms);
  }

  // 2) ticket sequence tie-breaker that does NOT depend on numeric order_id
  // This preserves a stable, deterministic order when two tickets have same due + same inserted.
  const ticketSeq = new Map<number, number>();
  let seq = 0;

  const fullySorted = filtered.slice().sort((a, b) => {
    // A) due date asc
    const da = dueMs(a.due_date);
    const db = dueMs(b.due_date);
    if (da !== db) return da - db;

    // B) ticket inserted asc (later inserted goes to bottom)
    const ta = ticketInserted.get(a.order_id) ?? Number.POSITIVE_INFINITY;
    const tb = ticketInserted.get(b.order_id) ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;

    // C) keep tickets grouped without using numeric order_id ordering
    if (a.order_id !== b.order_id) {
      if (!ticketSeq.has(a.order_id)) ticketSeq.set(a.order_id, seq++);
      if (!ticketSeq.has(b.order_id)) ticketSeq.set(b.order_id, seq++);
      return (ticketSeq.get(a.order_id) ?? 0) - (ticketSeq.get(b.order_id) ?? 0);
    }

    // D) within ticket: dash number
    const ad = extractDashNumber(a.name_id);
    const bd = extractDashNumber(b.name_id);
    if (ad !== bd) return ad - bd;

    // E) within ticket tie-break: row inserted_date asc
    const ia = parsePgTimestamptzToMs(a.inserted_date);
    const ib = parsePgTimestamptzToMs(b.inserted_date);
    if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib;

    return 0;
  });

  const grouped: Record<string, Order[]> = {};
  for (const order of fullySorted) {
    const rawKey = assignKeyType(order, orderType);
    if (!rawKey) continue;
    const key = String(rawKey);
    (grouped[key] ??= []).push(order);
  }

  return grouped;
}


// export function groupOrdersByFakeType(orderType : OrderTypes, orders: Order[], fakeOrder: Order | null, keyType?: string) {
//   // Insert fakeOrder in the correct section if present
//   let extendedOrders = orders.slice(); // Always work with a copy

//   if (fakeOrder != null) {
//     // Assign the group key for the fake order (so assignKeyType will work below)
//     fakeOrder.production_status = orderType;
//     extendedOrders.push(fakeOrder);
//   }

//   // Filter to just the orders for this type
//   const filtered = extendedOrders.filter((order) => order.production_status === orderType);

//   // First sort: by order_id, then dash-number
//   const byGroup = filtered.slice().sort(primarySort);

//   // Second sort: by due_date (stable sort)
//   const fullySorted = byGroup.slice().sort(secondarySort);

//   // Now group by assignKeyType
//   const grouped : any = {};
//   fullySorted.forEach((order) => {
//     const rawKey = assignKeyType(order, orderType);
//     if (rawKey == null || rawKey === "") return;
//     if (keyType && !rawKey.startsWith(keyType)) return; // Filter by keyType if provided
//     const key = String(rawKey);
//     if (!grouped[key]) grouped[key] = [];
//     grouped[key].push({
//       name_id: order.name_id,
//       order_id: order.order_id,
//       color: order.color,
//       date: order.due_date,
//     });
//   });

//   return grouped;
// }

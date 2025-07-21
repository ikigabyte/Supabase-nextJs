import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";
import { assignKeyType } from "./orderKeyAssigner";

function extractDashNumber(name: string): number {
  const match = name.match(/-(\d+)-/);
  return match ? parseInt(match[1], 10) : Infinity; // no dash goes to bottom
}

function primarySort(a: Order, b: Order) {
  // Group by order_id
  if (a.order_id !== b.order_id) return a.order_id - b.order_id;
  // Within group, by dash-number
  const aDash = extractDashNumber(a.name_id);
  const bDash = extractDashNumber(b.name_id);
  return aDash - bDash;
}

function secondarySort(a: Order, b: Order) {
  // Just due date
  const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  return dateDiff;
}

export function groupOrdersByOrderType(orderType: OrderTypes, orders: Order[]) {
  // Filter to just the orders for this type
  const filtered = orders.filter((order) => order.production_status === orderType);

  // First sort: by order_id, then dash-number
  const byGroup = filtered.slice().sort(primarySort);

  // Second sort: by due_date (this is a stable sort, so order_id and dash-number order are kept within ties)
  const fullySorted = byGroup.slice().sort(secondarySort);

  // Now group by order_id
  const grouped: Record<string, Order[]> = {};
  fullySorted.forEach((order) => {
    const rawKey = assignKeyType(order, orderType);
    if (rawKey == null || rawKey === "") return;
    const key = String(rawKey);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(order);
  });

  return grouped;
}
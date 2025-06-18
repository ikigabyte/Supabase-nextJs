import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";
import { assignKeyType } from "./orderKeyAssigner";

export function groupOrdersByOrderType(orderType: OrderTypes, orders: Order[]) {
  const grouped: Record<string, Order[]> = {};
  orders.forEach((order) => {
    // console.log("Order: ", order);
    if (order.production_status !== orderType) {
      // console.log("Order does not match orderType: ", order);
      return;
    }
    const rawKey = assignKeyType(order, orderType);
    if (rawKey == null || rawKey === '') {
      console.warn("Order has no valid grouping key: ", order);
      // Skip orders without a valid grouping key
      return;
    }
    const key = String(rawKey);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(order);
  });
  // console.log("Grouped Orders: ", grouped);
  return grouped;
}

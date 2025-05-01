import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";
import { assignKeyType } from "./orderKeyAssigner";

// type isTileOrRegular = string | number;

export function groupOrdersByOrderType(orderType: OrderTypes, orders: Order[]) {
  const grouped: Record<string, Order[]> = {};
  orders.forEach((order) => {
    // console.log("Order: ", order);
    if (order.production_status !== orderType) {
      // console.log("Order does not match orderType: ", order);
      return;
    }
    const key = assignKeyType(order, orderType);
    if (key) {
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(order);
    } else{
      console.error("Key not found for order: ", order);
    }
  });
  // console.log("Grouped Orders: ", grouped);
  return grouped;
}

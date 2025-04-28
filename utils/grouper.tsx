import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";
import { assignKeyType } from "./orderKeyAssigner";

// type isTileOrRegular = string | number;

export function groupOrdersByOrderType(orderType: OrderTypes, orders: Order[]) {
  const grouped: Record<string, Order[]> = {};
  // if (orderType === "ToPrint") {
  //   // Define categories for "toPrint" order type
  //   const categories = ["White", "Holographic", "Clear"];
    
  //   // Collect remaining orders
   
  // } else {
  //   // Default grouping logic for other order types
  //   // laminationGroups.forEach((lam) => {
  //   //   grouped[lam] = orders.filter((o) => o.lamination === lam);
  //   // });

  //   // Collect remaining orders
  //   // const others = orders.filter((o) => !laminationGroups.includes(o.lamination ?? ""));
  //   // if (others.length) {
  //   //   grouped["Others"] = others;
  //   // }
  // }
  orders.forEach((order) => {
    // console.log(`Lamination: ${order.lamination}, Material: ${order.material}, Quantity: ${order.quantity}`);
    const key = assignKeyType(order, orderType);
    // console.log(`Key: ${key}`);
    if (key) {
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(order);
    }
  });
  // console.log("Grouped Orders: ", grouped);
  return grouped;
}

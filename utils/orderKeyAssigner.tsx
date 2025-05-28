import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";
// import { orderKeys } from "./orderKeyAssigner";

export const orderKeys: Record<OrderTypes, string[]> = {
  print: [
    "special-regular",
    "rush-regular",
    "white-gloss-regular",
    "white-gloss-tiles",
    "white-gloss-promo",
    "white-matte-regular",
    "white-matte-tiles",
    "white-matte-promo",
    "holographic-gloss-regular",
    "holographic-gloss-tiles",
    "holographic-gloss-promo",
    "holographic-matte-regular",
    "holographic-matte-tiles",
    "holographic-matte-promo",
    "clear-gloss-regular",
    "clear-gloss-tiles",
    "clear-gloss-promo",
    "clear-matte-regular",
    "clear-matte-tiles",
    "clear-matte-promo",
    "glitter-gloss-regular",
    "glitter-gloss-tiles",
    "glitter-gloss-promo",
    "glitter-matte-regular",
    "glitter-matte-tiles",
    "glitter-matte-promo",
    "mag20pt-gloss-regular",
    "mag20pt-gloss-tiles",
    "mag20pt-gloss-promo",
    "mag20pt-matte-regular",
    "mag20pt-matte-tiles",
    "mag20pt-matte-promo",
    "mag30pt-gloss-regular",
    "mag30pt-gloss-tiles",
    "mag30pt-matte-regular",
    "mag30pt-matte-tiles",
    "cling-clear-regular",
    "cling-clear-tiles",
    "cling-white-regular",
    "cling-white-tiles",
    "reflective-gloss-regular",
    "reflective-gloss-tiles",
    "reflective-gloss-promo",
    "reflective-matte-regular",
    "reflective-matte-tiles",
    "reflective-matte-promo",
    "arlon-gloss-regular",
    "arlon-gloss-tiles",
    "arlon-matte-regular",
    "arlon-matte-tiles",
    "floor-hard-regular",
    "floor-hard-tiles",
    "floor-carpet-regular",
    "floor-carpet-tiles",
    "roll-gloss-tiles",
    "roll-gloss-promo",
    "roll-matte-tiles",
    "roll-matte-promo",
    
  ],
  cut: ["regular", "roll"],
  ship: ["regular", "roll"],
  pack: ["regular", "roll"],
  // completed: [], // add this to satisfy the OrderTypes enum
};

export function assignKeyType(order: Order, orderType: OrderTypes): string | null {
  const keys = orderKeys[orderType];
  if (!keys) return null;

  // 1) Promo takes priority

  // 1a) Rush orders for print take highest priority
  if (orderType === "print") {
    if (order.orderType === 2) {
      const specialKey = keys.find((k) => k.startsWith("special"));
      return specialKey || null;
    }
    // console.log("Rush", order.rush);
    if (order.rush === true) {
      // console.log("Rush detected");
      const rushKey = keys.find((k) => k.startsWith("rush"));
      if (rushKey) return rushKey;
    }

    // Convert for promo and order type here / also change the way they're coming in from the log
    if (order.orderType === 1) {
      // console.log("Promo detected");
      const promoKey = keys.find((k) => k.endsWith("-promo") && k.startsWith(`${order.material}-${order.lamination}`));
      if (promoKey) return promoKey;
    }

    const suffix = order.quantity && order.quantity.includes("-") ? "tiles" : "regular";
    const key = `${order.material}-${order.lamination}-${suffix}`;
    return keys.find((k) => k === key) || null;
  }

  // 3) For other order types (cut, ship, pack)
  const simpleKey = order.material === "roll" ? "roll" : "regular";
  return keys.find((k) => k === simpleKey) || null;
}

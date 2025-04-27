import { Order } from "@/types/custom";
import { OrderTypes } from "./orderTypes";

export function assignKeyType(order: Order, orderType: OrderTypes): string | undefined {
  const { lamination, material, quantity, promo } = order;

  if (["ship", "cut", "pack"].includes(orderType)) {
    return material === "roll" ? "Roll" : "Regular";
  }

  if (orderType === "print") {
    const baseMap: Record<string, Record<string, string>> = {
      white: { gloss: "white-gloss", matte: "white-matte" },
      holographic: { gloss: "holographic-gloss", matte: "holographic-matte" },
      clear: { gloss: "clear-gloss", matte: "clear-matte" },
    };

    if (material == null){
      return "other";
    }
    if (lamination == null){
      return "other";
    }
    const base = baseMap[material]?.[lamination];
    if (!base) return "other";
    const suffix = promo
      ? "promo"
      : typeof quantity === "number"
      ? "regular"
      : "tiles";
    return `${base}-${suffix}`;
  }

  return "other";
}
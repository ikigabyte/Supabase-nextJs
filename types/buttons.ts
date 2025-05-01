import { OrderTypes } from "@/utils/orderTypes"

export const getButtonCategories = (OrderType: OrderTypes) => {
  switch (OrderType) {
    case "print":
      return [
        "rush",
        "white",
        "holographic",
        "clear",
        "glitter",
        "mag20pt",
        "mag30pt",
        "cling",
        "reflective",
        "arlon",
        "floor",
        "Roll",
      ];
    case "cut":
      return ["Regular", "Roll"];
    case "pack":
      return ["Regular", "Roll"];
    case "ship":
      return ["Regular", "Roll"];
    default:
  }
};

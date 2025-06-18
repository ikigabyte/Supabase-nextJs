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
        "20ptmag",
        "30ptmag",
        "cling",
        "reflective",
        "arlon",
        "floor",
        "roll",
        "special",
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

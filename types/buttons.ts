import { OrderTypes } from "@/utils/orderTypes"

export const getButtonCategories = (OrderType: OrderTypes) => {
  switch (OrderType) {
    case "print":
      return ["white", "holographic", "clear", "mag20pt", "mag30pt", "cling", "reflective", "arlon", "Floor", "Roll",];
    case "cut":
      return ["Regular", "Roll"];
    case "pack":
      return ["Regular", "Roll"];
    case "ship":
      return ["Regular", "Roll"];
    default:
  }
};
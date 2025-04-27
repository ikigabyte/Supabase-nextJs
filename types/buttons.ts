import { OrderTypes } from "@/utils/orderTypes"

export const getButtonCategories = (OrderType: OrderTypes) => {
  switch (OrderType) {
    case "print":
      return ["White", "Holographic", "Clear", "MAG20PT", "MAG30PT", "CLING", "Reflective", "Arlon", "Floor", "Roll",];
    case "cut":
      return ["Regular", "Roll"];
    case "pack":
      return ["Regular", "Roll"];
    case "ship":
      return ["Regular", "Roll"];
    default:
  }
};
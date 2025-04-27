import { MaterialTypes } from "@/utils/materialTypes";
import { OrderTypes } from "@/utils/orderTypes"

export const getMaterialHeaders = (orderType : OrderTypes, material : string) => {
  switch (material) {
    case "white":
      return ["file-name", "shape", "lamination", "material", "quantity", "due date", "ihd date", "ihd date", "notes", "", orderType];
    case "floor":
      return ["Regular", "Roll"];
    default:
      return [];
  }
};
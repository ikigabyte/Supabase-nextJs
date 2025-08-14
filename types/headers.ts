import { OrderTypes } from "@/utils/orderTypes";
// import { BARREL_OPTIMIZATION_PREFIX } from "next/dist/shared/lib/constants";

export const getMaterialHeaders = (orderType: OrderTypes, material: string) => {
  switch (material) {
    case "white":
      return [
        "file-name",
        "shape",
        "quantity",
        "lamination",
        "material",
        "ink",
        "-",
        orderType + " date",
        "ship date",
        "shipping method",
        "notes",
        orderType,
      ];
    case "floor":
      return [
        "file-name",
        "quantity",
        "lamination",
        "material",
        "shape",
        "-",
        "-",
        orderType + " date",
        "SHIP DATE",
        "shipping method",
        "notes",
        orderType,
      ];
    case "roll":
      return [
        "file-name",
        "shape",
        "quantity",
        "material",
        "material",
        "cores",
        "print method",
        "-",
        orderType + " date",
        "shipping method",
        "notes",
        orderType,
      ];
    case "cling":
      return [
        "file-name",
        "shape",
        "quantity",
        "material",
        "product",
        "product type",
        "print method",
        "-",
        orderType + " date",
        "SHIP DATE",
        "shipping method",
        "notes",
        orderType,
      ];
    default:
      return [
        "file-name",
        "shape",
        "quantity",
        "lamination",
        "material",
        "ink",
        "print method",
        "-",
        orderType + " date",
        "shipping method",
        "notes",
        orderType,
      ];
  }
};

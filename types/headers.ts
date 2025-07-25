import { MaterialTypes } from "@/utils/materialTypes";
import { OrderTypes } from "@/utils/orderTypes";
import { BARREL_OPTIMIZATION_PREFIX } from "next/dist/shared/lib/constants";

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
        "SHIP date",
        "IHD date",
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
        "SHIP date",
        "IHD date",
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
        "SHIP date",
        "IHD date",
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
        "SHIP date",
        "IHD date",
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
        "SHIP DATE",
        "IHD DATE",
        "shipping method",
        "notes",
        orderType,
      ];
  }
};

BARREL_OPTIMIZATION_PREFIX;

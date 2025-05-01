import { MaterialTypes } from "@/utils/materialTypes";
import { OrderTypes } from "@/utils/orderTypes";
import { BARREL_OPTIMIZATION_PREFIX } from "next/dist/shared/lib/constants";

export const getMaterialHeaders = (orderType: OrderTypes, material: string) => {
  switch (material) {
    case "white":
      return [
        "file-name",
        "shape",
        "lamination",
        "material",
        "quantity",
        "ink",
        "print method",
        "SHIP date",
        "IHD date",
        "speed",
        "notes",
        orderType,
      ];
    case "floor":
      return [
        "file-name",
        "shape",
        "lamination",
        "material",
        "quantity",
        "-",
        "-",
        "SHIP date",
        "IHD date",
        "speed",
        "notes",
        orderType,
      ];
    default:
      return [
        "file-name",
        "shape",
        "lamination",
        "material",
        "quantity",
        "ink",
        "print method",
        "SHIP date",
        "IHD date",
        "speed",
        "notes",
        orderType,
      ];
  }
};

BARREL_OPTIMIZATION_PREFIX;

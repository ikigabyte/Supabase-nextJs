import { OrderTypes } from "@/utils/orderTypes";

export const getMaterialHeaders = (orderType: OrderTypes, material: string) => {
  // Example: if orderType is "pack", return special headers
  if (orderType === "ship") {
    return [
      "file-name",
      "shape",
      "quantity",
      "lamination",
      "material",
      "ink",
      "print method",
      "ship date",
      "ihd date",
      "shipping method",
      "notes",
      orderType,
    ];
  }

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
        orderType + " date",
        "SHIP DATE",
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
        orderType + " date",
        "SHIP DATE",
        "shipping method",
        "notes",
        orderType,
      ];
  }
};

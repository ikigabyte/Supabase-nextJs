

export function capitalizeFirstLetter(string: string | null) {
  if (typeof string !== "string") {
    return "-";
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
} 

export function formatDisplayShape(shape: string | null | undefined) {
  if (typeof shape !== "string") return "-";
  const baseShape = shape.split("-")[0]?.trim();
  return baseShape ? capitalizeFirstLetter(baseShape) : "-";
}

function extractFirstNumber(value: string | undefined) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

export function getDisplayQuantityBaseValue(quantity?: string | null) {
  const cleanedQuantity = (quantity ?? "").toLowerCase().replace(/qty/gi, "").trim();
  if (!cleanedQuantity) return null;

  if (cleanedQuantity.includes("tiles")) {
    const tileTextNumber = cleanedQuantity.match(/(\d+(?:\.\d+)?)\s*tiles\b/i)?.[1];
    if (tileTextNumber) return tileTextNumber;

    const parts = cleanedQuantity.split("-").map((part) => part.trim());
    const tilePartIndex = parts.findIndex((part) => part.includes("tiles"));
    if (tilePartIndex > 0) {
      return extractFirstNumber(parts[tilePartIndex - 1]);
    }
  }

  return cleanedQuantity.split("-")[0].trim();
}

export function isDisplayTileQuantity(quantity?: string | null) {
  const cleanedQuantity = (quantity ?? "").toLowerCase().replace(/qty/gi, "").trim();
  return cleanedQuantity.includes("tiles") || cleanedQuantity.includes("-");
}

export function getDisplayQuantityNumber(quantity?: string | null) {
  const quantityPart = getDisplayQuantityBaseValue(quantity);
  if (!quantityPart) return null;
  const parsed = Number(quantityPart);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDisplayQuantity(quantity?: string | null) {
  const cleanedQuantity = (quantity ?? "").toLowerCase().replace(/qty/gi, "").trim();
  if (!cleanedQuantity) return "-";

  if (isDisplayTileQuantity(quantity)) {
    const quantityPart = getDisplayQuantityBaseValue(quantity);
    return quantityPart ? `${quantityPart} Tiles` : "-";
  }

  return cleanedQuantity;
}

export const truncate = (text: string | number | undefined, maxChars: number): string => {
  const str = text?.toString() ?? "";
  return str.length > maxChars ? `${str.slice(0, maxChars)}...` : str;
};

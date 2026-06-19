

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

export function isSheetShape(shape: string | null | undefined) {
  if (typeof shape !== "string") return false;
  return shape.split("-")[0]?.trim().toLowerCase() === "sheets";
}

function extractFirstNumber(value: string | undefined) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

function extractFirstFiniteNumber(value: string | undefined) {
  const firstNumber = extractFirstNumber(value);
  if (firstNumber == null) return null;

  const number = Number(firstNumber);
  return Number.isFinite(number) ? number : null;
}

function extractTileSize(value: string | undefined) {
  const dimensionMatch = value?.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (dimensionMatch) {
    const height = Number(dimensionMatch[2]);
    return Number.isFinite(height) ? height : null;
  }

  return extractFirstFiniteNumber(value);
}

export function parseTileQuantityAndSize(rawQuantity?: string | null): { quantity: number; size: number } | null {
  const cleanedQuantity = (rawQuantity ?? "").toLowerCase().replace(/qty/gi, "").trim();
  if (!cleanedQuantity) return null;

  const parts = cleanedQuantity.split("-").map((part) => part.trim());
  if (parts.length < 3) return null;

  const tilePartIndex = parts.findIndex((part) => /\btiles?\b|\d+\s*tiles?\b/i.test(part));
  const tilePart = tilePartIndex >= 0 ? parts[tilePartIndex] : undefined;
  const tilePartQuantity = extractFirstFiniteNumber(tilePart);
  const fallbackQuantity = extractFirstFiniteNumber(parts[0]);
  const quantity = tilePartQuantity ?? fallbackQuantity;
  const size = extractTileSize(parts[parts.length - 1]);

  if (quantity == null || size == null) return null;

  return { quantity, size };
}

export function getDisplayQuantityBaseValue(quantity?: string | null) {
  const cleanedQuantity = (quantity ?? "").toLowerCase().replace(/qty/gi, "").trim();
  if (!cleanedQuantity) return null;

  if (cleanedQuantity.includes("tile")) {
    const tileTextNumber = cleanedQuantity.match(/(\d+(?:\.\d+)?)\s*tiles?\b/i)?.[1];
    if (tileTextNumber) return tileTextNumber;

    const parts = cleanedQuantity.split("-").map((part) => part.trim());
    const tilePartIndex = parts.findIndex((part) => part.includes("tile"));
    if (tilePartIndex > 0) {
      return extractFirstNumber(parts[tilePartIndex - 1]);
    }
  }

  return cleanedQuantity.split("-")[0].trim();
}

export function isDisplayTileQuantity(quantity?: string | null) {
  const cleanedQuantity = (quantity ?? "").toLowerCase().replace(/qty/gi, "").trim();
  return cleanedQuantity.includes("tile") || cleanedQuantity.includes("-");
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

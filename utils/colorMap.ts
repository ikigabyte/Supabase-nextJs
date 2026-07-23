export const materialColors: Record<string, string> = {
  rush: "red-800",
  white: "gray-800",
  glitter: "yellow-400",
  holo: "green-500",
  holographic: "green-500",
  clear: "pink-300",
  "20ptmag": "green-800",
  mag20pt: "green-800",
  "30ptmag": "blue-800",
  mag30pt: "blue-800",
  sheets: "blue-600",
  arlon: "teal-500",
  floor: "yellow-800",
  roll: "yellow-900",
  cling: "red-300",
  reflective: "green-300",
  special: "yellow-500",
};

const materialBackgroundColors: Record<string, string> = {
  clear: "#fce7f3",
  holographic: "#dcfce7",
  glitter: "#fef9c3",
};

const inkBackgroundColors: Record<string, string> = {
  metallic: "#f3e8ff",
  clear: "#fce7f3",
  white:"#ffc1fc",
  "3": "#fef08a",
  "4": "#fed7aa",
  "6": "#bbf7d0",
  "12": "#bfdbfe",
};

export const getMaterialColor = (material: string | null | undefined) => {
  if (!material) return "black";
  return materialColors[material.toLowerCase()] ?? "black";
};

export const getMaterialTextColor = (material: string | null | undefined) => {
  return `text-${getMaterialColor(material)}`;
};

export const getMaterialBackgroundColor = (material: string | null | undefined) => {
  if (!material) return "";
  return materialBackgroundColors[material.toLowerCase().trim()] ?? "";
};

export const getInkBackgroundColor = (ink: string | null | undefined) => {
  const normalized = ink?.toLowerCase().trim();
  if (!normalized) return "";
  if (normalized.includes("metallic")) return inkBackgroundColors.metallic;
  if (normalized.includes("white")) return inkBackgroundColors.white;
  return inkBackgroundColors[normalized] ?? "";
};

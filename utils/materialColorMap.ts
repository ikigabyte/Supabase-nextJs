export const materialColors: Record<string, string> = {
  rush: "red-800",
  white: "gray-800",
  glitter: "yellow-400",
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

export const getMaterialColor = (material: string | null | undefined) => {
  if (!material) return "black";
  return materialColors[material.toLowerCase()] ?? "black";
};

export const getMaterialTextColor = (material: string | null | undefined) => {
  return `text-${getMaterialColor(material)}`;
};

export const getMaterialBackgroundColor = (material: string | null | undefined) => {
  if (!material) return "";
  const color = materialColors[material.toLowerCase()];
  return color ? `bg-${color}` : "";
};

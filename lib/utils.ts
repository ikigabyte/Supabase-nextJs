import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const colorMap: Record<string, string> = {
  orange: "#ffc551ff",
  red: "#d22b2bff",
  blue: "#0074D9",
};

export const convertToSpaces = (str: string) => {
  return (
    str
      // Replace actual non-breaking space characters
      .replace(/\u00A0/g, " ")
      // Replace literal 'u00A0' sequences
      .replace(/u00A0/g, " ")
      // Replace es ed '\u00A0' sequences
      .replace(/\\u00A0/g, " ")
  );
};

// export const getCorrectUserColor = (asignee: string | undefined, assigneeColor: string | undefined) => {
//   if (!asignee) return { backgroundColor: "#ff6b16ff" }; // black as default

//   // Map color names to hex codes

//   // Use assigneeColor if provided and mapped, otherwise fallback to default red
//   const colorHex =
//     assigneeColor && colorMap[assigneeColor.toLowerCase()] ? colorMap[assigneeColor.toLowerCase()] : colorMap["red"];

//   return { backgroundColor: colorHex };
// };


export const getCorrectUserColor = (userColors: Map<string, string>, asignee: string | undefined) => {
  console.log(userColors)
  if (!asignee) return { backgroundColor: "#000000" }; // black as default
  const color = userColors.get(asignee);
  if (!color) return { backgroundColor: "#d22b2bff" };
  // If color is in "R/G/B" format, convert to rgb()
  const rgbMatch = color.match(/^(\d{1,3})\/(\d{1,3})\/(\d{1,3})$/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return { backgroundColor: `rgb(${r},${g},${b})` };
  }
  // Otherwise, assume it's a valid CSS color (hex, named, etc.)
  return { backgroundColor: color };
};



export const getNameToColor = (name: string | undefined) => {
  if (!name) return { backgroundColor: "#ff6b16ff" }; // default color

  const colorHex = colorMap[name.toLowerCase()] ?? colorMap["orange"];
  return { backgroundColor: colorHex };
};

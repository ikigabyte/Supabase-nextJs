

export function capitalizeFirstLetter(string: string | null) {
  if (typeof string !== "string") {
    return "-";
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
} 

export const truncate = (text: string | number | undefined, maxChars: number): string => {
  const str = text?.toString() ?? "";
  return str.length > maxChars ? `${str.slice(0, maxChars)}...` : str;
};

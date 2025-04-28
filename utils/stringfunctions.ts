

export function capitalizeFirstLetter(string: string) {
  if (typeof string !== "string" || string == null) {
    return "-";
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
} 

export const truncate = (text: string | number | undefined, maxChars: number): string => {
  const str = text?.toString() ?? "";
  return str.length > maxChars ? `${str.slice(0, maxChars)}...` : str;
};

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const convertToSpaces = (str: string) => {
  return (
    str
      // Replace actual non-breaking space characters
      .replace(/\u00A0/g, " ")
      // Replace literal 'u00A0' sequences
      .replace(/u00A0/g, " ")
      // Replace escaped '\u00A0' sequences
      .replace(/\\u00A0/g, " ")
  );
};

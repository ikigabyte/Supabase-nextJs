export type QuantityColorFamily = {
  label: string;
  key: string;
  variants: { number: 1 | 2 | 3; color: string }[];
};

export const quantityColorFamilies: QuantityColorFamily[] = [
  {
    label: "Blue",
    key: "B",
    variants: [
      { number: 1, color: "#cfe2f3" },
      { number: 2, color: "#a5e6f6ff" },
      { number: 3, color: "#90c5f3ff" },
    ],
  },
  {
    label: "Green",
    key: "G",
    variants: [
      { number: 1, color: "#d9ead3" },
      { number: 2, color: "#b6d7a8" },
      { number: 3, color: "#93c47d" },
    ],
  },
  {
    label: "Red",
    key: "R",
    variants: [
      { number: 1, color: "#f4cccc" },
      { number: 2, color: "#ea9999" },
      { number: 3, color: "#e06666" },
    ],
  },
  {
    label: "Orange",
    key: "O",
    variants: [
      { number: 1, color: "#fce5cd" },
      { number: 2, color: "#f9cb9c" },
      { number: 3, color: "#f6b26b" },
    ],
  },
  {
    label: "Magenta",
    key: "M",
    variants: [
      { number: 1, color: "#ead1dc" },
      { number: 2, color: "#e8b8cdff" },
      { number: 3, color: "#e39ebcff" },
    ],
  },
];

export const quantityColorOptions = quantityColorFamilies.flatMap((family) =>
  family.variants.map((variant) => ({
    label: `${family.label} ${variant.number}`,
    value: variant.color,
  })),
);

export function getQuantityColorForShortcut(shortcut: string | null): string | null {
  if (!shortcut) return null;

  const match = shortcut.toUpperCase().match(/^([BGROM])([1-3])$/);
  if (!match) return null;

  const family = quantityColorFamilies.find((item) => item.key === match[1]);
  const variant = family?.variants.find((item) => item.number === Number(match[2]));
  return variant?.color ?? null;
}

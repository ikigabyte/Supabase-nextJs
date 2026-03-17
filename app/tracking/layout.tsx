import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stickerbeat Order Tracking",
  description: "Order tracking for Stickerbeat",
};

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

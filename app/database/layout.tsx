import type { Metadata } from "next";
import AuthHeader from "@/components/auth-header";

export const metadata: Metadata = {
  title: "Stickerbeat Database",
  description: "Order tracking for Stickerbeat",
};

export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthHeader />
      <main className="flex flex-col items-center">{children}</main>
    </>
  );
}

import { GeistSans } from "geist/font/sans";
import "./globals.css";
import localFont from "next/font/local";

const archivo = localFont({
  src: "./fonts/Archivo-VariableFont_wdth,wght.ttf",
  variable: "--font-archivo",
  weight: "100 900",
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Stickerbeat Database",
  description: "Order Controller for Stickerbeat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"
        className={`${GeistSans.variable} ${archivo.variable}`}
      suppressHydrationWarning>
      <body className="sticky top-0 bg-background text-foreground">{children}</body>
    </html>
  );
}

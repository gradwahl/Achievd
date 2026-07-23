import type { Metadata } from "next";
import { productConfig } from "@/config/product";
import { DisableMiddleClickAutoscroll } from "@/components/disable-middle-click-autoscroll";
import "./globals.css";

export const metadata: Metadata = {
  title: productConfig.name,
  description:
    "A Steam achievement-hunting assistant for planning, rarity, and progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">
        <DisableMiddleClickAutoscroll />
        {children}
      </body>
    </html>
  );
}

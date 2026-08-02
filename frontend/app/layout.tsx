import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eyewear POS",
  description: "Multi-branch eyewear inventory & point of sale",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

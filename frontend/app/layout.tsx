import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:  "Chasma Pasal",
    template: "%s — Chasma Pasal",
  },
  description: "Multi-branch eyewear inventory & point of sale",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple:    "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

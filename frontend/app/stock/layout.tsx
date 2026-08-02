"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, getBranchName } from "@/lib/auth";
import clsx from "clsx";

const nav = [
  { href: "/stock/inventory", label: "Inventory" },
  { href: "/stock/inventory/new", label: "Add product" },
];

export default function StockLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // Start null so server and first client render match — populate after mount
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => {
    setBranchName(getBranchName());
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-border h-14 flex items-center px-6 gap-6 shrink-0">
        <div className="flex items-center gap-2 text-accent font-bold text-base">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="6" cy="12" r="4" /><circle cx="18" cy="12" r="4" /><path d="M10 12h4" />
          </svg>
          <span>Stock</span>
        </div>
        <nav className="flex items-center gap-1 flex-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                path === href
                  ? "bg-accent-light text-accent"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          {branchName && <span className="font-medium text-slate-700">{branchName}</span>}
          <button onClick={logout} className="hover:text-red-600 transition-colors">
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

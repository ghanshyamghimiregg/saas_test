"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, getBranchName } from "@/lib/auth";
import clsx from "clsx";

const NAV = [
  {
    href: "/stock/inventory",
    label: "Inventory",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/stock/inventory/new",
    label: "Add product",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ),
  },
];

export default function StockLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => { setBranchName(getBranchName()); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* App shell header */}
      <header className="bg-white border-b border-border h-13 flex items-center px-5 gap-0 shrink-0 sticky top-0 z-30">
        {/* Logo mark */}
        <div className="flex items-center gap-2 text-accent font-semibold text-sm mr-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
          </svg>
          <span className="tracking-tight">Stock</span>
        </div>

        {/* Code128 motif divider — the single signature element */}
        <div className="motif-bars mx-3 self-stretch py-2.5" aria-hidden="true" />

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 flex-1" aria-label="Stock navigation">
          {NAV.map(({ href, label, icon }) => {
            const active = href === "/stock/inventory"
              ? path === "/stock/inventory" || (path.startsWith("/stock/inventory/") && !path.includes("/new"))
              : path === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150",
                  active
                    ? "bg-accent-light text-accent"
                    : "text-ink-muted hover:bg-canvas hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                {icon}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Branch name + sign out */}
        <div className="flex items-center gap-4 text-xs text-ink-muted shrink-0">
          {branchName && (
            <span className="font-mono font-medium text-ink tracking-tight">{branchName}</span>
          )}
          <button
            onClick={logout}
            className="hover:text-signal-red transition-colors duration-150"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 sm:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

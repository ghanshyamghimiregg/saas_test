"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, getBranchName } from "@/lib/auth";
import clsx from "clsx";

const NAV = [
  {
    href: "/sales/pos",
    label: "Point of sale",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
      </svg>
    ),
  },
  {
    href: "/sales/history",
    label: "Sales history",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
    ),
  },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => { setBranchName(getBranchName()); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="bg-white border-b border-border h-13 flex items-center px-5 gap-0 shrink-0 sticky top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 text-accent font-semibold text-sm mr-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
          </svg>
          <span className="tracking-tight">Sales</span>
        </div>

        {/* Code128 motif divider */}
        <div className="motif-bars mx-3 self-stretch py-2.5" aria-hidden="true" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5 flex-1" aria-label="Sales navigation">
          {NAV.map(({ href, label, icon }) => {
            const active = path.startsWith(href);
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

        {/* Branch + sign out */}
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

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, getBranchName } from "@/lib/auth";
import clsx from "clsx";

const NAV = [
  {
    href:    "/stock/inventory",
    label:   "Inventory",
    section: "stock",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="4" rx="1"/>
        <rect x="2" y="10" width="20" height="4" rx="1"/>
        <rect x="2" y="17" width="20" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    href:    "/sales/pos",
    label:   "Point of sale",
    section: "sales",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
      </svg>
    ),
  },
  {
    href:    "/sales/history",
    label:   "Sales history",
    section: "sales",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
    ),
  },
];

export function BranchSidebarContent({ onClose }: { onClose?: () => void }) {
  const path = usePathname();
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => { setBranchName(getBranchName()); }, []);

  function isActive(href: string) {
    // Inventory: match /stock/inventory and any sub-routes except /new
    if (href === "/stock/inventory") {
      return path === "/stock/inventory"
        || (path.startsWith("/stock/inventory/") && !path.endsWith("/new"));
    }
    return path === href || path.startsWith(href + "/");
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Logo + branch identity */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
          </svg>
          <span className="font-semibold text-base tracking-tight text-ink">Chasma Pasal</span>
        </div>
        {branchName ? (
          <p className="text-xs font-mono font-semibold text-accent mt-2 truncate">{branchName}</p>
        ) : (
          <p className="text-2xs text-ink-faint mt-1 ml-0.5 font-medium uppercase tracking-widest">Branch</p>
        )}
        {/* Code128 motif — signature element */}
        <div className="motif-bars mt-4 h-4" aria-hidden="true" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Branch navigation">
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium",
                "transition-colors duration-150 w-full min-h-[44px]",
                active
                  ? "bg-accent-light text-accent"
                  : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={logout}
          className={clsx(
            "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium w-full min-h-[44px]",
            "text-ink-muted hover:bg-red-50 hover:text-signal-red transition-colors duration-150",
          )}
          aria-label="Sign out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

export function BranchShell({ children, contentClassName }: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden sm:flex flex-col w-56 shrink-0 bg-white border-r border-border sticky top-0 h-screen overflow-y-auto"
        aria-label="Branch sidebar"
      >
        <BranchSidebarContent />
      </aside>

      {/* ── Mobile overlay drawer ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 bg-white shadow-modal flex flex-col animate-modal-in h-full">
            <div className="flex items-center justify-end px-3 pt-3 shrink-0">
              <button
                onClick={() => setMobileOpen(false)}
                className="btn-ghost btn-xs"
                aria-label="Close navigation"
              >
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12"/>
                </svg>
              </button>
            </div>
            <BranchSidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className={clsx("flex-1 flex flex-col min-w-0", contentClassName)}>

        {/* Mobile top bar */}
        <MobileTopBar onOpen={() => setMobileOpen(true)} />

        {children}
      </div>
    </div>
  );
}

function MobileTopBar({ onOpen }: { onOpen: () => void }) {
  const [branchName, setBranchName] = useState<string | null>(null);
  useEffect(() => { setBranchName(getBranchName()); }, []);

  return (
    <header className="sm:hidden bg-white border-b border-border h-12 flex items-center px-4 shrink-0 sticky top-0 z-30">
      <button
        onClick={onOpen}
        className="btn-ghost btn-sm mr-3"
        aria-label="Open navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div className="flex items-center gap-2 text-accent font-semibold text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
        </svg>
        Chasma Pasal
      </div>
      {branchName && (
        <span className="ml-auto font-mono text-xs font-semibold text-ink truncate max-w-[130px]">
          {branchName}
        </span>
      )}
    </header>
  );
}

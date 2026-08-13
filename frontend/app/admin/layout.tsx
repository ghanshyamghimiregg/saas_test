"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import clsx from "clsx";

const NAV = [
  {
    href:  "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href:  "/admin/branches",
    label: "Branches",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href:  "/admin/config",
    label: "Configuration",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0"/>
      </svg>
    ),
  },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname();
  return (
    <div className="flex flex-col h-full w-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5 text-accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
          </svg>
          <span className="font-semibold text-base tracking-tight text-ink">Chasma Pasal</span>
        </div>
        <p className="text-2xs text-ink-faint mt-1 ml-0.5 font-medium uppercase tracking-widest">Admin</p>
        {/* Code128 motif — signature element */}
        <div className="motif-bars mt-4 h-4" aria-hidden="true" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Admin navigation">
        {NAV.map(({ href, label, icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors duration-150 w-full min-h-[44px]",
                active
                  ? "bg-accent-light text-accent"
                  : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-ink-muted hover:bg-red-50 hover:text-signal-red transition-colors duration-150 w-full min-h-[44px]"
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface">

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        className="hidden sm:flex flex-col w-56 shrink-0 bg-white border-r border-border sticky top-0 h-screen overflow-y-auto"
        aria-label="Sidebar"
      >
        <Sidebar />
      </aside>

      {/* ── Mobile overlay drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 bg-white shadow-modal flex flex-col animate-modal-in h-full">
            <div className="flex items-center justify-end px-3 pt-3">
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
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="sm:hidden bg-white border-b border-border h-12 flex items-center px-4 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-ghost btn-sm mr-3"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-2 text-accent font-semibold text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
            </svg>
            Chasma Pasal Admin
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-6 max-w-5xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

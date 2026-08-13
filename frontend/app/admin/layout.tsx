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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href:  "/admin/branches",
    label: "Branches",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href:  "/admin/config",
    label: "Configuration",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0"/>
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path    = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface">

      {/* ── Desktop header ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-border h-13 items-center px-5 gap-0 shrink-0 sticky top-0 z-30 hidden sm:flex">
        {/* Logo */}
        <div className="flex items-center gap-2 text-accent font-semibold text-sm mr-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
          </svg>
          <span className="tracking-tight">OptiStore</span>
        </div>

        {/* Code128 motif divider */}
        <div className="motif-bars mx-3 self-stretch py-2.5" aria-hidden="true" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5 flex-1" aria-label="Admin navigation">
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

        {/* Sign out */}
        <button
          onClick={logout}
          className="text-xs text-ink-muted hover:text-signal-red transition-colors duration-150"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </header>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <header className="sm:hidden bg-white border-b border-border h-13 flex items-center px-4 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2 text-accent font-semibold text-sm flex-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
          </svg>
          <span>OptiStore Admin</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="btn-ghost btn-sm"
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      {/* ── Mobile slide-out nav drawer ──────────────────────────────────── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-modal flex flex-col animate-modal-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
                </svg>
                Admin
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="btn-ghost btn-xs"
                aria-label="Close navigation"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12"/>
                </svg>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1" aria-label="Admin navigation">
              {NAV.map(({ href, label, icon }) => {
                const active = path.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileNavOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 w-full",
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
            <div className="p-4 border-t border-border">
              <button
                onClick={logout}
                className="btn-ghost btn-sm w-full text-signal-red hover:bg-red-50 justify-start gap-2"
                aria-label="Sign out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-5 sm:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

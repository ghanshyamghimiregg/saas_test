"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import clsx from "clsx";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/config", label: "Configuration" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-border h-14 flex items-center px-6 gap-6 shrink-0">
        <div className="flex items-center gap-2 text-accent font-bold text-base">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Admin
        </div>
        <nav className="flex items-center gap-1 flex-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                path.startsWith(href)
                  ? "bg-accent-light text-accent"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600 transition-colors">
          Sign out
        </button>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

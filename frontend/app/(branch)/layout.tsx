"use client";
/**
 * Single shared layout for all branch pages: /stock/* and /sales/*
 *
 * Must be "use client" — BranchShell holds sidebar open/close state.
 * Marking this as a client component ensures React keeps this layout
 * instance alive across navigations between /stock/* and /sales/*,
 * giving seamless page switching without sidebar remount.
 */
import { BranchShell } from "@/components/BranchSidebar";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchShell>
      {children}
    </BranchShell>
  );
}

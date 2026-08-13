/**
 * Single shared layout for all branch pages: /stock/* and /sales/*
 *
 * By placing both route segments inside this (branch) route group,
 * Next.js keeps this layout mounted when navigating between them —
 * the sidebar never remounts and no state is lost.
 */
import { BranchShell } from "@/components/BranchSidebar";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchShell>
      {children}
    </BranchShell>
  );
}

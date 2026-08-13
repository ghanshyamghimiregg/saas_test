// Server component layout — do NOT add "use client" here.
// Next.js 14 layouts MUST be server components to preserve across navigations.
// BranchShell is a client component imported from components/ — that boundary
// is correct: server layout → client shell → client pages.
import { BranchShell } from "@/components/BranchSidebar";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <BranchShell>{children}</BranchShell>;
}

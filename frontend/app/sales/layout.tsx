import { BranchShell } from "@/components/BranchSidebar";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  // overflow-hidden on the content wrapper is required for the POS split-panel
  return (
    <BranchShell contentClassName="overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </BranchShell>
  );
}

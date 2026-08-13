import { BranchShell } from "@/components/BranchSidebar";

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchShell>
      <main className="flex-1 p-5 sm:p-6">
        {children}
      </main>
    </BranchShell>
  );
}

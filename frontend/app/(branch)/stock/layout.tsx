// Stock pages get standard scrollable padding
export default function StockLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 p-5 sm:p-6 overflow-y-auto">
      {children}
    </main>
  );
}

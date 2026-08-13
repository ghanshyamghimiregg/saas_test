// Sales pages: overflow-hidden so POS split-panel fills the viewport correctly
export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {children}
    </div>
  );
}

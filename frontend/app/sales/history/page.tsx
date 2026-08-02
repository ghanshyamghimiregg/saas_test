"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import type { Sale } from "@/lib/types";
import { Table } from "@/components/ui/Table";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

export default function SalesHistoryPage() {
  const router = useRouter();
  const branchId = getBranchId();
  const { toast, show, dismiss } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnModal, setReturnModal] = useState(false);

  async function load() {
    if (!branchId) { router.push("/login"); return; }
    setLoading(true);
    try {
      const data = await api.get<Sale[]>(
        `/reports/sales/list?branch_id=${branchId}&start=${start}&end=${end}&limit=200`,
      );
      setSales(data);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to load", "error");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  function openInvoice(saleId: string, fmt = "a4") {
    const token = localStorage.getItem("access_token") || "";
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const url = `${base}/sales/${saleId}/invoice?fmt=${fmt}&token=${encodeURIComponent(token)}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const columns = [
    { key: "invoice_number", header: "Invoice #", render: (s: Sale) => s.invoice_number ?? "—" },
    {
      key: "created_at",
      header: "Date/time",
      render: (s: Sale) => new Date(s.created_at).toLocaleString(),
    },
    {
      key: "total",
      header: "Total",
      render: (s: Sale) => `NPR ${Number(s.total).toFixed(2)}`,
    },
    {
      key: "discount_type",
      header: "Discount",
      render: (s: Sale) =>
        s.discount_type !== "none"
          ? `${s.discount_type} (${Number(s.discount_pct ?? 0).toFixed(1)}%)`
          : "—",
    },
    {
      key: "payment_method",
      header: "Payment",
      render: (s: Sale) => s.payment_method?.replace("_", " ") ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (s: Sale) => {
        const colors: Record<string, string> = {
          active: "badge-green",
          held: "badge-yellow",
          void: "badge-gray",
          returned: "badge-blue",
        };
        return <span className={colors[s.status] ?? "badge-gray"}>{s.status}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (s: Sale) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button className="btn-secondary btn-sm" onClick={() => openInvoice(s.id)}>
            Invoice
          </button>
          {s.status === "active" && (
            <button
              className="btn-secondary btn-sm text-red-600"
              onClick={() => { setSelectedSale(s); setReturnModal(true); }}
            >
              Return
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1>Sales history</h1>
          <div className="flex gap-2 items-center">
            <input type="date" className="input w-36" value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" className="input w-36" value={end} onChange={(e) => setEnd(e.target.value)} />
            <button className="btn-primary btn-sm" onClick={load} disabled={loading}>
              {loading ? <Spinner size={4} /> : "Load"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={8} /></div>
        ) : (
          <Table
            columns={columns as Parameters<typeof Table>[0]["columns"]}
            rows={sales as unknown as Record<string, unknown>[]}
            keyField={"id" as never}
            emptyMessage="No sales found for this date range."
            onRowClick={(row) => setSelectedSale(row as unknown as Sale)}
          />
        )}
      </div>

      {/* Sale detail modal */}
      <Modal
        open={!!selectedSale && !returnModal}
        onClose={() => setSelectedSale(null)}
        title={`Sale ${selectedSale?.invoice_number ?? ""}`}
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-400">Total</span><div className="font-semibold">NPR {Number(selectedSale.total).toFixed(2)}</div></div>
              <div><span className="text-slate-400">Discount</span><div>{selectedSale.discount_type} {Number(selectedSale.discount_pct ?? 0).toFixed(1)}%</div></div>
              <div><span className="text-slate-400">Payment</span><div>{selectedSale.payment_method?.replace("_", " ")}</div></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-slate-500 text-xs">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit</th>
                <th className="text-right py-2">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {selectedSale.line_items.map((li) => (
                  <tr key={li.id}>
                    <td className="py-2">{li.product_name ?? "—"}</td>
                    <td className="text-right py-2">{li.quantity}</td>
                    <td className="text-right py-2">NPR {Number(li.unit_price).toFixed(2)}</td>
                    <td className="text-right py-2 font-medium">NPR {Number(li.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 pt-2">
              <button className="btn-secondary flex-1" onClick={() => openInvoice(selectedSale.id, "a4")}>Print A4</button>
              <button className="btn-secondary flex-1" onClick={() => openInvoice(selectedSale.id, "thermal")}>Print thermal</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return modal */}
      <Modal
        open={returnModal && !!selectedSale}
        onClose={() => { setReturnModal(false); setSelectedSale(null); }}
        title="Process return"
        size="md"
      >
        {selectedSale && (
          <ReturnForm
            sale={selectedSale}
            onDone={() => { setReturnModal(false); setSelectedSale(null); load(); show("Return processed", "success"); }}
            onError={(msg) => show(msg, "error")}
          />
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

// Inline return form
function ReturnForm({ sale, onDone, onError }: {
  sale: Sale;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const items = Object.entries(qtys)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ sale_line_item_id: id, quantity_returned: q }));
    if (!items.length) { onError("Select at least one item to return"); return; }
    if (!reason.trim()) { onError("Reason is required"); return; }
    setLoading(true);
    try {
      await api.post(`/sales/${sale.id}/return`, { reason, items });
      onDone();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Return failed");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        {sale.line_items.map((li) => (
          <div key={li.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{li.product_name ?? "Item"} (sold: {li.quantity})</span>
            <input
              type="number"
              min={0}
              max={li.quantity}
              className="input w-20 text-center"
              placeholder="0"
              value={qtys[li.id] ?? ""}
              onChange={(e) => setQtys((prev) => ({ ...prev, [li.id]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="label">Reason <span className="text-red-500">*</span></label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? <Spinner size={4} /> : "Process return"}
      </button>
    </form>
  );
}



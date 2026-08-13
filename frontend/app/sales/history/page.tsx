"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import type { Sale, SaleLineItem } from "@/lib/types";
import { Table } from "@/components/ui/Table";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

export default function SalesHistoryPage() {
  const router   = useRouter();
  const branchId = getBranchId();
  const { toast, show, dismiss } = useToast();
  const today    = new Date().toISOString().split("T")[0];
  const [start,        setStart]        = useState(today);
  const [end,          setEnd]          = useState(today);
  const [sales,        setSales]        = useState<Sale[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnModal,  setReturnModal]  = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

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
    const base  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const url   = `${base}/sales/${saleId}/invoice?fmt=${fmt}&token=${encodeURIComponent(token)}`;
    const a     = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function printLabels(sale: Sale, copies?: Record<string, number>) {
    const frameItems = sale.line_items.filter((li) => li.frame_id);
    if (!frameItems.length) { show("No frame products in this sale", "info"); return; }
    setPrintLoading(true);
    try {
      const base  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const token = localStorage.getItem("access_token") || "";
      const frameIds: string[] = [];
      for (const li of frameItems) {
        if (!li.frame_id) continue;
        const n = copies ? (copies[li.id] ?? li.quantity) : li.quantity;
        for (let i = 0; i < Math.max(1, n); i++) frameIds.push(li.frame_id);
      }
      const res = await fetch(
        `${base}/inventory/frames/print-barcodes?copies_per_frame=1&use_stock_qty=false&label_size=34x20`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(frameIds),
        },
      );
      if (!res.ok) throw new Error(await res.text() || `Print failed: ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `labels-${sale.invoice_number ?? sale.id}.pdf`;
      a.target = "_blank"; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      show("Labels ready", "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Print failed", "error");
    } finally { setPrintLoading(false); }
  }

  const STATUS_BADGE: Record<string, string> = {
    active:   "badge-green",
    held:     "badge-amber",
    void:     "badge-gray",
    returned: "badge-blue",
  };

  const columns = [
    {
      key:    "invoice_number",
      header: "Invoice #",
      mono:   true as const,
      render: (s: Sale) => s.invoice_number ?? "—",
    },
    {
      key:    "created_at",
      header: "Date / time",
      render: (s: Sale) => (
        <span className="font-mono text-xs tabular-nums text-ink-muted">
          {new Date(s.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key:    "total",
      header: "Total",
      align:  "right" as const,
      mono:   true as const,
      render: (s: Sale) => `NPR ${Number(s.total).toLocaleString("en-NP")}`,
    },
    {
      key:    "discount_type",
      header: "Discount",
      render: (s: Sale) =>
        s.discount_type !== "none"
          ? <span className="badge-blue text-xs">{s.discount_type.replace(/_/g, " ")} {Number(s.discount_pct ?? 0).toFixed(1)}%</span>
          : <span className="text-ink-faint">—</span>,
    },
    {
      key:    "payment_method",
      header: "Payment",
      render: (s: Sale) => (
        <span className="text-xs capitalize">{s.payment_method?.replace(/_/g, " ") ?? "—"}</span>
      ),
    },
    {
      key:    "status",
      header: "Status",
      render: (s: Sale) => (
        <span className={STATUS_BADGE[s.status] ?? "badge-gray"}>{s.status}</span>
      ),
    },
    {
      key:    "actions",
      header: "",
      render: (s: Sale) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => openInvoice(s.id)}
            aria-label={`Print invoice for ${s.invoice_number}`}
          >
            Invoice
          </button>
          {s.status === "active" && (
            <button
              className="btn-danger btn-sm"
              onClick={() => { setSelectedSale(s); setReturnModal(true); }}
              aria-label={`Return items from ${s.invoice_number}`}
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
      <div className="p-5 sm:p-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1>Sales history</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/sales/pos"
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
              </svg>
              POS
            </Link>
            <span className="w-px h-4 bg-border hidden sm:block" aria-hidden="true" />
            <label htmlFor="hist-start" className="sr-only">Start date</label>
            <input
              id="hist-start"
              type="date"
              className="input w-36"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <span className="text-xs text-ink-faint" aria-hidden="true">to</span>
            <label htmlFor="hist-end" className="sr-only">End date</label>
            <input
              id="hist-end"
              type="date"
              className="input w-36"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <button
              className="btn-secondary btn-sm"
              onClick={load}
              disabled={loading}
              aria-label="Load sales for selected date range"
            >
              {loading ? <Spinner size={3} /> : "Load"}
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <PageSpinner label="Loading sales…" />
        ) : (
          <Table
            columns={columns as unknown as Parameters<typeof Table>[0]["columns"]}
            rows={sales as unknown as Record<string, unknown>[]}
            keyField={"id" as never}
            emptyMessage="No sales found for this date range."
            emptyDetail="Try adjusting the date range above."
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
          <SaleDetail
            sale={selectedSale}
            printLoading={printLoading}
            onInvoice={(fmt) => openInvoice(selectedSale.id, fmt)}
            onPrintLabels={(copies) => printLabels(selectedSale, copies)}
            onReturn={() => setReturnModal(true)}
          />
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
            onDone={() => {
              setReturnModal(false);
              setSelectedSale(null);
              load();
              show("Return processed", "success");
            }}
            onError={(msg) => show(msg, "error")}
          />
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

// ── Sale detail ───────────────────────────────────────────────────────────────

function SaleDetail({
  sale, printLoading, onInvoice, onPrintLabels, onReturn,
}: {
  sale:         Sale;
  printLoading: boolean;
  onInvoice:    (fmt: string) => void;
  onPrintLabels:(copies: Record<string, number>) => void;
  onReturn:     () => void;
}) {
  const [labelCopies, setLabelCopies] = useState<Record<string, number>>(() =>
    Object.fromEntries(sale.line_items.map((li) => [li.id, li.quantity])),
  );

  const frameItems = sale.line_items.filter((li) => li.frame_id);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",   value: `NPR ${Number(sale.total).toLocaleString("en-NP")}`, mono: true },
          { label: "Discount", value: `${sale.discount_type.replace(/_/g, " ")} ${Number(sale.discount_pct ?? 0).toFixed(1)}%` },
          { label: "Payment",  value: sale.payment_method?.replace(/_/g, " ") ?? "—" },
        ].map(({ label, value, mono }) => (
          <div key={label} className="bg-canvas rounded-md px-3 py-2.5">
            <p className="section-heading">{label}</p>
            <p className={["text-sm font-semibold text-ink", mono ? "font-mono tabular-nums" : ""].join(" ")}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Line items */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="table-header text-left">Item</th>
            <th className="table-header text-right">Qty</th>
            <th className="table-header text-right">Unit</th>
            <th className="table-header text-right">Total</th>
            {frameItems.length > 0 && (
              <th className="table-header text-right">Labels</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sale.line_items.map((li) => (
            <tr key={li.id} className="hover:bg-canvas/40">
              <td className="table-cell">{li.product_name ?? "—"}</td>
              <td className="table-cell text-right font-mono tabular-nums">{li.quantity}</td>
              <td className="table-cell text-right font-mono tabular-nums">
                NPR {Number(li.unit_price).toLocaleString("en-NP")}
              </td>
              <td className="table-cell text-right font-mono tabular-nums font-medium">
                NPR {Number(li.line_total).toLocaleString("en-NP")}
              </td>
              {frameItems.length > 0 && (
                <td className="table-cell text-right py-1.5">
                  {li.frame_id ? (
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={labelCopies[li.id] ?? li.quantity}
                      onChange={(e) =>
                        setLabelCopies((prev) => ({
                          ...prev,
                          [li.id]: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      className="input-mono w-14 text-center text-xs py-1 px-1"
                      aria-label={`Label copies for ${li.product_name}`}
                    />
                  ) : (
                    <span className="text-ink-faint text-xs">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Label print panel */}
      {frameItems.length > 0 && (
        <div className="rounded-md border border-border bg-canvas flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Print barcode labels</p>
            <p className="text-xs text-ink-faint mt-0.5">34×20 mm thermal · adjust copies per item above</p>
          </div>
          <button
            className="btn-secondary btn-sm flex items-center gap-1.5 shrink-0"
            onClick={() => onPrintLabels(labelCopies)}
            disabled={printLoading}
            aria-label="Print barcode labels for items in this sale"
          >
            {printLoading ? <Spinner size={3} /> : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            )}
            Print labels
          </button>
        </div>
      )}

      {/* Invoice + return actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        <button className="btn-secondary flex-1 min-w-24" onClick={() => onInvoice("a4")}>
          Print A4
        </button>
        <button className="btn-secondary flex-1 min-w-24" onClick={() => onInvoice("thermal")}>
          Print thermal
        </button>
        {sale.status === "active" && (
          <button className="btn-danger btn-sm flex-1 min-w-24" onClick={onReturn}>
            Process return
          </button>
        )}
      </div>
    </div>
  );
}

// ── Return form ───────────────────────────────────────────────────────────────

function ReturnForm({ sale, onDone, onError }: {
  sale:    Sale;
  onDone:  () => void;
  onError: (msg: string) => void;
}) {
  const [reason,  setReason]  = useState("");
  const [qtys,    setQtys]    = useState<Record<string, number>>({});
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-2">
        {sale.line_items.map((li) => (
          <div key={li.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">{li.product_name ?? "Item"}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-ink-faint">sold: <span className="font-mono">{li.quantity}</span></span>
              <input
                type="number"
                min={0}
                max={li.quantity}
                className="input-mono w-20 text-center"
                placeholder="0"
                value={qtys[li.id] ?? ""}
                onChange={(e) => setQtys((prev) => ({ ...prev, [li.id]: Number(e.target.value) }))}
                aria-label={`Quantity to return for ${li.product_name}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="ret-reason" className="label label-required">Reason</label>
        <input
          id="ret-reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          aria-required="true"
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? <Spinner size={4} /> : "Process return"}
      </button>
    </form>
  );
}

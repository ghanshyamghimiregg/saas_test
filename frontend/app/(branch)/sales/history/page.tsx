"use client";
// v2 — branch sales history with permissions fix
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, openBlobInTab } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import type { Sale } from "@/lib/types";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BranchSummary {
  branch_id:         string;
  period:            string;
  total_revenue:     number;
  total_sales_count: number;
  total_discount:    number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card-flat">
      <p className="section-heading mb-2">{label}</p>
      <p className="text-2xl font-mono font-bold tabular-nums leading-none text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Period toggle ─────────────────────────────────────────────────────────────

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div role="group" aria-label="Report period" className="flex gap-0.5 bg-canvas border border-border rounded-md p-0.5">
      {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          className={[
            "px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150",
            value === p ? "bg-white text-accent shadow-card" : "text-ink-muted hover:text-ink",
          ].join(" ")}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BranchSalesHistoryPage() {
  const router   = useRouter();
  const branchId = getBranchId();
  const { toast, show, dismiss } = useToast();

  // Period summary (KPIs)
  const [period,         setPeriod]         = useState<Period>("daily");
  const [summary,        setSummary]        = useState<BranchSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Sales list
  const today = new Date().toISOString().split("T")[0];
  const [start,   setStart]   = useState(today);
  const [end,     setEnd]     = useState(today);
  const [search,  setSearch]  = useState("");
  const [sales,   setSales]   = useState<Sale[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Detail / return / print
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnModal,  setReturnModal]  = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Load period summary ──────────────────────────────────────────────────
  useEffect(() => {
    if (!branchId) { router.push("/login"); return; }
    setSummaryLoading(true);
    api.get<BranchSummary>(`/reports/sales/summary?branch_id=${branchId}&period=${period}`)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [period, branchId]); // eslint-disable-line

  // ── Load sales list ──────────────────────────────────────────────────────
  const loadSales = useCallback(async () => {
    if (!branchId) return;
    setListLoading(true);
    try {
      const data = await api.get<Sale[]>(
        `/reports/sales/list?branch_id=${branchId}&start=${start}&end=${end}&limit=500`,
      );
      setSales(data);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to load sales", "error");
    } finally {
      setListLoading(false);
    }
  }, [branchId, start, end]); // eslint-disable-line

  useEffect(() => { loadSales(); }, [loadSales]);

  // ── Filter sales by search (client-side on customer name / phone / invoice) ─
  const filtered = search.trim()
    ? sales.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.invoice_number?.toLowerCase().includes(q) ||
          String(s.total).includes(q)
        );
      })
    : sales;

  // ── Invoice open ─────────────────────────────────────────────────────────
  function openInvoice(saleId: string, fmt = "a4") {
    const token = localStorage.getItem("access_token") || "";
    const base  = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/$/, "");
    window.open(`${base}/sales/${saleId}/invoice?fmt=${fmt}&token=${encodeURIComponent(token)}`, "_blank", "noopener,noreferrer");
  }

  // ── Print labels ─────────────────────────────────────────────────────────
  async function printLabels(sale: Sale, copies?: Record<string, number>) {
    const frameItems = sale.line_items.filter((li) => li.frame_id);
    if (!frameItems.length) { show("No frame products in this sale", "info"); return; }
    setPrintLoading(true);
    try {
      const frameIds: string[] = [];
      for (const li of frameItems) {
        if (!li.frame_id) continue;
        const n = copies ? (copies[li.id] ?? li.quantity) : li.quantity;
        for (let i = 0; i < Math.max(1, n); i++) frameIds.push(li.frame_id);
      }
      await openBlobInTab(
        `/inventory/frames/print-barcodes?copies_per_frame=1&use_stock_qty=false&label_size=34x20`,
        `labels-${sale.invoice_number ?? sale.id}.pdf`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(frameIds) },
      );
      show("Labels opened — print with Ctrl+P", "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Print failed", "error");
    } finally { setPrintLoading(false); }
  }

  // ── Excel export ─────────────────────────────────────────────────────────
  async function handleExport() {
    if (!branchId) return;
    setExportLoading(true);
    try {
      await openBlobInTab(
        `/reports/export/excel?start=${start}&end=${end}&branch_id=${branchId}`,
        `sales-${start}-${end}.xlsx`,
      );
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Export failed", "error");
    } finally { setExportLoading(false); }
  }

  // ── Badges ───────────────────────────────────────────────────────────────
  const STATUS_BADGE: Record<string, string> = {
    active: "badge-green", held: "badge-amber", void: "badge-gray", returned: "badge-blue",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-5 sm:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1>Sales history</h1>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        {/* ── KPIs ── */}
        {summaryLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1,2,3].map((i) => (
              <div key={i} className="card-flat h-20 animate-pulse bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KPI
              label="Revenue"
              value={`NPR ${Number(summary?.total_revenue ?? 0).toLocaleString("en-NP")}`}
              sub={period}
            />
            <KPI
              label="Sales"
              value={summary?.total_sales_count ?? 0}
              sub={period}
            />
            <KPI
              label="Discounts given"
              value={`NPR ${Number(summary?.total_discount ?? 0).toLocaleString("en-NP")}`}
              sub={period}
            />
          </div>
        )}

        {/* ── Sales list controls ── */}
        <div className="card-flat space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Sales records</h2>
            <button
              className="btn-secondary btn-sm flex items-center gap-1.5"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? <Spinner size={3} /> : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              )}
              Download Excel
            </button>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-44">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                className="input pl-8 text-sm"
                placeholder="Search invoice #, amount…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search sales"
              />
            </div>
            <label htmlFor="sh-start" className="sr-only">Start date</label>
            <input id="sh-start" type="date" className="input w-36" value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="text-xs text-ink-faint" aria-hidden="true">to</span>
            <label htmlFor="sh-end" className="sr-only">End date</label>
            <input id="sh-end" type="date" className="input w-36" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>

          {/* Table */}
          {listLoading ? (
            <PageSpinner label="Loading sales…" />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-ink-muted">
                {search ? `No sales match "${search}"` : "No sales found for this date range."}
              </p>
              <p className="text-xs text-ink-faint mt-1">Try adjusting the date range or search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header text-left">Invoice #</th>
                    <th className="table-header text-left">Date / time</th>
                    <th className="table-header text-right">Total</th>
                    <th className="table-header text-left">Discount</th>
                    <th className="table-header text-left">Payment</th>
                    <th className="table-header text-left">Status</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-accent-light/20 cursor-pointer transition-colors duration-100"
                      onClick={() => setSelectedSale(s)}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedSale(s)}
                      role="button"
                      aria-label={`Open sale ${s.invoice_number}`}
                    >
                      <td className="table-cell font-mono tabular-nums">{s.invoice_number ?? "—"}</td>
                      <td className="table-cell">
                        <span className="font-mono text-xs tabular-nums text-ink-muted">
                          {new Date(s.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell text-right font-mono tabular-nums font-semibold">
                        NPR {Number(s.total).toLocaleString("en-NP")}
                      </td>
                      <td className="table-cell">
                        {s.discount_type !== "none"
                          ? <span className="badge-blue text-xs">{s.discount_type.replace(/_/g, " ")} {Number(s.discount_pct ?? 0).toFixed(1)}%</span>
                          : <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="table-cell text-xs capitalize text-ink-muted">
                        {s.payment_method?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="table-cell">
                        <span className={STATUS_BADGE[s.status] ?? "badge-gray"}>{s.status}</span>
                      </td>
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-secondary btn-xs"
                          onClick={() => openInvoice(s.id)}
                          aria-label={`Invoice for ${s.invoice_number}`}
                        >
                          Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-xs text-ink-faint text-right">
              {filtered.length} sale{filtered.length !== 1 ? "s" : ""} shown
              {search && ` · filtered from ${sales.length}`}
            </p>
          )}
        </div>
      </div>

      {/* ── Sale detail modal ── */}
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

      {/* ── Return modal ── */}
      <Modal
        open={returnModal && !!selectedSale}
        onClose={() => { setReturnModal(false); setSelectedSale(null); }}
        title="Process return"
        size="md"
      >
        {selectedSale && (
          <ReturnForm
            sale={selectedSale}
            onDone={() => { setReturnModal(false); setSelectedSale(null); loadSales(); show("Return processed", "success"); }}
            onError={(msg) => show(msg, "error")}
          />
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

// ── Sale detail ────────────────────────────────────────────────────────────────

function SaleDetail({
  sale, printLoading, onInvoice, onPrintLabels, onReturn,
}: {
  sale: Sale;
  printLoading: boolean;
  onInvoice: (fmt: string) => void;
  onPrintLabels: (copies: Record<string, number>) => void;
  onReturn: () => void;
}) {
  const [labelCopies, setLabelCopies] = useState<Record<string, number>>(() =>
    Object.fromEntries(sale.line_items.map((li) => [li.id, li.quantity])),
  );
  const frameItems = sale.line_items.filter((li) => li.frame_id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: `NPR ${Number(sale.total).toLocaleString("en-NP")}`, mono: true },
          { label: "Discount", value: `${sale.discount_type.replace(/_/g, " ")} ${Number(sale.discount_pct ?? 0).toFixed(1)}%` },
          { label: "Payment",  value: sale.payment_method?.replace(/_/g, " ") ?? "—" },
        ].map(({ label, value, mono }) => (
          <div key={label} className="bg-canvas rounded-md px-3 py-2.5">
            <p className="section-heading">{label}</p>
            <p className={["text-sm font-semibold text-ink", mono ? "font-mono tabular-nums" : ""].join(" ")}>{value}</p>
          </div>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="table-header text-left">Item</th>
            <th className="table-header text-right">Qty</th>
            <th className="table-header text-right">Unit</th>
            <th className="table-header text-right">Total</th>
            {frameItems.length > 0 && <th className="table-header text-right">Labels</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sale.line_items.map((li) => (
            <tr key={li.id} className="hover:bg-canvas/40">
              <td className="table-cell">{li.product_name ?? "—"}</td>
              <td className="table-cell text-right font-mono tabular-nums">{li.quantity}</td>
              <td className="table-cell text-right font-mono tabular-nums">NPR {Number(li.unit_price).toLocaleString("en-NP")}</td>
              <td className="table-cell text-right font-mono tabular-nums font-medium">NPR {Number(li.line_total).toLocaleString("en-NP")}</td>
              {frameItems.length > 0 && (
                <td className="table-cell text-right py-1.5">
                  {li.frame_id ? (
                    <input
                      type="number" min={1} max={500}
                      value={labelCopies[li.id] ?? li.quantity}
                      onChange={(e) => setLabelCopies((prev) => ({ ...prev, [li.id]: Math.max(1, Number(e.target.value) || 1) }))}
                      className="input-mono w-14 text-center text-xs py-1 px-1"
                      aria-label={`Label copies for ${li.product_name}`}
                    />
                  ) : <span className="text-ink-faint text-xs">—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

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

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        <button className="btn-secondary flex-1 min-w-24" onClick={() => onInvoice("a4")}>Print A4</button>
        <button className="btn-secondary flex-1 min-w-24" onClick={() => onInvoice("thermal")}>Print thermal</button>
        {sale.status === "active" && (
          <button className="btn-danger btn-sm flex-1 min-w-24" onClick={onReturn}>Process return</button>
        )}
      </div>
    </div>
  );
}

// ── Return form ────────────────────────────────────────────────────────────────

function ReturnForm({ sale, onDone, onError }: { sale: Sale; onDone: () => void; onError: (msg: string) => void }) {
  const [reason,  setReason]  = useState("");
  const [qtys,    setQtys]    = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const items = Object.entries(qtys).filter(([, q]) => q > 0).map(([id, q]) => ({ sale_line_item_id: id, quantity_returned: q }));
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
                type="number" min={0} max={li.quantity}
                className="input-mono w-20 text-center" placeholder="0"
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
        <input id="ret-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? <Spinner size={4} /> : "Process return"}
      </button>
    </form>
  );
}

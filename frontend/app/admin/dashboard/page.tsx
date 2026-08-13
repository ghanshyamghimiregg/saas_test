"use client";
import { useState, useEffect } from "react";
import { api, downloadBlob } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";

interface BranchSummary {
  branch_id:   string;
  revenue:     number;
  sales_count: number;
  discount:    number;
}
interface AllBranchesSummary {
  period:            string;
  period_start:      string;
  period_end:        string;
  total_revenue:     number;
  total_sales_count: number;
  branches:          BranchSummary[];
}
interface LowStockItem {
  id:                string;
  name:              string;
  branch_id:         string;
  quantity:          number;
  reorder_threshold: number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, urgent,
}: { label: string; value: string | number; sub?: string; urgent?: boolean }) {
  return (
    <div className={["card-flat", urgent ? "border-signal-red/30 bg-red-50/40" : ""].join(" ")}>
      <p className="section-heading mb-2">{label}</p>
      <p className={[
        "text-2xl font-mono font-bold tabular-nums leading-none",
        urgent ? "text-signal-red" : "text-ink",
      ].join(" ")}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink-faint mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Period pill ───────────────────────────────────────────────────────────────
function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const periods: Period[] = ["daily", "weekly", "monthly", "yearly"];
  return (
    <div
      role="group"
      aria-label="Report period"
      className="flex gap-0.5 bg-canvas border border-border rounded-md p-0.5"
    >
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          className={[
            "px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150",
            value === p
              ? "bg-white text-accent shadow-card"
              : "text-ink-muted hover:text-ink",
          ].join(" ")}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-md shadow-popover px-3 py-2 text-xs">
      <p className="font-mono font-semibold text-ink mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-ink-muted">
          {p.name}:{" "}
          <span className="font-mono font-semibold text-ink">
            NPR {p.value.toLocaleString("en-NP")}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { toast, show, dismiss } = useToast();
  const [period,        setPeriod]        = useState<Period>("daily");
  const [summary,       setSummary]       = useState<AllBranchesSummary | null>(null);
  const [lowStock,      setLowStock]      = useState<LowStockItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStart,   setExportStart]   = useState(new Date().toISOString().split("T")[0]);
  const [exportEnd,     setExportEnd]     = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<AllBranchesSummary>(`/reports/sales/summary/all-branches?period=${period}`),
      api.get<LowStockItem[]>("/inventory/frames/stock/all-branches?low_stock_only=true&limit=50"),
    ])
      .then(([s, ls]) => { setSummary(s); setLowStock(ls); })
      .catch((e: unknown) => show(e instanceof Error ? e.message : "Failed to load", "error"))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line

  async function handleExport() {
    setExportLoading(true);
    try {
      await downloadBlob(
        `/reports/export/excel?start=${exportStart}&end=${exportEnd}`,
        `report-all-${exportStart}-${exportEnd}.xlsx`,
      );
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Export failed", "error");
    } finally { setExportLoading(false); }
  }

  const chartData = summary?.branches.map((b) => ({
    name:      b.branch_id.slice(0, 8),
    Revenue:   Number(b.revenue),
    Discounts: Number(b.discount),
  })) ?? [];

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1>Dashboard</h1>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <PageSpinner label="Loading dashboard…" />
      ) : (
        <>
          {/* KPI grid — 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KPI
              label="Total revenue"
              value={`NPR ${Number(summary?.total_revenue ?? 0).toLocaleString("en-NP")}`}
              sub={period}
            />
            <KPI
              label="Total sales"
              value={(summary?.total_sales_count ?? 0).toLocaleString("en-NP")}
              sub={period}
            />
            <KPI
              label="Branches active"
              value={summary?.branches.length ?? 0}
            />
            <KPI
              label="Low stock alerts"
              value={lowStock.length}
              sub="across all branches"
              urgent={lowStock.length > 0}
            />
          </div>

          {/* Revenue chart */}
          {chartData.length > 0 && (
            <div className="card-flat mb-5">
              <h3 className="mb-4 text-sm">Revenue by branch — {period}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28} barGap={4}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="Revenue"   radius={[3, 3, 0, 0]} fill="#4f46e5" />
                  <Bar dataKey="Discounts" radius={[3, 3, 0, 0]} fill="#c7d2fe" />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3">
                {[{ color: "#4f46e5", label: "Revenue" }, { color: "#c7d2fe", label: "Discounts" }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} aria-hidden="true" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branch breakdown — horizontally scrollable on mobile */}
          <div className="card-flat mb-5">
            <h3 className="mb-4 text-sm">Branch breakdown</h3>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header text-left">Branch</th>
                    <th className="table-header text-right">Sales</th>
                    <th className="table-header text-right">Revenue</th>
                    <th className="table-header text-right">Discounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(summary?.branches ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-cell text-center text-ink-faint py-10">
                        No branch data for this period
                      </td>
                    </tr>
                  ) : (summary?.branches ?? []).map((b) => (
                    <tr key={b.branch_id} className="hover:bg-canvas/60 transition-colors">
                      <td className="table-cell font-mono text-xs">{b.branch_id.slice(0, 16)}</td>
                      <td className="table-cell text-right font-mono tabular-nums">{b.sales_count}</td>
                      <td className="table-cell text-right font-mono tabular-nums">
                        NPR {Number(b.revenue).toLocaleString("en-NP")}
                      </td>
                      <td className="table-cell text-right font-mono tabular-nums text-ink-muted">
                        NPR {Number(b.discount).toLocaleString("en-NP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low stock alerts */}
          {lowStock.length > 0 && (
            <div className="card-flat mb-5 border-signal-red/20">
              <h3 className="mb-4 text-sm text-signal-red flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Low stock alerts
              </h3>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[320px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="table-header text-left">Product</th>
                      <th className="table-header text-right">Qty</th>
                      <th className="table-header text-right">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lowStock.map((p) => (
                      <tr key={p.id}>
                        <td className="table-cell">{p.name}</td>
                        <td className="table-cell text-right font-mono tabular-nums text-signal-red font-semibold">{p.quantity}</td>
                        <td className="table-cell text-right font-mono tabular-nums text-ink-muted">{p.reorder_threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export */}
          <div className="card-flat">
            <h3 className="mb-1 text-sm">Export report</h3>
            <p className="text-xs text-ink-faint mb-4">5-sheet Excel workbook: sales detail, inventory, low stock, discounts, membership</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label htmlFor="exp-start" className="label">From</label>
                <input
                  id="exp-start"
                  type="date"
                  className="input w-36"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="exp-end" className="label">To</label>
                <input
                  id="exp-end"
                  type="date"
                  className="input w-36"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                />
              </div>
              <button
                className="btn-secondary flex items-center gap-2 min-w-36"
                onClick={handleExport}
                disabled={exportLoading}
                aria-label="Download Excel report"
              >
                {exportLoading ? <Spinner size={4} /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                )}
                {exportLoading ? "Preparing…" : "Download .xlsx"}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

"use client";
import { useState, useEffect } from "react";
import { api, downloadBlob } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";

interface BranchSummary {
  branch_id: string;
  revenue: number;
  sales_count: number;
  discount: number;
}
interface AllBranchesSummary {
  period: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_sales_count: number;
  branches: BranchSummary[];
}
interface LowStockItem {
  id: string;
  name: string;
  branch_id: string;
  quantity: number;
  reorder_threshold: number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { toast, show, dismiss } = useToast();
  const [period, setPeriod] = useState<Period>("daily");
  const [summary, setSummary] = useState<AllBranchesSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStart, setExportStart] = useState(new Date().toISOString().split("T")[0]);
  const [exportEnd, setExportEnd] = useState(new Date().toISOString().split("T")[0]);

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
    name: b.branch_id.slice(0, 8),
    Revenue: Number(b.revenue),
    Discounts: Number(b.discount),
  })) ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1>Dashboard</h1>
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
          {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p ? "bg-accent text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={8} /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KPI label="Total revenue" value={`NPR ${Number(summary?.total_revenue ?? 0).toLocaleString()}`} sub={period} />
            <KPI label="Total sales" value={summary?.total_sales_count ?? 0} sub={period} />
            <KPI label="Branches active" value={summary?.branches.length ?? 0} />
            <KPI label="Low stock alerts" value={lowStock.length} sub="across all branches" />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card mb-6">
              <h3 className="mb-4">Revenue by branch</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `NPR ${v.toLocaleString()}`} />
                  <Bar dataKey="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Discounts" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Branch breakdown table */}
          <div className="card mb-6">
            <h3 className="mb-4">Branch breakdown — {period}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-slate-400 text-xs">
                  <th className="text-left py-2">Branch ID</th>
                  <th className="text-right py-2">Sales</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Discounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(summary?.branches ?? []).map((b) => (
                  <tr key={b.branch_id}>
                    <td className="py-2 font-mono text-xs">{b.branch_id}</td>
                    <td className="text-right py-2">{b.sales_count}</td>
                    <td className="text-right py-2">NPR {Number(b.revenue).toLocaleString()}</td>
                    <td className="text-right py-2">NPR {Number(b.discount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Low stock */}
          {lowStock.length > 0 && (
            <div className="card mb-6">
              <h3 className="mb-4 text-amber-700">Low stock alerts</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-slate-400 text-xs">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2">{p.name}</td>
                      <td className="text-right py-2 text-red-600 font-medium">{p.quantity}</td>
                      <td className="text-right py-2">{p.reorder_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Export */}
          <div className="card">
            <h3 className="mb-4">Export report (.xlsx)</h3>
            <div className="flex gap-3 items-end">
              <div>
                <label className="label">From</label>
                <input type="date" className="input w-36" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input w-36" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleExport} disabled={exportLoading}>
                {exportLoading ? <Spinner size={4} /> : "Download .xlsx"}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

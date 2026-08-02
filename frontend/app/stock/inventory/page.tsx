"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import type { FrameProduct } from "@/lib/types";
import { Table } from "@/components/ui/Table";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { StockAdjustForm } from "./StockAdjustForm";

export default function InventoryPage() {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();
  const [products, setProducts] = useState<FrameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adjustTarget, setAdjustTarget] = useState<FrameProduct | null>(null);
  const [printLoading, setPrintLoading] = useState(false);

  // Use a ref for show so it never triggers useCallback/useEffect re-runs
  const showRef = useRef(show);
  useEffect(() => { showRef.current = show; }, [show]);

  const branchId = getBranchId();

  const load = useCallback(async () => {
    if (!branchId) { router.push("/login"); return; }
    setLoading(true);
    try {
      const path = q
        ? `/inventory/frames/search?branch_id=${branchId}&q=${encodeURIComponent(q)}&limit=200`
        : `/inventory/frames/stock?branch_id=${branchId}&limit=200&low_stock_only=${lowStockOnly}`;
      const data = await api.get<FrameProduct[]>(path);
      setProducts(data);
    } catch (e: unknown) {
      showRef.current(e instanceof Error ? e.message : "Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, q, lowStockOnly]);

  useEffect(() => { load(); }, [load]);

  async function handlePrintLabels() {
    if (!selectedIds.size) { show("Select at least one product", "info"); return; }
    setPrintLoading(true);
    try {
      const ids = [...selectedIds];
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/inventory/frames/print-barcodes?use_stock_qty=false&copies_per_frame=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
          body: JSON.stringify(ids),
        },
      );
      if (!res.ok) throw new Error(`Print failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "barcodes.pdf";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Print failed", "error");
    } finally {
      setPrintLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  const columns = [
    {
      key: "select",
      header: "",
      render: (p: FrameProduct) => (
        <input
          type="checkbox"
          checked={selectedIds.has(p.id)}
          onChange={() => toggleSelect(p.id)}
          aria-label={`Select ${p.name}`}
          className="rounded border-border"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: "w-10",
    },
    {
      key: "name",
      header: "Product",
      render: (p: FrameProduct) => (
        <div>
          <div className="font-medium text-slate-900">{p.name}</div>
          <div className="text-xs text-slate-400">{p.brand} · {p.category}</div>
        </div>
      ),
    },
    { key: "barcode", header: "Barcode" },
    {
      key: "selling_price",
      header: "Price",
      render: (p: FrameProduct) => `NPR ${Number(p.selling_price).toFixed(2)}`,
    },
    {
      key: "quantity",
      header: "Stock",
      render: (p: FrameProduct) => {
        const low = p.reorder_threshold != null && p.quantity <= p.reorder_threshold;
        return (
          <span className={low ? "badge-red" : "badge-green"}>
            {p.quantity} {low ? "⚠ Low" : ""}
          </span>
        );
      },
    },
    {
      key: "is_active",
      header: "Status",
      render: (p: FrameProduct) =>
        p.is_active ? (
          <span className="badge-green">Active</span>
        ) : (
          <span className="badge-gray">Inactive</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (p: FrameProduct) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setAdjustTarget(p)}
          >
            Adjust stock
          </button>
          <Link href={`/stock/inventory/${p.id}`} className="btn-secondary btn-sm">
            Edit
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1>Inventory</h1>
        <div className="flex gap-2">
          <button
            className="btn-secondary btn-sm"
            onClick={handlePrintLabels}
            disabled={!selectedIds.size || printLoading}
          >
            {printLoading ? <Spinner size={4} /> : `Print labels${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
          </button>
          <Link href="/stock/inventory/new" className="btn-primary btn-sm">
            + Add product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name, brand, barcode, SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-border"
          />
          Low stock only
        </label>
        {selectedIds.size > 0 && (
          <button className="btn-secondary btn-sm" onClick={toggleAll}>
            {selectedIds.size === products.length ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={8} /></div>
      ) : (
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          rows={products as unknown as Record<string, unknown>[]}
          keyField={"id" as never}
          emptyMessage="No products found."
          onRowClick={(row) => router.push(`/stock/inventory/${(row as unknown as FrameProduct).id}`)}
        />
      )}

      {/* Stock adjust modal */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust stock — ${adjustTarget?.name}`}
      >
        {adjustTarget && (
          <StockAdjustForm
            product={adjustTarget}
            onDone={() => { setAdjustTarget(null); load(); show("Stock adjusted", "success"); }}
            onError={(msg) => show(msg, "error")}
          />
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

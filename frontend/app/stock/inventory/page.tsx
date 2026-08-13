"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import type { FrameProduct } from "@/lib/types";
import { Table } from "@/components/ui/Table";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { StockAdjustForm } from "./StockAdjustForm";

export default function InventoryPage() {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();
  const [products,      setProducts]      = useState<FrameProduct[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [q,             setQ]             = useState("");
  const [lowStockOnly,  setLowStockOnly]  = useState(false);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [adjustTarget,  setAdjustTarget]  = useState<FrameProduct | null>(null);
  const [printLoading,  setPrintLoading]  = useState(false);

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
  }, [branchId, q, lowStockOnly]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handlePrintLabels() {
    if (!selectedIds.size) { show("Select at least one product", "info"); return; }
    setPrintLoading(true);
    try {
      const ids = [...selectedIds];
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/inventory/frames/print-barcodes?use_stock_qty=false&copies_per_frame=1&label_size=34x20`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          },
          body: JSON.stringify(ids),
        },
      );
      if (!res.ok) throw new Error(`Print failed: ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "barcodes.pdf"; a.target = "_blank"; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      show("Labels ready", "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Print failed", "error");
    } finally {
      setPrintLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleAll() {
    setSelectedIds(selectedIds.size === products.length ? new Set() : new Set(products.map((p) => p.id)));
  }

  const allSelected = products.length > 0 && selectedIds.size === products.length;

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
          className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: "w-10",
    },
    {
      key:    "name",
      header: "Product",
      render: (p: FrameProduct) => (
        <div>
          <div className="font-medium text-ink leading-snug">{p.name}</div>
          <div className="text-xs text-ink-faint font-mono mt-0.5">{p.brand}{p.brand && p.category ? " · " : ""}{p.category?.replace("_", " ")}</div>
        </div>
      ),
    },
    { key: "barcode", header: "Barcode", mono: true as const },
    {
      key:    "selling_price",
      header: "Price",
      align:  "right" as const,
      mono:   true as const,
      render: (p: FrameProduct) => `NPR ${Number(p.selling_price).toLocaleString("en-NP", { minimumFractionDigits: 0 })}`,
    },
    {
      key:    "quantity",
      header: "Stock",
      align:  "right" as const,
      render: (p: FrameProduct) => {
        const low = p.reorder_threshold != null && p.quantity <= p.reorder_threshold;
        return (
          <span className={low ? "badge-red" : "badge-green"}>
            <span className="font-mono tabular-nums">{p.quantity}</span>
            {low && <span className="ml-1 opacity-70">low</span>}
          </span>
        );
      },
    },
    {
      key:    "is_active",
      header: "Status",
      render: (p: FrameProduct) =>
        p.is_active
          ? <span className="badge-green">Active</span>
          : <span className="badge-gray">Inactive</span>,
    },
    {
      key:    "actions",
      header: "",
      render: (p: FrameProduct) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setAdjustTarget(p)}
            aria-label={`Adjust stock for ${p.name}`}
          >
            Adjust
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
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1>Inventory</h1>
        <div className="flex items-center gap-2">
          <Link href="/sales/pos" className="btn-ghost btn-sm flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
            </svg>
            POS
          </Link>
          <button
            className="btn-secondary btn-sm flex items-center gap-1.5"
            onClick={handlePrintLabels}
            disabled={!selectedIds.size || printLoading}
            aria-label={`Print labels for ${selectedIds.size} selected products`}
          >
            {printLoading ? <Spinner size={3} /> : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            )}
            {selectedIds.size ? `Print labels (${selectedIds.size})` : "Print labels"}
          </button>
          <Link href="/stock/inventory/new" className="btn-primary btn-sm">
            + Add product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input pl-9"
            placeholder="Search name, brand, barcode, SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-accent"
          />
          Low stock only
        </label>
        {products.length > 0 && (
          <button className="btn-ghost btn-sm" onClick={toggleAll}>
            {allSelected ? "Deselect all" : `Select all (${products.length})`}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <PageSpinner label="Loading inventory…" />
      ) : (
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          rows={products as unknown as Record<string, unknown>[]}
          keyField={"id" as never}
          emptyMessage={q ? "No products match your search." : lowStockOnly ? "No low-stock products." : "No products yet."}
          emptyDetail={!q && !lowStockOnly ? "Add your first product to get started." : undefined}
          onRowClick={(row) => router.push(`/stock/inventory/${(row as unknown as FrameProduct).id}`)}
        />
      )}

      {/* Stock adjust modal */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust stock — ${adjustTarget?.name ?? ""}`}
        size="sm"
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

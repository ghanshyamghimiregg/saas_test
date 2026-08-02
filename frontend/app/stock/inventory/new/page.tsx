"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import { ProductForm } from "../ProductForm";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { FrameProduct } from "@/lib/types";

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const NUMERIC = ["selling_price", "cost_price", "tax_rate", "quantity", "reorder_threshold"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === "" || v === null || v === undefined) continue;
    if (NUMERIC.includes(k)) {
      const n = Number(v);
      if (!isNaN(n)) out[k] = n;
    } else {
      out[k] = v;
    }
  }
  if (!out.product_code && out.name) {
    const ts = Date.now().toString(36).toUpperCase();
    out.product_code = `${String(out.name).slice(0, 4).toUpperCase().replace(/\s/g, "")}-${ts}`;
  }
  return out;
}

function BarcodePrintModal({
  product,
  onClose,
  onDone,
}: {
  product: FrameProduct;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"stock" | "custom">("stock");
  const [customQty, setCustomQty] = useState(product.quantity || 1);
  const [printing, setPrinting] = useState(false);

  const qty = mode === "stock" ? product.quantity : customQty;

  async function handlePrint() {
    setPrinting(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const useStockQty = mode === "stock";
      const copies = mode === "custom" ? customQty : 1;

      const res = await fetch(
        `${base}/inventory/frames/print-barcodes?use_stock_qty=${useStockQty}&copies_per_frame=${copies}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify([product.id]),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Print failed (${res.status}): ${body}`);
      }
      const blob = await res.blob();

      // Use <a download> — works after async, not blocked by popup blocker
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `barcodes-${product.barcode}.pdf`;
      // Also open in new tab so they can print directly from the browser
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revoke so the browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      onDone();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Print failed");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Product summary */}
      <div className="bg-slate-50 rounded-lg p-3 text-sm">
        <div className="font-medium text-slate-900">{product.name}</div>
        <div className="text-slate-500 font-mono text-xs mt-0.5">{product.barcode}</div>
        <div className="text-slate-500 text-xs mt-0.5">
          NPR {Number(product.selling_price).toFixed(2)} · Stock: {product.quantity}
        </div>
      </div>

      {/* Mode selector */}
      <div>
        <label className="label">Number of labels to print</label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setMode("stock")}
            className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
              mode === "stock"
                ? "border-accent bg-accent-light text-accent font-medium"
                : "border-border text-slate-600 hover:bg-slate-50"
            }`}
          >
            By stock qty ({product.quantity} labels)
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
              mode === "custom"
                ? "border-accent bg-accent-light text-accent font-medium"
                : "border-border text-slate-600 hover:bg-slate-50"
            }`}
          >
            Custom amount
          </button>
        </div>
      </div>

      {mode === "custom" && (
        <div>
          <label className="label">Number of copies</label>
          <input
            type="number"
            min={1}
            max={500}
            className="input"
            value={customQty}
            onChange={(e) => setCustomQty(Math.max(1, Math.min(500, Number(e.target.value))))}
            autoFocus
          />
        </div>
      )}

      <div className="bg-amber-50 rounded-md px-3 py-2 text-xs text-amber-700">
        Will generate <strong>{qty} label{qty !== 1 ? "s" : ""}</strong> arranged on A4 (3 per row).
        Each label shows the barcode, product name, and price.
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={onClose}
          disabled={printing}
        >
          Skip
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={handlePrint}
          disabled={printing || qty < 1}
        >
          {printing ? <Spinner size={4} /> : `Print ${qty} label${qty !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<FrameProduct | null>(null);
  const { toast, show, dismiss } = useToast();

  async function handleSubmit(data: Record<string, unknown>) {
    const branchId = getBranchId();
    if (!branchId) { router.push("/login"); return; }
    setLoading(true);
    try {
      const payload = sanitize({ ...data, branch_id: branchId });
      const product = await api.post<FrameProduct>("/inventory/frames", payload);
      show("Product created", "success");
      // Show barcode print modal instead of immediately redirecting
      setCreatedProduct(product);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to create product", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-slate-700 text-lg"
            aria-label="Back"
          >
            ←
          </button>
          <h1>Add product</h1>
        </div>
        <div className="card">
          <ProductForm
            onSubmit={handleSubmit as Parameters<typeof ProductForm>[0]["onSubmit"]}
            loading={loading}
            submitLabel="Create product"
          />
        </div>
      </div>

      {/* Barcode print modal — shown after successful creation */}
      <Modal
        open={!!createdProduct}
        onClose={() => { setCreatedProduct(null); router.push("/stock/inventory"); }}
        title="Print barcode labels"
        size="sm"
      >
        {createdProduct && (
          <BarcodePrintModal
            product={createdProduct}
            onClose={() => { setCreatedProduct(null); router.push("/stock/inventory"); }}
            onDone={() => { setCreatedProduct(null); router.push("/stock/inventory"); }}
          />
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

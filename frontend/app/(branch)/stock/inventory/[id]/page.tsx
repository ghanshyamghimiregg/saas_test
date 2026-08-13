"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { FrameProduct } from "@/lib/types";
import { ProductForm } from "../ProductForm";
import { PageSpinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [product,        setProduct]        = useState<FrameProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [saving,         setSaving]         = useState(false);
  const { toast, show, dismiss } = useToast();

  useEffect(() => {
    api.get<FrameProduct>(`/inventory/frames/${id}`)
      .then(setProduct)
      .catch((e: unknown) => {
        if (e instanceof Error && e.message.includes("404")) setNotFound(true);
        else show(e instanceof Error ? e.message : "Failed to load", "error");
      })
      .finally(() => setLoadingProduct(false));
  }, [id]); // eslint-disable-line

  async function handleSubmit(data: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.patch(`/inventory/frames/${id}`, data);
      show("Product updated", "success");
      setTimeout(() => router.push("/stock/inventory"), 600);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to save", "error");
    } finally { setSaving(false); }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate this product? It will no longer appear in inventory — sale history is preserved.")) return;
    try {
      await api.delete(`/inventory/frames/${id}`);
      show("Product deactivated", "success");
      setTimeout(() => router.push("/stock/inventory"), 600);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to deactivate", "error");
    }
  }

  if (loadingProduct) return <PageSpinner label="Loading product…" />;

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-ink-muted">Product not found</p>
        <p className="text-xs text-ink-faint mt-1 mb-4">It may have been deleted or the ID is incorrect.</p>
        <button className="btn-secondary btn-sm" onClick={() => router.push("/stock/inventory")}>
          ← Back to inventory
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn-ghost btn-sm"
              aria-label="Go back"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h1>Edit product</h1>
          </div>
          <button
            className="btn-danger btn-sm"
            onClick={handleDeactivate}
            aria-label="Deactivate product"
          >
            Deactivate
          </button>
        </div>

        {/* Identity badge */}
        <div className="card-flat mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-ink-faint">Barcode</span>
            <span className="font-mono font-semibold text-ink tracking-wide">{product.barcode}</span>
          </div>
          {product.sku && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-faint">SKU</span>
              <span className="font-mono text-ink">{product.sku}</span>
            </div>
          )}
          {product.product_code && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-faint">Code</span>
              <span className="font-mono text-ink">{product.product_code}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className={product.is_active ? "badge-green" : "badge-gray"}>
              {product.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="card-flat">
          <ProductForm
            defaultValues={product as Parameters<typeof ProductForm>[0]["defaultValues"]}
            onSubmit={handleSubmit as Parameters<typeof ProductForm>[0]["onSubmit"]}
            loading={saving}
            submitLabel="Save changes"
          />
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

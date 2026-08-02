"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { FrameProduct } from "@/lib/types";
import { ProductForm } from "../ProductForm";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<FrameProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, show, dismiss } = useToast();

  useEffect(() => {
    api.get<FrameProduct>(`/inventory/frames/${id}`)
      .then(setProduct)
      .catch((e: unknown) => show(e instanceof Error ? e.message : "Failed to load", "error"))
      .finally(() => setLoadingProduct(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.patch(`/inventory/frames/${id}`, data);
      show("Product updated", "success");
      setTimeout(() => router.push("/stock/inventory"), 600);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate this product? It will no longer appear in inventory but sale history is preserved.")) return;
    try {
      await api.delete(`/inventory/frames/${id}`);
      show("Product deactivated", "success");
      setTimeout(() => router.push("/stock/inventory"), 600);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to deactivate", "error");
    }
  }

  if (loadingProduct) {
    return <div className="flex justify-center py-20"><Spinner size={8} /></div>;
  }
  if (!product) {
    return <div className="text-center py-20 text-slate-400">Product not found</div>;
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 text-lg" aria-label="Back">←</button>
            <h1>Edit product</h1>
          </div>
          <button className="btn-danger btn-sm" onClick={handleDeactivate}>
            Deactivate
          </button>
        </div>

        <div className="card mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-slate-400">Barcode:</span>{" "}
              <span className="font-mono font-medium">{product.barcode}</span>
            </div>
            {product.sku && (
              <div>
                <span className="text-slate-400">SKU:</span>{" "}
                <span className="font-mono">{product.sku}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <ProductForm
            defaultValues={product as Parameters<typeof ProductForm>[0]["defaultValues"]}
            onSubmit={handleSubmit as Parameters<typeof ProductForm>[0]["onSubmit"]}
            loading={saving}
          />
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

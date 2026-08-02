"use client";
import { useState, FormEvent } from "react";
import { api } from "@/lib/api";
import type { FrameProduct } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";

const REASONS = ["physical_count", "damage", "theft", "correction", "other"];

interface Props {
  product: FrameProduct;
  onDone: () => void;
  onError: (msg: string) => void;
}

export function StockAdjustForm({ product, onDone, onError }: Props) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = delta !== "" ? product.quantity + Number(delta) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!delta || delta === "0") { onError("Delta must be non-zero"); return; }
    setLoading(true);
    try {
      await api.post(`/inventory/frames/${product.id}/adjust-stock`, {
        delta: Number(delta),
        reason,
        notes: notes || undefined,
      });
      onDone();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3 text-sm">
        <span className="text-slate-500">Current stock:</span>{" "}
        <span className="font-semibold">{product.quantity}</span>
        {preview !== null && (
          <>
            {" "}→{" "}
            <span className={preview < 0 ? "text-red-600 font-semibold" : "font-semibold"}>
              {preview}
            </span>
          </>
        )}
      </div>

      <div>
        <label className="label">Delta (+ to add, − to remove)</label>
        <input
          type="number"
          className="input"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="e.g. -2 or +10"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label">Reason</label>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} required>
          {REASONS.map((r) => (
            <option key={r} value={r}>{r.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context…"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? <Spinner size={4} /> : "Apply adjustment"}
        </button>
      </div>
    </form>
  );
}

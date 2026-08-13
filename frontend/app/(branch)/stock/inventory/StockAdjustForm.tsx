"use client";
import { useState, FormEvent } from "react";
import { api } from "@/lib/api";
import type { FrameProduct } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";

const REASONS = [
  { value: "physical_count", label: "Physical count" },
  { value: "damage",         label: "Damage / write-off" },
  { value: "theft",          label: "Theft" },
  { value: "correction",     label: "Correction" },
  { value: "other",          label: "Other" },
];

interface Props {
  product: FrameProduct;
  onDone:  () => void;
  onError: (msg: string) => void;
}

export function StockAdjustForm({ product, onDone, onError }: Props) {
  const [delta,  setDelta]  = useState("");
  const [reason, setReason] = useState(REASONS[0].value);
  const [notes,  setNotes]  = useState("");
  const [loading, setLoading] = useState(false);

  const deltaNum = delta !== "" ? Number(delta) : null;
  const preview  = deltaNum !== null ? product.quantity + deltaNum : null;
  const negative = preview !== null && preview < 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!delta || delta === "0") { onError("Delta must be non-zero"); return; }
    setLoading(true);
    try {
      await api.post(`/inventory/frames/${product.id}/adjust-stock`, {
        delta:  Number(delta),
        reason,
        notes:  notes || undefined,
      });
      onDone();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Adjustment failed");
    } finally {
      setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stock preview row */}
      <div className="flex items-center gap-3 bg-canvas rounded-md px-4 py-3 border border-border">
        <div className="text-xs text-ink-muted">Current</div>
        <div className="font-mono font-semibold text-lg text-ink tabular-nums">{product.quantity}</div>
        {preview !== null && (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-faint flex-shrink-0" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
            <div className="text-xs text-ink-muted">After</div>
            <div className={[
              "font-mono font-semibold text-lg tabular-nums",
              negative ? "text-signal-red" : deltaNum! > 0 ? "text-signal-green" : "text-ink",
            ].join(" ")}>
              {preview}
            </div>
            {negative && (
              <span className="text-xs text-signal-red ml-auto">Below zero</span>
            )}
          </>
        )}
      </div>

      {/* Delta input */}
      <div>
        <label htmlFor="adj-delta" className="label">
          Quantity change <span className="text-signal-red" aria-hidden="true">*</span>
        </label>
        <input
          id="adj-delta"
          type="number"
          className="input-mono"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="+10 to add, −3 to remove"
          required
          autoFocus
          aria-describedby="adj-delta-hint"
        />
        <p id="adj-delta-hint" className="text-xs text-ink-faint mt-1">
          Use a negative number to reduce stock
        </p>
      </div>

      {/* Reason */}
      <div>
        <label htmlFor="adj-reason" className="label">Reason <span className="text-signal-red" aria-hidden="true">*</span></label>
        <select
          id="adj-reason"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        >
          {REASONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="adj-notes" className="label">Notes</label>
        <textarea
          id="adj-notes"
          className="input resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional context or reference…"
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full mt-1"
        disabled={loading || !delta || delta === "0" || negative}
      >
        {loading ? <Spinner size={4} /> : "Apply adjustment"}
      </button>
    </form>
  );
}

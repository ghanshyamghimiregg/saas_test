"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { DiscountConfig, MembershipTier } from "@/lib/types";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";

export default function ConfigPage() {
  const { toast, show, dismiss } = useToast();
  const [discountCfg, setDiscountCfg] = useState<DiscountConfig | null>(null);
  const [tiers,       setTiers]       = useState<MembershipTier[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null); // which thing is saving

  useEffect(() => {
    Promise.all([
      api.get<DiscountConfig>("/admin/discount-config"),
      api.get<MembershipTier[]>("/admin/membership-tiers"),
    ])
      .then(([dc, mt]) => { setDiscountCfg(dc); setTiers(mt); })
      .catch((e: unknown) => show(e instanceof Error ? e.message : "Failed to load", "error"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  async function saveDiscounts() {
    if (!discountCfg) return;
    setSaving("discounts");
    try {
      const updated = await api.patch<DiscountConfig>("/admin/discount-config", {
        owner_pct:            Number(discountCfg.owner_pct),
        salesman_pct:         Number(discountCfg.salesman_pct),
        regular_customer_pct: Number(discountCfg.regular_customer_pct),
        allow_stacking:       discountCfg.allow_stacking,
      });
      setDiscountCfg(updated);
      show("Discount settings saved", "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSaving(null); }
  }

  async function saveTier(tier: MembershipTier) {
    setSaving(tier.id);
    try {
      const updated = await api.patch<MembershipTier>(`/admin/membership-tiers/${tier.id}`, {
        tier_name:     tier.tier_name,
        min_purchases: Number(tier.min_purchases),
        discount_pct:  Number(tier.discount_pct),
      });
      setTiers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      show(`${updated.tier_name} saved`, "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSaving(null); }
  }

  function updateTier(id: string, field: keyof MembershipTier, value: string | number) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  if (loading) return <PageSpinner label="Loading configuration…" />;

  return (
    <>
      <div className="mb-6">
        <h1>Configuration</h1>
        <p className="text-sm text-ink-muted mt-1">Discount rules and membership tiers apply across all branches</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* ── Discount percentages ──────────────────────────────────── */}
        <section className="card-flat" aria-labelledby="disc-heading">
          <h2 id="disc-heading" className="mb-1">Discount percentages</h2>
          <p className="text-xs text-ink-faint mb-5">
            Applied when a cashier selects the corresponding type at checkout.
          </p>

          {discountCfg && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  ["owner_pct",            "Owner discount (%)"],
                  ["salesman_pct",         "Salesman discount (%)"],
                  ["regular_customer_pct", "Regular customer (%)"],
                ] as const).map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={`disc-${field}`} className="label">{label}</label>
                    <input
                      id={`disc-${field}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="input-mono"
                      value={discountCfg[field]}
                      onChange={(e) =>
                        setDiscountCfg((prev) =>
                          prev ? { ...prev, [field]: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Stacking rule */}
              <div className="border border-border rounded-md p-4 bg-canvas">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="allow-stacking"
                    type="checkbox"
                    className="w-4 h-4 rounded border-border accent-accent mt-0.5 flex-shrink-0"
                    checked={discountCfg.allow_stacking}
                    onChange={(e) =>
                      setDiscountCfg((prev) =>
                        prev ? { ...prev, allow_stacking: e.target.checked } : prev,
                      )
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-ink">Allow discount stacking</span>
                    <p className="text-xs text-ink-muted mt-0.5">
                      <strong>Off (default):</strong> highest applicable discount wins.{" "}
                      <strong>On:</strong> all applicable discounts are summed.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                {discountCfg.updated_at && (
                  <p className="text-xs text-ink-faint">
                    Last updated{" "}
                    <span className="font-mono">{new Date(discountCfg.updated_at).toLocaleString()}</span>
                    {discountCfg.updated_by && ` by ${discountCfg.updated_by}`}
                  </p>
                )}
                <button
                  className="btn-primary btn-sm ml-auto"
                  onClick={saveDiscounts}
                  disabled={saving === "discounts"}
                  aria-label="Save discount settings"
                >
                  {saving === "discounts" ? <Spinner size={3} /> : "Save discounts"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Membership tiers ─────────────────────────────────────── */}
        <section aria-labelledby="tier-heading">
          <div className="mb-4">
            <h2 id="tier-heading">Membership tiers</h2>
            <p className="text-xs text-ink-faint mt-1">
              Customers auto-qualify based on total completed purchases across all branches.
              Higher tiers unlock higher discount percentages at checkout.
            </p>
          </div>

          <div className="space-y-3">
            {tiers
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((tier, idx) => (
              <div key={tier.id} className="card-flat">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-5 h-5 rounded-full bg-accent-light text-accent text-xs font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <input
                    className="input flex-1 font-medium text-sm"
                    value={tier.tier_name}
                    onChange={(e) => updateTier(tier.id, "tier_name", e.target.value)}
                    aria-label={`Tier ${idx + 1} name`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor={`tier-min-${tier.id}`} className="label">
                      Min purchases
                    </label>
                    <input
                      id={`tier-min-${tier.id}`}
                      type="number"
                      min="1"
                      className="input-mono"
                      value={tier.min_purchases}
                      onChange={(e) => updateTier(tier.id, "min_purchases", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label htmlFor={`tier-pct-${tier.id}`} className="label">
                      Discount (%)
                    </label>
                    <input
                      id={`tier-pct-${tier.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="input-mono"
                      value={tier.discount_pct}
                      onChange={(e) => updateTier(tier.id, "discount_pct", e.target.value)}
                    />
                  </div>
                </div>
                {tier.updated_at && (
                  <p className="text-2xs text-ink-faint mb-3">
                    Last saved{" "}
                    <span className="font-mono">{new Date(tier.updated_at).toLocaleDateString()}</span>
                  </p>
                )}
                <div className="flex justify-end border-t border-border pt-3">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => saveTier(tier)}
                    disabled={saving === tier.id}
                    aria-label={`Save ${tier.tier_name}`}
                  >
                    {saving === tier.id ? <Spinner size={3} /> : "Save tier"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

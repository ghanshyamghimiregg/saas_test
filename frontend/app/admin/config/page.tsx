"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { DiscountConfig, MembershipTier } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";

export default function ConfigPage() {
  const { toast, show, dismiss } = useToast();
  const [discountCfg, setDiscountCfg] = useState<DiscountConfig | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const updated = await api.patch<DiscountConfig>("/admin/discount-config", {
        owner_pct: Number(discountCfg.owner_pct),
        salesman_pct: Number(discountCfg.salesman_pct),
        regular_customer_pct: Number(discountCfg.regular_customer_pct),
        allow_stacking: discountCfg.allow_stacking,
      });
      setDiscountCfg(updated);
      show("Discount settings saved", "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSaving(false); }
  }

  async function saveTier(tier: MembershipTier) {
    setSaving(true);
    try {
      const updated = await api.patch<MembershipTier>(
        `/admin/membership-tiers/${tier.id}`,
        {
          tier_name: tier.tier_name,
          min_purchases: Number(tier.min_purchases),
          discount_pct: Number(tier.discount_pct),
        },
      );
      setTiers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      show(`${updated.tier_name} saved`, "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Save failed", "error");
    } finally { setSaving(false); }
  }

  function updateTier(id: string, field: keyof MembershipTier, value: string | number) {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={8} /></div>;

  return (
    <>
      <h1 className="mb-6">Configuration</h1>

      {/* Discount config */}
      <div className="card mb-6">
        <h2 className="mb-1">Discount percentages</h2>
        <p className="text-sm text-slate-400 mb-5">
          Applied when cashier selects the corresponding discount type at checkout.
        </p>

        {discountCfg && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  ["owner_pct", "Owner discount (%)"],
                  ["salesman_pct", "Salesman discount (%)"],
                  ["regular_customer_pct", "Regular customer discount (%)"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input"
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

            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-border w-4 h-4"
                  checked={discountCfg.allow_stacking}
                  onChange={(e) =>
                    setDiscountCfg((prev) =>
                      prev ? { ...prev, allow_stacking: e.target.checked } : prev,
                    )
                  }
                />
                <span className="text-sm text-slate-700">
                  Allow discount stacking (sum all applicable discounts)
                </span>
              </label>
              <p className="text-xs text-slate-400 mt-1 ml-7">
                When off (default): highest single discount wins. When on: discounts add up.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              {discountCfg.updated_at && (
                <p className="text-xs text-slate-400">
                  Last updated: {new Date(discountCfg.updated_at).toLocaleString()}
                  {discountCfg.updated_by && ` by ${discountCfg.updated_by}`}
                </p>
              )}
              <button className="btn-primary" onClick={saveDiscounts} disabled={saving}>
                {saving ? <Spinner size={4} /> : "Save discounts"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Membership tiers */}
      <div className="card">
        <h2 className="mb-1">Membership tiers</h2>
        <p className="text-sm text-slate-400 mb-5">
          Customers auto-qualify for a tier based on total completed purchases (across all branches).
        </p>

        <div className="space-y-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-lg border border-border p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Tier name</label>
                  <input
                    className="input"
                    value={tier.tier_name}
                    onChange={(e) => updateTier(tier.id, "tier_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Min purchases</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={tier.min_purchases}
                    onChange={(e) => updateTier(tier.id, "min_purchases", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label">Discount (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input"
                    value={tier.discount_pct}
                    onChange={(e) => updateTier(tier.id, "discount_pct", e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => saveTier(tier)}
                  disabled={saving}
                >
                  {saving ? <Spinner size={3} /> : "Save tier"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

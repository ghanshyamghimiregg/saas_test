"use client";
import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getBranchId } from "@/lib/auth";
import type { FrameProduct, CartItem, Customer, Sale } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";
import { Toast, useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

const DISCOUNT_TYPES = [
  { value: "none", label: "No discount" },
  { value: "owner", label: "Owner discount" },
  { value: "salesman", label: "Salesman discount" },
  { value: "regular_customer", label: "Regular customer" },
  { value: "membership_tier", label: "Membership tier" },
] as const;

type DiscountType = typeof DISCOUNT_TYPES[number]["value"];
type PaymentMethod = "cash" | "online_pending";

export default function POSPage() {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();
  const branchId = getBranchId();

  // --- Search / scan ---
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanInput, setScanInput] = useState("");
  const [searchResults, setSearchResults] = useState<FrameProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // --- Cart ---
  const [cart, setCart] = useState<CartItem[]>([]);

  // --- Customer ---
  const [customerPhone, setCustomerPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  // --- Discount ---
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [suggestedDiscount, setSuggestedDiscount] = useState<string | null>(null);

  // --- Payment ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashTendered, setCashTendered] = useState("");

  // --- Sale state ---
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [invoiceFormat, setInvoiceFormat] = useState<"a4" | "thermal">("a4");
  const [heldSales, setHeldSales] = useState<Sale[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  // Auto-focus scan input on mount only.
  // We deliberately do NOT re-focus on every render — that steals focus from
  // the discount dropdown, cash tendered input, and every other interactive element.
  useEffect(() => {
    scanRef.current?.focus();
  }, []); // empty deps = mount only

  // Load held sales on mount
  useEffect(() => {
    if (!branchId) return;
    api.get<Sale[]>(`/sales/held?branch_id=${branchId}`)
      .then(setHeldSales)
      .catch(() => {});
  }, [branchId]);

  // --- Barcode scanner support ---
  // Hardware scanners send rapid keystrokes ending in Enter.
  // We debounce: if Enter fires < 50ms after last keystroke = scanner input.
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const val = scanInput.trim();
    if (!val) return;
    handleProductSearch(val);
    setScanInput("");
  }

  const handleProductSearch = useCallback(
    async (q: string) => {
      if (!branchId || !q) return;
      setSearchLoading(true);
      try {
        // Try exact barcode first
        try {
          const frame = await api.get<FrameProduct>(`/inventory/frames/scan/${encodeURIComponent(q)}`);
          addToCart(frame);
          setSearchResults([]);
          return;
        } catch {}
        // Fall back to text search
        const results = await api.get<FrameProduct[]>(
          `/inventory/frames/search?branch_id=${branchId}&q=${encodeURIComponent(q)}&limit=10`,
        );
        setSearchResults(results);
      } catch (e: unknown) {
        show(e instanceof Error ? e.message : "Search failed", "error");
      } finally {
        setSearchLoading(false);
      }
    },
    [branchId, show],
  );

  // Debounced search-as-you-type (not for scanner — scanner uses Enter)
  useEffect(() => {
    if (!scanInput || scanInput.length < 2) { setSearchResults([]); return; }
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => handleProductSearch(scanInput), 350);
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, [scanInput, handleProductSearch]);

  function addToCart(frame: FrameProduct) {
    if (frame.quantity <= 0) { show(`'${frame.name}' is out of stock`, "error"); return; }
    setCart((prev) => {
      const existing = prev.find((c) => c.frame.id === frame.id);
      if (existing) {
        if (existing.quantity >= frame.quantity) {
          show(`Only ${frame.quantity} in stock`, "error");
          return prev;
        }
        return prev.map((c) =>
          c.frame.id === frame.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { frame, quantity: 1 }];
    });
    setScanInput("");
    setSearchResults([]);
    // Refocus scan bar after adding a product so the next scan is captured immediately
    setTimeout(() => scanRef.current?.focus(), 0);
  }

  function updateQty(frameId: string, qty: number) {
    if (qty <= 0) { removeFromCart(frameId); return; }
    setCart((prev) =>
      prev.map((c) => {
        if (c.frame.id !== frameId) return c;
        if (qty > c.frame.quantity) { show(`Only ${c.frame.quantity} in stock`, "error"); return c; }
        return { ...c, quantity: qty };
      }),
    );
  }

  function removeFromCart(frameId: string) {
    setCart((prev) => prev.filter((c) => c.frame.id !== frameId));
  }

  function clearCart() {
    setCart([]);
    setCustomer(null);
    setCustomerPhone("");
    setCustomerName("");
    setDiscountType("none");
    setCashTendered("");
    setSuggestedDiscount(null);
  }

  // --- Customer lookup ---
  async function lookupCustomer() {
    if (customerPhone.length !== 10) { show("Enter a valid 10-digit phone number", "error"); return; }
    setCustomerLoading(true);
    try {
      const found = await api.get<Customer | null>(`/customers/lookup?phone=${customerPhone}`);
      if (found) {
        setCustomer(found);
        // Get discount suggestion
        const sugg = await api.get<{ suggested_discount_type: string }>(
          `/sales/suggest-discount?customer_id=${found.id}`,
        );
        if (sugg.suggested_discount_type !== "none") {
          setSuggestedDiscount(sugg.suggested_discount_type);
          show(`Membership discount available: ${sugg.suggested_discount_type}`, "info");
        }
      } else {
        setCustomer(null);
        show("New customer — will be created on checkout", "info");
      }
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Lookup failed", "error");
    } finally {
      setCustomerLoading(false);
    }
  }

  // --- Totals ---
  const subtotal = cart.reduce((s, c) => s + Number(c.frame.selling_price) * c.quantity, 0);

  // --- Checkout ---
  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (!branchId) { router.push("/login"); return; }
    if (!cart.length) { show("Cart is empty", "error"); return; }
    if (paymentMethod === "cash" && (!cashTendered || Number(cashTendered) <= 0)) {
      show("Enter cash tendered amount", "error");
      return;
    }

    setCheckoutLoading(true);
    try {
      let customerId: string | undefined;

      // Create customer if new phone+name
      if (customerPhone && !customer) {
        if (!customerName.trim()) { show("Enter customer name for new customer", "error"); setCheckoutLoading(false); return; }
        const newCustomer = await api.post<Customer>("/customers/", {
          full_name: customerName.trim(),
          phone: customerPhone,
        });
        customerId = newCustomer.id;
      } else if (customer) {
        customerId = customer.id;
      }

      const sale = await api.post<Sale>("/sales/checkout", {
        branch_id: branchId,
        customer_id: customerId ?? null,
        discount_type: discountType,
        payment_method: paymentMethod,
        cash_tendered: paymentMethod === "cash" ? Number(cashTendered) : null,
        line_items: cart.map((c) => ({ frame_id: c.frame.id, quantity: c.quantity })),
      });

      setCompletedSale(sale);
      clearCart();
      show(`Sale ${sale.invoice_number} completed`, "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Checkout failed", "error");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // --- Hold sale ---
  async function handleHold() {
    if (!branchId || !cart.length) return;
    try {
      await api.post<Sale>("/sales/hold", {
        branch_id: branchId,
        customer_id: customer?.id ?? null,
        line_items: cart.map((c) => ({ frame_id: c.frame.id, quantity: c.quantity })),
      });
      clearCart();
      show("Sale held", "info");
      const held = await api.get<Sale[]>(`/sales/held?branch_id=${branchId}`);
      setHeldSales(held);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Hold failed", "error");
    }
  }

  // Resume held sale — load its items back into cart
  async function resumeHeld(sale: Sale) {
    clearCart();
    const items: CartItem[] = [];
    for (const li of sale.line_items) {
      if (!li.frame_id) continue;
      try {
        const frame = await api.get<FrameProduct>(`/inventory/frames/${li.frame_id}`);
        items.push({ frame, quantity: li.quantity });
      } catch {}
    }
    setCart(items);
    setShowHeld(false);
    // void the held record
    await api.post(`/sales/${sale.id}/void`).catch(() => {});
    setHeldSales((prev) => prev.filter((s) => s.id !== sale.id));
  }

  function openInvoice(saleId: string, fmt: "a4" | "thermal") {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    // Use a direct link with token in query param — works without popup blocker issues
    const url = `${base}/sales/${saleId}/invoice?fmt=${fmt}&token=${encodeURIComponent(token || "")}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ------------------------------------------------------------------ //
  // Render
  // ------------------------------------------------------------------ //
  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* LEFT — product search */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
          {/* Scan bar */}
          <div className="p-4 border-b border-border bg-white">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7V5a1 1 0 0 1 1-1h2M3 17v2a1 1 0 0 0 1 1h2M17 3h2a1 1 0 0 1 1 1v2M17 21h2a1 1 0 0 0 1-1v-2M7 12h10" />
                </svg>
              </span>
              <input
                ref={scanRef}
                className="input pl-9"
                placeholder="Scan barcode or search by name / brand / SKU…"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                aria-label="Barcode scanner input"
                autoComplete="off"
              />
              {searchLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size={4} />
                </span>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <Link href="/stock/inventory" className="btn-secondary btn-sm flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                </svg>
                Go to Inventory
              </Link>
            </div>
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:border-accent hover:bg-accent-light transition-colors flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {p.brand} · {p.barcode} · Stock: {p.quantity}
                      </div>
                    </div>
                    <div className="font-semibold text-accent shrink-0">
                      NPR {Number(p.selling_price).toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-300 text-sm pt-16 select-none">
                <svg className="mx-auto mb-3 text-slate-200" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="6" cy="12" r="4" /><circle cx="18" cy="12" r="4" /><path d="M10 12h4" />
                </svg>
                Scan a barcode or type to search
              </div>
            )}
          </div>

          {/* Held sales button */}
          {heldSales.length > 0 && (
            <div className="p-3 border-t border-border bg-amber-50">
              <button
                onClick={() => setShowHeld(true)}
                className="btn-secondary btn-sm w-full"
              >
                Resume held sale ({heldSales.length})
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — cart + checkout */}
        <div className="w-[400px] flex flex-col bg-white overflow-hidden shrink-0">
          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 select-none">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <p className="mt-2 text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map(({ frame, quantity }) => (
                  <div key={frame.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{frame.name}</div>
                      <div className="text-xs text-slate-400">{frame.brand}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="w-7 h-7 rounded border border-border text-slate-600 hover:bg-slate-100 text-sm font-bold"
                        onClick={() => updateQty(frame.id, quantity - 1)}
                        aria-label="Decrease quantity"
                      >−</button>
                      <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                      <button
                        className="w-7 h-7 rounded border border-border text-slate-600 hover:bg-slate-100 text-sm font-bold"
                        onClick={() => updateQty(frame.id, quantity + 1)}
                        aria-label="Increase quantity"
                      >+</button>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 w-24 text-right shrink-0">
                      NPR {(Number(frame.selling_price) * quantity).toFixed(2)}
                    </div>
                    <button
                      className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                      onClick={() => removeFromCart(frame.id)}
                      aria-label={`Remove ${frame.name}`}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout form */}
          <form onSubmit={handleCheckout} className="border-t border-border p-4 space-y-3 bg-slate-50">
            {/* Customer */}
            <div>
              <label className="label">Customer (optional)</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm shrink-0"
                  onClick={lookupCustomer}
                  disabled={customerLoading}
                >
                  {customerLoading ? <Spinner size={3} /> : "Look up"}
                </button>
              </div>
              {customer ? (
                <div className="mt-1.5 text-xs bg-indigo-50 text-indigo-700 rounded px-2 py-1.5">
                  {customer.full_name} · {customer.purchase_count} purchases
                  {customer.badge_tier && ` · ${customer.badge_tier}`}
                  {suggestedDiscount && ` · Eligible: ${suggestedDiscount}`}
                </div>
              ) : customerPhone.length === 10 ? (
                <input
                  className="input mt-1.5"
                  placeholder="New customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              ) : null}
            </div>

            {/* Discount */}
            <div>
              <label className="label">Discount</label>
              <select
                className="input"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              >
                {DISCOUNT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                    {d.value === suggestedDiscount ? " ✓ suggested" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment method */}
            <div>
              <label className="label">Payment</label>
              <div className="flex gap-2">
                {(["cash", "online_pending"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      paymentMethod === m
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {m === "cash" ? "Cash" : "Online"}
                  </button>
                ))}
              </div>
              {paymentMethod === "online_pending" && (
                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1">
                  Online payment recorded as pending — no gateway connected yet.
                </p>
              )}
            </div>

            {/* Cash tendered */}
            {paymentMethod === "cash" && (
              <div>
                <label className="label">Cash tendered</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  placeholder="Amount received"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                />
                {cashTendered && subtotal > 0 && (
                  <div className="text-xs mt-1 text-slate-500">
                    Change due:{" "}
                    <span className="font-semibold text-slate-800">
                      NPR {Math.max(0, Number(cashTendered) - subtotal).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Subtotal + discount preview */}
            <div className="space-y-1 pt-1 border-t border-border text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>NPR {subtotal.toFixed(2)}</span>
              </div>
              {discountType !== "none" && subtotal > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs">
                  <span>{DISCOUNT_TYPES.find(d => d.value === discountType)?.label}</span>
                  <span>− applied at checkout</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Total</span>
                <span>NPR {subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={handleHold}
                disabled={!cart.length}
              >
                Hold
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={checkoutLoading || !cart.length}
              >
                {checkoutLoading ? <Spinner size={4} /> : "Charge"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Completed sale modal */}
      <Modal
        open={!!completedSale}
        onClose={() => setCompletedSale(null)}
        title="Sale complete"
        size="sm"
      >
        {completedSale && (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-1">✓</div>
              <div className="font-semibold text-emerald-800">{completedSale.invoice_number}</div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">
                NPR {Number(completedSale.total).toFixed(2)}
              </div>
              {Number(completedSale.discount) > 0 && (
                <div className="text-sm text-emerald-600 mt-1">
                  {completedSale.discount_type.replace("_", " ")} discount ({Number(completedSale.discount_pct ?? 0).toFixed(1)}%)
                  {" "}saved NPR {Number(completedSale.discount).toFixed(2)}
                </div>
              )}
              {completedSale.change_due && Number(completedSale.change_due) > 0 && (
                <div className="text-sm text-emerald-700 mt-1">
                  Change: NPR {Number(completedSale.change_due).toFixed(2)}
                </div>
              )}
            </div>
            <div>
              <label className="label">Invoice format</label>
              <div className="flex gap-2">
                {(["a4", "thermal"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setInvoiceFormat(f)}
                    className={`flex-1 py-1.5 rounded-md text-sm border transition-colors ${
                      invoiceFormat === f
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border text-slate-600"
                    }`}
                  >
                    {f === "a4" ? "A4" : "Thermal (80mm)"}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => openInvoice(completedSale.id, invoiceFormat)}
            >
              Print / view invoice
            </button>
            <button className="btn-secondary w-full" onClick={() => setCompletedSale(null)}>
              New sale
            </button>
          </div>
        )}
      </Modal>

      {/* Held sales modal */}
      <Modal open={showHeld} onClose={() => setShowHeld(false)} title="Held sales" size="md">
        <div className="space-y-2">
          {heldSales.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-800">
                  {s.line_items.length} item{s.line_items.length !== 1 ? "s" : ""}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(s.created_at).toLocaleTimeString()} · {s.notes || "No notes"}
                </div>
              </div>
              <button className="btn-primary btn-sm" onClick={() => resumeHeld(s)}>
                Resume
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

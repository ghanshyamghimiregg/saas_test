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
  { value: "none",             label: "No discount" },
  { value: "owner",            label: "Owner discount" },
  { value: "salesman",         label: "Salesman discount" },
  { value: "regular_customer", label: "Regular customer" },
  { value: "membership_tier",  label: "Membership tier" },
] as const;

type DiscountType  = typeof DISCOUNT_TYPES[number]["value"];
type PaymentMethod = "cash" | "online_pending";

// ── Quick-add product modal ────────────────────────────────────────────────────
// Minimal fields needed to add a new product from the POS and sell it immediately.
function QuickAddModal({
  open,
  initialName,
  branchId,
  onAdded,
  onClose,
}: {
  open:        boolean;
  initialName: string;
  branchId:    string;
  onAdded:     (product: FrameProduct) => void;
  onClose:     () => void;
}) {
  const [name,     setName]     = useState(initialName);
  const [price,    setPrice]    = useState("");
  const [quantity, setQuantity] = useState("1");
  const [brand,    setBrand]    = useState("");
  const [category, setCategory] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Reset fields when modal opens with a new name
  useEffect(() => {
    if (open) {
      setName(initialName);
      setPrice("");
      setQuantity("1");
      setBrand("");
      setCategory("");
      setError(null);
    }
  }, [open, initialName]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim())         { setError("Product name is required"); return; }
    if (!price || Number(price) <= 0) { setError("Selling price is required"); return; }
    if (!quantity || Number(quantity) < 1) { setError("Quantity must be at least 1"); return; }

    setSaving(true);
    try {
      // Auto-generate a product code from name + timestamp
      const ts          = Date.now().toString(36).toUpperCase();
      const productCode = `${name.trim().slice(0, 4).toUpperCase().replace(/\s/g, "")}-${ts}`;

      const product = await api.post<FrameProduct>("/inventory/frames", {
        branch_id:    branchId,
        name:         name.trim(),
        selling_price: Number(price),
        quantity:     Number(quantity),
        brand:        brand.trim() || null,
        category:     category || null,
        product_code: productCode,
      });

      onAdded(product);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add new product to inventory" size="sm">
      <div className="space-y-4">
        {/* Context banner */}
        <div className="alert-info text-xs flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            Product not in inventory. Fill in the essentials — it will be added to stock and placed in your cart.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {/* Name */}
          <div>
            <label htmlFor="qa-name" className="label label-required">Product name</label>
            <input
              id="qa-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Price + Qty side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qa-price" className="label label-required">Selling price (NPR)</label>
              <input
                id="qa-price"
                type="number"
                step="1"
                min="0"
                className="input-mono"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label htmlFor="qa-qty" className="label label-required">Quantity</label>
              <input
                id="qa-qty"
                type="number"
                step="1"
                min="1"
                className="input-mono"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {/* Brand */}
          <div>
            <label htmlFor="qa-brand" className="label">Brand</label>
            <input
              id="qa-brand"
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="qa-cat" className="label">Category</label>
            <select
              id="qa-cat"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— optional —</option>
              {["sunglasses", "optical_frame", "contact_lens", "reading_glasses", "lens_only", "accessories"].map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {error && (
            <div role="alert" className="field-error">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? <Spinner size={4} /> : "Add & sell"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ── Main POS page ──────────────────────────────────────────────────────────────
export default function POSPage() {
  const router   = useRouter();
  const { toast, show, dismiss } = useToast();
  const branchId = getBranchId();

  // Search / scan
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanInput,      setScanInput]      = useState("");
  const [searchResults,  setSearchResults]  = useState<FrameProduct[]>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer
  const [customerPhone,   setCustomerPhone]   = useState("");
  const [customer,        setCustomer]        = useState<Customer | null>(null);
  const [customerName,    setCustomerName]    = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  // Discount
  const [discountType,      setDiscountType]      = useState<DiscountType>("none");
  const [suggestedDiscount, setSuggestedDiscount] = useState<string | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashTendered,  setCashTendered]  = useState("");

  // Sale state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [completedSale,   setCompletedSale]   = useState<Sale | null>(null);
  const [invoiceFormat,   setInvoiceFormat]   = useState<"a4" | "thermal">("a4");
  const [heldSales,       setHeldSales]       = useState<Sale[]>([]);
  const [showHeld,        setShowHeld]        = useState(false);

  // Mobile: cart drawer open
  const [cartOpen, setCartOpen] = useState(false);

  // Quick-add: when search returns no results, offer to add the item to stock
  const [quickAddOpen,    setQuickAddOpen]    = useState(false);
  const [quickAddName,    setQuickAddName]    = useState("");
  // Track whether last search returned zero results (enables the "add it" prompt)
  const [searchExhausted, setSearchExhausted] = useState(false);

  // Auto-focus scan input on mount only — do NOT re-focus on re-renders
  // (that would steal focus from discount dropdown, cash input, etc.)
  useEffect(() => { scanRef.current?.focus(); }, []);

  useEffect(() => {
    if (!branchId) return;
    api.get<Sale[]>(`/sales/held?branch_id=${branchId}`)
      .then(setHeldSales)
      .catch(() => {});
  }, [branchId]);

  // ── Barcode scanner support ──────────────────────────────────────────────
  // Hardware scanners fire rapid keystrokes ending in Enter.
  // We use keyDown-Enter as the trigger so scanner and keyboard both work.
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
      // Don't clear searchExhausted here — that would cause the flicker.
      // It will be set to false only when we get actual results back.
      try {
        try {
          const frame = await api.get<FrameProduct>(`/inventory/frames/scan/${encodeURIComponent(q)}`);
          addToCart(frame);
          setSearchResults([]);
          setSearchExhausted(false);
          return;
        } catch { /* barcode miss — fall through to text search */ }
        const results = await api.get<FrameProduct[]>(
          `/inventory/frames/search?branch_id=${branchId}&q=${encodeURIComponent(q)}&limit=10`,
        );
        setSearchResults(results);
        setSearchExhausted(results.length === 0);
      } catch (e: unknown) {
        show(e instanceof Error ? e.message : "Search failed", "error");
      } finally {
        setSearchLoading(false);
      }
    },
    [branchId, show], // eslint-disable-line
  );

  // Debounced type-ahead (not scanner — scanner uses Enter)
  // searchExhausted is only cleared when input length drops below threshold,
  // never at the start of a new search — this eliminates the flicker.
  useEffect(() => {
    if (!scanInput || scanInput.length < 2) {
      setSearchResults([]);
      setSearchExhausted(false);
      return;
    }
    // While the user is still typing, don't show or hide the exhausted state —
    // just wait for the debounce to settle before updating it.
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => handleProductSearch(scanInput), 400);
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, [scanInput, handleProductSearch]);

  function addToCart(frame: FrameProduct) {
    if (frame.quantity <= 0) { show(`'${frame.name}' is out of stock`, "error"); return; }
    setCart((prev) => {
      const existing = prev.find((c) => c.frame.id === frame.id);
      if (existing) {
        if (existing.quantity >= frame.quantity) { show(`Only ${frame.quantity} in stock`, "error"); return prev; }
        return prev.map((c) => c.frame.id === frame.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { frame, quantity: 1 }];
    });
    setScanInput("");
    setSearchResults([]);
    setTimeout(() => scanRef.current?.focus(), 0);
  }

  function updateQty(frameId: string, qty: number) {
    if (qty <= 0) { removeFromCart(frameId); return; }
    setCart((prev) => prev.map((c) => {
      if (c.frame.id !== frameId) return c;
      if (qty > c.frame.quantity) { show(`Only ${c.frame.quantity} in stock`, "error"); return c; }
      return { ...c, quantity: qty };
    }));
  }

  function removeFromCart(frameId: string) {
    setCart((prev) => prev.filter((c) => c.frame.id !== frameId));
  }

  function handleQuickAdded(product: FrameProduct) {
    setQuickAddOpen(false);
    setSearchExhausted(false);
    setScanInput("");
    setSearchResults([]);
    // Add the newly created product directly to cart
    addToCart(product);
    show(`"${product.name}" added to inventory and cart`, "success");
  }

  function clearCart() {
    setCart([]); setCustomer(null); setCustomerPhone(""); setCustomerName("");
    setDiscountType("none"); setCashTendered(""); setSuggestedDiscount(null);
  }

  async function lookupCustomer() {
    if (customerPhone.length !== 10) { show("Enter a valid 10-digit phone number", "error"); return; }
    setCustomerLoading(true);
    try {
      const found = await api.get<Customer | null>(`/customers/lookup?phone=${customerPhone}`);
      if (found) {
        setCustomer(found);
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
    } finally { setCustomerLoading(false); }
  }

  const subtotal = cart.reduce((s, c) => s + Number(c.frame.selling_price) * c.quantity, 0);
  const cartCount = cart.reduce((n, c) => n + c.quantity, 0);

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (!branchId) { router.push("/login"); return; }
    if (!cart.length) { show("Cart is empty", "error"); return; }
    if (paymentMethod === "cash" && (!cashTendered || Number(cashTendered) <= 0)) {
      show("Enter cash tendered amount", "error"); return;
    }
    setCheckoutLoading(true);
    try {
      let customerId: string | undefined;
      if (customerPhone && !customer) {
        if (!customerName.trim()) { show("Enter customer name for new customer", "error"); setCheckoutLoading(false); return; }
        const nc = await api.post<Customer>("/customers/", { full_name: customerName.trim(), phone: customerPhone });
        customerId = nc.id;
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
      setCartOpen(false);
      show(`Sale ${sale.invoice_number} completed`, "success");
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Checkout failed", "error");
    } finally { setCheckoutLoading(false); }
  }

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

  async function resumeHeld(sale: Sale) {
    clearCart();
    const items: CartItem[] = [];
    for (const li of sale.line_items) {
      if (!li.frame_id) continue;
      try {
        const frame = await api.get<FrameProduct>(`/inventory/frames/${li.frame_id}`);
        items.push({ frame, quantity: li.quantity });
      } catch { /* skip unavailable */ }
    }
    setCart(items);
    setShowHeld(false);
    await api.post(`/sales/${sale.id}/void`).catch(() => {});
    setHeldSales((prev) => prev.filter((s) => s.id !== sale.id));
  }

  function openInvoice(saleId: string, fmt: "a4" | "thermal") {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
    const base  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const url   = `${base}/sales/${saleId}/invoice?fmt=${fmt}&token=${encodeURIComponent(token || "")}`;
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── Checkout panel (shared desktop + mobile drawer) ──────────────────────
  const CheckoutPanel = (
    <form onSubmit={handleCheckout} className="flex flex-col h-full" noValidate>
      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-ink-faint select-none">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="mb-2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-0.5">Scan or search a product to add</p>
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Cart items">
            {cart.map(({ frame, quantity }) => (
              <li key={frame.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{frame.name}</div>
                  <div className="text-xs text-ink-faint font-mono">
                    NPR {Number(frame.selling_price).toLocaleString("en-NP")} ea
                  </div>
                </div>
                {/* Quantity stepper */}
                <div className="flex items-center gap-1 shrink-0" role="group" aria-label={`Quantity for ${frame.name}`}>
                  <button
                    type="button"
                    className="w-7 h-7 rounded border border-border text-ink-muted hover:bg-canvas hover:text-ink text-sm font-bold transition-colors"
                    onClick={() => updateQty(frame.id, quantity - 1)}
                    aria-label="Decrease quantity"
                  >−</button>
                  <span className="w-7 text-center text-sm font-mono font-semibold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    className="w-7 h-7 rounded border border-border text-ink-muted hover:bg-canvas hover:text-ink text-sm font-bold transition-colors"
                    onClick={() => updateQty(frame.id, quantity + 1)}
                    aria-label="Increase quantity"
                  >+</button>
                </div>
                {/* Line total */}
                <div className="text-sm font-mono font-semibold tabular-nums text-ink w-24 text-right shrink-0">
                  {(Number(frame.selling_price) * quantity).toLocaleString("en-NP")}
                </div>
                <button
                  type="button"
                  className="text-ink-faint hover:text-signal-red transition-colors duration-150 ml-1 leading-none"
                  onClick={() => removeFromCart(frame.id)}
                  aria-label={`Remove ${frame.name}`}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Checkout controls */}
      <div className="border-t border-border bg-canvas px-4 py-4 space-y-3 shrink-0">

        {/* Customer */}
        <div>
          <label htmlFor="pos-phone" className="label">Customer (optional)</label>
          <div className="flex gap-2">
            <input
              id="pos-phone"
              className="input flex-1 font-mono"
              placeholder="10-digit phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              inputMode="numeric"
            />
            <button
              type="button"
              className="btn-secondary btn-sm shrink-0"
              onClick={lookupCustomer}
              disabled={customerLoading}
              aria-label="Look up customer by phone"
            >
              {customerLoading ? <Spinner size={3} /> : "Look up"}
            </button>
          </div>
          {customer ? (
            <div className="mt-1.5 alert-info text-xs">
              {customer.full_name} · <span className="font-mono">{customer.purchase_count}</span> purchases
              {customer.badge_tier && ` · ${customer.badge_tier}`}
              {suggestedDiscount && (
                <span className="ml-1 text-accent font-medium">· {suggestedDiscount} eligible</span>
              )}
            </div>
          ) : customerPhone.length === 10 ? (
            <input
              className="input mt-1.5"
              placeholder="New customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              aria-label="New customer name"
            />
          ) : null}
        </div>

        {/* Discount */}
        <div>
          <label htmlFor="pos-discount" className="label">Discount</label>
          <select
            id="pos-discount"
            className="input"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
          >
            {DISCOUNT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}{d.value === suggestedDiscount ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Payment method */}
        <div>
          <label className="label">Payment</label>
          <div className="flex gap-2" role="group" aria-label="Payment method">
            {(["cash", "online_pending"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={[
                  "flex-1 py-2 rounded-md text-sm font-medium border transition-colors duration-150",
                  paymentMethod === m
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border text-ink-muted hover:bg-white hover:text-ink",
                ].join(" ")}
                aria-pressed={paymentMethod === m}
              >
                {m === "cash" ? "Cash" : "Online"}
              </button>
            ))}
          </div>
          {paymentMethod === "online_pending" && (
            <p className="alert-warning text-xs mt-1.5">
              Recorded as pending — no payment gateway connected
            </p>
          )}
        </div>

        {/* Cash tendered */}
        {paymentMethod === "cash" && (
          <div>
            <label htmlFor="pos-cash" className="label">Cash tendered</label>
            <input
              id="pos-cash"
              type="number"
              step="1"
              min="0"
              className="input-mono"
              placeholder="Amount received"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              inputMode="numeric"
            />
            {cashTendered && subtotal > 0 && (
              <p className="text-xs text-ink-muted mt-1">
                Change:{" "}
                <span className="font-mono font-semibold text-ink">
                  NPR {Math.max(0, Number(cashTendered) - subtotal).toLocaleString("en-NP")}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-1 pt-1 border-t border-border text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">NPR {subtotal.toLocaleString("en-NP")}</span>
          </div>
          {discountType !== "none" && subtotal > 0 && (
            <div className="flex justify-between text-signal-green text-xs">
              <span>{DISCOUNT_TYPES.find((d) => d.value === discountType)?.label}</span>
              <span>applied at checkout</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-ink text-base">
            <span>Total</span>
            <span className="font-mono tabular-nums">NPR {subtotal.toLocaleString("en-NP")}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
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
            className="btn-primary flex-1 font-semibold"
            disabled={checkoutLoading || !cart.length}
          >
            {checkoutLoading ? <Spinner size={4} /> : "Charge"}
          </button>
        </div>
      </div>
    </form>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Desktop split-panel — full viewport height, sidebar handles its own space */}
      <div className="hidden md:flex h-dvh overflow-hidden">

        {/* LEFT — scan + search */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden">

          {/* Scan bar */}
          <div className="p-4 border-b border-border bg-white shrink-0">
            <div className="relative">
              {/* Scanner icon */}
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7V5a1 1 0 0 1 1-1h2M3 17v2a1 1 0 0 0 1 1h2M17 3h2a1 1 0 0 1 1 1v2M17 21h2a1 1 0 0 0 1-1v-2M7 12h10"/>
                </svg>
              </span>
              <input
                ref={scanRef}
                className="input pl-9 font-mono"
                placeholder="Scan barcode or search by name / brand / SKU…"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                aria-label="Barcode scanner and product search"
                autoComplete="off"
                spellCheck={false}
              />
              {searchLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size={4} />
                </span>
              )}
            </div>
            {/* Go to inventory shortcut */}
            <div className="flex items-center justify-between mt-2">
              <Link
                href="/stock/inventory"
                className="btn-ghost btn-xs flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
                Inventory
              </Link>
              {heldSales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHeld(true)}
                  className="btn-ghost btn-xs flex items-center gap-1.5 text-signal-amber"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {heldSales.length} held
                </button>
              )}
            </div>
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchResults.length > 0 ? (
              <ul className="space-y-1.5" aria-label="Search results">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={p.quantity <= 0}
                      className="w-full text-left rounded-md border border-border p-3 hover:border-accent hover:bg-accent-light/30 transition-colors duration-100 flex items-center justify-between gap-4 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent/30"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-ink text-sm truncate">{p.name}</div>
                        <div className="text-xs text-ink-faint mt-0.5 font-mono">
                          {p.brand && `${p.brand} · `}{p.barcode} · qty {p.quantity}
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-accent shrink-0 tabular-nums">
                        NPR {Number(p.selling_price).toLocaleString("en-NP")}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchExhausted ? (
              /* ── No results: offer to add to inventory ── */
              <div className="flex flex-col items-center justify-center h-full select-none py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-ink mb-1">
                  &ldquo;{scanInput}&rdquo; not found in inventory
                </p>
                <p className="text-xs text-ink-faint mb-4">
                  Add it to stock now and sell it immediately
                </p>
                <button
                  type="button"
                  className="btn-primary btn-sm flex items-center gap-2"
                  onClick={() => { setQuickAddName(scanInput); setQuickAddOpen(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add to inventory &amp; sell
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-ink-faint select-none py-16">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" className="mb-3 opacity-30">
                  <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
                </svg>
                <p className="text-sm text-ink-faint">Scan a barcode or type to search</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — cart + checkout (desktop) */}
        <div className="w-[400px] flex flex-col bg-white overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-ink">
              Cart
              {cartCount > 0 && (
                <span className="ml-2 badge-blue font-mono">{cartCount}</span>
              )}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {CheckoutPanel}
          </div>
        </div>
      </div>

      {/* Mobile layout — search full-width, cart as slide-up drawer */}
      <div className="md:hidden flex flex-col h-[calc(100dvh-48px)] overflow-hidden">

        {/* Scan bar */}
        <div className="p-3 border-b border-border bg-white shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a1 1 0 0 1 1-1h2M3 17v2a1 1 0 0 0 1 1h2M17 3h2a1 1 0 0 1 1 1v2M17 21h2a1 1 0 0 0 1-1v-2M7 12h10"/>
              </svg>
            </span>
            <input
              ref={scanRef}
              className="input pl-8 font-mono text-base"
              placeholder="Scan or search…"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleScanKeyDown}
              aria-label="Barcode scanner and product search"
              autoComplete="off"
              spellCheck={false}
            />
            {searchLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size={4} /></span>
            )}
          </div>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto p-3 pb-24">
          {searchResults.length > 0 ? (
            <ul className="space-y-2">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { addToCart(p); setCartOpen(true); }}
                    disabled={p.quantity <= 0}
                    className="w-full text-left rounded-md border border-border p-3 hover:border-accent hover:bg-accent-light/30 transition-colors duration-100 flex items-center justify-between gap-3 disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-ink text-sm">{p.name}</div>
                      <div className="text-xs text-ink-faint mt-0.5 font-mono">{p.barcode} · qty {p.quantity}</div>
                    </div>
                    <div className="font-mono font-semibold text-accent shrink-0">
                      NPR {Number(p.selling_price).toLocaleString("en-NP")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : searchExhausted ? (
              <div className="flex flex-col items-center justify-center h-full select-none py-12 px-4 text-center">
                <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-ink mb-1">
                  &ldquo;{scanInput}&rdquo; not found
                </p>
                <p className="text-xs text-ink-faint mb-4">Add it to inventory and sell</p>
                <button
                  type="button"
                  className="btn-primary btn-sm flex items-center gap-2"
                  onClick={() => { setQuickAddName(scanInput); setQuickAddOpen(true); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add &amp; sell
                </button>
              </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-full text-ink-faint py-12">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" className="mb-2 opacity-30">
                <circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M10 12h4"/>
              </svg>
              <p className="text-sm">Scan or search a product</p>
            </div>
            )}
        </div>

        {/* Persistent cart summary bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 z-20 md:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full btn-primary flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              </svg>
              View cart {cartCount > 0 && `(${cartCount})`}
            </span>
            <span className="font-mono tabular-nums">NPR {subtotal.toLocaleString("en-NP")}</span>
          </button>
        </div>

        {/* Mobile cart drawer */}
        {cartOpen && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setCartOpen(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-t-xl shadow-modal flex flex-col max-h-[90dvh]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-ink">Cart {cartCount > 0 && `· ${cartCount} items`}</h2>
                <button onClick={() => setCartOpen(false)} className="btn-ghost btn-xs" aria-label="Close cart">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {CheckoutPanel}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completed sale modal */}
      <Modal open={!!completedSale} onClose={() => setCompletedSale(null)} title="Sale complete" size="sm">
        {completedSale && (
          <div className="space-y-4">
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-5 text-center">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="font-mono text-sm text-ink-muted">{completedSale.invoice_number}</div>
              <div className="text-3xl font-mono font-bold text-ink mt-1 tabular-nums">
                NPR {Number(completedSale.total).toLocaleString("en-NP")}
              </div>
              {Number(completedSale.discount) > 0 && (
                <div className="text-xs text-signal-green mt-1.5">
                  {completedSale.discount_type.replace(/_/g, " ")} · saved NPR {Number(completedSale.discount).toLocaleString("en-NP")}
                </div>
              )}
              {completedSale.change_due && Number(completedSale.change_due) > 0 && (
                <div className="text-sm font-mono font-semibold text-ink mt-1.5">
                  Change: NPR {Number(completedSale.change_due).toLocaleString("en-NP")}
                </div>
              )}
            </div>
            <div>
              <label className="label">Invoice format</label>
              <div className="flex gap-2" role="group" aria-label="Invoice format">
                {(["a4", "thermal"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setInvoiceFormat(f)}
                    className={[
                      "flex-1 py-2 rounded-md text-sm font-medium border transition-colors duration-150",
                      invoiceFormat === f
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border text-ink-muted hover:bg-canvas",
                    ].join(" ")}
                    aria-pressed={invoiceFormat === f}
                  >
                    {f === "a4" ? "A4" : "Thermal 80mm"}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => openInvoice(completedSale.id, invoiceFormat)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / view invoice
            </button>
            <button className="btn-primary w-full" onClick={() => setCompletedSale(null)}>
              New sale
            </button>
          </div>
        )}
      </Modal>

      {/* Held sales modal */}
      <Modal open={showHeld} onClose={() => setShowHeld(false)} title="Held sales" size="md">
        <div className="space-y-2">
          {heldSales.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No held sales</p>
          ) : heldSales.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3 gap-3">
              <div>
                <div className="text-sm font-medium text-ink">
                  {s.line_items.length} item{s.line_items.length !== 1 ? "s" : ""}
                </div>
                <div className="text-xs text-ink-faint font-mono">
                  {new Date(s.created_at).toLocaleTimeString()}
                  {s.notes ? ` · ${s.notes}` : ""}
                </div>
              </div>
              <button className="btn-primary btn-sm shrink-0" onClick={() => resumeHeld(s)}>
                Resume
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}

      {/* Quick-add product from POS */}
      {branchId && (
        <QuickAddModal
          open={quickAddOpen}
          initialName={quickAddName}
          branchId={branchId}
          onAdded={handleQuickAdded}
          onClose={() => setQuickAddOpen(false)}
        />
      )}
    </>
  );
}

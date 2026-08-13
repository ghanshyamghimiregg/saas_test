"use client";
import { useForm } from "react-hook-form";
import type { FrameProduct } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";

type FormValues = Omit<FrameProduct, "id" | "barcode" | "created_at" | "is_active">;

const CATEGORIES    = ["sunglasses", "optical_frame", "contact_lens", "reading_glasses", "lens_only", "accessories"];
const SHAPES        = ["aviator", "wayfarer", "round", "cat_eye", "rectangle", "oval", "geometric", "other"];
const MATERIALS     = ["acetate", "metal", "titanium", "tr90", "combination", "other"];
const GENDERS       = ["men", "women", "unisex", "kids"];
const LENS_TYPES    = ["single_vision", "bifocal", "progressive", "non_prescription", "plano"];
const LENS_MATS     = ["cr39", "polycarbonate", "high_index", "glass"];
const LENS_COATINGS = ["ar", "blue_light", "uv", "scratch", "photochromic", "none"];

interface Props {
  defaultValues?: Partial<FormValues>;
  onSubmit:       (data: FormValues) => Promise<void>;
  loading:        boolean;
  submitLabel?:   string;
}

function Field({
  label, id, required, hint, error, children,
}: {
  label:     string;
  id?:       string;
  required?: boolean;
  hint?:     string;
  error?:    string;
  children:  React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={required ? "label label-required" : "label"}>
        {label}
      </label>
      {children}
      {hint  && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="section-heading border-b border-border pb-2 mb-4">{children}</h3>;
}

function humanise(s: string) { return s.replace(/_/g, " "); }

export function ProductForm({ defaultValues, onSubmit, loading, submitLabel = "Save product" }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: defaultValues ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Identity ─────────────────────────────────────── */}
      <section className="mb-7">
        <SectionHeading>Identity</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product name" id="f-name" required error={errors.name?.message}>
            <input id="f-name" className="input" {...register("name", { required: "Name is required" })} autoFocus />
          </Field>
          <Field label="Brand" id="f-brand">
            <input id="f-brand" className="input" {...register("brand")} />
          </Field>
          <Field label="Model number" id="f-model">
            <input id="f-model" className="input" {...register("model_number")} />
          </Field>
          <Field label="SKU" id="f-sku">
            <input id="f-sku" className="input font-mono" {...register("sku")} />
          </Field>
          <Field label="Product code" id="f-code" hint="Leave blank to auto-generate">
            <input id="f-code" className="input font-mono" {...register("product_code")} />
          </Field>
        </div>
      </section>

      {/* ── Classification ───────────────────────────────── */}
      <section className="mb-7">
        <SectionHeading>Classification</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Category" id="f-cat">
            <select id="f-cat" className="input" {...register("category")}>
              <option value="">— select —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
            </select>
          </Field>
          <Field label="Gender" id="f-gender">
            <select id="f-gender" className="input" {...register("gender")}>
              <option value="">— select —</option>
              {GENDERS.map((g) => <option key={g} value={g}>{humanise(g)}</option>)}
            </select>
          </Field>
          <Field label="Frame shape" id="f-shape">
            <select id="f-shape" className="input" {...register("frame_shape")}>
              <option value="">— select —</option>
              {SHAPES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
            </select>
          </Field>
          <Field label="Frame material" id="f-mat">
            <select id="f-mat" className="input" {...register("frame_material")}>
              <option value="">— select —</option>
              {MATERIALS.map((m) => <option key={m} value={m}>{humanise(m)}</option>)}
            </select>
          </Field>
          <Field label="Frame color" id="f-color">
            <input id="f-color" className="input" {...register("frame_color")} />
          </Field>
          <Field label="Size" id="f-size" hint="e.g. 52-18-140">
            <input id="f-size" className="input font-mono" placeholder="52-18-140" {...register("size")} />
          </Field>
        </div>
      </section>

      {/* ── Lens ─────────────────────────────────────────── */}
      <section className="mb-7">
        <SectionHeading>Lens</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lens type" id="f-ltype">
            <select id="f-ltype" className="input" {...register("lens_type")}>
              <option value="">— select —</option>
              {LENS_TYPES.map((t) => <option key={t} value={t}>{humanise(t)}</option>)}
            </select>
          </Field>
          <Field label="Lens material" id="f-lmat">
            <select id="f-lmat" className="input" {...register("lens_material")}>
              <option value="">— select —</option>
              {LENS_MATS.map((m) => <option key={m} value={m}>{humanise(m)}</option>)}
            </select>
          </Field>
          <Field label="Lens coating" id="f-lcoat">
            <select id="f-lcoat" className="input" {...register("lens_coating")}>
              <option value="">— select —</option>
              {LENS_COATINGS.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
            </select>
          </Field>
          <Field label="Polarized" id="f-polar">
            <label className="flex items-center gap-2.5 mt-2 cursor-pointer select-none">
              <input
                id="f-polar"
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-accent"
                {...register("polarized")}
              />
              <span className="text-sm text-ink">Yes, polarized lenses</span>
            </label>
          </Field>
        </div>
      </section>

      {/* ── Pricing & Tax ────────────────────────────────── */}
      <section className="mb-7">
        <SectionHeading>Pricing &amp; Tax</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Selling price (NPR)" id="f-sell" required error={errors.selling_price?.message}>
            <input
              id="f-sell"
              type="number"
              step="0.01"
              min="0"
              className="input-mono"
              {...register("selling_price", { required: "Required", min: { value: 0, message: "Must be ≥ 0" } })}
            />
          </Field>
          <Field label="Cost price (NPR)" id="f-cost">
            <input id="f-cost" type="number" step="0.01" min="0" className="input-mono" {...register("cost_price")} />
          </Field>
          <Field label="Tax rate (%)" id="f-tax">
            <input id="f-tax" type="number" step="0.01" min="0" max="100" className="input-mono" {...register("tax_rate")} />
          </Field>
          <Field label="HSN code" id="f-hsn">
            <input id="f-hsn" className="input font-mono" {...register("hsn_code")} />
          </Field>
        </div>
      </section>

      {/* ── Stock & Logistics ────────────────────────────── */}
      <section className="mb-7">
        <SectionHeading>Stock &amp; Logistics</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Opening quantity" id="f-qty" required error={errors.quantity?.message}>
            <input
              id="f-qty"
              type="number"
              min="0"
              className="input-mono"
              {...register("quantity", { required: "Required", min: { value: 0, message: "Must be ≥ 0" } })}
            />
          </Field>
          <Field label="Reorder threshold" id="f-reorder" hint="Alert fires when stock ≤ this value">
            <input id="f-reorder" type="number" min="0" className="input-mono" {...register("reorder_threshold")} />
          </Field>
          <Field label="Supplier" id="f-supplier">
            <input id="f-supplier" className="input" {...register("supplier")} />
          </Field>
          <Field label="Warranty period" id="f-warranty">
            <input id="f-warranty" className="input" placeholder="e.g. 1 year" {...register("warranty_period")} />
          </Field>
        </div>
      </section>

      {/* ── Notes ────────────────────────────────────────── */}
      <section className="mb-7">
        <SectionHeading>Notes</SectionHeading>
        <textarea
          id="f-notes"
          className="input resize-none"
          rows={3}
          placeholder="Any additional product notes…"
          {...register("notes")}
        />
      </section>

      <div className="border-t border-border pt-5">
        <button type="submit" className="btn-primary w-full sm:w-auto min-w-36" disabled={loading}>
          {loading ? <Spinner size={4} /> : submitLabel}
        </button>
      </div>
    </form>
  );
}

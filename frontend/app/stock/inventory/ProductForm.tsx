"use client";
import { useForm } from "react-hook-form";
import type { FrameProduct } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";

type FormValues = Omit<FrameProduct, "id" | "barcode" | "created_at" | "is_active">;

const CATEGORIES = ["sunglasses", "optical_frame", "contact_lens", "reading_glasses", "lens_only", "accessories"];
const SHAPES = ["aviator", "wayfarer", "round", "cat_eye", "rectangle", "oval", "geometric", "other"];
const MATERIALS = ["acetate", "metal", "titanium", "tr90", "combination", "other"];
const GENDERS = ["men", "women", "unisex", "kids"];
const LENS_TYPES = ["single_vision", "bifocal", "progressive", "non_prescription", "plano"];
const LENS_MATERIALS = ["cr39", "polycarbonate", "high_index", "glass"];
const LENS_COATINGS = ["ar", "blue_light", "uv", "scratch", "photochromic", "none"];

interface Props {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  loading: boolean;
  submitLabel?: string;
}

function Field({
  label, children, required,
}: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function ProductForm({ defaultValues, onSubmit, loading, submitLabel = "Save product" }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: defaultValues ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Identity */}
      <section>
        <h3 className="mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">Identity</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product name" required>
            <input className="input" {...register("name", { required: "Name is required" })} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </Field>
          <Field label="Brand">
            <input className="input" {...register("brand")} />
          </Field>
          <Field label="Model number">
            <input className="input" {...register("model_number")} />
          </Field>
          <Field label="SKU">
            <input className="input" {...register("sku")} />
          </Field>
          <Field label="Product code">
            <input
              className="input"
              placeholder="Leave blank to auto-generate"
              {...register("product_code")}
            />
          </Field>
        </div>
      </section>

      {/* Classification */}
      <section>
        <h3 className="mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">Classification</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select className="input" {...register("category")}>
              <option value="">— select —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Frame shape">
            <select className="input" {...register("frame_shape")}>
              <option value="">— select —</option>
              {SHAPES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Frame material">
            <select className="input" {...register("frame_material")}>
              <option value="">— select —</option>
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Frame color">
            <input className="input" {...register("frame_color")} />
          </Field>
          <Field label="Gender">
            <select className="input" {...register("gender")}>
              <option value="">— select —</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Size (e.g. 52-18-140)">
            <input className="input" placeholder="52-18-140" {...register("size")} />
          </Field>
        </div>
      </section>

      {/* Lens */}
      <section>
        <h3 className="mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">Lens</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lens type">
            <select className="input" {...register("lens_type")}>
              <option value="">— select —</option>
              {LENS_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Lens material">
            <select className="input" {...register("lens_material")}>
              <option value="">— select —</option>
              {LENS_MATERIALS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Lens coating">
            <select className="input" {...register("lens_coating")}>
              <option value="">— select —</option>
              {LENS_COATINGS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Polarized">
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" {...register("polarized")} className="rounded border-border" />
              <span className="text-sm text-slate-600">Yes</span>
            </label>
          </Field>
        </div>
      </section>

      {/* Pricing */}
      <section>
        <h3 className="mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">Pricing</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Selling price (NPR)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              {...register("selling_price", { required: "Required", min: { value: 0, message: "Must be ≥ 0" } })}
            />
            {errors.selling_price && <p className="text-xs text-red-500 mt-1">{errors.selling_price.message}</p>}
          </Field>
          <Field label="Cost price (NPR)">
            <input type="number" step="0.01" min="0" className="input" {...register("cost_price")} />
          </Field>
          <Field label="Tax rate (%)">
            <input type="number" step="0.01" min="0" max="100" className="input" {...register("tax_rate")} />
          </Field>
          <Field label="HSN code">
            <input className="input" {...register("hsn_code")} />
          </Field>
        </div>
      </section>

      {/* Stock */}
      <section>
        <h3 className="mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">Stock</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Opening quantity" required>
            <input
              type="number"
              min="0"
              className="input"
              {...register("quantity", { required: "Required", min: { value: 0, message: "Must be ≥ 0" } })}
            />
          </Field>
          <Field label="Reorder threshold">
            <input type="number" min="0" className="input" {...register("reorder_threshold")} />
          </Field>
          <Field label="Supplier">
            <input className="input" {...register("supplier")} />
          </Field>
          <Field label="Warranty period">
            <input className="input" placeholder="e.g. 1 year" {...register("warranty_period")} />
          </Field>
        </div>
      </section>

      {/* Notes */}
      <section>
        <h3 className="mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">Notes</h3>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Any additional product notes…"
          {...register("notes")}
        />
      </section>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? <Spinner size={4} /> : submitLabel}
      </button>
    </form>
  );
}

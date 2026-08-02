// Mirrors backend Pydantic schemas — keep in sync with API changes

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  camera_stream_url: string | null;
}

export interface BranchProvisionOut extends Branch {
  plaintext_password: string;
}

export interface FrameProduct {
  id: string;
  branch_id: string;
  product_code: string;
  barcode: string;
  sku: string | null;
  name: string;
  brand: string | null;
  model_number: string | null;
  category: string | null;
  frame_shape: string | null;
  frame_material: string | null;
  frame_color: string | null;
  gender: string | null;
  lens_type: string | null;
  lens_material: string | null;
  lens_coating: string | null;
  polarized: boolean | null;
  size: string | null;
  cost_price: string | null;
  selling_price: string;
  tax_rate: string | null;
  hsn_code: string | null;
  supplier: string | null;
  quantity: number;
  reorder_threshold: number | null;
  warranty_period: string | null;
  notes: string | null;
  image_urls: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface SaleLineItem {
  id: string;
  frame_id: string | null;
  lens_spec_id: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Sale {
  id: string;
  branch_id: string;
  customer_id: string | null;
  invoice_number: string | null;
  status: "active" | "held" | "void" | "returned";
  payment_method: "cash" | "online_pending" | "online_confirmed" | null;
  payment_status: string;
  discount: string;
  discount_pct: string | null;
  discount_type: "none" | "owner" | "salesman" | "regular_customer" | "membership_tier";
  subtotal: string;
  tax_amount: string;
  total: string;
  cash_tendered: string | null;
  change_due: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  line_items: SaleLineItem[];
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  purchase_count: number;
  loyalty_points: number;
  discount_level: number;
  badge_tier: string | null;
}

export interface DiscountConfig {
  id: string;
  owner_pct: string;
  salesman_pct: string;
  regular_customer_pct: string;
  allow_stacking: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface MembershipTier {
  id: string;
  tier_name: string;
  min_purchases: number;
  discount_pct: string;
  sort_order: number;
  updated_at: string | null;
}

export interface CartItem {
  frame: FrameProduct;
  quantity: number;
}

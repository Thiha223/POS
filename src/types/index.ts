export type UserRole = 'admin' | 'user';
export type SubscriptionPlan = 'free' | 'basic' | 'premium';
export type UserStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  user_id: string;
  shop_name: string;
  shop_name_mm: string;
  logo_url: string;
  phone: string;
  address: string;
  subscription_plan: SubscriptionPlan;
  is_admin: boolean;
  role: UserRole;
  status: UserStatus;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  name_mm: string;
  barcode: string;
  category: string;
  selling_price: number;
  cost_price: number;
  current_stock: number;
  unit: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryOpening {
  id: string;
  user_id: string;
  product_id: string;
  qty: number;
  note: string;
  created_at: string;
  product?: Product;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  supplier_name: string;
  qty: number;
  unit_cost: number;
  total_cost: number;
  note: string;
  created_at: string;
  product?: Product;
}

export interface Sale {
  id: string;
  user_id: string;
  sale_number: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'kpay' | 'wave' | 'mobile_banking';
  transaction_id: string;
  receipt_slip_url: string;
  customer_name: string;
  note: string;
  created_at: string;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export interface CartItem {
  product: Product;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  total_orders: number;
  total_spent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRequest {
  id: string;
  user_id: string;
  user_email: string;
  plan: 'basic' | 'premium';
  payment_method: 'kpay' | 'wave';
  transaction_slip_url: string;
  transaction_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export type Page =
  | 'dashboard'
  | 'new-sale'
  | 'sales-history'
  | 'add-product'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'customers'
  | 'financial'
  | 'subscription'
  | 'settings'
  | 'admin';

export type AdminPage =
  | 'admin-dashboard'
  | 'admin-shops'
  | 'admin-users'
  | 'admin-customers'
  | 'admin-settings';

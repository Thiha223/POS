/*
# Zay Saing Sa Yin - Multi-tenant SaaS Inventory & Sales Management Schema

## Summary
Creates the full schema for a multi-tenant retail SaaS application for Myanmar shops.
Each tenant (shop owner) is identified by their Supabase auth user_id.

## New Tables

### profiles
- Stores shop owner profile: shop name, logo URL, subscription plan, phone number.
- One row per user; user_id is both PK and FK to auth.users.

### products
- Product catalog per tenant: name, Myanmar name, barcode, selling price, cost price, category, image URL.

### inventory_opening
- Opening stock entries per product per tenant.

### purchases
- Supplier purchase records. When a purchase is created, current stock increases automatically via trigger.

### sales
- Sale transactions with payment method, discount, total, transaction ID for digital payments.

### sale_items
- Line items for each sale (product, qty, unit_price, subtotal).

### subscription_requests
- Tenant requests to subscribe/upgrade; stores payment slip URL and admin approval status.

## Security
- RLS enabled on all tables.
- All policies scoped TO authenticated with auth.uid() ownership checks.
- user_id columns default to auth.uid() so inserts without explicit user_id work.

## Notes
1. Trigger: after INSERT on purchases, updates product current_stock.
2. Trigger: after INSERT on sale_items, decrements product current_stock.
3. current_stock is a computed/maintained column on products table.
*/

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name text NOT NULL DEFAULT 'My Shop',
  shop_name_mm text DEFAULT '',
  logo_url text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'premium')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_mm text DEFAULT '',
  barcode text DEFAULT '',
  category text DEFAULT 'General',
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'ခု',
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode != '';

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_products" ON products;
CREATE POLICY "select_own_products" ON products FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_products" ON products;
CREATE POLICY "insert_own_products" ON products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- INVENTORY OPENING TABLE
CREATE TABLE IF NOT EXISTS inventory_opening (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 0,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_opening_user_id ON inventory_opening(user_id);

ALTER TABLE inventory_opening ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_opening" ON inventory_opening;
CREATE POLICY "select_own_opening" ON inventory_opening FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_opening" ON inventory_opening;
CREATE POLICY "insert_own_opening" ON inventory_opening FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_opening" ON inventory_opening;
CREATE POLICY "update_own_opening" ON inventory_opening FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_opening" ON inventory_opening;
CREATE POLICY "delete_own_opening" ON inventory_opening FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PURCHASES TABLE
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_name text DEFAULT '',
  qty integer NOT NULL DEFAULT 1,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  total_cost numeric(12,2) NOT NULL DEFAULT 0,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_purchases" ON purchases;
CREATE POLICY "select_own_purchases" ON purchases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_purchases" ON purchases;
CREATE POLICY "insert_own_purchases" ON purchases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_purchases" ON purchases;
CREATE POLICY "update_own_purchases" ON purchases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_purchases" ON purchases;
CREATE POLICY "delete_own_purchases" ON purchases FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SALES TABLE
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_number text NOT NULL DEFAULT '',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'kpay', 'wave', 'mobile_banking')),
  transaction_id text DEFAULT '',
  customer_name text DEFAULT '',
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sales" ON sales;
CREATE POLICY "select_own_sales" ON sales FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sales" ON sales;
CREATE POLICY "insert_own_sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sales" ON sales;
CREATE POLICY "update_own_sales" ON sales FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sales" ON sales;
CREATE POLICY "delete_own_sales" ON sales FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sale_items" ON sale_items;
CREATE POLICY "select_own_sale_items" ON sale_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_sale_items" ON sale_items;
CREATE POLICY "insert_own_sale_items" ON sale_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_sale_items" ON sale_items;
CREATE POLICY "update_own_sale_items" ON sale_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_sale_items" ON sale_items;
CREATE POLICY "delete_own_sale_items" ON sale_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

-- SUBSCRIPTION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('basic', 'premium')),
  payment_method text NOT NULL CHECK (payment_method IN ('kpay', 'wave')),
  transaction_slip_url text DEFAULT '',
  transaction_id text DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_requests_user_id ON subscription_requests(user_id);

ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sub_requests" ON subscription_requests;
CREATE POLICY "select_own_sub_requests" ON subscription_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sub_requests" ON subscription_requests;
CREATE POLICY "insert_own_sub_requests" ON subscription_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sub_requests" ON subscription_requests;
CREATE POLICY "update_own_sub_requests" ON subscription_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sub_requests" ON subscription_requests;
CREATE POLICY "delete_own_sub_requests" ON subscription_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- TRIGGER: Update product stock when a purchase is recorded
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET current_stock = current_stock + NEW.qty,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_purchase_update_stock ON purchases;
CREATE TRIGGER trg_purchase_update_stock
  AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_purchase();

-- TRIGGER: Decrease product stock when a sale item is recorded
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET current_stock = current_stock - NEW.qty,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sale_item_update_stock ON sale_items;
CREATE TRIGGER trg_sale_item_update_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- TRIGGER: Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, shop_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'shop_name', 'My Shop'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_profile ON auth.users;
CREATE TRIGGER trg_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

/*
# Add payment receipt slip URL to sales + product/receipt storage buckets

## Summary
1. Adds a `receipt_slip_url` text column to the `sales` table so digital payment
   proof screenshots can be saved alongside each transaction record.
2. Creates two new Supabase Storage buckets:
   - `product-images` — for product photos uploaded by shop owners (public read, owner-scoped write).
   - `payment-receipts` — for payment slip/screenshot uploads at checkout (owner-scoped read+write).
3. Adds storage RLS policies for both buckets, scoped by auth.uid() so each tenant
   can only manage files in their own folder.

## Modified Tables
- `sales`: + `receipt_slip_url text DEFAULT ''` (non-breaking, nullable, defaults to empty string).

## New Storage Buckets
- `product-images` (public read)
- `payment-receipts` (private, owner-only)

## Security
- product-images: public SELECT; authenticated INSERT/UPDATE scoped to `products/<uid>/` folder.
- payment-receipts: authenticated SELECT/INSERT scoped to `receipts/<uid>/` folder (owner only).
*/

-- 1. Add receipt_slip_url column to sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'receipt_slip_url'
  ) THEN
    ALTER TABLE sales ADD COLUMN receipt_slip_url text DEFAULT '';
  END IF;
END $$;

-- 2. Create product-images bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create payment-receipts bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for product-images
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
CREATE POLICY "Authenticated upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'products' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
CREATE POLICY "Authenticated update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'products' AND (storage.foldername(name))[2] = auth.uid()::text)
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'products' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
CREATE POLICY "Authenticated delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'products' AND (storage.foldername(name))[2] = auth.uid()::text);

-- 5. Storage policies for payment-receipts (owner-scoped)
DROP POLICY IF EXISTS "Authenticated upload payment receipts" ON storage.objects;
CREATE POLICY "Authenticated upload payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = 'receipts' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated read own payment receipts" ON storage.objects;
CREATE POLICY "Authenticated read own payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = 'receipts' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated delete own payment receipts" ON storage.objects;
CREATE POLICY "Authenticated delete own payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = 'receipts' AND (storage.foldername(name))[2] = auth.uid()::text);

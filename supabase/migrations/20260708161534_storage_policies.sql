/*
# Storage Policies for shop-logos and subscription-slips buckets

1. shop-logos bucket: authenticated users can upload/update their own logo; public can read
2. subscription-slips bucket: authenticated users can upload their own slips; only owner can read
*/

-- Shop logos: public read, authenticated users can upload their own
DROP POLICY IF EXISTS "Public read shop logos" ON storage.objects;
CREATE POLICY "Public read shop logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop-logos');

DROP POLICY IF EXISTS "Authenticated upload shop logos" ON storage.objects;
CREATE POLICY "Authenticated upload shop logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-logos' AND (storage.foldername(name))[1] = 'logos' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated update shop logos" ON storage.objects;
CREATE POLICY "Authenticated update shop logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-logos' AND (storage.foldername(name))[1] = 'logos' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Subscription slips: authenticated users can upload and read their own
DROP POLICY IF EXISTS "Authenticated upload sub slips" ON storage.objects;
CREATE POLICY "Authenticated upload sub slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'subscription-slips' AND (storage.foldername(name))[1] = 'slips' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated read own sub slips" ON storage.objects;
CREATE POLICY "Authenticated read own sub slips"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'subscription-slips' AND (storage.foldername(name))[1] = 'slips' AND (storage.foldername(name))[2] = auth.uid()::text);

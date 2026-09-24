-- Keep customer self-service while preventing role escalation.
DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) AND role = 'customer');
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()) AND role = 'customer');

-- Anonymous catalog reads must only expose active products and their media.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_items;
CREATE POLICY product_items_read_active ON public.product_items
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = variant_id AND p.is_active IS TRUE
    )
  );
DROP POLICY IF EXISTS product_variants_select_for_auth ON public.product_variants;
DROP POLICY IF EXISTS product_variants_select_for_public ON public.product_variants;
CREATE POLICY product_variants_read_active ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.is_active IS TRUE
    )
  );
DROP POLICY IF EXISTS product_images_select_for_auth ON public.variant_images;
CREATE POLICY variant_images_read_active ON public.variant_images
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      WHERE v.id = variant_id AND p.is_active IS TRUE
    )
  );
CREATE POLICY category_images_public_read ON public.category_images
  FOR SELECT TO anon, authenticated USING (true);

-- The legacy bucket is writable only by administrators. New product images use R2.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY variant_images_admin_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'variant-images' AND public.is_admin());
CREATE POLICY variant_images_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'variant-images' AND public.is_admin());

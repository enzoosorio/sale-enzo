-- Customizations captured from the source project's auth/storage schemas.
-- Supabase manages the rest of these schemas; only project-owned objects are recreated.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE OR REPLACE TRIGGER on_auth_user_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_verified();

CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'variant-images');
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'variant-images');
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'variant-images');

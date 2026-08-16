
CREATE POLICY "staff read commercial documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'commercial-documents');
CREATE POLICY "staff upload commercial documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'commercial-documents');
CREATE POLICY "staff update commercial documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'commercial-documents') WITH CHECK (bucket_id = 'commercial-documents');
CREATE POLICY "admin delete commercial documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'commercial-documents' AND public.has_role(auth.uid(),'admin'));

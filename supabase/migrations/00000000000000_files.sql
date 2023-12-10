CREATE SCHEMA private;

INSERT INTO storage.buckets(id, name)
  VALUES ('files', 'files')
ON CONFLICT
  DO NOTHING;

CREATE OR REPLACE FUNCTION private.uuid_or_null(str text)
  RETURNS uuid
  LANGUAGE plpgsql
  AS $$
BEGIN
  RETURN str::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;

$$;

CREATE POLICY "Authenticated users can upload files" ON storage.objects
  FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'files'
    AND OWNER = auth.uid()
    AND private.uuid_or_null(path_tokens[1]) IS NOT NULL);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT TO authenticated
    USING (bucket_id = 'files'
      AND OWNER = auth.uid());

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE TO authenticated
    WITH CHECK (bucket_id = 'files'
    AND OWNER = auth.uid());

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
    USING (bucket_id = 'files'
      AND OWNER = auth.uid());



-- Create storage bucket for patient files (photos + clinical PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-files', 'patient-files', true);

-- Allow authenticated users to upload files
CREATE POLICY "Auth can upload patient files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-files');

-- Allow anyone to read patient files (public bucket)
CREATE POLICY "Anyone can read patient files"
ON storage.objects FOR SELECT
USING (bucket_id = 'patient-files');

-- Allow authenticated users to delete patient files
CREATE POLICY "Auth can delete patient files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-files');

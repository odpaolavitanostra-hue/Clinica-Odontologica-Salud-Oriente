
-- Add signature and seal image URLs to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS signature_img text NOT NULL DEFAULT '';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS seal_img text NOT NULL DEFAULT '';

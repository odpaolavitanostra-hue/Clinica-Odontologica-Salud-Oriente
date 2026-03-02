
-- Add odontogram_data column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS odontogram_data jsonb DEFAULT NULL;

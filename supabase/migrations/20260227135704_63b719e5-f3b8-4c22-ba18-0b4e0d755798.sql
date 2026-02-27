
-- Add status column to tenant_blocked_slots for pre-reservation workflow
ALTER TABLE public.tenant_blocked_slots 
ADD COLUMN status text NOT NULL DEFAULT 'approved';

-- Add rental request fields directly to tenant_blocked_slots for self-service requests
ALTER TABLE public.tenant_blocked_slots
ADD COLUMN requester_first_name text DEFAULT '',
ADD COLUMN requester_last_name text DEFAULT '',
ADD COLUMN requester_cedula text DEFAULT '',
ADD COLUMN requester_cov text DEFAULT '',
ADD COLUMN requester_email text DEFAULT '',
ADD COLUMN requester_phone text DEFAULT '',
ADD COLUMN rental_mode text DEFAULT 'turno',
ADD COLUMN rental_price numeric DEFAULT 0;

-- Make tenant_id nullable so self-service requests don't need a pre-existing tenant
ALTER TABLE public.tenant_blocked_slots ALTER COLUMN tenant_id DROP NOT NULL;

-- Update RLS: allow anyone to INSERT rental requests (public form)
CREATE POLICY "Anyone can insert rental requests"
ON public.tenant_blocked_slots
FOR INSERT
WITH CHECK (true);

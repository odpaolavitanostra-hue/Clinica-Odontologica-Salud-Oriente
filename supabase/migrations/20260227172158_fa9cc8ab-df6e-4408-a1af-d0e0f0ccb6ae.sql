
-- Add treatment column to tenant_blocked_slots for % rental mode
ALTER TABLE public.tenant_blocked_slots 
ADD COLUMN treatment text DEFAULT 'Revisión';

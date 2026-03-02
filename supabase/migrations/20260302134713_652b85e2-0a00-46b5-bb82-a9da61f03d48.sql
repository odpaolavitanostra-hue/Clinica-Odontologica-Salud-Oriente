
-- Add payment fields to appointments
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS final_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT '';

-- Create transactions table for reconciliation
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  date text NOT NULL,
  type text NOT NULL DEFAULT 'patient', -- 'patient' or 'tenant'
  entity_name text NOT NULL DEFAULT '',
  appointment_id uuid,
  rental_slot_id uuid,
  amount_usd numeric NOT NULL DEFAULT 0,
  amount_ves numeric NOT NULL DEFAULT 0,
  tasa_bcv numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  payment_reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT ''
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Auth can manage transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Add payment fields to tenant_blocked_slots too
ALTER TABLE public.tenant_blocked_slots
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT '';

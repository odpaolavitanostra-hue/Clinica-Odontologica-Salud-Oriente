
CREATE TABLE public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'reminder',
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  patient_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage notifications" ON public.scheduled_notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth can read notifications" ON public.scheduled_notifications
  FOR SELECT TO authenticated USING (true);

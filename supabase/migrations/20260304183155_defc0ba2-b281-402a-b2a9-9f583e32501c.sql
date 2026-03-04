
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'edit',
  author_email text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

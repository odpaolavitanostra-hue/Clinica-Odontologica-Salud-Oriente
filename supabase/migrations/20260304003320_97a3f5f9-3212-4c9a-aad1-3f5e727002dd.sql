
CREATE TABLE public.clinical_histories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  -- Personal data (auto-filled + additional)
  birth_date TEXT DEFAULT '',
  age INTEGER DEFAULT 0,
  sex TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  address TEXT DEFAULT '',
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  
  -- Medical triage (JSONB for flexibility)
  medical_triage JSONB DEFAULT '{}'::jsonb,
  
  -- Conditions matrix (JSONB)
  conditions_matrix JSONB DEFAULT '{}'::jsonb,
  
  -- Evaluation
  pain_description TEXT DEFAULT '',
  bleeding TEXT DEFAULT '',
  sensitivity_cold BOOLEAN DEFAULT false,
  sensitivity_heat BOOLEAN DEFAULT false,
  sensitivity_sweet BOOLEAN DEFAULT false,
  
  -- Follow-ups
  followup_1_date TEXT DEFAULT '',
  followup_1_notes TEXT DEFAULT '',
  followup_2_date TEXT DEFAULT '',
  followup_2_notes TEXT DEFAULT '',
  followup_3_date TEXT DEFAULT '',
  followup_3_notes TEXT DEFAULT '',
  
  -- Consent
  consent_signature TEXT DEFAULT '',
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(patient_id)
);

ALTER TABLE public.clinical_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clinical histories" ON public.clinical_histories FOR SELECT USING (true);
CREATE POLICY "Auth can manage clinical histories" ON public.clinical_histories FOR ALL USING (true) WITH CHECK (true);

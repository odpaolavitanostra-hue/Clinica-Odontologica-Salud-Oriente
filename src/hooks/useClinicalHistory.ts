
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClinicalHistory {
  id: string;
  patientId: string;
  birthDate: string;
  age: number;
  sex: string;
  occupation: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalTriage: Record<string, boolean>;
  conditionsMatrix: Record<string, boolean>;
  painDescription: string;
  bleeding: string;
  sensitivityCold: boolean;
  sensitivityHeat: boolean;
  sensitivitySweet: boolean;
  followup1Date: string;
  followup1Notes: string;
  followup2Date: string;
  followup2Notes: string;
  followup3Date: string;
  followup3Notes: string;
  consentSignature: string;
  isLocked: boolean;
  lockedAt?: string;
}

export const TRIAGE_QUESTIONS = [
  { key: "prev_treatment", label: "¿Ha recibido tratamiento odontológico anteriormente?" },
  { key: "current_medication", label: "¿Está tomando algún medicamento actualmente?" },
  { key: "allergies", label: "¿Tiene alergias a medicamentos o materiales?" },
  { key: "anesthesia_reaction", label: "¿Ha tenido reacciones adversas a la anestesia?" },
  { key: "recent_surgery", label: "¿Ha sido sometido a cirugía reciente?" },
  { key: "bleeding_issues", label: "¿Presenta problemas de sangrado prolongado?" },
  { key: "pregnant_or_nursing", label: "¿Está embarazada o en período de lactancia?" },
  { key: "smoker", label: "¿Fuma o consume tabaco?" },
];

export const CONDITIONS = [
  { key: "diabetes", label: "Diabetes" },
  { key: "hypertension", label: "Hipertensión" },
  { key: "cardiopathy", label: "Cardiopatías" },
  { key: "asthma", label: "Asma" },
  { key: "epilepsy", label: "Epilepsia" },
  { key: "renal", label: "Enfermedades Renales" },
  { key: "hepatic", label: "Enfermedades Hepáticas" },
  { key: "coagulation", label: "Trastornos de Coagulación" },
  { key: "autoimmune", label: "Enfermedades Autoinmunes" },
  { key: "hiv_hepatitis", label: "VIH / Hepatitis" },
  { key: "cancer", label: "Cáncer" },
  { key: "pregnancy", label: "Embarazo" },
];

const mapRow = (r: any): ClinicalHistory => ({
  id: r.id,
  patientId: r.patient_id,
  birthDate: r.birth_date || "",
  age: r.age || 0,
  sex: r.sex || "",
  occupation: r.occupation || "",
  address: r.address || "",
  emergencyContactName: r.emergency_contact_name || "",
  emergencyContactPhone: r.emergency_contact_phone || "",
  medicalTriage: (r.medical_triage || {}) as Record<string, boolean>,
  conditionsMatrix: (r.conditions_matrix || {}) as Record<string, boolean>,
  painDescription: r.pain_description || "",
  bleeding: r.bleeding || "",
  sensitivityCold: r.sensitivity_cold || false,
  sensitivityHeat: r.sensitivity_heat || false,
  sensitivitySweet: r.sensitivity_sweet || false,
  followup1Date: r.followup_1_date || "",
  followup1Notes: r.followup_1_notes || "",
  followup2Date: r.followup_2_date || "",
  followup2Notes: r.followup_2_notes || "",
  followup3Date: r.followup_3_date || "",
  followup3Notes: r.followup_3_notes || "",
  consentSignature: r.consent_signature || "",
  isLocked: r.is_locked || false,
  lockedAt: r.locked_at || undefined,
});

export function useClinicalHistory(patientId: string | null) {
  const qc = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ["clinical_history", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data } = await supabase
        .from("clinical_histories")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      return data ? mapRow(data) : null;
    },
    enabled: !!patientId,
  });

  const save = async (patientId: string, h: Partial<ClinicalHistory>) => {
    const mapped: any = {
      patient_id: patientId,
      birth_date: h.birthDate,
      age: h.age,
      sex: h.sex,
      occupation: h.occupation,
      address: h.address,
      emergency_contact_name: h.emergencyContactName,
      emergency_contact_phone: h.emergencyContactPhone,
      medical_triage: h.medicalTriage,
      conditions_matrix: h.conditionsMatrix,
      pain_description: h.painDescription,
      bleeding: h.bleeding,
      sensitivity_cold: h.sensitivityCold,
      sensitivity_heat: h.sensitivityHeat,
      sensitivity_sweet: h.sensitivitySweet,
      followup_1_date: h.followup1Date,
      followup_1_notes: h.followup1Notes,
      followup_2_date: h.followup2Date,
      followup_2_notes: h.followup2Notes,
      followup_3_date: h.followup3Date,
      followup_3_notes: h.followup3Notes,
      consent_signature: h.consentSignature,
      is_locked: h.isLocked,
      locked_at: h.isLocked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    // Upsert
    const { data: existing } = await supabase
      .from("clinical_histories")
      .select("id")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (existing) {
      await supabase.from("clinical_histories").update(mapped).eq("id", existing.id);
    } else {
      await supabase.from("clinical_histories").insert(mapped);
    }
    qc.invalidateQueries({ queryKey: ["clinical_history", patientId] });
  };

  return { history, isLoading, save };
}

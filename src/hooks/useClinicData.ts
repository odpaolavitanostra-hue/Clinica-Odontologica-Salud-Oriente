
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types matching the old store interface (camelCase)
export interface Doctor {
  id: string;
  email: string;
  name: string;
  specialty: string;
  payModel: 'fixed' | 'percent';
  rate: number;
  phone: string;
  cov: string;
  signatureImg: string;
  sealImg: string;
}

export interface Patient {
  id: string;
  name: string;
  cedula: string;
  phone: string;
  email: string;
  notes: string;
  photos: string[];
  clinicalHistoryUrl: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  priceUSD: number;
  minStock: number;
}

export interface Treatment {
  id: string;
  name: string;
  priceUSD: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientCedula?: string;
  patientEmail?: string;
  doctorId: string;
  date: string;
  time: string;
  treatment: string;
  priceUSD: number;
  status: 'pendiente' | 'completada' | 'cancelada' | 'pendiente_confirmacion' | 'pagada';
  materialsUsed?: { itemId: string; qty: number }[];
  notes: string;
  finalPrice?: number;
  paymentMethod?: string;
  paymentReference?: string;
  odontogramData?: any;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'patient' | 'tenant';
  entityName: string;
  appointmentId?: string;
  rentalSlotId?: string;
  amountUSD: number;
  amountVES: number;
  tasaBCV: number;
  paymentMethod: string;
  paymentReference: string;
  description: string;
  createdAt: string;
}

export interface FinanceRecord {
  id: string;
  appointmentId: string;
  date: string;
  treatmentPriceUSD: number;
  doctorPayUSD: number;
  materialsCostUSD: number;
  utilityUSD: number;
  tasaBCV: number;
}

export interface TenantBlockedSlot {
  id: string;
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  status: string;
  requesterFirstName?: string;
  requesterLastName?: string;
  requesterCedula?: string;
  requesterCov?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  rentalMode?: string;
  rentalPrice?: number;
  treatment?: string;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  cov: string;
  email: string;
  phone: string;
  cedula: string;
  rentalMode: 'turno' | 'percent';
  rentalPrice: number;
  blockedSlots: TenantBlockedSlot[];
}

export function useClinicData() {
  const qc = useQueryClient();

  // ─── Queries ───
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("*");
      return (data || []).map(d => ({
        id: d.id, email: d.email, name: d.name, specialty: d.specialty,
        payModel: d.pay_model as 'fixed' | 'percent', rate: d.rate,
        phone: (d as any).phone || '', cov: (d as any).cov || '',
        signatureImg: (d as any).signature_img || '', sealImg: (d as any).seal_img || '',
      })) as Doctor[];
    },
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const { data } = await supabase.from("treatments").select("*");
      return (data || []).map(t => ({
        id: t.id, name: t.name, priceUSD: t.price_usd,
      })) as Treatment[];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*");
      return (data || []).map(a => ({
        id: a.id, patientName: a.patient_name, patientPhone: a.patient_phone,
        patientCedula: a.patient_cedula || undefined, patientEmail: a.patient_email || undefined,
        doctorId: a.doctor_id || '', date: a.date, time: a.time, treatment: a.treatment,
        priceUSD: a.price_usd, status: a.status as Appointment['status'],
        materialsUsed: a.materials_used as any, notes: a.notes,
        finalPrice: (a as any).final_price || 0,
        paymentMethod: (a as any).payment_method || '',
        paymentReference: (a as any).payment_reference || '',
        odontogramData: (a as any).odontogram_data || null,
      })) as Appointment[];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("*");
      return (data || []).map(p => ({
        id: p.id, name: p.name, cedula: p.cedula, phone: p.phone,
        email: p.email, notes: p.notes, photos: p.photos || [],
        clinicalHistoryUrl: p.clinical_history_url,
      })) as Patient[];
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory").select("*");
      return (data || []).map(i => ({
        id: i.id, name: i.name, stock: i.stock,
        priceUSD: i.price_usd, minStock: i.min_stock,
      })) as InventoryItem[];
    },
  });

  const { data: finances = [] } = useQuery({
    queryKey: ["finances"],
    queryFn: async () => {
      const { data } = await supabase.from("finances").select("*");
      return (data || []).map(f => ({
        id: f.id, appointmentId: f.appointment_id || '',
        date: f.date, treatmentPriceUSD: f.treatment_price_usd,
        doctorPayUSD: f.doctor_pay_usd, materialsCostUSD: f.materials_cost_usd,
        utilityUSD: f.utility_usd, tasaBCV: f.tasa_bcv,
      })) as FinanceRecord[];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*");
      return (data || []).map(t => ({
        id: t.id, date: t.date, type: t.type as 'patient' | 'tenant',
        entityName: t.entity_name, appointmentId: t.appointment_id || undefined,
        rentalSlotId: t.rental_slot_id || undefined, amountUSD: t.amount_usd,
        amountVES: t.amount_ves, tasaBCV: t.tasa_bcv,
        paymentMethod: t.payment_method, paymentReference: t.payment_reference,
        description: t.description, createdAt: t.created_at,
      })) as Transaction[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").limit(1).single();
      return data;
    },
  });

  const { data: rawTenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*");
      return data || [];
    },
  });

  const { data: blockedSlots = [] } = useQuery({
    queryKey: ["tenant_blocked_slots"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_blocked_slots").select("*");
      return data || [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const blockedSlotsByTenantId = blockedSlots.reduce<Record<string, TenantBlockedSlot[]>>((acc, slot) => {
    const tenantId = slot.tenant_id;
    if (!acc[tenantId]) acc[tenantId] = [];

    acc[tenantId].push({
      id: slot.id,
      date: slot.date,
      allDay: slot.all_day,
      startTime: slot.start_time || undefined,
      endTime: slot.end_time || undefined,
      status: slot.status || 'approved',
      requesterFirstName: slot.requester_first_name || undefined,
      requesterLastName: slot.requester_last_name || undefined,
      requesterCedula: slot.requester_cedula || undefined,
      requesterCov: slot.requester_cov || undefined,
      requesterEmail: slot.requester_email || undefined,
      requesterPhone: slot.requester_phone || undefined,
      rentalMode: slot.rental_mode || undefined,
      rentalPrice: slot.rental_price || undefined,
      treatment: (slot as any).treatment || undefined,
    });

    return acc;
  }, {});

  const rawTenantsById = new Map(rawTenants.map((tenant) => [tenant.id, tenant]));
  const tenantIds = Array.from(new Set([
    ...rawTenants.map((tenant) => tenant.id),
    ...Object.keys(blockedSlotsByTenantId),
  ]));

  const tenants: Tenant[] = tenantIds.map((tenantId) => {
    const tenant = rawTenantsById.get(tenantId);

    return {
      id: tenantId,
      firstName: tenant?.first_name ?? "Bloqueo",
      lastName: tenant?.last_name ?? "Agenda",
      cov: tenant?.cov ?? "",
      email: tenant?.email ?? "",
      phone: tenant?.phone ?? "",
      cedula: tenant?.cedula ?? "",
      rentalMode: (tenant?.rental_mode as 'turno' | 'percent') ?? "turno",
      rentalPrice: tenant?.rental_price ?? 0,
      blockedSlots: blockedSlotsByTenantId[tenantId] || [],
    };
  });

  const tasaBCV = settings?.tasa_bcv ?? 36.50;

  const inv = (...keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  // ─── Doctor CRUD ───
  const addDoctor = async (doc: Omit<Doctor, 'id'>) => {
    await supabase.from("doctors").insert({
      name: doc.name, email: doc.email, specialty: doc.specialty,
      pay_model: doc.payModel, rate: doc.rate,
      phone: doc.phone, cov: doc.cov,
    } as any);
    inv("doctors");
  };
  const updateDoctor = async (id: string, doc: Partial<Doctor>) => {
    const mapped: any = {};
    if (doc.name !== undefined) mapped.name = doc.name;
    if (doc.email !== undefined) mapped.email = doc.email;
    if (doc.specialty !== undefined) mapped.specialty = doc.specialty;
    if (doc.payModel !== undefined) mapped.pay_model = doc.payModel;
    if (doc.rate !== undefined) mapped.rate = doc.rate;
    if (doc.phone !== undefined) mapped.phone = doc.phone;
    if (doc.cov !== undefined) mapped.cov = doc.cov;
    if (doc.signatureImg !== undefined) mapped.signature_img = doc.signatureImg;
    if (doc.sealImg !== undefined) mapped.seal_img = doc.sealImg;
    await supabase.from("doctors").update(mapped).eq("id", id);
    inv("doctors");
  };
  const deleteDoctor = async (id: string) => {
    await supabase.from("doctors").delete().eq("id", id);
    inv("doctors");
  };

  // ─── Patient CRUD ───
  const addPatient = async (p: Omit<Patient, 'id'>) => {
    await supabase.from("patients").insert({
      name: p.name, cedula: p.cedula, phone: p.phone, email: p.email,
      notes: p.notes, photos: p.photos, clinical_history_url: p.clinicalHistoryUrl,
    });
    inv("patients");
  };
  const updatePatient = async (id: string, p: Partial<Patient>) => {
    const mapped: any = {};
    if (p.name !== undefined) mapped.name = p.name;
    if (p.cedula !== undefined) mapped.cedula = p.cedula;
    if (p.phone !== undefined) mapped.phone = p.phone;
    if (p.email !== undefined) mapped.email = p.email;
    if (p.notes !== undefined) mapped.notes = p.notes;
    if (p.photos !== undefined) mapped.photos = p.photos;
    if (p.clinicalHistoryUrl !== undefined) mapped.clinical_history_url = p.clinicalHistoryUrl;
    await supabase.from("patients").update(mapped).eq("id", id);
    inv("patients");
  };
  const deletePatient = async (id: string) => {
    await supabase.from("patients").delete().eq("id", id);
    inv("patients");
  };

  // ─── Inventory CRUD ───
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    await supabase.from("inventory").insert({
      name: item.name, stock: item.stock, price_usd: item.priceUSD, min_stock: item.minStock,
    });
    inv("inventory");
  };
  const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
    const mapped: any = {};
    if (item.name !== undefined) mapped.name = item.name;
    if (item.stock !== undefined) mapped.stock = item.stock;
    if (item.priceUSD !== undefined) mapped.price_usd = item.priceUSD;
    if (item.minStock !== undefined) mapped.min_stock = item.minStock;
    await supabase.from("inventory").update(mapped).eq("id", id);
    inv("inventory");
  };
  const deleteInventoryItem = async (id: string) => {
    await supabase.from("inventory").delete().eq("id", id);
    inv("inventory");
  };

  // ─── Appointment CRUD ───
  const INVASIVE_TREATMENTS = ["cirugía", "endodoncia", "extracción", "implante", "implantes"];

  const addAppointment = async (app: Omit<Appointment, 'id'>) => {
    const { data: inserted } = await supabase.from("appointments").insert({
      patient_name: app.patientName, patient_phone: app.patientPhone,
      patient_cedula: app.patientCedula, patient_email: app.patientEmail,
      doctor_id: app.doctorId, date: app.date, time: app.time,
      treatment: app.treatment, price_usd: app.priceUSD,
      status: app.status, notes: app.notes,
      payment_method: app.paymentMethod || null,
      payment_reference: app.paymentReference || null,
    }).select("id").single();

    const appointmentId = inserted?.id;

    // Auto-schedule notifications
    if (appointmentId && app.patientPhone) {
      const notifications: any[] = [];

      // 1. Reminder: 24h before appointment
      const appointmentDateTime = new Date(`${app.date}T${app.time}:00-04:00`);
      const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (reminderTime > new Date()) {
        notifications.push({
          type: "reminder",
          appointment_id: appointmentId,
          patient_name: app.patientName,
          phone: app.patientPhone,
          message: `Hola ${app.patientName}, le recordamos su cita mañana ${app.date} a las ${app.time} en Clínica Salud Oriente. ¡Le esperamos!`,
          scheduled_for: reminderTime.toISOString(),
        });
      }

      // 2. Post-op follow-up: 24h after appointment (only for invasive treatments)
      const isInvasive = INVASIVE_TREATMENTS.some(t => app.treatment.toLowerCase().includes(t));
      if (isInvasive) {
        const followupTime = new Date(appointmentDateTime.getTime() + 24 * 60 * 60 * 1000);
        notifications.push({
          type: "postop",
          appointment_id: appointmentId,
          patient_name: app.patientName,
          phone: app.patientPhone,
          message: `Hola ${app.patientName}, ayer se realizó su ${app.treatment} en Clínica Salud Oriente. ¿Cómo se siente? Si tiene alguna molestia, no dude en contactarnos.`,
          scheduled_for: followupTime.toISOString(),
        });
      }

      if (notifications.length > 0) {
        await supabase.from("scheduled_notifications").insert(notifications);
      }
    }

    inv("appointments");
  };
  const updateAppointment = async (id: string, app: Partial<Appointment>) => {
    const mapped: any = {};
    if (app.patientName !== undefined) mapped.patient_name = app.patientName;
    if (app.patientPhone !== undefined) mapped.patient_phone = app.patientPhone;
    if (app.doctorId !== undefined) mapped.doctor_id = app.doctorId;
    if (app.status !== undefined) mapped.status = app.status;
    if (app.materialsUsed !== undefined) mapped.materials_used = app.materialsUsed;
    if (app.notes !== undefined) mapped.notes = app.notes;
    if (app.priceUSD !== undefined) mapped.price_usd = app.priceUSD;
    if (app.finalPrice !== undefined) mapped.final_price = app.finalPrice;
    if (app.paymentMethod !== undefined) mapped.payment_method = app.paymentMethod;
    if (app.paymentReference !== undefined) mapped.payment_reference = app.paymentReference;
    if (app.odontogramData !== undefined) mapped.odontogram_data = app.odontogramData;
    await supabase.from("appointments").update(mapped).eq("id", id);
    inv("appointments");
  };
  const deleteAppointment = async (id: string) => {
    await supabase.from("appointments").delete().eq("id", id);
    inv("appointments");
  };

  const completeAppointment = async (id: string, materialsUsed: { itemId: string; qty: number }[]) => {
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    // Deduct inventory
    await Promise.all(materialsUsed.map(async ({ itemId, qty }) => {
      const item = inventory.find(i => i.id === itemId);
      if (item) {
        await supabase.from("inventory").update({
          stock: Math.round((item.stock - qty) * 100) / 100,
        }).eq("id", itemId);
      }
    }));

    // Calculate finance
    const doctor = doctors.find(d => d.id === app.doctorId);
    const doctorPayUSD = doctor
      ? doctor.payModel === 'percent' ? app.priceUSD * doctor.rate : doctor.rate
      : 0;
    const materialsCostUSD = materialsUsed.reduce((sum, { itemId, qty }) => {
      const item = inventory.find(i => i.id === itemId);
      return sum + (item ? item.priceUSD * qty : 0);
    }, 0);
    const utilityUSD = app.priceUSD - doctorPayUSD - materialsCostUSD;

    // Create finance record
    await supabase.from("finances").insert({
      appointment_id: id, date: app.date,
      treatment_price_usd: app.priceUSD, doctor_pay_usd: doctorPayUSD,
      materials_cost_usd: materialsCostUSD, utility_usd: utilityUSD,
      tasa_bcv: tasaBCV,
    });

    // Update appointment status
    await supabase.from("appointments").update({
      status: 'completada', materials_used: materialsUsed,
    }).eq("id", id);

    inv("appointments", "finances", "inventory");
  };

  // ─── Treatment ───
  const updateTreatment = async (name: string, priceUSD: number) => {
    await supabase.from("treatments").update({ price_usd: priceUSD }).eq("name", name);
    inv("treatments");
  };

  // ─── Transaction ───
  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    await supabase.from("transactions").insert({
      date: t.date, type: t.type, entity_name: t.entityName,
      appointment_id: t.appointmentId || null, rental_slot_id: t.rentalSlotId || null,
      amount_usd: t.amountUSD, amount_ves: t.amountVES, tasa_bcv: t.tasaBCV,
      payment_method: t.paymentMethod, payment_reference: t.paymentReference,
      description: t.description,
    });
    inv("transactions");
  };

  // ─── Finance ───
  const addFinance = async (f: Omit<FinanceRecord, 'id'>) => {
    await supabase.from("finances").insert({
      appointment_id: f.appointmentId, date: f.date,
      treatment_price_usd: f.treatmentPriceUSD, doctor_pay_usd: f.doctorPayUSD,
      materials_cost_usd: f.materialsCostUSD, utility_usd: f.utilityUSD,
      tasa_bcv: f.tasaBCV,
    });
    inv("finances");
  };

  const updateFinance = async (appointmentId: string, updates: Partial<FinanceRecord>) => {
    const mapped: any = {};
    if (updates.doctorPayUSD !== undefined) mapped.doctor_pay_usd = updates.doctorPayUSD;
    if (updates.utilityUSD !== undefined) mapped.utility_usd = updates.utilityUSD;
    if (updates.materialsCostUSD !== undefined) mapped.materials_cost_usd = updates.materialsCostUSD;
    await supabase.from("finances").update(mapped).eq("appointment_id", appointmentId);
    inv("finances");
  };

  // ─── Settings ───
  const setTasaBCV = async (tasa: number) => {
    if (settings?.id) {
      await supabase.from("settings").update({ tasa_bcv: tasa }).eq("id", settings.id);
    }
    inv("settings");
  };

  // ─── Tenant CRUD ───
  const addTenant = async (t: Omit<Tenant, 'id' | 'blockedSlots'>) => {
    const { data } = await supabase.from("tenants").insert({
      first_name: t.firstName, last_name: t.lastName, cov: t.cov,
      email: t.email, phone: t.phone, cedula: t.cedula,
      rental_mode: t.rentalMode, rental_price: t.rentalPrice,
    }).select().single();
    inv("tenants");
    return data;
  };
  const updateTenant = async (id: string, t: Partial<Tenant>) => {
    const mapped: any = {};
    if (t.firstName !== undefined) mapped.first_name = t.firstName;
    if (t.lastName !== undefined) mapped.last_name = t.lastName;
    if (t.cov !== undefined) mapped.cov = t.cov;
    if (t.email !== undefined) mapped.email = t.email;
    if (t.phone !== undefined) mapped.phone = t.phone;
    if (t.cedula !== undefined) mapped.cedula = t.cedula;
    if (t.rentalMode !== undefined) mapped.rental_mode = t.rentalMode;
    if (t.rentalPrice !== undefined) mapped.rental_price = t.rentalPrice;
    await supabase.from("tenants").update(mapped).eq("id", id);
    inv("tenants");
  };
  const deleteTenant = async (id: string) => {
    await supabase.from("tenants").delete().eq("id", id);
    inv("tenants", "tenant_blocked_slots");
  };
  const addTenantBlockedSlot = async (tenantId: string, slot: Omit<TenantBlockedSlot, 'id'>) => {
    await supabase.from("tenant_blocked_slots").insert({
      tenant_id: tenantId, date: slot.date, all_day: slot.allDay,
      start_time: slot.startTime, end_time: slot.endTime,
      treatment: slot.treatment || 'Revisión',
    });
    inv("tenant_blocked_slots");
  };
  const removeTenantBlockedSlot = async (_tenantId: string, slotId: string) => {
    await supabase.from("tenant_blocked_slots").delete().eq("id", slotId);
    inv("tenant_blocked_slots");
  };

  const updateBlockedSlot = async (slotId: string, updates: { rentalMode?: string; rentalPrice?: number; date?: string; startTime?: string; endTime?: string; treatment?: string }) => {
    const mapped: any = {};
    if (updates.rentalMode !== undefined) mapped.rental_mode = updates.rentalMode;
    if (updates.rentalPrice !== undefined) mapped.rental_price = updates.rentalPrice;
    if (updates.date !== undefined) mapped.date = updates.date;
    if (updates.startTime !== undefined) mapped.start_time = updates.startTime;
    if (updates.endTime !== undefined) mapped.end_time = updates.endTime;
    if (updates.treatment !== undefined) mapped.treatment = updates.treatment;
    await supabase.from("tenant_blocked_slots").update(mapped).eq("id", slotId);
    inv("tenant_blocked_slots");
  };

  // ─── Rental Requests (ALL blocked slots — all statuses) ───
  const rentalRequests = blockedSlots
    .filter((slot) => ['pending_review', 'approved', 'completed', 'cancelled'].includes(slot.status))
    .map((slot) => {
      const tenant = slot.tenant_id ? rawTenantsById.get(slot.tenant_id) : null;
      return {
        id: slot.id,
        date: slot.date,
        allDay: slot.all_day,
        startTime: slot.start_time || undefined,
        endTime: slot.end_time || undefined,
        status: slot.status || 'pending_review',
        tenantId: slot.tenant_id || undefined,
        requesterFirstName: tenant?.first_name || slot.requester_first_name || '',
        requesterLastName: tenant?.last_name || slot.requester_last_name || '',
        requesterCedula: tenant?.cedula || slot.requester_cedula || '',
        requesterCov: tenant?.cov || slot.requester_cov || '',
        requesterEmail: tenant?.email || slot.requester_email || '',
        requesterPhone: tenant?.phone || slot.requester_phone || '',
        rentalMode: slot.rental_mode || tenant?.rental_mode || 'turno',
        rentalPrice: slot.rental_price || tenant?.rental_price || 0,
        treatment: (slot as any).treatment || 'Revisión',
      };
    });

  const approveRentalRequest = async (slotId: string) => {
    // Find the request data
    const slot = blockedSlots.find(s => s.id === slotId);
    if (!slot) return;

    // Create or find tenant by cedula
    const existingTenant = rawTenants.find(t => t.cedula === slot.requester_cedula);
    let tenantId: string;

    if (existingTenant) {
      tenantId = existingTenant.id;
    } else {
      const { data } = await supabase.from("tenants").insert({
        first_name: slot.requester_first_name || '',
        last_name: slot.requester_last_name || '',
        cedula: slot.requester_cedula || '',
        cov: slot.requester_cov || '',
        email: slot.requester_email || '',
        phone: slot.requester_phone || '',
        rental_mode: slot.rental_mode || 'turno',
        rental_price: slot.rental_price || 0,
      }).select("id").single();
      tenantId = data?.id || '';
    }

    // Update the blocked slot: assign tenant_id and change status to approved
    await supabase.from("tenant_blocked_slots").update({
      tenant_id: tenantId,
      status: 'approved',
    }).eq("id", slotId);

    inv("tenant_blocked_slots", "tenants");
  };

  const rejectRentalRequest = async (slotId: string) => {
    await supabase.from("tenant_blocked_slots").update({ status: 'cancelled' }).eq("id", slotId);
    inv("tenant_blocked_slots");
  };

  const deleteRentalRequest = async (slotId: string) => {
    await supabase.from("tenant_blocked_slots").delete().eq("id", slotId);
    inv("tenant_blocked_slots");
  };

  const completeRentalSlot = async (slotId: string) => {
    const slot = blockedSlots.find(s => s.id === slotId);
    if (!slot) return;

    // Update status to completed
    await supabase.from("tenant_blocked_slots").update({ status: 'completed' }).eq("id", slotId);

    // Create finance/sales entry
    const tenant = slot.tenant_id ? rawTenantsById.get(slot.tenant_id) : null;
    const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : `${slot.requester_first_name || ''} ${slot.requester_last_name || ''}`.trim() || 'Inquilino';
    const rentalPrice = slot.rental_price || 0;

    if (rentalPrice > 0) {
      await supabase.from("finances").insert({
        date: slot.date,
        treatment_price_usd: rentalPrice,
        doctor_pay_usd: 0,
        materials_cost_usd: 0,
        utility_usd: rentalPrice,
        tasa_bcv: tasaBCV,
      });
    }

    inv("tenant_blocked_slots", "finances");
  };

  const isLoading = loadingDoctors;

  return {
    // Data
    doctors, treatments, appointments, patients, inventory, finances, tenants, tasaBCV, transactions,
    // Doctor
    addDoctor, updateDoctor, deleteDoctor,
    // Patient
    addPatient, updatePatient, deletePatient,
    // Inventory
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    // Appointment
    addAppointment, updateAppointment, deleteAppointment, completeAppointment,
    // Treatment
    updateTreatment,
    // Finance
    addFinance, updateFinance, addTransaction,
    // Settings
    setTasaBCV,
    // Tenant
    addTenant, updateTenant, deleteTenant, addTenantBlockedSlot, removeTenantBlockedSlot, updateBlockedSlot,
    // Rental Requests
    rentalRequests, approveRentalRequest, rejectRentalRequest, deleteRentalRequest, completeRentalSlot,
    // State
    isLoading,
  };
}

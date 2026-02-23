import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Doctor {
  id: string;
  email: string;
  pass: string;
  name: string;
  specialty: string;
  payModel: 'fixed' | 'percent';
  rate: number;
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
  name: string;
  priceUSD: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  date: string;
  time: string;
  treatment: string;
  priceUSD: number;
  status: 'pendiente' | 'completada' | 'cancelada';
  materialsUsed?: { itemId: string; qty: number }[];
  notes: string;
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

interface CosoState {
  tasaBCV: number;
  adminPassword: string;
  doctors: Doctor[];
  patients: Patient[];
  inventory: InventoryItem[];
  appointments: Appointment[];
  treatments: Treatment[];
  finances: FinanceRecord[];
  
  setTasaBCV: (tasa: number) => void;
  setAdminPassword: (pass: string) => void;
  
  addDoctor: (doc: Doctor) => void;
  updateDoctor: (id: string, doc: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;
  
  addPatient: (p: Patient) => void;
  updatePatient: (id: string, p: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  deductInventory: (itemId: string, qty: number) => boolean;
  
  addAppointment: (app: Appointment) => void;
  updateAppointment: (id: string, app: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  completeAppointment: (id: string, materialsUsed: { itemId: string; qty: number }[]) => void;
  
  addFinance: (f: FinanceRecord) => void;
  
  validateSlot: (date: string, time: string, excludeId?: string) => boolean;
  validateSchedule: (date: string, time: string) => { valid: boolean; reason?: string };
}

const generateId = () => Math.random().toString(36).substring(2, 10);

export const useCosoStore = create<CosoState>()(
  persist(
    (set, get) => ({
      tasaBCV: 36.50,
      adminPassword: '000000',
      
      doctors: [
        { id: 'd1', email: 'dra1@coso.com', pass: '000000', name: 'Dra. María González', specialty: 'Odontología General', payModel: 'percent', rate: 0.40 },
      ],
      
      patients: [],
      
      inventory: [
        { id: 'm1', name: 'Guantes (Caja)', stock: 50, priceUSD: 8.50, minStock: 10 },
        { id: 'm2', name: 'Anestesia Local', stock: 100, priceUSD: 3.00, minStock: 20 },
        { id: 'm3', name: 'Resina Compuesta', stock: 30, priceUSD: 25.00, minStock: 5 },
        { id: 'm4', name: 'Agujas Descartables', stock: 200, priceUSD: 0.50, minStock: 50 },
        { id: 'm5', name: 'Algodón (Bolsa)', stock: 40, priceUSD: 2.00, minStock: 10 },
      ],
      
      appointments: [],
      
      treatments: [
        { name: 'Blanqueamiento', priceUSD: 80 },
        { name: 'Endodoncia', priceUSD: 120 },
        { name: 'Extracción', priceUSD: 40 },
        { name: 'Limpieza', priceUSD: 30 },
        { name: 'Prótesis', priceUSD: 200 },
        { name: 'Resina', priceUSD: 45 },
        { name: 'Revisión', priceUSD: 25 },
        { name: 'Otros', priceUSD: 0 },
      ],
      
      finances: [],

      setTasaBCV: (tasa) => set({ tasaBCV: tasa }),
      setAdminPassword: (pass) => set({ adminPassword: pass }),

      addDoctor: (doc) => set((s) => ({ doctors: [...s.doctors, doc] })),
      updateDoctor: (id, doc) => set((s) => ({
        doctors: s.doctors.map((d) => d.id === id ? { ...d, ...doc } : d),
      })),
      deleteDoctor: (id) => set((s) => ({ doctors: s.doctors.filter((d) => d.id !== id) })),

      addPatient: (p) => set((s) => ({ patients: [...s.patients, p] })),
      updatePatient: (id, p) => set((s) => ({
        patients: s.patients.map((pt) => pt.id === id ? { ...pt, ...p } : pt),
      })),
      deletePatient: (id) => set((s) => ({ patients: s.patients.filter((p) => p.id !== id) })),

      addInventoryItem: (item) => set((s) => ({ inventory: [...s.inventory, item] })),
      updateInventoryItem: (id, item) => set((s) => ({
        inventory: s.inventory.map((i) => i.id === id ? { ...i, ...item } : i),
      })),
      deleteInventoryItem: (id) => set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) })),
      deductInventory: (itemId, qty) => {
        const item = get().inventory.find((i) => i.id === itemId);
        if (!item || item.stock - qty < 0) return false;
        set((s) => ({
          inventory: s.inventory.map((i) =>
            i.id === itemId ? { ...i, stock: Math.round((i.stock - qty) * 100) / 100 } : i
          ),
        }));
        return true;
      },

      addAppointment: (app) => set((s) => ({ appointments: [...s.appointments, app] })),
      updateAppointment: (id, app) => set((s) => ({
        appointments: s.appointments.map((a) => a.id === id ? { ...a, ...app } : a),
      })),
      deleteAppointment: (id) => set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),
      completeAppointment: (id, materialsUsed) => {
        const state = get();
        const app = state.appointments.find((a) => a.id === id);
        if (!app) return;

        // Deduct materials
        materialsUsed.forEach(({ itemId, qty }) => {
          state.deductInventory(itemId, qty);
        });

        // Calculate finance
        const doctor = state.doctors.find((d) => d.id === app.doctorId);
        const doctorPayUSD = doctor
          ? doctor.payModel === 'percent'
            ? app.priceUSD * doctor.rate
            : doctor.rate
          : 0;
        
        const materialsCostUSD = materialsUsed.reduce((sum, { itemId, qty }) => {
          const item = state.inventory.find((i) => i.id === itemId);
          return sum + (item ? item.priceUSD * qty : 0);
        }, 0);

        const utilityUSD = app.priceUSD - doctorPayUSD - materialsCostUSD;

        const finance: FinanceRecord = {
          id: generateId(),
          appointmentId: id,
          date: app.date,
          treatmentPriceUSD: app.priceUSD,
          doctorPayUSD,
          materialsCostUSD,
          utilityUSD,
          tasaBCV: state.tasaBCV,
        };

        set((s) => ({
          appointments: s.appointments.map((a) =>
            a.id === id ? { ...a, status: 'completada', materialsUsed } : a
          ),
          finances: [...s.finances, finance],
        }));
      },

      addFinance: (f) => set((s) => ({ finances: [...s.finances, f] })),

      validateSlot: (date, time, excludeId) => {
        const requested = new Date(`${date}T${time}`);
        const collision = get().appointments.some((app) => {
          if (excludeId && app.id === excludeId) return false;
          if (app.status === 'cancelada') return false;
          const existing = new Date(`${app.date}T${app.time}`);
          const diff = Math.abs(requested.getTime() - existing.getTime()) / (1000 * 60);
          return app.date === date && diff < 60;
        });
        return !collision;
      },

      validateSchedule: (date, time) => {
        const d = new Date(`${date}T${time}`);
        const day = d.getDay();
        const hours = parseInt(time.split(':')[0]);
        const minutes = parseInt(time.split(':')[1]);
        const timeInMinutes = hours * 60 + minutes;
        
        if (day === 0) return { valid: false, reason: 'No se aceptan citas los domingos' };
        if (day === 6) {
          if (timeInMinutes < 480 || timeInMinutes >= 840) {
            return { valid: false, reason: 'Sábados: 08:00 - 14:00' };
          }
        } else {
          if (timeInMinutes < 480 || timeInMinutes >= 1020) {
            return { valid: false, reason: 'Lun-Vie: 08:00 - 17:00' };
          }
        }
        return { valid: true };
      },
    }),
    { name: 'coso-ultimate-v41' }
  )
);

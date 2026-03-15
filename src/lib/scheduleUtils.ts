
export const getCaracasDate = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Caracas" }));
};

export const getCaracasNow = () => getCaracasDate();

export const getCaracasToday = () => {
  const c = getCaracasDate();
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
};

export interface BlockedSlotData {
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  status?: string;
}

export interface TenantWithSlots {
  firstName: string;
  lastName: string;
  blockedSlots: BlockedSlotData[];
}

export const isSlotBlockedByTenant = (
  date: string,
  time: string,
  tenants: TenantWithSlots[]
): { blocked: boolean; tenantName?: string } => {
  const hour = parseInt(time.split(':')[0]);
  for (const tenant of tenants) {
    for (const slot of tenant.blockedSlots) {
      if (slot.date !== date) continue;
      if (slot.allDay) return { blocked: true, tenantName: `${tenant.firstName} ${tenant.lastName}` };
      if (slot.startTime && slot.endTime) {
        const start = parseInt(slot.startTime.split(':')[0]);
        const end = parseInt(slot.endTime.split(':')[0]);
        if (hour >= start && hour < end) {
          return { blocked: true, tenantName: `${tenant.firstName} ${tenant.lastName}` };
        }
      }
    }
  }
  return { blocked: false };
};

export interface AppointmentSlotData {
  id: string;
  date: string;
  time: string;
  status: string;
}

export const validateSlot = (
  date: string,
  time: string,
  appointments: AppointmentSlotData[],
  tenants: TenantWithSlots[],
  excludeId?: string
): boolean => {
  const tenantCheck = isSlotBlockedByTenant(date, time, tenants);
  if (tenantCheck.blocked) return false;

  const requested = new Date(`${date}T${time}`);
  const collision = appointments.some((app) => {
    if (excludeId && app.id === excludeId) return false;
    if (app.status === 'cancelada') return false;
    const existing = new Date(`${app.date}T${app.time}`);
    const diff = Math.abs(requested.getTime() - existing.getTime()) / (1000 * 60);
    return app.date === date && diff < 60;
  });
  return !collision;
};

export const validateSchedule = (date: string, time: string): { valid: boolean; reason?: string } => {
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
};

/**
 * Check if date is within the next 48 hours from now (Caracas time).
 */
export const isWithin48Hours = (date: string): boolean => {
  const now = getCaracasDate();
  const target = new Date(date + 'T23:59:59');
  const diffMs = target.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= 48 * 60 * 60 * 1000;
};

/**
 * Get ALL available time slots for a date (used for 48h bypass and waitlist).
 */
export const getAllAvailableSlots = (
  date: string,
  allAppointments: AppointmentSlotData[],
  tenants: TenantWithSlots[],
  currentHour?: number,
  isToday?: boolean
): string[] => {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  if (day === 0) return [];

  const endHour = day === 6 ? 14 : 17;
  const allHours: number[] = [];
  for (let h = 8; h < endHour; h++) allHours.push(h);

  const bookedHours = new Set<number>();
  const dayAppointments = allAppointments.filter(
    a => a.date === date && a.status !== 'cancelada'
  );
  for (const a of dayAppointments) {
    bookedHours.add(parseInt(a.time.split(':')[0]));
  }

  return allHours.filter(h => {
    if (isToday && currentHour !== undefined && h <= currentHour) return false;
    const time = `${h.toString().padStart(2, '0')}:00`;
    if (isSlotBlockedByTenant(date, time, tenants).blocked) return false;
    if (bookedHours.has(h)) return false;
    return true;
  }).map(h => `${h.toString().padStart(2, '0')}:00`);
};

/**
 * Smart scheduling algorithm that maximizes agenda density.
 * Rules:
 * 1. Empty day → only anchor slots (08:00, 14:00)
 * 2. Proximity: enable T-1 and T+1 from existing bookings
 * 3. Max 4 options shown, prioritizing gap-closing slots
 * 4. 70% block rule: don't open opposite block if current < 70% contiguous
 * 5. 48-hour bypass: if date is within 48h, show ALL available slots (max 4)
 */
export const getSmartTimeSlots = (
  date: string,
  allAppointments: AppointmentSlotData[],
  tenants: TenantWithSlots[],
  currentHour?: number,
  isToday?: boolean
): string[] => {
  // 48-hour bypass: show all available slots to avoid losing last-minute patients
  if (isWithin48Hours(date)) {
    const all = getAllAvailableSlots(date, allAppointments, tenants, currentHour, isToday);
    return all.slice(0, 3);
  }

  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  if (day === 0) return [];

  const endHour = day === 6 ? 14 : 17;
  const allHours: number[] = [];
  for (let h = 8; h < endHour; h++) allHours.push(h);

  // Filter out past hours, blocked by tenant, or already booked
  const bookedHours = new Set<number>();
  const dayAppointments = allAppointments.filter(
    a => a.date === date && a.status !== 'cancelada'
  );
  for (const a of dayAppointments) {
    bookedHours.add(parseInt(a.time.split(':')[0]));
  }

  const availableHours = allHours.filter(h => {
    if (isToday && currentHour !== undefined && h <= currentHour) return false;
    const time = `${h.toString().padStart(2, '0')}:00`;
    if (isSlotBlockedByTenant(date, time, tenants).blocked) return false;
    if (bookedHours.has(h)) return false;
    return true;
  });

  if (availableHours.length === 0) return [];

  // Define blocks
  const MORNING_ANCHOR = 8;
  const AFTERNOON_ANCHOR = 14;
  const morningRange = allHours.filter(h => h < 13);
  const afternoonRange = allHours.filter(h => h >= 13);

  // If NO bookings for the day → only anchors
  if (bookedHours.size === 0) {
    const anchors: string[] = [];
    if (availableHours.includes(MORNING_ANCHOR))
      anchors.push(`${MORNING_ANCHOR.toString().padStart(2, '0')}:00`);
    if (availableHours.includes(AFTERNOON_ANCHOR))
      anchors.push(`${AFTERNOON_ANCHOR.toString().padStart(2, '0')}:00`);
    return anchors.slice(0, 3);
  }

  // Build proximity set: for each booked hour, allow T-1 and T+1
  const proximitySet = new Set<number>();
  for (const bh of bookedHours) {
    if (bh - 1 >= 8) proximitySet.add(bh - 1);
    if (bh + 1 < endHour) proximitySet.add(bh + 1);
  }

  // Also always keep anchors in proximity if their block has activity
  const morningBooked = [...bookedHours].filter(h => morningRange.includes(h));
  const afternoonBooked = [...bookedHours].filter(h => afternoonRange.includes(h));

  if (morningBooked.length > 0) proximitySet.add(MORNING_ANCHOR);
  if (afternoonBooked.length > 0) proximitySet.add(AFTERNOON_ANCHOR);

  // 70% block rule
  const morningCapacity = morningRange.length;
  const afternoonCapacity = afternoonRange.length;
  const morningOccupancy = morningBooked.length / morningCapacity;
  const afternoonOccupancy = afternoonBooked.length / afternoonCapacity;

  // Filter available by proximity
  let smartSlots = availableHours.filter(h => proximitySet.has(h));

  // Apply 70% rule: if morning < 70%, remove afternoon slots (unless afternoon already has bookings)
  if (morningBooked.length > 0 && afternoonBooked.length === 0 && morningOccupancy < 0.7) {
    smartSlots = smartSlots.filter(h => morningRange.includes(h));
  }
  if (afternoonBooked.length > 0 && morningBooked.length === 0 && afternoonOccupancy < 0.7) {
    smartSlots = smartSlots.filter(h => afternoonRange.includes(h));
  }

  // Prioritize gap-closing: slots adjacent to the most bookings get priority
  smartSlots.sort((a, b) => {
    const scoreA = (bookedHours.has(a - 1) ? 1 : 0) + (bookedHours.has(a + 1) ? 1 : 0);
    const scoreB = (bookedHours.has(b - 1) ? 1 : 0) + (bookedHours.has(b + 1) ? 1 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA; // higher adjacency first
    return a - b; // earlier first as tiebreaker
  });

  // Return max 3
  return smartSlots.slice(0, 3).sort((a, b) => a - b).map(
    h => `${h.toString().padStart(2, '0')}:00`
  );
};

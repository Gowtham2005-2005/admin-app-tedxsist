export interface TimeSlot {
  id: string;
  label: string;     // e.g. "09:00 – 09:15"
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:15"
  capacity: number;  // max participants per slot
}

export interface SlotConfig {
  slots: TimeSlot[];
  eventName: string;
  eventDate: string;
  eventVenue: string;
  updatedAt?: string;
}

export const DEFAULT_SLOT_CONFIG: SlotConfig = {
  slots: [
    { id: "slot1", label: "09:00 – 09:15", startTime: "09:00", endTime: "09:15", capacity: 25 },
    { id: "slot2", label: "09:15 – 09:30", startTime: "09:15", endTime: "09:30", capacity: 25 },
    { id: "slot3", label: "09:30 – 09:45", startTime: "09:30", endTime: "09:45", capacity: 25 },
    { id: "slot4", label: "09:45 – 10:00", startTime: "09:45", endTime: "10:00", capacity: 25 },
  ],
  eventName: "TEDxSIST 2026",
  eventDate: "July 17, 2026",
  eventVenue: "Mj auditorium",
};

/**
 * Assigns slots to participants using round-robin distribution.
 * Returns array of slot labels indexed to match the participants array.
 */
export function assignSlots(participantIds: string[], slots: TimeSlot[]): string[] {
  if (!slots.length) return participantIds.map(() => "TBD");
  return participantIds.map((_, idx) => slots[idx % slots.length].label);
}

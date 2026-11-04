/**
 * Time and Scheduling Utilities for AutoMotion Rental System
 * Standardized to Philippine Time: Asia/Manila (UTC+8)
 */

export const PHILIPPINE_TIMEZONE = 'Asia/Manila';
export const GRACE_PERIOD_MINUTES = 59;
export const HOURLY_LATE_FEE_RATE = 20; // ₱20 per completed hour after grace period

/**
 * Format any ISO/timestamp string to Philippine Date and Time
 * Example output: "Nov 11, 2026, 10:00 AM"
 */
export function formatPhilippineDateTime(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '—';
  try {
    const d = new Date(isoOrDateString);
    if (isNaN(d.getTime())) return String(isoOrDateString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINE_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(isoOrDateString);
  }
}

/**
 * Format to Philippine Date only
 * Example output: "Nov 11, 2026"
 */
export function formatPhilippineDate(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '—';
  try {
    const d = new Date(isoOrDateString);
    if (isNaN(d.getTime())) return String(isoOrDateString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINE_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(isoOrDateString);
  }
}

/**
 * Format to Philippine Time only
 * Example output: "10:00 AM"
 */
export function formatPhilippineTime(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '—';
  try {
    const d = new Date(isoOrDateString);
    if (isNaN(d.getTime())) return String(isoOrDateString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINE_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(isoOrDateString);
  }
}

/**
 * Returns current Philippine date (YYYY-MM-DD), time (HH:mm), and full ISO string
 */
export function getCurrentPhilippineSchedule(): {
  date: string;
  time: string;
  isoString: string;
} {
  const now = new Date();
  
  // Use Intl to format in Asia/Manila
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;
  const isoString = now.toISOString();

  return { date, time, isoString };
}

/**
 * Builds an absolute ISO timestamp from Philippine date and time (YYYY-MM-DD and HH:mm)
 */
export function createPhilippineIsoString(dateStr: string, timeStr: string): string {
  // Format as +08:00 offset explicitly to ensure reliable timezone anchoring
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim();
  const timeWithSeconds = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  return new Date(`${cleanDate}T${timeWithSeconds}+08:00`).toISOString();
}

/**
 * Automatically calculates the Expected Return schedule given a pickup date, time, and duration in days.
 * Default rental duration: 24 hours (1 day).
 * Handles overnight, month transitions, and multiple days accurately.
 */
export function calculateExpectedReturnSchedule(
  pickupDate: string,
  pickupTime: string,
  days: number = 1
): {
  pickupIso: string;
  expectedReturnIso: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
} {
  const durationDays = Math.max(1, days);
  const pickupIso = createPhilippineIsoString(pickupDate, pickupTime);
  const pickupMs = new Date(pickupIso).getTime();

  // Duration in milliseconds: days * 24 hours
  const returnMs = pickupMs + durationDays * 24 * 60 * 60 * 1000;
  const returnDateObj = new Date(returnMs);
  const expectedReturnIso = returnDateObj.toISOString();

  // Extract Philippine date and time parts for expected return
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(returnDateObj);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const expectedReturnDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const expectedReturnTime = `${getPart('hour')}:${getPart('minute')}`;

  return {
    pickupIso,
    expectedReturnIso,
    expectedReturnDate,
    expectedReturnTime,
  };
}

export interface LateFeeCalculationResult {
  elapsedMinutes: number; // A - E in minutes (can be negative if returned early)
  lateMinutes: number; // max(0, elapsedMinutes)
  chargeableLateHours: number; // floor(lateMinutes / 60) if >= 60, else 0
  lateReturnFee: number; // chargeableLateHours * 20
  isLate: boolean; // lateMinutes >= 60
  withinGracePeriod: boolean; // lateMinutes > 0 && lateMinutes <= 59
  gracePeriodMinutes: number; // 59
  ratePerHour: number; // 20
}

/**
 * Calculates Automatic Late Return Fee based on Expected Return and Actual Return timestamps.
 * 
 * Rules:
 * - Grace Period: 59 minutes (L <= 59 mins -> Late Fee = ₱0)
 * - At exactly 60 minutes late: floor(60/60) * ₱20 = ₱20
 * - At 119 minutes late: floor(119/60) * ₱20 = ₱20
 * - At 120 minutes late: floor(120/60) * ₱20 = ₱40
 * - At 180 minutes late: floor(180/60) * ₱20 = ₱60
 * - Formula: If L < 60 mins -> ₱0. If L >= 60 mins -> floor(L / 60) * ₱20.
 */
export function calculateLateFee(
  expectedReturnIsoOrDate: string,
  actualReturnIsoOrDate: string
): LateFeeCalculationResult {
  const expectedMs = new Date(expectedReturnIsoOrDate).getTime();
  const actualMs = new Date(actualReturnIsoOrDate).getTime();

  if (isNaN(expectedMs) || isNaN(actualMs)) {
    return {
      elapsedMinutes: 0,
      lateMinutes: 0,
      chargeableLateHours: 0,
      lateReturnFee: 0,
      isLate: false,
      withinGracePeriod: false,
      gracePeriodMinutes: GRACE_PERIOD_MINUTES,
      ratePerHour: HOURLY_LATE_FEE_RATE,
    };
  }

  // Elapsed difference in minutes
  const diffMs = actualMs - expectedMs;
  const elapsedMinutes = Math.floor(diffMs / (1000 * 60));
  const lateMinutes = Math.max(0, elapsedMinutes);

  let chargeableLateHours = 0;
  let lateReturnFee = 0;
  let isLate = false;
  let withinGracePeriod = false;

  if (lateMinutes > 0 && lateMinutes <= GRACE_PERIOD_MINUTES) {
    withinGracePeriod = true;
    chargeableLateHours = 0;
    lateReturnFee = 0;
    isLate = false;
  } else if (lateMinutes >= 60) {
    isLate = true;
    chargeableLateHours = Math.floor(lateMinutes / 60);
    lateReturnFee = chargeableLateHours * HOURLY_LATE_FEE_RATE;
  }

  return {
    elapsedMinutes,
    lateMinutes,
    chargeableLateHours,
    lateReturnFee,
    isLate,
    withinGracePeriod,
    gracePeriodMinutes: GRACE_PERIOD_MINUTES,
    ratePerHour: HOURLY_LATE_FEE_RATE,
  };
}

/**
 * Format minutes into human-readable duration
 * Examples: "0 mins", "45 mins", "1 hr 15 mins", "2 hrs"
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return '0 mins';
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hrs === 0) {
    return `${remainingMins} min${remainingMins === 1 ? '' : 's'}`;
  }
  if (remainingMins === 0) {
    return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  }
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${remainingMins} min${remainingMins === 1 ? '' : 's'}`;
}

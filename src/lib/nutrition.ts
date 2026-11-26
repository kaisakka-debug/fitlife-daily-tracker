import { Goal, NutritionSummary, ProfileData } from '@/types/fitlife';

export const GOAL_OPTIONS: Array<{
  id: Goal;
  label: string;
  short: string;
  desc: string;
}> = [
  {
    id: 'lose',
    label: 'ลดไขมัน / ลดน้ำหนัก',
    short: 'ลดไขมัน',
    desc: 'ตัดแคลอรี่อย่างปลอดภัย ไม่ต่ำกว่า BMR',
  },
  {
    id: 'maintain',
    label: 'คงน้ำหนัก',
    short: 'คงน้ำหนัก',
    desc: 'รักษาน้ำหนักและระดับพลังงานให้สมดุล',
  },
  {
    id: 'gain',
    label: 'เพิ่มกล้ามเนื้อ',
    short: 'เพิ่มกล้ามเนื้อ',
    desc: 'เพิ่มพลังงาน +300 kcal และโปรตีนสูงขึ้น',
  },
];

export const ACTIVITY_CARDS = [
  {
    multiplier: 1.2,
    emoji: '🛋️',
    title: 'วันพัก / นั่งทำงานเรียนอย่างเดียว',
    desc: 'นั่งโต๊ะ เรียน ทำงานหน้าจอ แทบไม่ได้เดิน',
    tag: 'BMR × 1.2',
  },
  {
    multiplier: 1.375,
    emoji: '🚶',
    title: 'เดินเยอะ / ทำงานบ้าน / ออกข้างนอก',
    desc: 'เดินเดินทาง ทำงานบ้าน เดินซื้อของทั้งวัน',
    tag: 'BMR × 1.375',
  },
  {
    multiplier: 1.5,
    emoji: '🏋️',
    title: 'ออกกำลังกาย 30–45 นาที',
    desc: 'เวทเทรนนิ่ง, เดินเร็ว, วิ่งเหยาะ ระดับปานกลาง',
    tag: 'BMR × 1.5',
  },
  {
    multiplier: 1.65,
    emoji: '⚡',
    title: 'ออกกำลังกายหนัก / กีฬา 1 ชม.+',
    desc: 'วิ่งหนัก, เตะบอล, เวทหนัก หรือเล่นกีฬาต่อเนื่อง',
    tag: 'BMR × 1.65',
  },
];

export function toSafePositive(val: unknown): number {
  if (val === '' || val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateString(isoDate: string, deltaDays: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return getLocalDateString();
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + deltaDays);
  return getLocalDateString(d);
}

export function getCurrentTimeString(date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatTimeFromIso(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return getCurrentTimeString(d);
}

export function formatShortThaiDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  const mIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(day) || mIdx < 0 || mIdx > 11) return isoDate;
  return `${day} ${months[mIdx]}`;
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122-compatible v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let partA = '';
  let partB = '';
  for (let i = 0; i < 4; i++) {
    partA += chars[Math.floor(Math.random() * chars.length)];
    partB += chars[Math.floor(Math.random() * chars.length)];
  }
  return `FIT-${partA}-${partB}`;
}

export function calculateNutrition(
  profile: ProfileData,
  activityMultiplier: number
): NutritionSummary {
  const weight = toSafePositive(profile.weight);
  const height = toSafePositive(profile.height);
  const age = toSafePositive(profile.age);
  const mult =
    Number.isFinite(Number(activityMultiplier)) && Number(activityMultiplier) > 0
      ? Number(activityMultiplier)
      : 1.2;

  if (weight <= 0 || height <= 0 || age <= 0) {
    return {
      isValid: false,
      bmr: 0,
      tdee: 0,
      targetCalories: 0,
      targetProtein: 0,
    };
  }

  const base = 10 * weight + 6.25 * height - 5 * age;
  const rawBmr = profile.gender === 'female' ? base - 161 : base + 5;
  const bmr = Math.max(0, rawBmr);
  const tdee = Math.max(0, bmr * mult);

  let targetCalories = tdee;
  if (profile.goal === 'lose') {
    targetCalories = Math.max(tdee - 500, bmr, 1200);
  } else if (profile.goal === 'gain') {
    targetCalories = tdee + 300;
  }

  const proteinFactor = profile.goal === 'gain' ? 1.8 : 1.6;
  const targetProtein = Math.max(0, Math.round(weight * proteinFactor));

  return {
    isValid: true,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.max(0, Math.round(targetCalories)),
    targetProtein,
  };
}

export const AVATAR_OPTIONS = ['💪', '🏃', '🔥', '🥗', '🏋️', '⚡', '🦊', '🌸'] as const;

export interface BmiSummary {
  bmi: number;
  label: string;
  badgeClass: string;
}

export function calculateBmi(weight: unknown, height: unknown): BmiSummary | null {
  const w = toSafePositive(weight);
  const h = toSafePositive(height);
  if (w <= 0 || h <= 0) return null;
  const meters = h / 100;
  const bmi = Number((w / (meters * meters)).toFixed(1));
  // เกณฑ์ BMI สำหรับคนเอเชีย (WHO Asia-Pacific)
  if (bmi < 18.5) {
    return {
      bmi,
      label: 'น้ำหนักน้อย',
      badgeClass: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
    };
  }
  if (bmi < 23) {
    return {
      bmi,
      label: 'สมส่วน',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    };
  }
  if (bmi < 25) {
    return {
      bmi,
      label: 'ท้วม',
      badgeClass: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    };
  }
  return {
    bmi,
    label: 'เริ่มอ้วน/อ้วน',
    badgeClass: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  };
}

export function buildProfileSummaryLine(
  profile: ProfileData,
  nutrition: NutritionSummary
): string {
  const genderText = profile.gender === 'female' ? 'หญิง' : 'ชาย';
  const ageText =
    toSafePositive(profile.age) > 0 ? `อายุ ${profile.age} ปี` : 'ยังไม่ระบุอายุ';
  const heightText =
    toSafePositive(profile.height) > 0 ? `${profile.height} ซม.` : 'ยังไม่ระบุส่วนสูง';
  const weightText =
    toSafePositive(profile.weight) > 0 ? `${profile.weight} กก.` : 'ยังไม่ระบุน้ำหนัก';
  const goalObj = GOAL_OPTIONS.find((g) => g.id === profile.goal) || GOAL_OPTIONS[0];
  const bmrText = nutrition.isValid
    ? `BMR ${formatNumber(nutrition.bmr)} kcal`
    : 'กรอกข้อมูลให้ครบ';
  const prefix = profile.name.trim() ? `${profile.name.trim()} • ` : '';
  return `${prefix}${genderText} • ${ageText} • ${heightText} • ${weightText} • ${goalObj.short} • ${bmrText}`;
}

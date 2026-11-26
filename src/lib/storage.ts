import {
  FitLifeState,
  FoodLogItem,
  MealCategory,
  MealItem,
  PendingOps,
  WorkoutDay,
} from '@/types/fitlife';
import { generateSyncCode, generateUuid, getLocalDateString, toSafePositive } from '@/lib/nutrition';
import { cloneDefaultWorkouts, DEFAULT_WORKOUTS } from '@/lib/workouts-data';

export const STORAGE_KEY = 'fitlife_daily_tracker_v2';
const LEGACY_STORAGE_KEY = 'fitlife_daily_tracker_v1';

const VALID_CATEGORIES: MealCategory[] = [
  'ตามสั่ง',
  'ก๋วยเตี๋ยว/จานเดียว',
  'ส้มตำ/ลาบ/ปิ้งย่าง',
  '7-Eleven/คาเฟ่',
];

export function createEmptyPendingOps(): PendingOps {
  return {
    profileDirty: false,
    upsertedFoodLogs: [],
    deletedFoodLogIds: [],
    clearedFoodDates: [],
    upsertedWeights: [],
    upsertedCustomMeals: [],
    deletedCustomMealIds: [],
    dirtyWorkoutDays: [],
  };
}

export function createDefaultState(customSyncCode?: string): FitLifeState {
  const today = getLocalDateString();
  return {
    theme: 'light',
    activeTab: 'today',
    syncCode: customSyncCode || generateSyncCode(),
    authEmail: null,
    profile: {
      name: '',
      gender: 'male',
      age: 23,
      height: 175,
      weight: 95,
      goal: 'lose',
    },
    activityMultiplier: 1.2,
    todayDate: today,
    selectedDate: today,
    logsByDate: {},
    weightHistory: [],
    customMeals: [],
    workouts: cloneDefaultWorkouts(),
    activeWorkoutDay: 0,
    workoutStreak: 0,
    autoTimer: true,
    pendingOps: createEmptyPendingOps(),
  };
}

function normalizeWorkouts(raw: unknown): WorkoutDay[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return cloneDefaultWorkouts();
  }
  return raw.map((day, idx) => {
    const fallback = DEFAULT_WORKOUTS[idx];
    const obj = (day && typeof day === 'object' ? day : {}) as Record<string, unknown>;
    const exercisesRaw = Array.isArray(obj.exercises) ? obj.exercises : [];
    return {
      dayName: typeof obj.dayName === 'string' ? obj.dayName : fallback.dayName,
      focus: typeof obj.focus === 'string' ? obj.focus : fallback.focus,
      completedAt: typeof obj.completedAt === 'string' ? obj.completedAt : null,
      exercises: exercisesRaw.map((ex) => {
        const e = (ex && typeof ex === 'object' ? ex : {}) as Record<string, unknown>;
        const setsRaw = Array.isArray(e.sets) && e.sets.length > 0 ? e.sets.map(Boolean) : [false, false, false, false];
        return {
          id: typeof e.id === 'string' && e.id ? e.id : generateUuid(),
          name: typeof e.name === 'string' ? e.name : 'ท่าฝึก',
          weight: Number.isFinite(Number(e.weight)) && Number(e.weight) >= 0 ? Number(e.weight) : 0,
          reps: Number.isFinite(Number(e.reps)) && Number(e.reps) >= 0 ? Number(e.reps) : 10,
          sets: setsRaw,
          tip: typeof e.tip === 'string' ? e.tip : '',
        };
      }),
    };
  });
}

function normalizeMeal(raw: unknown): MealItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const category = VALID_CATEGORIES.includes(m.category as MealCategory)
    ? (m.category as MealCategory)
    : 'ตามสั่ง';
  return {
    id: typeof m.id === 'string' && m.id ? m.id : generateUuid(),
    name: typeof m.name === 'string' && m.name.trim() ? m.name.trim() : 'เมนูส่วนตัว',
    category,
    kcal: Math.round(toSafePositive(m.kcal)),
    protein: Math.round(toSafePositive(m.protein)),
    carbs: Math.round(toSafePositive(m.carbs)),
    fat: Math.round(toSafePositive(m.fat)),
    tip: typeof m.tip === 'string' ? m.tip : '',
    isCustom: true,
  };
}

export function normalizeState(raw: unknown): FitLifeState {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const rawProfile = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;
  const currentToday = getLocalDateString();

  const logsByDate: Record<string, FoodLogItem[]> = {};
  if (r.logsByDate && typeof r.logsByDate === 'object') {
    for (const [dateKey, list] of Object.entries(r.logsByDate as Record<string, unknown>)) {
      if (Array.isArray(list)) {
        logsByDate[dateKey] = list
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const it = item as Record<string, unknown>;
            return {
              id: typeof it.id === 'string' && it.id ? it.id : generateUuid(),
              logDate: typeof it.logDate === 'string' ? it.logDate : dateKey,
              mealName: typeof it.mealName === 'string' ? it.mealName : String(it.name || 'รายการอาหาร'),
              kcal: Math.round(toSafePositive(it.kcal)),
              protein: Math.round(toSafePositive(it.protein)),
              time: typeof it.time === 'string' ? it.time : '',
              createdAt: typeof it.createdAt === 'string' ? it.createdAt : undefined,
            };
          });
      }
    }
  } else if (Array.isArray(r.todayLogs) && r.todayLogs.length > 0) {
    // Smooth migration from v1 schema
    const legacyDate = typeof r.todayDate === 'string' && r.todayDate ? r.todayDate : currentToday;
    logsByDate[legacyDate] = r.todayLogs.map((item: Record<string, unknown>) => ({
      id: generateUuid(),
      logDate: legacyDate,
      mealName: typeof item.name === 'string' ? item.name : 'รายการอาหาร',
      kcal: Math.round(toSafePositive(item.kcal)),
      protein: Math.round(toSafePositive(item.protein)),
      time: typeof item.time === 'string' ? item.time : '',
    }));
  }

  const storedToday = typeof r.todayDate === 'string' && r.todayDate ? r.todayDate : currentToday;
  const rolledOver = storedToday !== currentToday;

  const mult = Number(r.activityMultiplier);
  const validMult = [1.2, 1.375, 1.5, 1.65].includes(mult) ? mult : 1.2;

  const rawPending = (r.pendingOps && typeof r.pendingOps === 'object' ? r.pendingOps : {}) as Partial<PendingOps>;

  return {
    theme: r.theme === 'dark' ? 'dark' : 'light',
    activeTab: r.activeTab === 'meals' || r.activeTab === 'workout' ? r.activeTab : 'today',
    syncCode: typeof r.syncCode === 'string' && r.syncCode.trim().length >= 6 ? r.syncCode.trim().toUpperCase() : base.syncCode,
    authEmail: typeof r.authEmail === 'string' && r.authEmail ? r.authEmail : null,
    profile: {
      name: typeof rawProfile.name === 'string' ? rawProfile.name : '',
      gender: rawProfile.gender === 'female' ? 'female' : 'male',
      age:
        rawProfile.age === ''
          ? ''
          : Number.isFinite(Number(rawProfile.age))
          ? Math.max(0, Number(rawProfile.age))
          : 23,
      height:
        rawProfile.height === ''
          ? ''
          : Number.isFinite(Number(rawProfile.height))
          ? Math.max(0, Number(rawProfile.height))
          : 175,
      weight:
        rawProfile.weight === ''
          ? ''
          : Number.isFinite(Number(rawProfile.weight))
          ? Math.max(0, Number(rawProfile.weight))
          : 95,
      goal:
        rawProfile.goal === 'maintain' || rawProfile.goal === 'gain' ? rawProfile.goal : 'lose',
    },
    activityMultiplier: rolledOver ? 1.2 : validMult,
    todayDate: currentToday,
    selectedDate: rolledOver
      ? currentToday
      : typeof r.selectedDate === 'string' && r.selectedDate
      ? r.selectedDate
      : currentToday,
    logsByDate,
    weightHistory: Array.isArray(r.weightHistory)
      ? r.weightHistory
          .filter((w) => w && typeof w === 'object' && Number.isFinite(Number((w as Record<string, unknown>).weight)))
          .map((w) => {
            const entry = w as Record<string, unknown>;
            return {
              id: typeof entry.id === 'string' ? entry.id : undefined,
              date: typeof entry.date === 'string' ? entry.date : currentToday,
              weight: Number(Number(entry.weight).toFixed(1)),
            };
          })
      : [],
    customMeals: Array.isArray(r.customMeals)
      ? r.customMeals.map(normalizeMeal).filter((m): m is MealItem => Boolean(m))
      : [],
    workouts: normalizeWorkouts(r.workouts),
    activeWorkoutDay: [0, 1, 2].includes(Number(r.activeWorkoutDay)) ? Number(r.activeWorkoutDay) : 0,
    workoutStreak:
      Number.isFinite(Number(r.workoutStreak)) && Number(r.workoutStreak) >= 0
        ? Math.floor(Number(r.workoutStreak))
        : 0,
    autoTimer: typeof r.autoTimer === 'boolean' ? r.autoTimer : true,
    pendingOps: {
      profileDirty: Boolean(rawPending.profileDirty),
      upsertedFoodLogs: Array.isArray(rawPending.upsertedFoodLogs) ? rawPending.upsertedFoodLogs : [],
      deletedFoodLogIds: Array.isArray(rawPending.deletedFoodLogIds) ? rawPending.deletedFoodLogIds : [],
      clearedFoodDates: Array.isArray(rawPending.clearedFoodDates) ? rawPending.clearedFoodDates : [],
      upsertedWeights: Array.isArray(rawPending.upsertedWeights) ? rawPending.upsertedWeights : [],
      upsertedCustomMeals: Array.isArray(rawPending.upsertedCustomMeals) ? rawPending.upsertedCustomMeals : [],
      deletedCustomMealIds: Array.isArray(rawPending.deletedCustomMealIds) ? rawPending.deletedCustomMealIds : [],
      dirtyWorkoutDays: Array.isArray(rawPending.dirtyWorkoutDays) ? rawPending.dirtyWorkoutDays : [],
    },
  };
}

export function loadLocalState(): FitLifeState {
  if (typeof window === 'undefined') return createDefaultState();
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      return normalizeState(JSON.parse(rawV2));
    }
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const migrated = normalizeState(JSON.parse(rawV1));
      migrated.pendingOps.profileDirty = true;
      return migrated;
    }
    return createDefaultState();
  } catch {
    return createDefaultState();
  }
}

export function saveLocalState(state: FitLifeState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

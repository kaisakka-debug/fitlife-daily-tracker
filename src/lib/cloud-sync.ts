import {
  FitLifeState,
  FoodLogItem,
  MealCategory,
  MealItem,
  WeightEntry,
  WorkoutDay,
} from '@/types/fitlife';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  formatTimeFromIso,
  getLocalDateString,
  shiftDateString,
  toSafePositive,
} from '@/lib/nutrition';
import { cloneDefaultWorkouts, DEFAULT_WORKOUTS } from '@/lib/workouts-data';
import { createDefaultState, createEmptyPendingOps, getSavedProfileBySyncCode } from '@/lib/storage';

const VALID_CATEGORIES: MealCategory[] = [
  'ตามสั่ง',
  'ก๋วยเตี๋ยว/จานเดียว',
  'ส้มตำ/ลาบ/ปิ้งย่าง',
  '7-Eleven/คาเฟ่',
];

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function ensureCloudProfileId(state: FitLifeState): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('sync_code', state.syncCode)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (existing?.id) return existing.id;

  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      sync_code: state.syncCode,
      name: state.profile.name || '',
      gender: state.profile.gender,
      age: toSafePositive(state.profile.age) || 23,
      height: toSafePositive(state.profile.height) || 175,
      weight: toSafePositive(state.profile.weight) || 95,
      goal: state.profile.goal,
      activity_multiplier: state.activityMultiplier,
      workout_streak: state.workoutStreak,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr) {
    // Handle race condition if another tab created the same sync_code simultaneously
    const { data: retry } = await supabase
      .from('profiles')
      .select('id')
      .eq('sync_code', state.syncCode)
      .maybeSingle();
    if (retry?.id) return retry.id;
    throw insertErr;
  }

  return created?.id || null;
}

export async function flushPendingOpsToCloud(state: FitLifeState): Promise<FitLifeState> {
  if (!isSupabaseConfigured() || typeof navigator !== 'undefined' && !navigator.onLine) {
    return state;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return state;

  const profileId = await ensureCloudProfileId(state);
  if (!profileId) return state;

  const ops = state.pendingOps;

  // 1. Profile update
  if (ops.profileDirty) {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: state.profile.name || '',
        gender: state.profile.gender,
        age: toSafePositive(state.profile.age) || 0,
        height: toSafePositive(state.profile.height) || 0,
        weight: toSafePositive(state.profile.weight) || 0,
        goal: state.profile.goal,
        activity_multiplier: state.activityMultiplier,
        workout_streak: state.workoutStreak,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);
    if (error) throw error;
  }

  // 2. Cleared food dates
  for (const dateStr of ops.clearedFoodDates) {
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('profile_id', profileId)
      .eq('log_date', dateStr);
    if (error) throw error;
  }

  // 3. Deleted food log items
  const validDeleteFoodIds = ops.deletedFoodLogIds.filter(isUuid);
  if (validDeleteFoodIds.length > 0) {
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('profile_id', profileId)
      .in('id', validDeleteFoodIds);
    if (error) throw error;
  }

  // 4. Upserted food log items
  if (ops.upsertedFoodLogs.length > 0) {
    const rows = ops.upsertedFoodLogs
      .filter((item) => isUuid(item.id))
      .map((item) => ({
        id: item.id,
        profile_id: profileId,
        log_date: item.logDate,
        meal_name: item.mealName,
        kcal: Math.round(toSafePositive(item.kcal)),
        protein: Math.round(toSafePositive(item.protein)),
        created_at: item.createdAt || new Date().toISOString(),
      }));
    if (rows.length > 0) {
      const { error } = await supabase
        .from('food_logs')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // 5. Upserted weight entries
  for (const entry of ops.upsertedWeights) {
    const { data: existingWeight } = await supabase
      .from('weight_logs')
      .select('id')
      .eq('profile_id', profileId)
      .eq('recorded_date', entry.date)
      .maybeSingle();

    if (existingWeight?.id) {
      const { error } = await supabase
        .from('weight_logs')
        .update({ weight: entry.weight })
        .eq('id', existingWeight.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('weight_logs').insert({
        profile_id: profileId,
        recorded_date: entry.date,
        weight: entry.weight,
      });
      if (error) throw error;
    }
  }

  // 6. Deleted custom meals
  const validDeleteMealIds = ops.deletedCustomMealIds.filter(isUuid);
  if (validDeleteMealIds.length > 0) {
    const { error } = await supabase
      .from('custom_meals')
      .delete()
      .eq('profile_id', profileId)
      .in('id', validDeleteMealIds);
    if (error) throw error;
  }

  // 7. Upserted custom meals
  if (ops.upsertedCustomMeals.length > 0) {
    const rows = ops.upsertedCustomMeals
      .filter((m) => isUuid(m.id))
      .map((m) => ({
        id: m.id,
        profile_id: profileId,
        name: m.name,
        category: m.category,
        kcal: Math.round(toSafePositive(m.kcal)),
        protein: Math.round(toSafePositive(m.protein)),
        carbs: Math.round(toSafePositive(m.carbs)),
        fat: Math.round(toSafePositive(m.fat)),
        tip: m.tip || '',
      }));
    if (rows.length > 0) {
      const { error } = await supabase
        .from('custom_meals')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // 8. Dirty workout days or full workout schedule structure change
  if (ops.syncAllWorkouts) {
    const { error: pruneErr } = await supabase
      .from('workout_logs')
      .delete()
      .eq('profile_id', profileId)
      .gte('day_index', state.workouts.length);
    if (pruneErr) throw pruneErr;
  }

  const targetDayIndices = ops.syncAllWorkouts
    ? state.workouts.map((_, idx) => idx)
    : Array.from(new Set(ops.dirtyWorkoutDays)).filter(
        (d) => Number.isInteger(d) && d >= 0 && d < state.workouts.length
      );

  for (const dayIdx of targetDayIndices) {
    const dayObj = state.workouts[dayIdx];
    if (!dayObj) continue;

    const { data: existingPlan } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('profile_id', profileId)
      .eq('day_index', dayIdx)
      .maybeSingle();

    const payload = {
      profile_id: profileId,
      day_index: dayIdx,
      workout_state: dayObj,
      completed_at: dayObj.completedAt || null,
      updated_at: new Date().toISOString(),
    };

    if (existingPlan?.id) {
      const { error } = await supabase
        .from('workout_logs')
        .update(payload)
        .eq('id', existingPlan.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('workout_logs').insert(payload);
      if (error) throw error;
    }
  }

  return {
    ...state,
    pendingOps: createEmptyPendingOps(),
  };
}

export async function fetchFoodLogsForDateCloud(
  syncCode: string,
  dateStr: string
): Promise<FoodLogItem[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('sync_code', syncCode)
    .maybeSingle();

  if (!profile?.id) return null;

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('id, log_date, meal_name, kcal, protein, created_at')
    .eq('profile_id', profile.id)
    .eq('log_date', dateStr)
    .order('created_at', { ascending: true });

  if (error || !logs) return null;

  return logs.map((row) => ({
    id: row.id,
    logDate: row.log_date,
    mealName: row.meal_name,
    kcal: Math.round(toSafePositive(row.kcal)),
    protein: Math.round(toSafePositive(row.protein)),
    time: formatTimeFromIso(row.created_at) || '00:00',
    createdAt: row.created_at,
  }));
}

export async function loadCloudSnapshotBySyncCode(
  targetSyncCode: string,
  currentTheme: 'light' | 'dark' = 'light',
  authEmail: string | null = null
): Promise<{ found: boolean; state?: FitLifeState }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { found: false };

  const normalizedCode = targetSyncCode.trim().toUpperCase();
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('sync_code', normalizedCode)
    .maybeSingle();

  if (profErr) throw profErr;
  if (!profile) return { found: false };

  const sinceDate = shiftDateString(getLocalDateString(), -45);

  const [foodRes, weightRes, mealsRes, workoutsRes] = await Promise.all([
    supabase
      .from('food_logs')
      .select('id, log_date, meal_name, kcal, protein, created_at')
      .eq('profile_id', profile.id)
      .gte('log_date', sinceDate)
      .order('created_at', { ascending: true }),
    supabase
      .from('weight_logs')
      .select('id, recorded_date, weight')
      .eq('profile_id', profile.id)
      .order('recorded_date', { ascending: true }),
    supabase
      .from('custom_meals')
      .select('id, name, category, kcal, protein, carbs, fat, tip')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('workout_logs')
      .select('day_index, workout_state, completed_at')
      .eq('profile_id', profile.id)
      .order('day_index', { ascending: true }),
  ]);

  const logsByDate: Record<string, FoodLogItem[]> = {};
  for (const row of foodRes.data || []) {
    const key = row.log_date;
    if (!logsByDate[key]) logsByDate[key] = [];
    logsByDate[key].push({
      id: row.id,
      logDate: row.log_date,
      mealName: row.meal_name,
      kcal: Math.round(toSafePositive(row.kcal)),
      protein: Math.round(toSafePositive(row.protein)),
      time: formatTimeFromIso(row.created_at) || '00:00',
      createdAt: row.created_at,
    });
  }

  const weightHistory: WeightEntry[] = (weightRes.data || []).map((row) => ({
    id: row.id,
    date: row.recorded_date,
    weight: Number(Number(row.weight).toFixed(1)),
  }));

  const customMeals: MealItem[] = (mealsRes.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: VALID_CATEGORIES.includes(row.category as MealCategory)
      ? (row.category as MealCategory)
      : 'ตามสั่ง',
    kcal: Math.round(toSafePositive(row.kcal)),
    protein: Math.round(toSafePositive(row.protein)),
    carbs: Math.round(toSafePositive(row.carbs)),
    fat: Math.round(toSafePositive(row.fat)),
    tip: row.tip || '',
    isCustom: true,
  }));

  let workouts: WorkoutDay[] = cloneDefaultWorkouts();
  const workoutRows = (workoutsRes.data || []).filter(
    (row) => Number.isInteger(row.day_index) && row.day_index >= 0 && row.workout_state
  );
  if (workoutRows.length > 0) {
    workouts = workoutRows
      .sort((a, b) => a.day_index - b.day_index)
      .map((row, idx) => {
        const ws = row.workout_state as Partial<WorkoutDay>;
        const fallback = DEFAULT_WORKOUTS[idx % DEFAULT_WORKOUTS.length];
        return {
          dayName: ws.dayName || `วันที่ ${idx + 1}`,
          focus: ws.focus || fallback.focus,
          completedAt: row.completed_at || ws.completedAt || null,
          exercises: Array.isArray(ws.exercises) ? ws.exercises : [],
        };
      });
  }

  const today = getLocalDateString();
  const base = createDefaultState(normalizedCode);
  const existingLocal = getSavedProfileBySyncCode(normalizedCode);
  const mult = Number(profile.activity_multiplier);

  return {
    found: true,
    state: {
      ...base,
      theme: currentTheme,
      syncCode: normalizedCode,
      authEmail,
      profile: {
        name: profile.name || '',
        avatar:
          existingLocal?.profile.avatar ||
          (profile.gender === 'female' ? '🌸' : '💪'),
        gender: profile.gender === 'female' ? 'female' : 'male',
        age: Number.isFinite(Number(profile.age)) ? Number(profile.age) : 23,
        height: Number.isFinite(Number(profile.height)) ? Number(profile.height) : 175,
        weight: Number.isFinite(Number(profile.weight)) ? Number(profile.weight) : 95,
        goal:
          profile.goal === 'maintain' || profile.goal === 'gain' ? profile.goal : 'lose',
      },
      activityMultiplier: [1.2, 1.375, 1.5, 1.65].includes(mult) ? mult : 1.2,
      todayDate: today,
      selectedDate: today,
      logsByDate,
      weightHistory,
      customMeals,
      workouts,
      workoutStreak: Number(profile.workout_streak) || 0,
      pendingOps: createEmptyPendingOps(),
    },
  };
}

export async function sendMagicLinkEmail(email: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase ในโปรเจกต์' };
  }
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });
  return { error: error ? error.message : null };
}

export async function signOutAuthUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export type ThemeMode = 'light' | 'dark';
export type TabId = 'today' | 'meals' | 'workout';
export type Gender = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'local-only';

export interface ProfileData {
  name: string;
  avatar?: string;
  gender: Gender;
  age: number | '';
  height: number | '';
  weight: number | '';
  goal: Goal;
}

export interface FoodLogItem {
  id: string;
  logDate: string; // YYYY-MM-DD
  mealName: string;
  kcal: number;
  protein: number;
  time: string; // HH:mm
  createdAt?: string;
}

export interface WeightEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  weight: number;
}

export type MealCategory =
  | 'ตามสั่ง'
  | 'ก๋วยเตี๋ยว/จานเดียว'
  | 'ส้มตำ/ลาบ/ปิ้งย่าง'
  | '7-Eleven/คาเฟ่';

export interface MealItem {
  id: string;
  name: string;
  category: MealCategory;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tip: string;
  isCustom?: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  weight: number;
  reps: number;
  sets: boolean[];
  tip: string;
}

export interface WorkoutDay {
  dayName: string;
  focus: string;
  exercises: WorkoutExercise[];
  completedAt?: string | null;
}

export interface PendingOps {
  profileDirty: boolean;
  upsertedFoodLogs: FoodLogItem[];
  deletedFoodLogIds: string[];
  clearedFoodDates: string[];
  upsertedWeights: WeightEntry[];
  upsertedCustomMeals: MealItem[];
  deletedCustomMealIds: string[];
  dirtyWorkoutDays: number[];
  syncAllWorkouts: boolean;
}

export interface FitLifeState {
  theme: ThemeMode;
  activeTab: TabId;
  syncCode: string;
  authEmail: string | null;
  profile: ProfileData;
  activityMultiplier: number;
  todayDate: string;
  selectedDate: string;
  logsByDate: Record<string, FoodLogItem[]>;
  weightHistory: WeightEntry[];
  customMeals: MealItem[];
  workouts: WorkoutDay[];
  activeWorkoutDay: number;
  workoutStreak: number;
  autoTimer: boolean;
  pendingOps: PendingOps;
}

export interface NutritionSummary {
  isValid: boolean;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

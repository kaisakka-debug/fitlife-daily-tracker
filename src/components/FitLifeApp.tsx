'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  UtensilsCrossed,
  Dumbbell,
  Moon,
  Sun,
  RotateCcw,
  Download,
  Zap,
} from 'lucide-react';
import {
  FitLifeState,
  FoodLogItem,
  MealItem,
  SyncStatus,
  TabId,
  ToastMessage,
  WorkoutDay,
  WorkoutExercise,
} from '@/types/fitlife';
import {
  calculateNutrition,
  formatShortThaiDate,
  generateSyncCode,
  generateUuid,
  getCurrentTimeString,
  getLocalDateString,
  toSafePositive,
} from '@/lib/nutrition';
import {
  createDefaultState,
  createEmptyPendingOps,
  loadLocalState,
  saveLocalState,
} from '@/lib/storage';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  fetchFoodLogsForDateCloud,
  flushPendingOpsToCloud,
  loadCloudSnapshotBySyncCode,
  sendMagicLinkEmail,
  signOutAuthUser,
} from '@/lib/cloud-sync';
import { BeforeInstallPromptEvent, PwaRegistrar } from '@/components/PwaRegistrar';
import { ToastContainer } from '@/components/ToastContainer';
import { createWorkoutDayFromTemplate } from '@/lib/workouts-data';
import {
  ConfirmModal,
  CustomMealModal,
  ExerciseModal,
  PwaGuideModal,
  QuickLogModal,
  ScheduleSetupModal,
  WorkoutDayModal,
} from '@/components/ModalDialog';
import { TodayTab } from '@/components/TodayTab';
import { MealsTab } from '@/components/MealsTab';
import { WorkoutTab } from '@/components/WorkoutTab';

type ActiveModal =
  | { type: 'none' }
  | { type: 'quick-log' }
  | { type: 'add-meal' }
  | { type: 'exercise'; existing: WorkoutExercise | null }
  | { type: 'workout-day'; editIndex: number | null; existing: WorkoutDay | null }
  | { type: 'schedule-setup' }
  | { type: 'pwa-guide' }
  | {
      type: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
      onConfirm: () => void;
    };

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'today', label: 'คำนวณวันนี้', icon: <Calculator className="w-5 h-5" /> },
  { id: 'meals', label: 'คลังเมนูทั่วไป', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { id: 'workout', label: 'ตารางออกกำลังกาย', icon: <Dumbbell className="w-5 h-5" /> },
];

export function FitLifeApp() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<FitLifeState>(() => createDefaultState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modal, setModal] = useState<ActiveModal>({ type: 'none' });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [loadingDateLogs, setLoadingDateLogs] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const supabaseReady = isSupabaseConfigured();
  const stateRef = useRef(state);
  stateRef.current = state;
  const syncTimeoutRef = useRef<number | null>(null);
  const syncingRef = useRef(false);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'success') => {
      const id = generateUuid();
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    },
    []
  );

  // Sync html.dark class whenever theme changes
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mounted, state.theme]);

  const runCloudSync = useCallback(async () => {
    if (!supabaseReady || typeof navigator === 'undefined' || !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const snapshot = stateRef.current;
      await flushPendingOpsToCloud(snapshot);

      // Clear flushed ops while preserving any newer edits queued during async flush
      setState((current) => {
        const flushedFoodIds = new Set(snapshot.pendingOps.upsertedFoodLogs.map((f) => f.id));
        const flushedDeletedFoodIds = new Set(snapshot.pendingOps.deletedFoodLogIds);
        const flushedClearedDates = new Set(snapshot.pendingOps.clearedFoodDates);
        const flushedWeights = new Set(snapshot.pendingOps.upsertedWeights.map((w) => w.date));
        const flushedMeals = new Set(snapshot.pendingOps.upsertedCustomMeals.map((m) => m.id));
        const flushedDeletedMeals = new Set(snapshot.pendingOps.deletedCustomMealIds);
        const flushedDays = new Set(snapshot.pendingOps.dirtyWorkoutDays);

        const nextState: FitLifeState = {
          ...current,
          pendingOps: {
            profileDirty:
              current.pendingOps.profileDirty && !snapshot.pendingOps.profileDirty
                ? true
                : false,
            upsertedFoodLogs: current.pendingOps.upsertedFoodLogs.filter(
              (f) => !flushedFoodIds.has(f.id)
            ),
            deletedFoodLogIds: current.pendingOps.deletedFoodLogIds.filter(
              (id) => !flushedDeletedFoodIds.has(id)
            ),
            clearedFoodDates: current.pendingOps.clearedFoodDates.filter(
              (d) => !flushedClearedDates.has(d)
            ),
            upsertedWeights: current.pendingOps.upsertedWeights.filter(
              (w) => !flushedWeights.has(w.date)
            ),
            upsertedCustomMeals: current.pendingOps.upsertedCustomMeals.filter(
              (m) => !flushedMeals.has(m.id)
            ),
            deletedCustomMealIds: current.pendingOps.deletedCustomMealIds.filter(
              (id) => !flushedDeletedMeals.has(id)
            ),
            dirtyWorkoutDays: current.pendingOps.dirtyWorkoutDays.filter(
              (d) => !flushedDays.has(d)
            ),
            syncAllWorkouts:
              current.pendingOps.syncAllWorkouts && !snapshot.pendingOps.syncAllWorkouts
                ? true
                : false,
          },
        };
        saveLocalState(nextState);
        return nextState;
      });
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    } finally {
      syncingRef.current = false;
    }
  }, [supabaseReady]);

  const scheduleCloudSync = useCallback(
    (delayMs = 450) => {
      if (!supabaseReady) {
        setSyncStatus('offline');
        return;
      }
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = window.setTimeout(() => {
        void runCloudSync();
      }, delayMs);
    },
    [runCloudSync, supabaseReady]
  );

  // Helper to commit optimistic state updates + schedule cloud sync
  const updateState = useCallback(
    (updater: (prev: FitLifeState) => FitLifeState, syncDelayMs: number | null = 450) => {
      setState((prev) => {
        const next = updater(prev);
        saveLocalState(next);
        stateRef.current = next;
        return next;
      });
      if (syncDelayMs !== null) {
        scheduleCloudSync(syncDelayMs);
      }
    },
    [scheduleCloudSync]
  );

  // Initial hydration + online listeners + Supabase Auth listener
  useEffect(() => {
    const initial = loadLocalState();
    // Ensure initial profile exists in cloud on first visit when Supabase is configured
    if (supabaseReady && initial.syncCode) {
      initial.pendingOps.profileDirty = true;
    }
    saveLocalState(initial);
    stateRef.current = initial;
    setState(initial);
    setMounted(true);

    if (supabaseReady && navigator.onLine) {
      void runCloudSync();
    } else {
      setSyncStatus('offline');
    }

    const handleOnline = () => {
      void runCloudSync();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const supabase = getSupabaseClient();
    const authSub = supabase?.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const userSyncCode = `AUTH-${session.user.id.slice(0, 8).toUpperCase()}`;
        const email = session.user.email || null;
        if (
          stateRef.current.syncCode !== userSyncCode ||
          stateRef.current.authEmail !== email
        ) {
          try {
            const cloudSnap = await loadCloudSnapshotBySyncCode(
              userSyncCode,
              stateRef.current.theme,
              email
            );
            if (cloudSnap.found && cloudSnap.state) {
              saveLocalState(cloudSnap.state);
              stateRef.current = cloudSnap.state;
              setState(cloudSnap.state);
              setSyncStatus('synced');
              if (event === 'SIGNED_IN') {
                showToast(`เข้าสู่ระบบสำเร็จ (${email || userSyncCode})`, 'success');
              }
            } else {
              updateState(
                (prev) => ({
                  ...prev,
                  syncCode: userSyncCode,
                  authEmail: email,
                  pendingOps: { ...prev.pendingOps, profileDirty: true },
                }),
                100
              );
            }
          } catch {
            // Keep offline state if fetch fails
          }
        }
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      authSub?.data.subscription.unsubscribe();
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nutrition = useMemo(
    () => calculateNutrition(state.profile, state.activityMultiplier),
    [state.profile, state.activityMultiplier]
  );

  // Handlers
  const handleSelectDate = async (dateStr: string) => {
    updateState((prev) => ({ ...prev, selectedDate: dateStr }), null);

    if (supabaseReady && navigator.onLine) {
      setLoadingDateLogs(true);
      try {
        const cloudLogs = await fetchFoodLogsForDateCloud(stateRef.current.syncCode, dateStr);
        if (cloudLogs) {
          updateState((prev) => {
            const pendingIds = new Set(prev.pendingOps.upsertedFoodLogs.map((l) => l.id));
            const deletedIds = new Set(prev.pendingOps.deletedFoodLogIds);
            const localPendingForDate = (prev.logsByDate[dateStr] || []).filter((l) =>
              pendingIds.has(l.id)
            );
            const mergedMap = new Map<string, FoodLogItem>();
            for (const item of cloudLogs) {
              if (!deletedIds.has(item.id)) mergedMap.set(item.id, item);
            }
            for (const item of localPendingForDate) {
              mergedMap.set(item.id, item);
            }
            return {
              ...prev,
              logsByDate: {
                ...prev.logsByDate,
                [dateStr]: Array.from(mergedMap.values()),
              },
            };
          }, null);
        }
      } catch {
        // Fallback silently to cached logs
      } finally {
        setLoadingDateLogs(false);
      }
    }
  };

  const handleAddFoodLog = (data: { mealName: string; kcal: number; protein: number }) => {
    const targetDate = stateRef.current.selectedDate || getLocalDateString();
    const newItem: FoodLogItem = {
      id: generateUuid(),
      logDate: targetDate,
      mealName: data.mealName,
      kcal: data.kcal,
      protein: data.protein,
      time: getCurrentTimeString(),
      createdAt: new Date().toISOString(),
    };

    updateState(
      (prev) => ({
        ...prev,
        logsByDate: {
          ...prev.logsByDate,
          [targetDate]: [...(prev.logsByDate[targetDate] || []), newItem],
        },
        pendingOps: {
          ...prev.pendingOps,
          upsertedFoodLogs: [...prev.pendingOps.upsertedFoodLogs, newItem],
        },
      }),
      150
    );
    showToast(`บันทึก "${data.mealName}" (+${data.kcal} kcal) แล้ว`, 'success');
  };

  const handleDeleteFoodLog = (logId: string) => {
    const targetDate = stateRef.current.selectedDate;
    updateState(
      (prev) => ({
        ...prev,
        logsByDate: {
          ...prev.logsByDate,
          [targetDate]: (prev.logsByDate[targetDate] || []).filter((item) => item.id !== logId),
        },
        pendingOps: {
          ...prev.pendingOps,
          upsertedFoodLogs: prev.pendingOps.upsertedFoodLogs.filter((l) => l.id !== logId),
          deletedFoodLogIds: [...prev.pendingOps.deletedFoodLogIds, logId],
        },
      }),
      150
    );
    showToast('ลบรายการอาหารแล้ว', 'info');
  };

  const handleConfirmClearDayLogs = () => {
    const targetDate = stateRef.current.selectedDate;
    const label =
      targetDate === stateRef.current.todayDate ? 'วันนี้' : formatShortThaiDate(targetDate);
    setModal({
      type: 'confirm',
      title: `เริ่มวันใหม่ (${label})?`,
      message: `ต้องการล้างรายการอาหารที่บันทึกไว้สำหรับ${label}ทั้งหมดใช่ไหม? (ข้อมูลโปรไฟล์และประวัติวันอื่นจะยังคงอยู่)`,
      confirmLabel: 'ล้างรายการ',
      danger: true,
      onConfirm: () => {
        updateState(
          (prev) => ({
            ...prev,
            logsByDate: {
              ...prev.logsByDate,
              [targetDate]: [],
            },
            pendingOps: {
              ...prev.pendingOps,
              upsertedFoodLogs: prev.pendingOps.upsertedFoodLogs.filter(
                (l) => l.logDate !== targetDate
              ),
              clearedFoodDates: Array.from(
                new Set([...prev.pendingOps.clearedFoodDates, targetDate])
              ),
            },
          }),
          150
        );
        showToast('ล้างรายการอาหารเรียบร้อย เริ่มต้นวันใหม่ได้เลย!', 'info');
      },
    });
  };

  const handleSubmitWeight = (weightKg: number) => {
    const todayStr = getLocalDateString();
    updateState((prev) => {
      const idx = prev.weightHistory.findIndex((w) => w.date === todayStr);
      const nextHistory = [...prev.weightHistory];
      if (idx >= 0) {
        nextHistory[idx] = { ...nextHistory[idx], weight: weightKg };
      } else {
        nextHistory.push({ date: todayStr, weight: weightKg });
      }
      const nextWeights = prev.pendingOps.upsertedWeights.filter((w) => w.date !== todayStr);
      nextWeights.push({ date: todayStr, weight: weightKg });

      return {
        ...prev,
        profile: { ...prev.profile, weight: weightKg },
        weightHistory: nextHistory,
        pendingOps: {
          ...prev.pendingOps,
          profileDirty: true,
          upsertedWeights: nextWeights,
        },
      };
    }, 150);
    showToast(`บันทึกน้ำหนัก ${weightKg} กก. และคำนวณแคลอรี่ใหม่แล้ว`, 'success');
  };

  const handleCopySyncCode = async () => {
    try {
      await navigator.clipboard.writeText(state.syncCode);
      showToast(`คัดลอกรหัสซิงก์ "${state.syncCode}" แล้ว`, 'success');
    } catch {
      showToast(`รหัสของคุณคือ ${state.syncCode}`, 'info');
    }
  };

  const handleLoadSyncCode = async (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    if (clean.length < 6) {
      showToast('กรุณากรอกรหัสซิงก์อย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }
    if (!supabaseReady) {
      showToast('ยังไม่ได้เชื่อมต่อ Supabase จึงยังไม่สามารถดึงข้อมูลจากเครื่องอื่นได้', 'warning');
      return;
    }
    if (!navigator.onLine) {
      showToast('กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนโหลดข้อมูลจากรหัสอื่น', 'warning');
      return;
    }

    try {
      const result = await loadCloudSnapshotBySyncCode(clean, state.theme, state.authEmail);
      if (!result.found || !result.state) {
        showToast(`ไม่พบรหัสซิงก์ "${clean}" ในระบบคลาวด์`, 'warning');
        return;
      }
      saveLocalState(result.state);
      stateRef.current = result.state;
      setState(result.state);
      setSyncStatus('synced');
      showToast(`โหลดข้อมูลจากรหัส "${clean}" เรียบร้อยแล้ว`, 'success');
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase กรุณาลองใหม่', 'error');
    }
  };

  const handleSendMagicLink = async (email: string) => {
    const { error } = await sendMagicLinkEmail(email);
    if (error) {
      showToast(`ไม่สามารถส่งอีเมลได้: ${error}`, 'error');
    } else {
      showToast(`ส่งลิงก์เข้าสู่ระบบไปที่ ${email} แล้ว กรุณาเช็กกล่องข้อความ`, 'success');
    }
  };

  const handleSignOutEmail = async () => {
    await signOutAuthUser();
    const freshCode = generateSyncCode();
    updateState(
      (prev) => ({
        ...prev,
        authEmail: null,
        syncCode: freshCode,
        pendingOps: { ...prev.pendingOps, profileDirty: true },
      }),
      150
    );
    showToast('ออกจากระบบอีเมลแล้ว เปลี่ยนกลับเป็นโหมดรหัสซิงก์ส่วนตัว', 'info');
  };

  const handleConfirmResetAll = () => {
    setModal({
      type: 'confirm',
      title: 'ล้างข้อมูลทั้งหมด / เริ่มใหม่?',
      message:
        'ระบบจะสร้างรหัสผู้ใช้ใหม่ และรีเซ็ตข้อมูลโปรไฟล์ ประวัติอาหาร น้ำหนัก เมนูส่วนตัว และตารางฝึกบนเครื่องนี้กลับเป็นค่าเริ่มต้น',
      confirmLabel: 'รีเซ็ตข้อมูลทั้งหมด',
      danger: true,
      onConfirm: () => {
        const fresh = createDefaultState();
        if (supabaseReady) {
          fresh.pendingOps = { ...createEmptyPendingOps(), profileDirty: true };
        }
        saveLocalState(fresh);
        stateRef.current = fresh;
        setState(fresh);
        scheduleCloudSync(150);
        showToast('รีเซ็ตข้อมูลทั้งหมดเรียบร้อย พร้อมตั้งค่าโปรไฟล์ใหม่!', 'info');
      },
    });
  };

  const handleLogMenuMeal = (meal: MealItem) => {
    const targetDate = stateRef.current.selectedDate || getLocalDateString();
    const newItem: FoodLogItem = {
      id: generateUuid(),
      logDate: targetDate,
      mealName: meal.name,
      kcal: meal.kcal,
      protein: meal.protein,
      time: getCurrentTimeString(),
      createdAt: new Date().toISOString(),
    };
    updateState(
      (prev) => ({
        ...prev,
        logsByDate: {
          ...prev.logsByDate,
          [targetDate]: [...(prev.logsByDate[targetDate] || []), newItem],
        },
        pendingOps: {
          ...prev.pendingOps,
          upsertedFoodLogs: [...prev.pendingOps.upsertedFoodLogs, newItem],
        },
      }),
      150
    );
    showToast(`บันทึก "${meal.name}" (+${meal.kcal} kcal, โปรตีน ${meal.protein}g) เข้าวันนี้แล้ว`, 'success');
  };

  const handleAddCustomMeal = (mealData: Omit<MealItem, 'id' | 'isCustom'>) => {
    const newMeal: MealItem = {
      ...mealData,
      id: generateUuid(),
      isCustom: true,
    };
    updateState(
      (prev) => ({
        ...prev,
        customMeals: [newMeal, ...prev.customMeals],
        pendingOps: {
          ...prev.pendingOps,
          upsertedCustomMeals: [...prev.pendingOps.upsertedCustomMeals, newMeal],
        },
      }),
      150
    );
    showToast(`เพิ่มเมนู "${newMeal.name}" เข้าคลังส่วนตัวแล้ว`, 'success');
  };

  const handleConfirmDeleteCustomMeal = (meal: MealItem) => {
    setModal({
      type: 'confirm',
      title: 'ลบเมนูของฉัน?',
      message: `ต้องการลบเมนู "${meal.name}" ออกจากคลังเมนูส่วนตัวใช่ไหม?`,
      confirmLabel: 'ลบเมนู',
      danger: true,
      onConfirm: () => {
        updateState(
          (prev) => ({
            ...prev,
            customMeals: prev.customMeals.filter((m) => m.id !== meal.id),
            pendingOps: {
              ...prev.pendingOps,
              upsertedCustomMeals: prev.pendingOps.upsertedCustomMeals.filter(
                (m) => m.id !== meal.id
              ),
              deletedCustomMealIds: [...prev.pendingOps.deletedCustomMealIds, meal.id],
            },
          }),
          150
        );
        showToast('ลบเมนูส่วนตัวเรียบร้อย', 'info');
      },
    });
  };

  const handleToggleSet = (exId: string, setIndex: number): boolean => {
    let becameDone = false;
    updateState((prev) => {
      const dayIdx = prev.activeWorkoutDay;
      const nextWorkouts = prev.workouts.map((day, i) => {
        if (i !== dayIdx) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) => {
            if (ex.id !== exId) return ex;
            const nextSets = [...ex.sets];
            becameDone = !nextSets[setIndex];
            nextSets[setIndex] = becameDone;
            return { ...ex, sets: nextSets };
          }),
        };
      });

      return {
        ...prev,
        workouts: nextWorkouts,
        pendingOps: {
          ...prev.pendingOps,
          dirtyWorkoutDays: Array.from(new Set([...prev.pendingOps.dirtyWorkoutDays, dayIdx])),
        },
      };
    }, 500);
    return becameDone;
  };

  const handleUpdateExerciseField = (
    exId: string,
    field: 'weight' | 'reps',
    value: number
  ) => {
    updateState((prev) => {
      const dayIdx = prev.activeWorkoutDay;
      const nextWorkouts = prev.workouts.map((day, i) => {
        if (i !== dayIdx) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) =>
            ex.id === exId ? { ...ex, [field]: value } : ex
          ),
        };
      });
      return {
        ...prev,
        workouts: nextWorkouts,
        pendingOps: {
          ...prev.pendingOps,
          dirtyWorkoutDays: Array.from(new Set([...prev.pendingOps.dirtyWorkoutDays, dayIdx])),
        },
      };
    }, 600);
  };

  const handleSaveExercise = (
    data: { name: string; weight: number; reps: number; setCount: number; tip: string },
    editId?: string
  ) => {
    updateState((prev) => {
      const dayIdx = prev.activeWorkoutDay;
      const nextWorkouts = prev.workouts.map((day, i) => {
        if (i !== dayIdx) return day;
        if (editId) {
          return {
            ...day,
            exercises: day.exercises.map((ex) => {
              if (ex.id !== editId) return ex;
              const nextSets: boolean[] = [];
              for (let s = 0; s < data.setCount; s++) {
                nextSets.push(Boolean(ex.sets[s]));
              }
              return {
                ...ex,
                name: data.name,
                weight: data.weight,
                reps: data.reps,
                sets: nextSets,
                tip: data.tip,
              };
            }),
          };
        }
        return {
          ...day,
          exercises: [
            ...day.exercises,
            {
              id: generateUuid(),
              name: data.name,
              weight: data.weight,
              reps: data.reps,
              sets: Array(data.setCount).fill(false) as boolean[],
              tip: data.tip,
            },
          ],
        };
      });

      return {
        ...prev,
        workouts: nextWorkouts,
        pendingOps: {
          ...prev.pendingOps,
          dirtyWorkoutDays: Array.from(new Set([...prev.pendingOps.dirtyWorkoutDays, dayIdx])),
        },
      };
    }, 200);

    showToast(
      editId ? `แก้ไขท่า "${data.name}" แล้ว` : `เพิ่มท่า "${data.name}" ลงตารางฝึกแล้ว`,
      'success'
    );
  };

  const handleConfirmDeleteExercise = (ex: WorkoutExercise) => {
    const dayName = state.workouts[state.activeWorkoutDay]?.dayName || '';
    setModal({
      type: 'confirm',
      title: 'ลบท่าฝึก?',
      message: `ต้องการลบท่า "${ex.name}" ออกจาก ${dayName} ใช่ไหม?`,
      confirmLabel: 'ลบท่าฝึก',
      danger: true,
      onConfirm: () => {
        updateState((prev) => {
          const dayIdx = prev.activeWorkoutDay;
          const nextWorkouts = prev.workouts.map((day, i) =>
            i === dayIdx
              ? { ...day, exercises: day.exercises.filter((item) => item.id !== ex.id) }
              : day
          );
          return {
            ...prev,
            workouts: nextWorkouts,
            pendingOps: {
              ...prev.pendingOps,
              dirtyWorkoutDays: Array.from(new Set([...prev.pendingOps.dirtyWorkoutDays, dayIdx])),
            },
          };
        }, 200);
        showToast('ลบท่าฝึกเรียบร้อย', 'info');
      },
    });
  };

  const handleSaveWorkoutDay = (
    data: {
      dayName: string;
      focus: string;
      templateType: 'fullbodyA' | 'fullbodyB' | 'fullbodyC' | 'empty';
    },
    editIndex: number | null
  ) => {
    let targetIndex = editIndex ?? 0;
    updateState((prev) => {
      if (editIndex !== null && prev.workouts[editIndex]) {
        const nextWorkouts = prev.workouts.map((day, i) =>
          i === editIndex
            ? {
                ...day,
                dayName: data.dayName,
                focus: data.focus || day.focus,
              }
            : day
        );
        return {
          ...prev,
          workouts: nextWorkouts,
          pendingOps: {
            ...prev.pendingOps,
            dirtyWorkoutDays: Array.from(
              new Set([...prev.pendingOps.dirtyWorkoutDays, editIndex])
            ),
          },
        };
      }

      const newDay = createWorkoutDayFromTemplate(
        data.dayName,
        data.focus,
        data.templateType
      );
      const nextWorkouts = [...prev.workouts, newDay];
      targetIndex = nextWorkouts.length - 1;
      return {
        ...prev,
        workouts: nextWorkouts,
        activeWorkoutDay: targetIndex,
        pendingOps: {
          ...prev.pendingOps,
          syncAllWorkouts: true,
        },
      };
    }, 150);

    showToast(
      editIndex !== null
        ? `อัปเดต "${data.dayName}" แล้ว`
        : `เพิ่ม "${data.dayName}" ลงตารางฝึกแล้ว`,
      'success'
    );
  };

  const handleConfirmDeleteWorkoutDay = (dayIndex: number, day: WorkoutDay) => {
    if (state.workouts.length <= 1) {
      showToast('ต้องมีวันฝึกอย่างน้อย 1 วันในตาราง', 'warning');
      return;
    }
    setModal({
      type: 'confirm',
      title: `ลบ "${day.dayName}"?`,
      message: `ต้องการลบ "${day.dayName}" และท่าฝึกทั้งหมดในวันนี้ออกจากตารางใช่ไหม?`,
      confirmLabel: 'ลบวันนี้',
      danger: true,
      onConfirm: () => {
        updateState((prev) => {
          if (prev.workouts.length <= 1) return prev;
          const nextWorkouts = prev.workouts.filter((_, idx) => idx !== dayIndex);
          const nextActive = Math.min(prev.activeWorkoutDay, nextWorkouts.length - 1);
          return {
            ...prev,
            workouts: nextWorkouts,
            activeWorkoutDay: Math.max(0, nextActive),
            pendingOps: {
              ...prev.pendingOps,
              syncAllWorkouts: true,
            },
          };
        }, 150);
        showToast(`ลบ "${day.dayName}" ออกจากตารางแล้ว`, 'info');
      },
    });
  };

  const handleApplyWorkoutSchedule = (nextWorkouts: WorkoutDay[]) => {
    if (nextWorkouts.length === 0) return;
    updateState(
      (prev) => ({
        ...prev,
        workouts: nextWorkouts,
        activeWorkoutDay: 0,
        pendingOps: {
          ...prev.pendingOps,
          syncAllWorkouts: true,
        },
      }),
      150
    );
    showToast(`อัปเดตตารางฝึกเป็น ${nextWorkouts.length} วัน/สัปดาห์แล้ว`, 'success');
  };

  const handleCompleteWorkout = () => {
    let upgraded = false;
    let nextStreak = 1;
    updateState((prev) => {
      const dayIdx = prev.activeWorkoutDay;
      nextStreak = (prev.workoutStreak || 0) + 1;
      upgraded = Number(prev.activityMultiplier) < 1.5;
      const nextMult = upgraded ? 1.5 : prev.activityMultiplier;

      const nextWorkouts = prev.workouts.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              completedAt: new Date().toISOString(),
              exercises: day.exercises.map((ex) => ({
                ...ex,
                sets: ex.sets.map(() => false),
              })),
            }
          : day
      );

      return {
        ...prev,
        workoutStreak: nextStreak,
        activityMultiplier: nextMult,
        activeTab: 'today',
        workouts: nextWorkouts,
        pendingOps: {
          ...prev.pendingOps,
          profileDirty: true,
          dirtyWorkoutDays: Array.from(new Set([...prev.pendingOps.dirtyWorkoutDays, dayIdx])),
        },
      };
    }, 100);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(
      upgraded
        ? `สุดยอด! จบการฝึกแล้ว 🔥 สะสม ${nextStreak} ครั้ง • ปรับกิจกรรมเป็น "ออกกำลังกาย 30–45 นาที" แล้ว`
        : `สุดยอด! จบการฝึกแล้ว 🔥 สะสมทั้งหมด ${nextStreak} ครั้ง`,
      'success'
    );
  };

  const handlePwaInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        showToast('กำลังติดตั้ง FitLife ลงหน้าจอโฮม!', 'success');
      }
    } else {
      setModal({ type: 'pwa-guide' });
    }
  };

  const selectedDateLabel =
    state.selectedDate === state.todayDate ? 'วันนี้' : formatShortThaiDate(state.selectedDate);

  return (
    <>
      <PwaRegistrar onInstallPromptReady={setInstallPrompt} />

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base sm:text-lg leading-tight truncate text-slate-900 dark:text-white">
                FitLife Daily Tracker
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                วางแผนแคลอรี่ • เมนูทั่วไป • ตารางฝึก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              className="touch-target px-2.5 sm:px-3 rounded-xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200/80 dark:border-orange-500/30 text-orange-700 dark:text-orange-300 flex items-center gap-1 text-xs sm:text-sm font-semibold tabular-nums"
              title="จำนวนครั้งที่ออกกำลังกายสำเร็จ"
            >
              <span>🔥</span>
              <span>{mounted ? state.workoutStreak : 0}</span>
              <span className="hidden sm:inline">ครั้ง</span>
            </div>

            <button
              type="button"
              onClick={() => void handlePwaInstallClick()}
              className="touch-target w-10 sm:w-auto sm:px-3 h-10 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
              title="ติดตั้งแอปบนมือถือ (PWA)"
              aria-label="ติดตั้งแอปบนมือถือ"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">ติดตั้งแอป</span>
            </button>

            <button
              type="button"
              onClick={() =>
                updateState(
                  (prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }),
                  null
                )
              }
              className="touch-target w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
              aria-label="สลับโหมดสีสว่าง/มืด"
              title="สลับโหมดสี"
            >
              {mounted && state.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <button
              type="button"
              onClick={handleConfirmResetAll}
              className="touch-target px-2.5 sm:px-3 h-10 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              title="ล้างข้อมูลทั้งหมด / เริ่มใหม่"
              aria-label="ล้างข้อมูลทั้งหมด / เริ่มใหม่"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">เริ่มใหม่</span>
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav
          className="hidden md:block border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60"
          aria-label="เมนูหลัก"
        >
          <div className="max-w-4xl mx-auto px-6 py-2 flex items-center gap-2">
            {TABS.map((tab) => {
              const active = mounted && state.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateState((prev) => ({ ...prev, activeTab: tab.id }), null)}
                  className={`touch-target px-4 py-2 rounded-xl font-display font-medium text-sm flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-12">
        {!mounted ? (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
            <div className="h-52 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
          </div>
        ) : state.activeTab === 'today' ? (
          <TodayTab
            state={state}
            nutrition={nutrition}
            syncStatus={syncStatus}
            supabaseReady={supabaseReady}
            loadingDateLogs={loadingDateLogs}
            onUpdateProfile={(patch) =>
              updateState(
                (prev) => ({
                  ...prev,
                  profile: { ...prev.profile, ...patch },
                  pendingOps: { ...prev.pendingOps, profileDirty: true },
                }),
                500
              )
            }
            onSetActivity={(mult) =>
              updateState(
                (prev) => ({
                  ...prev,
                  activityMultiplier: mult,
                  pendingOps: { ...prev.pendingOps, profileDirty: true },
                }),
                200
              )
            }
            onOpenQuickLog={() => setModal({ type: 'quick-log' })}
            onConfirmClearDayLogs={handleConfirmClearDayLogs}
            onDeleteLog={handleDeleteFoodLog}
            onSelectDate={(d) => void handleSelectDate(d)}
            onSubmitWeight={handleSubmitWeight}
            onCopySyncCode={() => void handleCopySyncCode()}
            onLoadSyncCode={handleLoadSyncCode}
            onSendMagicLink={handleSendMagicLink}
            onSignOutEmail={handleSignOutEmail}
            onConfirmResetAll={handleConfirmResetAll}
            onGoToMeals={() => updateState((prev) => ({ ...prev, activeTab: 'meals' }), null)}
          />
        ) : state.activeTab === 'meals' ? (
          <MealsTab
            state={state}
            nutrition={nutrition}
            onLogMeal={handleLogMenuMeal}
            onOpenAddCustomMeal={() => setModal({ type: 'add-meal' })}
            onConfirmDeleteCustomMeal={handleConfirmDeleteCustomMeal}
            onToast={showToast}
          />
        ) : (
          <WorkoutTab
            state={state}
            onSelectDay={(dayIdx) =>
              updateState((prev) => ({ ...prev, activeWorkoutDay: dayIdx }), null)
            }
            onOpenScheduleSetup={() => setModal({ type: 'schedule-setup' })}
            onOpenAddDay={() =>
              setModal({ type: 'workout-day', editIndex: null, existing: null })
            }
            onOpenEditDay={(dayIdx, day) =>
              setModal({ type: 'workout-day', editIndex: dayIdx, existing: day })
            }
            onConfirmDeleteDay={handleConfirmDeleteWorkoutDay}
            onToggleSet={handleToggleSet}
            onUpdateExerciseField={handleUpdateExerciseField}
            onOpenAddExercise={() => setModal({ type: 'exercise', existing: null })}
            onOpenEditExercise={(ex) => setModal({ type: 'exercise', existing: ex })}
            onConfirmDeleteExercise={handleConfirmDeleteExercise}
            onToggleAutoTimer={() => {
              const nextVal = !state.autoTimer;
              updateState((prev) => ({ ...prev, autoTimer: nextVal }), null);
              showToast(
                nextVal ? 'เปิดจับเวลาพัก 90 วิ อัตโนมัติแล้ว' : 'ปิดจับเวลาพักอัตโนมัติแล้ว',
                'info'
              );
            }}
            onCompleteWorkout={handleCompleteWorkout}
            onToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-pb shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        aria-label="เมนูหลักมือถือ"
      >
        <div className="grid grid-cols-3 gap-1 px-2 pt-1.5">
          {TABS.map((tab) => {
            const active = mounted && state.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  updateState((prev) => ({ ...prev, activeTab: tab.id }), null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`touch-target py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span className="text-[11px] leading-tight truncate max-w-full">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Custom Modals */}
      {modal.type === 'quick-log' && (
        <QuickLogModal
          selectedDateLabel={selectedDateLabel}
          onSubmit={handleAddFoodLog}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'add-meal' && (
        <CustomMealModal
          onSubmit={handleAddCustomMeal}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'exercise' && (
        <ExerciseModal
          existing={modal.existing}
          onSubmit={(data) => handleSaveExercise(data, modal.existing?.id)}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'workout-day' && (
        <WorkoutDayModal
          existing={modal.existing}
          defaultDayNumber={state.workouts.length + 1}
          onSubmit={(data) => handleSaveWorkoutDay(data, modal.editIndex)}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'schedule-setup' && (
        <ScheduleSetupModal
          currentWorkouts={state.workouts}
          onApply={handleApplyWorkoutSchedule}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'pwa-guide' && (
        <PwaGuideModal onClose={() => setModal({ type: 'none' })} />
      )}

      {modal.type === 'confirm' && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          danger={modal.danger}
          onConfirm={modal.onConfirm}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

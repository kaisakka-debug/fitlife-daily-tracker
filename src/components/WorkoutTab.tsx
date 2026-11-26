'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Timer, Trash2 } from 'lucide-react';
import { FitLifeState, WorkoutExercise } from '@/types/fitlife';

interface WorkoutTabProps {
  state: FitLifeState;
  onSelectDay: (dayIndex: number) => void;
  onToggleSet: (exId: string, setIndex: number) => boolean;
  onUpdateExerciseField: (exId: string, field: 'weight' | 'reps', value: number) => void;
  onOpenAddExercise: () => void;
  onOpenEditExercise: (ex: WorkoutExercise) => void;
  onConfirmDeleteExercise: (ex: WorkoutExercise) => void;
  onToggleAutoTimer: () => void;
  onCompleteWorkout: () => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

function formatTimerClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function WorkoutTab({
  state,
  onSelectDay,
  onToggleSet,
  onUpdateExerciseField,
  onOpenAddExercise,
  onOpenEditExercise,
  onConfirmDeleteExercise,
  onToggleAutoTimer,
  onCompleteWorkout,
  onToast,
}: WorkoutTabProps) {
  const [durationSec, setDurationSec] = useState(90);
  const [remainingSec, setRemainingSec] = useState(90);
  const [running, setRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  const endTimestampRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudioContext = () => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume().catch(() => undefined);
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const playChime = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.18, 0.36].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 2 ? 1046.5 : 880, now + offset);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } catch {
      // Audio unavailable
    }
  };

  const startTimer = (seconds?: number) => {
    ensureAudioContext();
    const targetSec =
      typeof seconds === 'number' && seconds > 0
        ? seconds
        : remainingSec > 0
        ? remainingSec
        : durationSec;
    if (typeof seconds === 'number' && seconds > 0) {
      setDurationSec(seconds);
    }
    setRemainingSec(targetSec);
    setJustFinished(false);
    endTimestampRef.current = Date.now() + targetSec * 1000;
    setRunning(true);
  };

  const pauseTimer = () => {
    if (endTimestampRef.current) {
      const left = Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000));
      setRemainingSec(left);
    }
    endTimestampRef.current = null;
    setRunning(false);
  };

  const resetTimer = (seconds?: number) => {
    endTimestampRef.current = null;
    setRunning(false);
    setJustFinished(false);
    const nextDur = typeof seconds === 'number' && seconds > 0 ? seconds : durationSec;
    if (typeof seconds === 'number' && seconds > 0) setDurationSec(seconds);
    setRemainingSec(nextDur);
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (!endTimestampRef.current) return;
      const diffMs = endTimestampRef.current - Date.now();
      const next = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSec(next);
      if (diffMs <= 0) {
        endTimestampRef.current = null;
        setRunning(false);
        setRemainingSec(0);
        setJustFinished(true);
        playChime();
        onToast('หมดเวลาพักแล้ว! ลุยเซตต่อไปกันเลย 💪', 'success');
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const activeDay = state.workouts[state.activeWorkoutDay] || state.workouts[0];
  const totalSets = activeDay.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const doneSets = activeDay.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(Boolean).length,
    0
  );
  const timerPct =
    durationSec > 0 ? Math.max(0, Math.min(100, (remainingSec / durationSec) * 100)) : 0;

  return (
    <div className="space-y-4 animate-fade-slide">
      {/* 1. Built-in Rest Timer Bar */}
      <section className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tabular-nums">
                  {formatTimerClock(remainingSec)}
                </span>
                <span className="text-xs text-slate-400">นาที:วิ</span>
              </div>
              <p
                className={`text-xs ${
                  justFinished
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : running
                    ? 'font-medium text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {justFinished
                  ? 'หมดเวลาพัก! พร้อมลุยต่อ'
                  : running
                  ? 'กำลังนับถอยหลัง...'
                  : 'พร้อมจับเวลาพักระหว่างเซต'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => startTimer(sec)}
                className={`touch-target px-3 py-1.5 rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
                  durationSec === sec
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {sec} วิ
              </button>
            ))}

            <button
              type="button"
              onClick={() => (running ? pauseTimer() : startTimer())}
              className="touch-target px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              {running
                ? 'หยุดชั่วคราว'
                : remainingSec < durationSec && remainingSec > 0
                ? 'เริ่มต่อ'
                : 'เริ่มจับเวลา'}
            </button>

            <button
              type="button"
              onClick={() => resetTimer()}
              className="touch-target px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              รีเซ็ต
            </button>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-200"
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label
            htmlFor="auto-timer-toggle"
            className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium cursor-pointer select-none"
          >
            จับเวลาพัก 90 วิ อัตโนมัติเมื่อติ๊กเสร็จ 1 เซต
          </label>
          <button
            id="auto-timer-toggle"
            type="button"
            role="switch"
            aria-checked={state.autoTimer}
            onClick={onToggleAutoTimer}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              state.autoTimer ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition duration-200 ${
                state.autoTimer ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 2. 3-Day Split Exercises */}
      <section className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              ตารางฝึก 3 วัน (ปรับแต่งท่าได้อิสระ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeDay.focus} • ทำไปแล้ว{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {doneSets}/{totalSets}
              </span>{' '}
              เซต
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddExercise}
            className="touch-target px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-display font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มท่าฝึก</span>
          </button>
        </div>

        {/* Day Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {state.workouts.map((day, idx) => {
            const active = idx === state.activeWorkoutDay;
            const dSets = day.exercises.reduce((s, ex) => s + ex.sets.length, 0);
            const dDone = day.exercises.reduce((s, ex) => s + ex.sets.filter(Boolean).length, 0);
            return (
              <button
                key={day.dayName}
                type="button"
                onClick={() => onSelectDay(idx)}
                className={`touch-target px-2.5 py-2 rounded-xl border text-center transition-all ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="font-display font-bold text-xs sm:text-sm">{day.dayName}</div>
                <div className="text-[11px] opacity-85 tabular-nums">
                  {dDone}/{dSets} เซต
                </div>
              </button>
            );
          })}
        </div>

        {activeDay.exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              ยังไม่มีท่าฝึกใน{activeDay.dayName}
            </p>
            <button
              type="button"
              onClick={onOpenAddExercise}
              className="touch-target px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold"
            >
              + เพิ่มท่าฝึกแรก
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDay.exercises.map((ex, exIdx) => {
              const exDone = ex.sets.filter(Boolean).length;
              const allDone = exDone === ex.sets.length && ex.sets.length > 0;
              return (
                <article
                  key={ex.id}
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-colors ${
                    allDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                          {exIdx + 1}
                        </span>
                        <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                          {ex.name}
                        </h3>
                      </div>
                      {ex.tip && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 pl-8 leading-relaxed">
                          💡 {ex.tip}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenEditExercise(ex)}
                        className="w-10 h-10 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 flex items-center justify-center transition-colors"
                        title="แก้ไขท่าฝึก"
                        aria-label={`แก้ไขท่า ${ex.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmDeleteExercise(ex)}
                        className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center justify-center transition-colors"
                        title="ลบท่าฝึก"
                        aria-label={`ลบท่า ${ex.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Editable Weight & Reps */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <label
                        htmlFor={`ex-w-${ex.id}`}
                        className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0"
                      >
                        น้ำหนัก (กก.)
                      </label>
                      <input
                        id={`ex-w-${ex.id}`}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        max="500"
                        value={ex.weight}
                        onChange={(e) =>
                          onUpdateExerciseField(
                            ex.id,
                            'weight',
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="w-16 text-right font-display font-bold text-sm bg-transparent text-slate-900 dark:text-white tabular-nums focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <label
                        htmlFor={`ex-r-${ex.id}`}
                        className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0"
                      >
                        จำนวนครั้ง
                      </label>
                      <input
                        id={`ex-r-${ex.id}`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="500"
                        value={ex.reps}
                        onChange={(e) =>
                          onUpdateExerciseField(
                            ex.id,
                            'reps',
                            Math.max(0, Math.round(Number(e.target.value) || 0))
                          )
                        }
                        className="w-16 text-right font-display font-bold text-sm bg-transparent text-slate-900 dark:text-white tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Set Toggle Buttons */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ex.sets.map((done, setIdx) => (
                      <button
                        key={setIdx}
                        type="button"
                        aria-pressed={done}
                        onClick={() => {
                          const becameDone = onToggleSet(ex.id, setIdx);
                          if (becameDone && state.autoTimer) {
                            startTimer(90);
                          }
                        }}
                        className={`touch-target px-3 py-2 rounded-xl border font-display font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                          done
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <span>{done ? '✓' : '○'}</span>
                        <span>เซต {setIdx + 1}</span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Finish Workout Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              resetTimer();
              onCompleteWorkout();
            }}
            className="touch-target w-full px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-display font-bold text-sm sm:text-base shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>🎉 จบการออกกำลังกายวันนี้ (อัปเดตแคลอรี่อัตโนมัติ)</span>
          </button>
        </div>
      </section>
    </div>
  );
}

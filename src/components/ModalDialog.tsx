'use client';

import { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { MealCategory, MealItem, WorkoutExercise } from '@/types/fitlife';
import { MEAL_CATEGORIES } from '@/lib/meals-data';
import { toSafePositive } from '@/lib/nutrition';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalShell({ title, onClose, children }: ModalShellProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-pop max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="touch-target px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`touch-target px-4 py-2 rounded-xl text-sm font-semibold text-white ${
            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

interface QuickLogModalProps {
  selectedDateLabel: string;
  onSubmit: (data: { mealName: string; kcal: number; protein: number }) => void;
  onClose: () => void;
}

export function QuickLogModal({ selectedDateLabel, onSubmit, onClose }: QuickLogModalProps) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('0');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('กรุณาระบุชื่ออาหารหรือเครื่องดื่ม');
      return;
    }
    onSubmit({
      mealName: trimmed,
      kcal: Math.round(toSafePositive(kcal)),
      protein: Math.round(toSafePositive(protein)),
    });
    onClose();
  };

  return (
    <ModalShell title={`+ บันทึกแคลอรี่ด่วน (${selectedDateLabel})`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMsg && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errorMsg}</p>
        )}
        <div>
          <label
            htmlFor="ql-name"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            ชื่ออาหาร / เครื่องดื่ม
          </label>
          <input
            id="ql-name"
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ข้าวไข่ข้น, เวย์โปรตีน 1 สกู๊ป"
            autoFocus
            className="touch-target w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="ql-kcal"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              แคลอรี่ (kcal)
            </label>
            <input
              id="ql-kcal"
              type="number"
              inputMode="numeric"
              min="0"
              max="5000"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              placeholder="350"
              required
              className="touch-target w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="ql-protein"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              โปรตีน (กรัม)
            </label>
            <input
              id="ql-protein"
              type="number"
              inputMode="numeric"
              min="0"
              max="500"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="24"
              className="touch-target w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="touch-target px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="touch-target px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            บันทึกเข้าวันนี้
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface CustomMealModalProps {
  onSubmit: (meal: Omit<MealItem, 'id' | 'isCustom'>) => void;
  onClose: () => void;
}

export function CustomMealModal({ onSubmit, onClose }: CustomMealModalProps) {
  const categories = MEAL_CATEGORIES.filter((c): c is MealCategory => c !== 'ทั้งหมด');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MealCategory>('ตามสั่ง');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('40');
  const [fat, setFat] = useState('15');
  const [tip, setTip] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category,
      kcal: Math.round(toSafePositive(kcal)),
      protein: Math.round(toSafePositive(protein)),
      carbs: Math.round(toSafePositive(carbs)),
      fat: Math.round(toSafePositive(fat)),
      tip: tip.trim(),
    });
    onClose();
  };

  return (
    <ModalShell title="+ เพิ่มเมนูของฉัน" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="cm-name"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            ชื่อเมนู
          </label>
          <input
            id="cm-name"
            type="text"
            maxLength={70}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ข้าวกะเพราเนื้อสับร้านหน้าปากซอย"
            autoFocus
            className="touch-target w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="cm-category"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            หมวดหมู่
          </label>
          <select
            id="cm-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MealCategory)}
            className="touch-target w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="cm-kcal"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              แคลอรี่ (kcal)
            </label>
            <input
              id="cm-kcal"
              type="number"
              inputMode="numeric"
              min="0"
              max="5000"
              required
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              placeholder="450"
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="cm-protein"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              โปรตีน (กรัม)
            </label>
            <input
              id="cm-protein"
              type="number"
              inputMode="numeric"
              min="0"
              max="500"
              required
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="30"
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="cm-carbs"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              คาร์บ (กรัม)
            </label>
            <input
              id="cm-carbs"
              type="number"
              inputMode="numeric"
              min="0"
              max="500"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="cm-fat"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              ไขมัน (กรัม)
            </label>
            <input
              id="cm-fat"
              type="number"
              inputMode="numeric"
              min="0"
              max="500"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="cm-tip"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            ทริคการสั่ง / หมายเหตุ (ไม่บังคับ)
          </label>
          <input
            id="cm-tip"
            type="text"
            maxLength={120}
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="เช่น สั่งหวานน้อยหรือไม่ใส่น้ำมันเพิ่ม"
            className="touch-target w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="touch-target px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="touch-target px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            บันทึกเมนู
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface ExerciseModalProps {
  existing: WorkoutExercise | null;
  onSubmit: (data: { name: string; weight: number; reps: number; setCount: number; tip: string }) => void;
  onClose: () => void;
}

export function ExerciseModal({ existing, onSubmit, onClose }: ExerciseModalProps) {
  const [name, setName] = useState(existing?.name || '');
  const [weight, setWeight] = useState(existing ? String(existing.weight) : '10');
  const [reps, setReps] = useState(existing ? String(existing.reps) : '12');
  const [setCount, setSetCount] = useState(existing ? String(existing.sets.length) : '4');
  const [tip, setTip] = useState(existing?.tip || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      weight: Math.max(0, Number(weight) || 0),
      reps: Math.max(1, Math.round(Number(reps) || 10)),
      setCount: Math.min(6, Math.max(1, Math.round(Number(setCount) || 4))),
      tip: tip.trim(),
    });
    onClose();
  };

  return (
    <ModalShell title={existing ? 'แก้ไขท่าฝึก' : '+ เพิ่มท่าฝึกใหม่'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="ex-name"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            ชื่อท่าฝึก
          </label>
          <input
            id="ex-name"
            type="text"
            maxLength={70}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ดัมเบลเคิร์ล (Bicep Curl)"
            autoFocus
            className="touch-target w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label
              htmlFor="ex-weight"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              น้ำหนัก (กก.)
            </label>
            <input
              id="ex-weight"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="ex-reps"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              จำนวนครั้ง
            </label>
            <input
              id="ex-reps"
              type="number"
              inputMode="numeric"
              min="1"
              max="500"
              required
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="ex-sets"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              จำนวนเซต
            </label>
            <input
              id="ex-sets"
              type="number"
              inputMode="numeric"
              min="1"
              max="6"
              required
              value={setCount}
              onChange={(e) => setSetCount(e.target.value)}
              className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="ex-tip"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            คำแนะนำท่าทาง (ไม่บังคับ)
          </label>
          <input
            id="ex-tip"
            type="text"
            maxLength={120}
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="เช่น คุมจังหวะลงช้าๆ ล็อกศอกให้นิ่ง"
            className="touch-target w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="touch-target px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="touch-target px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            {existing ? 'บันทึกการแก้ไข' : 'เพิ่มลงตารางฝึก'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function PwaGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="ติดตั้งเป็นแอปบนมือถือ (PWA)" onClose={onClose}>
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>สำหรับ iPhone / iPad (Safari)</span>
          </div>
          <p className="text-xs flex items-center gap-1.5 flex-wrap">
            1. แตะปุ่มแชร์ <Share className="w-3.5 h-3.5 inline text-sky-500" /> ที่แถบด้านล่างของ Safari
          </p>
          <p className="text-xs flex items-center gap-1.5 flex-wrap">
            2. เลือก <PlusSquare className="w-3.5 h-3.5 inline text-emerald-500" />{' '}
            <strong>&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</strong>
          </p>
        </div>
        <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>สำหรับ Android (Chrome)</span>
          </div>
          <p className="text-xs">
            แตะเมนูจุด 3 จุด (⋮) มุมขวาบน แล้วเลือก <strong>&quot;ติดตั้งแอป&quot; (Install App)</strong>
          </p>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="touch-target px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

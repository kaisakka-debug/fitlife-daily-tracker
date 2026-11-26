'use client';

import { useMemo, useState } from 'react';
import { Dices, Plus, Search, X } from 'lucide-react';
import { FitLifeState, MealCategory, MealItem, NutritionSummary } from '@/types/fitlife';
import { DEFAULT_MEALS, MEAL_CATEGORIES } from '@/lib/meals-data';
import { formatNumber, toSafePositive } from '@/lib/nutrition';

interface MealsTabProps {
  state: FitLifeState;
  nutrition: NutritionSummary;
  onLogMeal: (meal: MealItem) => void;
  onOpenAddCustomMeal: () => void;
  onConfirmDeleteCustomMeal: (meal: MealItem) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function MealsTab({
  state,
  nutrition,
  onLogMeal,
  onOpenAddCustomMeal,
  onConfirmDeleteCustomMeal,
  onToast,
}: MealsTabProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'ทั้งหมด' | MealCategory>('ทั้งหมด');
  const [highProtein, setHighProtein] = useState(false);
  const [lowCal, setLowCal] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  const allMeals = useMemo<MealItem[]>(() => {
    return [
      ...state.customMeals.map((m) => ({ ...m, isCustom: true })),
      ...DEFAULT_MEALS.map((m) => ({ ...m, isCustom: false })),
    ];
  }, [state.customMeals]);

  const filteredMeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMeals.filter((meal) => {
      if (category !== 'ทั้งหมด' && meal.category !== category) return false;
      if (highProtein && toSafePositive(meal.protein) < 25) return false;
      if (lowCal && toSafePositive(meal.kcal) >= 450) return false;
      if (q) {
        const haystack = `${meal.name} ${meal.category} ${meal.tip || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allMeals, category, highProtein, lowCal, search]);

  const spotlightMeal = useMemo(() => {
    if (!spotlightId) return null;
    return filteredMeals.find((m) => m.id === spotlightId) || null;
  }, [filteredMeals, spotlightId]);

  const activeLogs = state.logsByDate[state.selectedDate] || [];
  const consumedCal = activeLogs.reduce((sum, item) => sum + toSafePositive(item.kcal), 0);
  const remaining = nutrition.targetCalories - Math.round(consumedCal);
  const isOver = nutrition.isValid && remaining < 0;

  const hasFilters = Boolean(search || category !== 'ทั้งหมด' || highProtein || lowCal);

  const clearFilters = () => {
    setSearch('');
    setCategory('ทั้งหมด');
    setHighProtein(false);
    setLowCal(false);
    setSpotlightId(null);
  };

  const handleRandomize = () => {
    if (filteredMeals.length === 0) {
      onToast('ไม่พบเมนูที่ตรงกับตัวกรอง ลองล้างตัวกรองก่อนนะ', 'warning');
      return;
    }
    const pool =
      filteredMeals.length > 1 && spotlightId
        ? filteredMeals.filter((m) => m.id !== spotlightId)
        : filteredMeals;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSpotlightId(pick.id);
    onToast(`สุ่มได้เมนู "${pick.name}" (${pick.kcal} kcal)`, 'info');
  };

  const renderCard = (meal: MealItem, isSpotlight = false) => (
    <article
      key={isSpotlight ? `spot_${meal.id}` : meal.id}
      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
        isSpotlight
          ? 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 border-amber-300 dark:border-amber-500/40 shadow-sm animate-pop'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/70 shadow-sm'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {isSpotlight && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                🎲 เมนูแนะนำจากการสุ่ม
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
              {meal.category}
            </span>
            {meal.isCustom && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
                เมนูของฉัน
              </span>
            )}
          </div>

          {meal.isCustom && !isSpotlight && (
            <button
              type="button"
              onClick={() => onConfirmDeleteCustomMeal(meal)}
              className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center justify-center transition-colors shrink-0"
              title="ลบเมนูของฉัน"
              aria-label={`ลบเมนู ${meal.name}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
          {meal.name}
        </h3>

        <div className="grid grid-cols-4 gap-1.5 text-center tabular-nums">
          <div className="rounded-xl py-1.5 px-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">พลังงาน</div>
            <div className="font-display font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-200">
              {formatNumber(meal.kcal)}
            </div>
          </div>
          <div className="rounded-xl py-1.5 px-1 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20">
            <div className="text-[10px] text-sky-700 dark:text-sky-300">โปรตีน</div>
            <div className="font-display font-bold text-xs sm:text-sm text-sky-800 dark:text-sky-200">
              {formatNumber(meal.protein)}g
            </div>
          </div>
          <div className="rounded-xl py-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">คาร์บ</div>
            <div className="font-display font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              {formatNumber(meal.carbs || 0)}g
            </div>
          </div>
          <div className="rounded-xl py-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">ไขมัน</div>
            <div className="font-display font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              {formatNumber(meal.fat || 0)}g
            </div>
          </div>
        </div>

        {meal.tip && (
          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 rounded-xl px-3 py-2 leading-relaxed">
            💡 <span className="font-semibold">ทริคการสั่ง:</span> {meal.tip}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onLogMeal(meal)}
          className="touch-target flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-display font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5"
        >
          <span>+ กินเมนูนี้ (บันทึกเข้าวันนี้)</span>
        </button>
        {isSpotlight && (
          <button
            type="button"
            onClick={handleRandomize}
            className="touch-target px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-xs sm:text-sm transition-colors"
          >
            สุ่มใหม่
          </button>
        )}
      </div>
    </article>
  );

  return (
    <div className="space-y-4 animate-fade-slide">
      <section className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                คลังเมนูทั่วไป (สั่งง่าย กินได้จริงทุกวัน)
              </h2>
              {nutrition.isValid && (
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold tabular-nums border ${
                    isOver
                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isOver
                    ? `เกินโควตา +${formatNumber(Math.abs(remaining))} kcal`
                    : `งบคงเหลือ ${formatNumber(remaining)} kcal`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              รวมเมนูร้านตามสั่ง ก๋วยเตี๋ยว ส้มตำ และ 7-Eleven พร้อมทริคปรับแคลอรี่
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRandomize}
              className="touch-target flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-display font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Dices className="w-4 h-4" />
              <span>สุ่มเมนูมื้อนี้</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddCustomMeal}
              className="touch-target flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-display font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเมนูของฉัน</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเมนู เช่น กะเพรา, อกไก่, ก๋วยเตี๋ยว, 7-11..."
            className="touch-target w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {MEAL_CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setSpotlightId(null);
                }}
                className={`touch-target whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                  active
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHighProtein((v) => !v);
              setSpotlightId(null);
            }}
            className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              highProtein
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-sky-50/70 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/20'
            }`}
          >
            🥩 โปรตีนสูง (25g+)
          </button>
          <button
            type="button"
            onClick={() => {
              setLowCal((v) => !v);
              setSpotlightId(null);
            }}
            className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              lowCal
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
            }`}
          >
            🥗 แคลต่ำ (&lt;450 kcal)
          </button>
        </div>
      </section>

      {spotlightMeal && <div>{renderCard(spotlightMeal, true)}</div>}

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>แสดงทั้งหมด {filteredMeals.length} เมนู</span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="touch-target px-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {filteredMeals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
          <div className="text-3xl">🍜</div>
          <p className="font-display font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
            ไม่พบเมนูที่ตรงกับเงื่อนไข
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ลองเปลี่ยนคำค้นหา ล้างตัวกรอง หรือเพิ่มเมนูโปรดของคุณเอง
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="touch-target px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-semibold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
            <button
              type="button"
              onClick={onOpenAddCustomMeal}
              className="touch-target px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold"
            >
              + เพิ่มเมนูของฉัน
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMeals.map((meal) => renderCard(meal, false))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
  Mail,
  LogOut,
  Plus,
  RotateCcw,
  Calendar,
  Users,
} from 'lucide-react';
import {
  FitLifeState,
  Gender,
  Goal,
  NutritionSummary,
  SyncStatus,
} from '@/types/fitlife';
import {
  ACTIVITY_CARDS,
  AVATAR_OPTIONS,
  GOAL_OPTIONS,
  buildProfileSummaryLine,
  calculateBmi,
  formatNumber,
  formatShortThaiDate,
  shiftDateString,
  toSafePositive,
} from '@/lib/nutrition';
import { WeightSparkline } from '@/components/WeightSparkline';

interface TodayTabProps {
  state: FitLifeState;
  nutrition: NutritionSummary;
  syncStatus: SyncStatus;
  supabaseReady: boolean;
  loadingDateLogs: boolean;
  onUpdateProfile: (patch: Partial<FitLifeState['profile']>) => void;
  onSetActivity: (mult: number) => void;
  onOpenQuickLog: () => void;
  onConfirmClearDayLogs: () => void;
  onDeleteLog: (logId: string) => void;
  onSelectDate: (dateStr: string) => void;
  onSubmitWeight: (weightKg: number) => void;
  onCopySyncCode: () => void;
  onLoadSyncCode: (code: string) => Promise<void>;
  onSendMagicLink: (email: string) => Promise<void>;
  onSignOutEmail: () => Promise<void>;
  onOpenProfileManager: () => void;
  onConfirmResetAll: () => void;
  onGoToMeals: () => void;
}

export function TodayTab({
  state,
  nutrition,
  syncStatus,
  supabaseReady,
  loadingDateLogs,
  onUpdateProfile,
  onSetActivity,
  onOpenQuickLog,
  onConfirmClearDayLogs,
  onDeleteLog,
  onSelectDate,
  onSubmitWeight,
  onCopySyncCode,
  onLoadSyncCode,
  onSendMagicLink,
  onSignOutEmail,
  onOpenProfileManager,
  onConfirmResetAll,
  onGoToMeals,
}: TodayTabProps) {
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [switchCodeInput, setSwitchCodeInput] = useState('');
  const [switchingCode, setSwitchingCode] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [weightInput, setWeightInput] = useState(
    state.profile.weight !== '' ? String(state.profile.weight) : ''
  );
  const [prevProfileWeight, setPrevProfileWeight] = useState(state.profile.weight);

  // Keep weight check-in input in sync when profile weight changes externally (e.g. cloud load / reset)
  if (state.profile.weight !== prevProfileWeight) {
    setPrevProfileWeight(state.profile.weight);
    setWeightInput(state.profile.weight !== '' ? String(state.profile.weight) : '');
  }

  const activeLogs = state.logsByDate[state.selectedDate] || [];
  const totals = activeLogs.reduce(
    (acc, item) => {
      acc.kcal += toSafePositive(item.kcal);
      acc.protein += toSafePositive(item.protein);
      return acc;
    },
    { kcal: 0, protein: 0 }
  );

  const consumedCal = Math.round(totals.kcal);
  const consumedPro = Math.round(totals.protein);
  const targetCal = nutrition.targetCalories;
  const targetPro = nutrition.targetProtein;
  const remaining = targetCal - consumedCal;
  const isOver = nutrition.isValid && remaining < 0;

  const calPct = targetCal > 0 ? Math.min(100, Math.round((consumedCal / targetCal) * 100)) : 0;
  const proPct = targetPro > 0 ? Math.min(100, Math.round((consumedPro / targetPro) * 100)) : 0;

  const isViewingToday = state.selectedDate === state.todayDate;
  const yesterdayStr = shiftDateString(state.todayDate, -1);
  const isViewingYesterday = state.selectedDate === yesterdayStr;

  const summaryLine = buildProfileSummaryLine(state.profile, nutrition);
  const bmiInfo = calculateBmi(state.profile.weight, state.profile.height);
  const activeAvatar =
    state.profile.avatar || (state.profile.gender === 'female' ? '🌸' : '💪');
  const displayProfileName = state.profile.name.trim() || 'ผู้ใช้ทั่วไป';

  const syncBadge = (() => {
    if (syncStatus === 'syncing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
          <RefreshCw className="w-3 h-3 animate-spin" />
          กำลังซิงก์...
        </span>
      );
    }
    if (syncStatus === 'synced') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
          <span>🟢</span>
          <span>ซิงก์ข้อมูลแล้ว</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
        title={
          supabaseReady
            ? 'โหมดออฟไลน์ ข้อมูลจะซิงก์เมื่อเชื่อมต่ออินเทอร์เน็ต'
            : 'กำลังบันทึกในเครื่อง (ตั้งค่า Supabase เพื่อซิงก์ข้ามอุปกรณ์)'
        }
      >
        <span>🟡</span>
        <span>ออฟไลน์</span>
      </span>
    );
  })();

  const handleLoadCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchCodeInput.trim()) return;
    setSwitchingCode(true);
    try {
      await onLoadSyncCode(switchCodeInput.trim());
      setSwitchCodeInput('');
    } finally {
      setSwitchingCode(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSendingEmail(true);
    try {
      await onSendMagicLink(emailInput.trim());
      setEmailInput('');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weightInput);
    if (!Number.isFinite(w) || w < 20 || w > 300) return;
    onSubmitWeight(Number(w.toFixed(1)));
  };

  return (
    <div className="space-y-4 animate-fade-slide">
      {/* 1. Personal Profile & Cloud Sync Card */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setProfileCollapsed((v) => !v)}
            className="flex-1 min-w-0 flex items-center gap-3 text-left touch-target"
            aria-expanded={!profileCollapsed}
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
              {activeAvatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  โปรไฟล์: {displayProfileName}
                </h2>
                {syncBadge}
                {bmiInfo && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${bmiInfo.badgeClass}`}
                  >
                    BMI {bmiInfo.bmi} ({bmiInfo.label})
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {summaryLine}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenProfileManager}
              className="touch-target px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
              title="จัดการ / สลับโปรไฟล์ผู้ใช้"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สลับ / สร้างโปรไฟล์</span>
            </button>
            <button
              type="button"
              onClick={() => setProfileCollapsed((v) => !v)}
              className={`w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-transform ${
                profileCollapsed ? '' : 'rotate-180'
              }`}
              aria-label="พับ/กางการ์ดโปรไฟล์"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!profileCollapsed && (
          <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {/* Cloud Sync Panel */}
            <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {supabaseReady ? (
                    <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    รหัสซิงก์ส่วนตัว (Sync Code)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 tracking-wide">
                    {state.syncCode}
                  </code>
                  <button
                    type="button"
                    onClick={onCopySyncCode}
                    className="touch-target px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
                    title="คัดลอกรหัสซิงก์"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก</span>
                  </button>
                </div>
              </div>

              {/* Switch User / Load Code */}
              <form onSubmit={handleLoadCodeSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={switchCodeInput}
                  onChange={(e) => setSwitchCodeInput(e.target.value.toUpperCase())}
                  placeholder="กรอกรหัสซิงก์จากเครื่องอื่น เช่น FIT-XXXX-XXXX"
                  className="touch-target flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={switchingCode || !switchCodeInput.trim()}
                  className="touch-target px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition-colors"
                >
                  {switchingCode ? 'กำลังโหลด...' : 'สลับ / โหลดข้อมูล'}
                </button>
              </form>

              {/* Optional Email Magic Link */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {state.authEmail ? (
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
                    <Mail className="w-3.5 h-3.5" />
                    <span>ซิงก์บัญชี: {state.authEmail}</span>
                    <button
                      type="button"
                      onClick={() => void onSignOutEmail()}
                      className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-1"
                    >
                      <LogOut className="w-3 h-3" />
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEmailLogin((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold py-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{showEmailLogin ? 'ซ่อนการเข้าสู่ระบบด้วยอีเมล' : 'เข้าสู่ระบบด้วยอีเมล (Magic Link)'}</span>
                  </button>
                )}

                {!supabaseReady && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    ทำงานแบบออฟไลน์ในเครื่อง (ยังไม่เชื่อมต่อ .env Supabase)
                  </span>
                )}
              </div>

              {showEmailLogin && !state.authEmail && (
                <form onSubmit={handleMagicLinkSubmit} className="flex items-center gap-2 pt-1">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="touch-target flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="touch-target px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shrink-0"
                  >
                    {sendingEmail ? 'กำลังส่ง...' : 'ส่งลิงก์'}
                  </button>
                </form>
              )}
            </div>

            {/* Profile Form Fields */}
            <div>
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                ไอคอนโปรไฟล์
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => onUpdateProfile({ avatar: icon })}
                    className={`w-10 h-10 rounded-xl border text-lg flex items-center justify-center transition-all ${
                      activeAvatar === icon
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                    }`}
                    aria-label={`เลือกไอคอน ${icon}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prof-name"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  ชื่อเล่น (ไม่บังคับ)
                </label>
                <input
                  id="prof-name"
                  type="text"
                  maxLength={30}
                  value={state.profile.name}
                  onChange={(e) => onUpdateProfile({ name: e.target.value })}
                  placeholder="เช่น ต้น, มายด์"
                  className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  เพศ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'male', label: '👨 ชาย' },
                      { id: 'female', label: '👩 หญิง' },
                    ] as Array<{ id: Gender; label: string }>
                  ).map((g) => {
                    const active = state.profile.gender === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => onUpdateProfile({ gender: g.id })}
                        className={`touch-target rounded-xl border text-sm font-semibold transition-all ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <label
                  htmlFor="prof-age"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  อายุ (ปี)
                </label>
                <input
                  id="prof-age"
                  type="number"
                  inputMode="numeric"
                  min="10"
                  max="100"
                  value={state.profile.age}
                  onChange={(e) =>
                    onUpdateProfile({
                      age: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  placeholder="23"
                  className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="prof-height"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  ส่วนสูง (ซม.)
                </label>
                <input
                  id="prof-height"
                  type="number"
                  inputMode="numeric"
                  min="100"
                  max="240"
                  value={state.profile.height}
                  onChange={(e) =>
                    onUpdateProfile({
                      height: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  placeholder="175"
                  className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="prof-weight"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  น้ำหนัก (กก.)
                </label>
                <input
                  id="prof-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="25"
                  max="300"
                  value={state.profile.weight}
                  onChange={(e) =>
                    onUpdateProfile({
                      weight: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  placeholder="95"
                  className="touch-target w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                เป้าหมายหลัก
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GOAL_OPTIONS.map((g) => {
                  const active = state.profile.goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onUpdateProfile({ goal: g.id as Goal })}
                      className={`touch-target p-2.5 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          active
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {g.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {g.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>สูตรคำนวณมาตรฐาน Mifflin-St Jeor</span>
              <button
                type="button"
                onClick={onConfirmResetAll}
                className="touch-target px-2 text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              >
                ล้างข้อมูลทั้งหมด / เริ่มใหม่
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Hero Quota Banner */}
      <section className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border border-emerald-200/80 dark:border-slate-800 shadow-sm">
        {!nutrition.isValid && (
          <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium">
            ⚠️ กรุณากรอกอายุ ส่วนสูง และน้ำหนักปัจจุบัน (มากกว่า 0) เพื่อให้ระบบคำนวณงบแคลอรี่และโปรตีนของคุณ
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="rounded-2xl p-3 sm:p-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              วันนี้กินได้ทั้งหมด
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white tabular-nums">
                {formatNumber(targetCal)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">kcal</span>
            </div>
          </div>

          <div className="rounded-2xl p-3 sm:p-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
              โปรตีนเป้าหมาย
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display font-bold text-xl sm:text-2xl text-sky-600 dark:text-sky-400 tabular-nums">
                {formatNumber(targetPro)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">กรัม</span>
            </div>
          </div>

          <div
            className={`col-span-2 sm:col-span-1 rounded-2xl p-3 sm:p-4 border transition-colors ${
              isOver
                ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold">
                {isOver ? '⚠️ เกินโควตาวันนี้' : 'คงเหลือวันนี้'}
              </span>
              {isOver && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                  ระวังเกินงบ
                </span>
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display font-bold text-xl sm:text-2xl tabular-nums">
                {isOver ? `+${formatNumber(Math.abs(remaining))}` : formatNumber(remaining)}
              </span>
              <span className="text-xs opacity-80">kcal</span>
            </div>
          </div>
        </div>

        {/* Dual Progress Bars */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                🔥 แคลอรี่{isViewingToday ? 'ที่กินวันนี้' : `วันที่ ${formatShortThaiDate(state.selectedDate)}`}
              </span>
              <span
                className={`tabular-nums font-semibold ${
                  isOver
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {formatNumber(consumedCal)} / {formatNumber(targetCal)} kcal (
                {targetCal > 0 ? Math.round((consumedCal / targetCal) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isOver ? 'bg-rose-500' : calPct >= 88 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                🥩 โปรตีนที่ได้รับ
              </span>
              <span
                className={`tabular-nums font-semibold ${
                  consumedPro >= targetPro && targetPro > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-sky-600 dark:text-sky-400'
                }`}
              >
                {formatNumber(consumedPro)} / {formatNumber(targetPro)} กรัม (
                {targetPro > 0 ? Math.round((consumedPro / targetPro) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  consumedPro >= targetPro && targetPro > 0 ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
                style={{ width: `${proPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onOpenQuickLog}
            className="touch-target flex-1 min-w-[170px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-display font-semibold text-sm shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกแคลอรี่ด่วน</span>
          </button>
          <button
            type="button"
            onClick={onConfirmClearDayLogs}
            className="touch-target px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-display font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>เริ่มวันใหม่</span>
          </button>
        </div>
      </section>

      {/* 3. Activity Selector */}
      <section className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="mb-3">
          <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
            วันนี้ทำอะไรบ้าง? → กินได้เท่าไหร่
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            เลือกกิจกรรมจริงของวันนี้ ระบบจะปรับงบแคลอรี่ให้ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ACTIVITY_CARDS.map((act) => {
            const active = Math.abs(state.activityMultiplier - act.multiplier) < 0.001;
            return (
              <button
                key={act.multiplier}
                type="button"
                onClick={() => onSetActivity(act.multiplier)}
                className={`touch-target p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-500/15 ring-1 ring-emerald-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xl sm:text-2xl shrink-0 mt-0.5">{act.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`font-display font-semibold text-xs sm:text-sm leading-snug ${
                        active
                          ? 'text-emerald-800 dark:text-emerald-200'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {act.title}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {act.tag}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Food Logs with Date Switcher & Weekly Weight Check-in */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                🍽️ รายการอาหาร{isViewingToday ? 'วันนี้' : ` (${formatShortThaiDate(state.selectedDate)})`} ({activeLogs.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isViewingToday ? 'บันทึกประจำวัน (ซิงก์อัตโนมัติ)' : 'กำลังดูประวัติย้อนหลัง'}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToMeals}
              className="touch-target px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              + เลือกจากคลังเมนู
            </button>
          </div>

          {/* Date Switcher (วันนี้ / ย้อนหลัง) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <button
              type="button"
              onClick={() => onSelectDate(state.todayDate)}
              className={`touch-target px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isViewingToday
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => onSelectDate(yesterdayStr)}
              className={`touch-target px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isViewingYesterday
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              เมื่อวาน
            </button>

            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={() => onSelectDate(shiftDateString(state.selectedDate, -1))}
                className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="วันก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <label className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="date"
                  max={state.todayDate}
                  value={state.selectedDate}
                  onChange={(e) => {
                    if (e.target.value) onSelectDate(e.target.value);
                  }}
                  aria-label="เลือกวันที่ดูข้อมูลย้อนหลัง"
                  className="touch-target pl-7 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <button
                type="button"
                disabled={isViewingToday}
                onClick={() => onSelectDate(shiftDateString(state.selectedDate, 1))}
                className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="วันถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingDateLogs ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>กำลังดึงข้อมูลอาหารจากคลาวด์...</span>
            </div>
          ) : activeLogs.length === 0 ? (
            <div className="flex-1 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🥗</span>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                ยังไม่มีรายการอาหารสำหรับวันที่ {formatShortThaiDate(state.selectedDate)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                กดปุ่ม &quot;+ บันทึกแคลอรี่ด่วน&quot; หรือเลือกอาหารไทยจากแท็บ &quot;คลังเมนูทั่วไป&quot;
              </p>
            </div>
          ) : (
            <ul className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800/80">
              {activeLogs
                .slice()
                .reverse()
                .map((log) => (
                  <li key={log.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {log.mealName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {log.time && <span>🕒 {log.time} น.</span>}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(log.kcal)} kcal
                        </span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          โปรตีน {formatNumber(log.protein)} กรัม
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteLog(log.id)}
                      className="w-10 h-10 shrink-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center justify-center transition-colors"
                      aria-label={`ลบรายการ ${log.mealName}`}
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* Weekly Weight Check-in & Sparkline */}
        <section className="lg:col-span-5 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              ⚖️ เช็คอินน้ำหนักรายสัปดาห์
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              อัปเดตน้ำหนักเพื่อคำนวณแคลอรี่ใหม่และซิงก์กราฟแนวโน้ม
            </p>
          </div>

          <form onSubmit={handleWeightSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="25"
                max="300"
                required
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="น้ำหนัก กก."
                className="touch-target w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                กก.
              </span>
            </div>
            <button
              type="submit"
              className="touch-target px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-display font-semibold text-xs sm:text-sm shrink-0 transition-colors"
            >
              บันทึก
            </button>
          </form>

          <WeightSparkline history={state.weightHistory} />
        </section>
      </div>
    </div>
  );
}

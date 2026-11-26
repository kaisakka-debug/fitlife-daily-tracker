'use client';

import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import { ToastMessage } from '@/types/fitlife';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const styleMap = {
    success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20',
    info: 'bg-slate-800 dark:bg-slate-700 text-white border-slate-700 shadow-slate-900/20',
    warning: 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20',
    error: 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20',
  };

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
    error: <XCircle className="w-4 h-4 shrink-0" />,
  };

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-50 flex flex-col gap-2 pointer-events-none sm:max-w-sm"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto animate-pop flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-lg text-sm font-medium ${styleMap[t.type]}`}
        >
          {iconMap[t.type]}
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

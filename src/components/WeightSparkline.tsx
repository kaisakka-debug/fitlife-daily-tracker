'use client';

import { WeightEntry } from '@/types/fitlife';
import { formatShortThaiDate } from '@/lib/nutrition';

interface WeightSparklineProps {
  history: WeightEntry[];
}

export function WeightSparkline({ history }: WeightSparklineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        บันทึกน้ำหนักครั้งแรกด้านบน เพื่อเริ่มติดตามกราฟแนวโน้มประจำสัปดาห์
      </div>
    );
  }

  const recent = history.slice(-12);
  const weights = recent.map((item) => Number(item.weight)).filter((w) => Number.isFinite(w));
  if (weights.length === 0) return null;

  const latest = weights[weights.length - 1];
  const first = weights[0];
  const diff = Number((latest - first).toFixed(1));

  let diffText = 'คงที่';
  let diffColor = 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800';
  if (diff < 0) {
    diffText = `ลดลง ${Math.abs(diff)} กก.`;
    diffColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15';
  } else if (diff > 0) {
    diffText = `เพิ่มขึ้น +${diff} กก.`;
    diffColor = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15';
  }

  const width = 320;
  const height = 96;
  const padX = 18;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const span = maxW - minW;

  const coords = recent.map((entry, idx) => {
    const x = recent.length === 1 ? width / 2 : padX + (idx / (recent.length - 1)) * innerW;
    const normY = span === 0 ? 0.5 : (Number(entry.weight) - minW) / span;
    const y = padY + innerH - normY * innerH;
    return { x, y, weight: Number(entry.weight), date: entry.date };
  });

  const pointsAttr = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `M ${coords[0].x.toFixed(1)},${height - 6} ` +
        coords.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L ${coords[coords.length - 1].x.toFixed(1)},${height - 6} Z`
      : '';

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">ล่าสุด:</span>
          <span className="font-display font-bold text-sm text-slate-900 dark:text-white tabular-nums">
            {latest} กก.
          </span>
          {recent.length > 1 && (
            <span className={`px-2 py-0.5 rounded-full font-semibold ${diffColor} tabular-nums`}>
              {diffText}
            </span>
          )}
        </div>
        <span className="text-slate-400 dark:text-slate-500 tabular-nums">
          ช่วง {minW}–{maxW} กก. ({recent.length} ครั้ง)
        </span>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 p-2.5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible"
          role="img"
          aria-label="กราฟแนวโน้มน้ำหนัก"
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          {areaPath && <path d={areaPath} fill="url(#sparkFill)" />}
          {coords.length > 1 && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsAttr}
            />
          )}
          {coords.map((p, i) => {
            const isLast = i === coords.length - 1;
            return (
              <g key={`${p.date}_${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 5 : 3.5}
                  className={
                    isLast
                      ? 'fill-emerald-500 stroke-white dark:stroke-slate-900'
                      : 'fill-emerald-400 stroke-white dark:stroke-slate-900'
                  }
                  strokeWidth="2"
                >
                  <title>{`${formatShortThaiDate(p.date)}: ${p.weight} กก.`}</title>
                </circle>
                {isLast && (
                  <text
                    x={p.x}
                    y={p.y - 9}
                    textAnchor="middle"
                    className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-bold"
                  >
                    {p.weight}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">
          <span>{formatShortThaiDate(recent[0].date)}</span>
          <span>{formatShortThaiDate(recent[recent.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
}

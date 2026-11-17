import { useState } from "react";
import { useGetLiquidityRadarQuery } from "@/features/analytics/analyticsAPI";
import { formatCurrency } from "@/lib/format-currency";
import { useTypedSelector } from "@/app/hook";

export default function LiquidityRadarChart() {
  const { data, isLoading } = useGetLiquidityRadarQuery();
  const forecast = data?.data;
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);

  if (isLoading || !forecast) {
    return (
      <div className="w-full obsidian-card rounded-2xl p-6 border border-white/[0.06] h-60 flex items-center justify-center">
        <span className="text-white/30 text-xs">Loading cash flow forecast...</span>
      </div>
    );
  }

  const trajectory = forecast.trajectory;
  const valley = forecast.valley;

  // Compute SVG dimensions and normalized coordinates
  const minBal = Math.min(0, ...trajectory.map((t) => t.balance));
  const maxBal = Math.max(1000, ...trajectory.map((t) => t.balance));
  const range = maxBal - minBal || 1;

  const svgWidth = 800;
  const svgHeight = 200;
  const paddingX = 30;
  const paddingY = 25;

  const points = trajectory.map((t, index) => {
    const x = paddingX + (index / (trajectory.length - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = (t.balance - minBal) / range;
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y, ...t };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  const activeDay = activeDayIndex !== null ? trajectory[activeDayIndex] : null;

  return (
    <div className="w-full obsidian-card rounded-2xl p-6 border border-white/[0.08] bg-[#111114]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-3">
        <div>
          <h3 className="text-sm font-medium text-white tracking-tight">
            30-Day Cash Flow Forecast
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Projected daily balance based on scheduled bills and typical spending.
          </p>
        </div>

        {/* Forecast Summary */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-white/40 block text-[11px]">Lowest Projected Balance</span>
            <span className="font-medium text-white tabular-nums">
              {formatCurrency(valley.balance, { currency })}
              <span className="text-white/40 font-normal ml-1">({valley.dayLabel})</span>
            </span>
          </div>

          <div className="border-l border-white/[0.06] pl-4">
            <span className="text-white/40 block text-[11px]">Estimated End Balance</span>
            <span className="font-medium text-white tabular-nums">
              {formatCurrency(trajectory[trajectory.length - 1]?.balance || 0, { currency })}
            </span>
          </div>
        </div>
      </div>

      {/* Trajectory SVG Curve */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-40 sm:h-48 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c1a063" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#c1a063" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Zero reference line if negative balance exists */}
          {minBal < 0 && (
            <line
              x1={paddingX}
              y1={svgHeight - paddingY - (Math.abs(minBal) / range) * (svgHeight - paddingY * 2)}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY - (Math.abs(minBal) / range) * (svgHeight - paddingY * 2)}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="3 3"
            />
          )}

          {/* Filled Area */}
          <path d={areaD} fill="url(#forecastGradient)" />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#c1a063"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Points on Events and Valley */}
          {points.map((p, idx) => {
            const isValley = p.date === valley.date;
            const hasEvents = p.events.length > 0;
            const isSelected = activeDayIndex === idx;

            if (isValley || hasEvents || isSelected) {
              return (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 4.5 : 3}
                  className="fill-[#c1a063] stroke-[#111114] stroke-2 cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={() => setActiveDayIndex(idx)}
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Timeline Axis */}
        <div className="flex justify-between text-[11px] text-white/35 pt-2">
          <span>Today ({trajectory[0]?.dayLabel})</span>
          <span>Day 15 ({trajectory[15]?.dayLabel})</span>
          <span>Day 30 ({trajectory[trajectory.length - 1]?.dayLabel})</span>
        </div>
      </div>

      {/* Selected Day Details (clean & quiet) */}
      {activeDay && (
        <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="space-y-0.5">
            <div className="text-white">
              <span className="text-white/50">{activeDay.dayLabel}:</span>{" "}
              <span className="font-medium tabular-nums">{formatCurrency(activeDay.balance, { currency })}</span>
            </div>
            {activeDay.events.length > 0 && (
              <div className="text-[11px] text-white/50">
                Scheduled: {activeDay.events.join(", ")}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveDayIndex(null)}
            className="text-[11px] text-white/40 hover:text-white cursor-pointer self-start sm:self-center"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

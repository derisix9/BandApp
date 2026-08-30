import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string;
  bgClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  colorClass = "text-indigo-400",
  bgClass = "bg-slate-900/70 border-slate-800",
}) => {
  return (
    <div
      className={`p-2.5 sm:p-3.5 rounded-2xl border ${bgClass} flex items-center gap-2 sm:gap-3 shadow-xs min-w-0 overflow-hidden w-full`}
    >
      <div className={`p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs sm:text-base md:text-lg font-extrabold text-white tracking-tight leading-tight truncate">
          {value}
        </div>
        <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate mt-0.5">
          {title}
        </div>
      </div>
    </div>
  );
};

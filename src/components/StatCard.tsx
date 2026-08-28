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
  bgClass = "bg-indigo-950/40 border-indigo-800/40",
}) => {
  return (
    <div
      className={`p-3.5 rounded-2xl border ${bgClass} flex items-center gap-3 shadow-xs`}
    >
      <div className={`p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-none truncate">
          {value}
        </div>
        <div className="text-xs text-slate-400 font-medium truncate mt-1">
          {title}
        </div>
      </div>
    </div>
  );
};

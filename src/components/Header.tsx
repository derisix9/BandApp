import React from "react";
import {
  ArrowLeft,
  BookOpen,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Trophy,
} from "lucide-react";
import { ActiveScreen, AppTheme } from "../types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  onBack?: () => void;
  actions?: React.ReactNode;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  activeScreen,
  onNavigate,
  onBack,
  actions,
  theme = "dark",
  onToggleTheme,
}) => {
  const isRoot = activeScreen === "home" || activeScreen === "auth";

  return (
    <header
      id="bandapp-header"
      className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shadow-md transition-colors"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {!isRoot && (
            <button
              id="header-back-btn"
              onClick={onBack ? onBack : () => onNavigate("home")}
              className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {isRoot && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate leading-snug">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-400 font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {actions}

          {onToggleTheme && (
            <button
              id="header-theme-toggle-btn"
              onClick={onToggleTheme}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={theme === "light" ? "Alternar para Tema Escuro" : "Alternar para Tema Claro"}
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-indigo-500" />
              ) : (
                <Sun className="w-5 h-5 text-amber-400" />
              )}
            </button>
          )}

          {activeScreen !== "leaderboard" && (
            <button
              id="header-leaderboard-btn"
              onClick={() => onNavigate("leaderboard")}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Placar dos Estudantes (Ranking)"
            >
              <Trophy className="w-5 h-5 text-amber-400/90" />
            </button>
          )}

          {activeScreen !== "question_bank" && (
            <button
              id="header-question-bank-btn"
              onClick={() => onNavigate("question_bank")}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Banco de Questões"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}

          {activeScreen !== "settings" && (
            <button
              id="header-settings-btn"
              onClick={() => onNavigate("settings")}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Configurações & IA"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


import React from "react";
import { CheckCircle2, XCircle, Sparkles, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OptionLetter } from "../types";

interface OptionCardProps {
  letter: OptionLetter;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean;
  showResult?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  letter,
  text,
  isSelected,
  isCorrect,
  showResult = false,
  onClick,
  disabled = false,
}) => {
  // Determine states
  const isSelectedCorrect = showResult && isSelected && isCorrect;
  const isSelectedIncorrect = showResult && isSelected && !isCorrect;
  const isRevealedCorrect = showResult && !isSelected && isCorrect;
  const isNeutralSelected = !showResult && isSelected;
  const isDimmed = showResult && !isSelected && !isCorrect;

  // Dynamic container classes
  let containerClasses =
    "bg-slate-900/70 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-850 hover:shadow-md";
  let letterBadgeClasses =
    "bg-slate-800 text-slate-300 border-slate-700 shadow-xs";

  if (isSelectedCorrect) {
    containerClasses =
      "bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-slate-900 border-emerald-400 text-emerald-100 ring-2 ring-emerald-500/50 shadow-xl shadow-emerald-950/50";
    letterBadgeClasses =
      "bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-md shadow-emerald-500/30";
  } else if (isSelectedIncorrect) {
    containerClasses =
      "bg-gradient-to-r from-rose-950/85 via-rose-900/40 to-slate-900 border-rose-500 text-rose-100 ring-2 ring-rose-500/50 shadow-xl shadow-rose-950/50";
    letterBadgeClasses =
      "bg-rose-600 text-white border-rose-400 font-black shadow-md shadow-rose-600/30";
  } else if (isRevealedCorrect) {
    containerClasses =
      "bg-emerald-950/30 border-2 border-dashed border-emerald-500/70 text-emerald-200/95";
    letterBadgeClasses =
      "bg-emerald-900/90 text-emerald-300 border-emerald-600 font-bold";
  } else if (isNeutralSelected) {
    containerClasses =
      "bg-indigo-950/60 border-indigo-500 text-white ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/60";
    letterBadgeClasses =
      "bg-indigo-600 text-white border-indigo-400 font-black shadow-md shadow-indigo-600/30";
  } else if (isDimmed) {
    containerClasses =
      "bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-40";
    letterBadgeClasses =
      "bg-slate-800 text-slate-500 border-slate-800";
  }

  // Animation variants
  const getAnimationProps = () => {
    if (isSelectedCorrect) {
      return {
        animate: {
          scale: [0.97, 1.03, 1],
          y: [0, -3, 0],
          transition: { duration: 0.35, ease: "easeOut" as const },
        },
      };
    }
    if (isSelectedIncorrect) {
      return {
        animate: {
          x: [0, -8, 8, -6, 6, -3, 3, 0],
          transition: { duration: 0.42, ease: "easeInOut" as const },
        },
      };
    }
    if (isRevealedCorrect) {
      return {
        animate: {
          opacity: [0.7, 1],
          scale: [0.99, 1],
          transition: { duration: 0.3 },
        },
      };
    }
    return {};
  };

  return (
    <motion.button
      type="button"
      id={`option-${letter}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !showResult ? { scale: 1.006 } : undefined}
      whileTap={!disabled && !showResult ? { scale: 0.985 } : undefined}
      {...getAnimationProps()}
      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-colors duration-200 flex items-start gap-3 sm:gap-3.5 cursor-pointer disabled:cursor-default relative overflow-hidden ${containerClasses}`}
    >
      {/* Decorative dynamic pulse background on correct */}
      {isSelectedCorrect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.25, 0], scale: [0.8, 1.3, 1.5] }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 bg-emerald-400 rounded-2xl pointer-events-none"
        />
      )}

      {/* Option Letter Badge */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition-all duration-200 ${letterBadgeClasses}`}
      >
        {letter}
      </div>

      {/* Option Text Content */}
      <div className="flex-1 pt-0.5 text-sm sm:text-base leading-relaxed break-words font-medium">
        {text}
      </div>

      {/* Dynamic Feedback Indicators */}
      <div className="shrink-0 flex items-center gap-1.5 self-center">
        <AnimatePresence mode="wait">
          {isSelectedCorrect && (
            <motion.div
              key="correct-tag"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Correto!</span>
            </motion.div>
          )}

          {isSelectedIncorrect && (
            <motion.div
              key="incorrect-tag"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Incorreto</span>
            </motion.div>
          )}

          {isRevealedCorrect && (
            <motion.div
              key="revealed-tag"
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gabarito</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

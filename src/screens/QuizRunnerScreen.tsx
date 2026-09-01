import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
  Quote,
  Layers,
  Clock,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Zap,
  Lock,
  X,
  Timer,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Minimize2,
  AlertOctagon,
  LogOut,
  Ban,
  Sun,
} from "lucide-react";
import { Quiz, OptionLetter, Question } from "../types";
import { OptionCard } from "../components/OptionCard";
import { shuffleQuizSessionQuestions } from "../utils/quizRandomizer";
import { screenWakeLock } from "../utils/screenWakeLock";
import {
  playCorrectSound,
  playIncorrectSound,
  playTimeoutAlertSound,
  playSecurityAlarmSound,
} from "../utils/audioEffects";
import {
  getPointsPerQuestion,
  getQuizPhaseInfo,
  getCurrentPhase,
  formatQuizPoints,
} from "../utils/scoring";

export function requestFullScreenMode(): Promise<void> {
  try {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      return elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      return elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      return elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      return elem.msRequestFullscreen();
    }
  } catch (e) {
    console.warn("Fullscreen request error:", e);
  }
  return Promise.resolve();
}

export function exitFullScreenMode(): Promise<void> {
  try {
    const doc = document as any;
    if (doc.exitFullscreen && doc.fullscreenElement) {
      return doc.exitFullscreen().catch(() => {});
    } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
      return doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen && doc.mozFullScreenElement) {
      return doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen && doc.msFullscreenElement) {
      return doc.msExitFullscreen();
    }
  } catch (e) {
    console.warn("Fullscreen exit error:", e);
  }
  return Promise.resolve();
}

export function isDocumentInFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

interface QuizRunnerScreenProps {
  quiz: Quiz;
  onFinishQuiz: (
    scorePercent: number,
    correctCount: number,
    answers: Record<number, OptionLetter>,
    timeSpentSeconds?: number,
    sessionQuiz?: Quiz
  ) => void;
  onNavigateBack: () => void;
}

export const QuizRunnerScreen: React.FC<QuizRunnerScreenProps> = ({
  quiz,
  onFinishQuiz,
  onNavigateBack,
}) => {
  // Randomize question order AND options (A, B, C, D) dynamically for this game session,
  // mapping the correct option letter so answers remain 100% accurate, without
  // mutating the permanent stored database/localStorage quiz.
  const [sessionQuestions] = useState<Question[]>(() => {
    return shuffleQuizSessionQuestions(quiz.questions || []);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, OptionLetter>>({});
  // Lightning Mode (Raio): When TRUE -> Instant feedback, sound effects, answer lock & auto-advance.
  // When FALSE -> Free Mode: No sound, no answer reveal, prev/next buttons visible, user can freely change answers.
  const [showInstantExplanation, setShowInstantExplanation] = useState(true);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [questionAutoAdvanceNotice, setQuestionAutoAdvanceNotice] = useState<string | null>(null);
  const [showPhaseTransitionModal, setShowPhaseTransitionModal] = useState(false);
  const [transitionPhaseTarget, setTransitionPhaseTarget] = useState<number>(2);
  const [selectedGridPhase, setSelectedGridPhase] = useState<number>(1);

  // Auto-advance timer ref
  const autoAdvanceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fullscreen & Anti-fraud Security States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSecurityActive, setIsSecurityActive] = useState(false);
  const [isAnnulled, setIsAnnulled] = useState(false);
  const [annulmentReason, setAnnulmentReason] = useState("");
  const [showExitFullscreenConfirmModal, setShowExitFullscreenConfirmModal] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

  // Screen Wake Lock: Keeps the mobile or PC screen active and prevents sleep/auto-lock during quiz
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  const questions = sessionQuestions;
  const pointsPerQuestion = getPointsPerQuestion(questions.length);
  const phaseInfo = getQuizPhaseInfo(questions.length);
  const currentPhase = getCurrentPhase(currentIndex, questions.length);

  // Timer configuration & normalization
  const isTimed = quiz.timerMode === "timed";
  const timerScope = quiz.timerScope || "general";
  const isIndividualTimer = isTimed && timerScope === "individual";

  // Compute duration in seconds (defaults: 30s per question for individual, 20m for general)
  const configuredDurationSeconds =
    quiz.timerSeconds && quiz.timerSeconds > 0
      ? quiz.timerSeconds
      : quiz.timerMinutes && quiz.timerMinutes > 0
      ? quiz.timerMinutes * 60
      : isIndividualTimer
      ? 30
      : 20 * 60;

  // General countdown timer state
  const [generalSecondsRemaining, setGeneralSecondsRemaining] = useState<number>(
    !isIndividualTimer && isTimed ? configuredDurationSeconds : 0
  );

  // Individual per-question countdown timer state
  const [questionSecondsRemaining, setQuestionSecondsRemaining] = useState<number>(
    isIndividualTimer ? configuredDurationSeconds : 0
  );

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timeExpired, setTimeExpired] = useState(false);

  const currentQuestion = questions[currentIndex];

  // 1. Enter Fullscreen on Mount and prepare Security Monitor
  useEffect(() => {
    let isMounted = true;

    const tryEnterFullscreen = async () => {
      try {
        await requestFullScreenMode();
        if (isMounted) {
          const inFS = isDocumentInFullscreen();
          setIsFullscreen(inFS);
          if (inFS) {
            setIsSecurityActive(true);
          } else {
            // Browser required gesture, prompt with one click
            setShowFullscreenPrompt(true);
          }
        }
      } catch {
        if (isMounted) setShowFullscreenPrompt(true);
      }
    };

    tryEnterFullscreen();

    return () => {
      isMounted = false;
      exitFullScreenMode();
    };
  }, []);

  // 2. Universal Screen Wake Lock: Keeps the mobile or PC screen awake and prevents screen lock/sleep
  useEffect(() => {
    if (isAnnulled) {
      screenWakeLock.disable();
      return;
    }

    // Subscribe to wake lock status updates
    const unsubscribe = screenWakeLock.subscribe((active) => {
      setIsWakeLockActive(active);
    });

    // Request wake lock (Native + NoSleep fallback)
    screenWakeLock.enable();

    return () => {
      unsubscribe();
      screenWakeLock.disable();
    };
  }, [isAnnulled]);

  // 2. Anti-fraud Security Monitor: Fullscreen exit, Tab visibility, Window blur & Anti-cheating
  useEffect(() => {
    if (isAnnulled) return;

    const handleFullscreenChange = () => {
      const inFS = isDocumentInFullscreen();
      setIsFullscreen(inFS);

      // If anti-fraud security is active and user leaves fullscreen during the active quiz -> ANNUL!
      if (isSecurityActive && !inFS && !isAnnulled) {
        handleAnnulQuiz("Saída do modo de tela cheia detectada durante a avaliação.");
      }
    };

    const handleVisibilityChange = () => {
      // If user switches tab or minimizes window during active quiz -> ANNUL!
      if (document.visibilityState === "hidden" && isSecurityActive && !isAnnulled) {
        handleAnnulQuiz("Alternância de aba ou minimização de janela detectada durante a avaliação.");
      }
    };

    const handleWindowBlur = () => {
      // If user switches application or clicks outside the window -> ANNUL!
      if (isSecurityActive && !isAnnulled) {
        handleAnnulQuiz("Perda de foco da janela ou troca de aplicativo detectada durante a avaliação.");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block devtools, inspect and view-source shortcuts during exam
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSecurityActive, isAnnulled]);

  const handleAnnulQuiz = (reason: string) => {
    setIsAnnulled(true);
    setAnnulmentReason(reason);
    setIsSecurityActive(false);
    playSecurityAlarmSound();
    exitFullScreenMode();
  };

  const handleManualEnterFullscreen = async () => {
    await requestFullScreenMode();
    setIsFullscreen(true);
    setIsSecurityActive(true);
    setShowFullscreenPrompt(false);
  };

  const handleConfirmExitFullscreen = () => {
    setShowExitFullscreenConfirmModal(false);
    handleAnnulQuiz("Saída voluntária da tela cheia confirmada pelo candidato.");
  };

  // Scroll to top and reset question timer on question index change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowUnansweredWarning(false);
    if (isIndividualTimer) {
      setQuestionSecondsRemaining(configuredDurationSeconds);
    }
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [currentIndex, isIndividualTimer, configuredDurationSeconds]);

  // Main countdown timer ticker
  useEffect(() => {
    if (timeExpired || isAnnulled) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (isIndividualTimer) {
        setQuestionSecondsRemaining((prev) => {
          if (prev <= 1) {
            playTimeoutAlertSound();
            // If there's another question, automatically advance
            if (currentIndex < questions.length - 1) {
              setQuestionAutoAdvanceNotice(
                `Tempo esgotado na Questão ${currentIndex + 1}! Avançando automaticamente...`
              );
              setTimeout(() => setQuestionAutoAdvanceNotice(null), 2500);
              setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1));
              return configuredDurationSeconds;
            } else {
              // Reached end of quiz via individual timer
              clearInterval(timer);
              setTimeExpired(true);
              return 0;
            }
          }
          return prev - 1;
        });
      } else if (isTimed) {
        setGeneralSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isTimed,
    isIndividualTimer,
    timeExpired,
    isAnnulled,
    currentIndex,
    questions.length,
    configuredDurationSeconds,
  ]);

  // Auto-finish on general or last-question timer expiration
  useEffect(() => {
    if (timeExpired && !isAnnulled) {
      handleFinish();
    }
  }, [timeExpired, isAnnulled]);

  const handleFinishWithAnswers = (finalAnswers: Record<number, OptionLetter>) => {
    setIsSecurityActive(false);
    exitFullScreenMode();
    screenWakeLock.disable();

    let correct = 0;
    questions.forEach((q, idx) => {
      const chosen = finalAnswers[idx];
      if (chosen && chosen.toUpperCase() === q.correctOption.toUpperCase()) {
        correct++;
      }
    });

    const answeredIndices = Object.keys(finalAnswers).map(Number);
    const totalAnsweredQuestions = answeredIndices.length;
    // If the quiz was paused / concluded at Phase 2 (e.g. 200 questions answered out of 300 or 400),
    // calculate score percentage based on the active answered set of questions.
    const effectiveTotal =
      totalAnsweredQuestions > 0 && totalAnsweredQuestions < questions.length
        ? totalAnsweredQuestions
        : questions.length;

    const percent = effectiveTotal > 0 ? Math.round((correct / effectiveTotal) * 100) : 0;
    const timeSpent = isTimed
      ? !isIndividualTimer
        ? Math.max(1, configuredDurationSeconds - generalSecondsRemaining)
        : Math.max(1, elapsedSeconds)
      : Math.max(1, elapsedSeconds);

    const sessionQuiz: Quiz = {
      ...quiz,
      questions,
    };

    onFinishQuiz(percent, correct, finalAnswers, timeSpent, sessionQuiz);
  };

  // Annulled Screen View: Preserve partial score up to interruption
  if (isAnnulled) {
    let partialCorrect = 0;
    let partialAnswered = 0;
    questions.forEach((q, idx) => {
      const chosen = userAnswers[idx];
      if (chosen) {
        partialAnswered++;
        if (chosen.toUpperCase() === q.correctOption.toUpperCase()) {
          partialCorrect++;
        }
      }
    });

    const partialScorePercent =
      questions.length > 0
        ? Math.round((partialCorrect / questions.length) * 100)
        : 0;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white select-none">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-rose-600/70 shadow-2xl shadow-rose-950/80 space-y-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 animate-pulse shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black uppercase tracking-wider">
              Segurança Anti-Fraude
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">
              AVALIAÇÃO INTERROMPIDA
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              A avaliação foi encerrada por detecção de infração de segurança (saída de tela cheia ou perda de foco). Sua nota foi calculada até as questões respondidas.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-left space-y-1.5 text-xs shadow-inner">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Infração Detectada:</span>
            </div>
            <p className="text-slate-200 pl-6 leading-relaxed font-medium">
              {annulmentReason || "Saída do modo de tela cheia ou alternância de abas/janelas."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Nota Atribuída</span>
              <p className="text-xl font-black text-amber-400 mt-0.5">{partialScorePercent}%</p>
              <span className="text-[10px] text-slate-400">
                {partialCorrect} {partialCorrect === 1 ? "acerto" : "acertos"} ({partialAnswered}/{questions.length} respondidas)
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
              <p className="text-sm font-black text-amber-400 mt-1">Desclassificado</p>
              <span className="text-[10px] text-slate-400">Acertos parciais preservados</span>
            </div>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              id="quiz-annulled-review-btn"
              onClick={() => handleFinishWithAnswers(userAnswers)}
              className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ver Gabarito e Relatório Parcial ({partialScorePercent}%)</span>
            </button>
            <button
              type="button"
              id="quiz-annulled-exit-btn"
              onClick={onNavigateBack}
              className="w-full py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Voltar para a Página Inicial</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Nenhuma questão encontrada neste questionário.</p>
        <button
          onClick={onNavigateBack}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs cursor-pointer"
        >
          Voltar
        </button>
      </div>
    );
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const selectedAnswer = userAnswers[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const answeredCount = Object.keys(userAnswers).length;

  const isCurrentSelectionCorrect =
    selectedAnswer &&
    selectedAnswer.toUpperCase() === currentQuestion.correctOption.toUpperCase();

  const handleSelectOption = (letter: OptionLetter) => {
    // In Lightning Mode (showInstantExplanation === true), if already selected, selection is LOCKED!
    if (showInstantExplanation && userAnswers[currentIndex] !== undefined) {
      return;
    }

    setShowUnansweredWarning(false);
    const isCorrect = letter.toUpperCase() === currentQuestion.correctOption.toUpperCase();

    const nextAnswers: Record<number, OptionLetter> = {
      ...userAnswers,
      [currentIndex]: letter,
    };
    setUserAnswers(nextAnswers);

    // Sound, Confetti & Auto-Advance ONLY when Lightning Mode is active
    if (showInstantExplanation) {
      if (isCorrect) {
        playCorrectSound();
        try {
          confetti({
            particleCount: 24,
            spread: 60,
            origin: { y: 0.65 },
            colors: ["#10b981", "#34d399", "#fbbf24", "#6366f1"],
          });
        } catch {}
      } else {
        playIncorrectSound();
      }

      // Auto-advance automatically to next question or transition/finish
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (phaseInfo.hasPhases && currentIndex === 99 && questions.length > 100 && !nextAnswers[100]) {
          setTransitionPhaseTarget(2);
          setShowPhaseTransitionModal(true);
        } else if (phaseInfo.hasPhases && currentIndex === 199 && questions.length > 200 && !nextAnswers[200]) {
          setTransitionPhaseTarget(3);
          setShowPhaseTransitionModal(true);
        } else if (phaseInfo.hasPhases && currentIndex === 299 && questions.length > 300 && !nextAnswers[300]) {
          setTransitionPhaseTarget(4);
          setShowPhaseTransitionModal(true);
        } else if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else if (currentIndex === questions.length - 1) {
          handleFinishWithAnswers(nextAnswers);
        }
      }, 1350);
    }
  };

  const handleNext = () => {
    // Block advancing if current question has not been answered
    if (!userAnswers[currentIndex]) {
      setShowUnansweredWarning(true);
      return;
    }

    setShowUnansweredWarning(false);

    // If completing the last question of Phase 1 (index 99), show celebration & transition modal to Phase 2
    if (phaseInfo.hasPhases && currentIndex === 99 && questions.length > 100 && !userAnswers[100]) {
      setTransitionPhaseTarget(2);
      setShowPhaseTransitionModal(true);
      return;
    }

    // If completing the last question of Phase 2 (index 199) in a 300/400 question quiz
    if (phaseInfo.hasPhases && currentIndex === 199 && questions.length > 200 && !userAnswers[200]) {
      setTransitionPhaseTarget(3);
      setShowPhaseTransitionModal(true);
      return;
    }

    // If completing the last question of Phase 3 (index 299) in a 400 question quiz
    if (phaseInfo.hasPhases && currentIndex === 299 && questions.length > 300 && !userAnswers[300]) {
      setTransitionPhaseTarget(4);
      setShowPhaseTransitionModal(true);
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleStartNextPhase = (targetPhase: number) => {
    setShowPhaseTransitionModal(false);
    const targetIdx = (targetPhase - 1) * 100;
    setCurrentIndex(targetIdx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setShowUnansweredWarning(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleJumpToQuestion = (targetIdx: number) => {
    // If attempting to jump forward past unanswered questions, guide user
    if (targetIdx > currentIndex) {
      for (let i = 0; i <= currentIndex; i++) {
        if (!userAnswers[i]) {
          setShowUnansweredWarning(true);
          setShowQuestionGrid(false);
          setCurrentIndex(i);
          return;
        }
      }
    }

    setShowUnansweredWarning(false);
    setCurrentIndex(targetIdx);
    setShowQuestionGrid(false);
  };

  const handleFinish = () => {
    // Block finishing if the current question has not been answered (unless timer expired)
    if (!userAnswers[currentIndex] && !timeExpired) {
      setShowUnansweredWarning(true);
      return;
    }

    handleFinishWithAnswers(userAnswers);
  };

  const options: { letter: OptionLetter; text: string }[] = [
    { letter: "A", text: currentQuestion.optionA },
    { letter: "B", text: currentQuestion.optionB },
    { letter: "C", text: currentQuestion.optionC },
    { letter: "D", text: currentQuestion.optionD },
  ];

  return (
    <div id="quiz-runner-screen" className="max-w-3xl mx-auto px-4 py-4 pb-28 space-y-5 select-none">
      {/* Top Security & Fullscreen Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Anti-fraud Active Badge */}
          <span className="px-2.5 py-1 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold flex items-center gap-1.5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Modo Seguro Ativo</span>
          </span>

          {phaseInfo.hasPhases ? (
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 font-bold flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Fase {currentPhase} de {phaseInfo.totalPhases}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium">
              Fase Única
            </span>
          )}

          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>+{formatQuizPoints(pointsPerQuestion)} pts/acerto</span>
          </span>

          <button
            type="button"
            id="quiz-wakelock-toggle-btn"
            onClick={() => {
              screenWakeLock.toggle();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              isWakeLockActive
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-xs hover:bg-amber-500/25"
                : "bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-amber-300 hover:border-amber-500/40"
            }`}
            title={
              isWakeLockActive
                ? "Tela Sempre Ligada: Ativa (Seu celular ou PC não irá bloquear nem apagar durante a prova. Clique para desativar)"
                : "Clique para Ativar Tela Sempre Ligada (Evita que o celular ou PC apague ou bloqueie)"
            }
          >
            <Sun
              className={`w-3.5 h-3.5 ${
                isWakeLockActive
                  ? "text-amber-400 fill-amber-400/40 animate-pulse"
                  : "text-slate-400"
              }`}
            />
            <span>{isWakeLockActive ? "Tela Ligada" : "Ativar Tela Ligada"}</span>
          </button>
        </div>

        {/* Dedicated Sair da Tela Cheia Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="quiz-exit-fullscreen-btn"
            onClick={() => setShowExitFullscreenConfirmModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 border border-rose-500/40 hover:bg-rose-900/90 text-rose-200 hover:text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
            title="Sair da tela cheia (Atenção: anula a avaliação)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Sair da Tela Cheia</span>
            <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded-md bg-rose-900/90 text-rose-200 font-mono">
              ⚠️ Anula
            </span>
          </button>
        </div>
      </div>

      {/* Progress, Timer & Quick Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="quiz-exit-btn"
              onClick={() => setShowExitConfirmModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
              title="Sair do questionário sem registrar estatísticas"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Desistir</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (phaseInfo.hasPhases) {
                  setSelectedGridPhase(currentPhase as 1 | 2);
                }
                setShowQuestionGrid(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Respondidas: <strong className="text-white">{answeredCount}</strong> de {questions.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Timer Display */}
            {isTimed ? (
              isIndividualTimer ? (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-bold transition-colors ${
                    questionSecondsRemaining <= 5
                      ? "bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse"
                      : questionSecondsRemaining <= 10
                      ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                      : "bg-indigo-950/60 border-indigo-500/30 text-indigo-300"
                  }`}
                  title="Tempo individual para esta pergunta"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{formatTimer(questionSecondsRemaining)}</span>
                  <span className="text-[10px] text-amber-300/80 font-sans font-normal">/questão</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-bold ${
                    generalSecondsRemaining < 60
                      ? "bg-rose-950/70 border-rose-500/50 text-rose-300 animate-pulse"
                      : generalSecondsRemaining < 300
                      ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                      : "bg-indigo-950/60 border-indigo-500/30 text-indigo-300"
                  }`}
                  title="Tempo total restante para todo o questionário"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(generalSecondsRemaining)}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">total</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Tempo Livre</span>
              </div>
            )}

            {/* Lightning Mode (Raio) Switch Button */}
            <button
              type="button"
              id="toggle-instant-feedback-btn"
              onClick={() => setShowInstantExplanation(!showInstantExplanation)}
              className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                showInstantExplanation
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-950/50"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title={
                showInstantExplanation
                  ? "Modo Raio ATIVO: Feedback imediato com som e trava de resposta. Clique para alternar para Modo Livre."
                  : "Modo Livre ATIVO: Sem som ou gabarito imediato. Você pode alterar suas respostas livremente. Clique para ativar Modo Raio."
              }
            >
              <Zap
                className={`w-4 h-4 transition-transform duration-200 ${
                  showInstantExplanation
                    ? "text-emerald-400 fill-emerald-400 scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : "text-slate-500"
                }`}
              />
              <span className="hidden sm:inline">
                {showInstantExplanation ? "Modo Raio" : "Modo Livre"}
              </span>
            </button>
          </div>
        </div>

        {/* Top Progress bar */}
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-indigo-500 to-amber-400 h-2 rounded-full transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Auto-Advance Notification Toast for Individual Timer */}
      <AnimatePresence>
        {questionAutoAdvanceNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg"
          >
            <Timer className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{questionAutoAdvanceNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Phase Transition & Continuation Modal */}
      {showPhaseTransitionModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>

            {/* Content when completing Phase 1 -> starting Phase 2 */}
            {transitionPhaseTarget === 2 && (
              <>
                <div className="space-y-1.5">
                  <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold uppercase">
                    Parabéns! Fase 1 Concluída
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Você finalizou as primeiras 100 questões!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Agora iniciaremos a <strong>Fase 2</strong> com as questões de <strong>101 a {Math.min(200, questions.length)}</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>Questões restantes no simulado:</span>
                    <span className="text-indigo-400 font-black">{questions.length - 100} questões</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Pontuação por acerto:</span>
                    <span className="text-amber-400 font-bold">+{formatQuizPoints(pointsPerQuestion)} pts cada</span>
                  </div>
                </div>

                <button
                  type="button"
                  id="start-phase-2-btn"
                  onClick={() => handleStartNextPhase(2)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>Avançar e Iniciar Fase 2</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Content when completing Phase 2 on 300 or 400 questions quiz */}
            {transitionPhaseTarget === 3 && (
              <>
                <div className="space-y-1.5">
                  <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase">
                    Fases 1 e 2 Concluídas • 200 Questões
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Você concluiu as Fases 1 e 2 com sucesso!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Como este simulado possui <strong>{questions.length} questões</strong>, você pode escolher se deseja finalizar o quiz agora com o seu resultado de 200 questões ou dar sequência para as perguntas restantes (<strong>Fase 3{questions.length >= 400 ? " e 4" : ""}</strong>).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-300 text-left space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>Questões respondidas até aqui:</span>
                    <span className="text-emerald-400 font-black">200 de {questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Regra de Pontuação Contínua:</span>
                    <span className="text-amber-400 font-bold">+{formatQuizPoints(pointsPerQuestion)} pts/acerto</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    id="finish-after-phase-2-btn"
                    onClick={() => {
                      setShowPhaseTransitionModal(false);
                      handleFinishWithAnswers(userAnswers);
                    }}
                    className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Finalizar Simulado (200 Qs)</span>
                  </button>

                  <button
                    type="button"
                    id="continue-to-phase-3-btn"
                    onClick={() => handleStartNextPhase(3)}
                    className="py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <span>Dar Sequência (Iniciar Fase 3)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* Content when completing Phase 3 on 400 questions quiz */}
            {transitionPhaseTarget === 4 && (
              <>
                <div className="space-y-1.5">
                  <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase">
                    Fases 1, 2 e 3 Concluídas • 300 Questões
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Você concluiu 300 questões!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Deseja finalizar o quiz agora com a sua nota de 300 questões ou dar sequência para a <strong>Fase 4 final (Questões 301 a 400)</strong>?
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-300 text-left space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>Questões respondidas até aqui:</span>
                    <span className="text-emerald-400 font-black">300 de {questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Regra de Pontuação Contínua:</span>
                    <span className="text-amber-400 font-bold">+{formatQuizPoints(pointsPerQuestion)} pts/acerto</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    id="finish-after-phase-3-btn"
                    onClick={() => {
                      setShowPhaseTransitionModal(false);
                      handleFinishWithAnswers(userAnswers);
                    }}
                    className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Finalizar Simulado (300 Qs)</span>
                  </button>

                  <button
                    type="button"
                    id="continue-to-phase-4-btn"
                    onClick={() => handleStartNextPhase(4)}
                    className="py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <span>Dar Sequência (Iniciar Fase 4)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Question Selector Modal with Phase Tabs */}
      {showQuestionGrid && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Navegar pelas Questões ({questions.length})
              </h3>
              <button
                onClick={() => setShowQuestionGrid(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Dynamic Phase Selector Tabs */}
            {phaseInfo.hasPhases && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                {phaseInfo.phases.map((p) => (
                  <button
                    key={p.phaseNumber}
                    type="button"
                    onClick={() => setSelectedGridPhase(p.phaseNumber)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-xs ${
                      selectedGridPhase === p.phaseNumber
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Fase {p.phaseNumber} ({p.startQuestion} a {p.endQuestion})
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ idx }) => {
                  if (!phaseInfo.hasPhases) return true;
                  const currentPhaseObj = phaseInfo.phases.find(
                    (p) => p.phaseNumber === selectedGridPhase
                  );
                  if (!currentPhaseObj) return true;
                  return idx >= currentPhaseObj.startIndex && idx <= currentPhaseObj.endIndex;
                })
                .map(({ idx }) => {
                  const isAnswered = userAnswers[idx] !== undefined;
                  const isCurrent = idx === currentIndex;
                  const isLocked = idx > currentIndex && !userAnswers[currentIndex];

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative flex items-center justify-center ${
                        isCurrent
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md"
                          : isAnswered
                          ? "bg-emerald-950/70 border border-emerald-500/50 text-emerald-300"
                          : isLocked
                          ? "bg-slate-950/40 border border-slate-900 text-slate-600 opacity-60"
                          : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                      title={isLocked ? "Responda a questão atual primeiro" : `Questão ${idx + 1}`}
                    >
                      <span>{idx + 1}</span>
                      {isLocked && (
                        <Lock className="w-2.5 h-2.5 absolute top-1 right-1 text-slate-600" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Exit Quiz Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Deseja desistir do questionário?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você respondeu <strong className="text-white">{answeredCount}</strong> de <strong className="text-white">{questions.length}</strong> questões.
              </p>
              
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-[11px] text-slate-300 text-left space-y-1.5 shadow-inner">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Aviso de Desistência</span>
                </div>
                <p className="leading-relaxed">
                  Como este questionário <strong>não foi concluído</strong>, nenhum acerto ou pontuação será computado no seu histórico de estatísticas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Continuar Prova
              </button>
              <button
                type="button"
                id="confirm-exit-quiz-btn"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  exitFullScreenMode();
                  onNavigateBack();
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold transition-all cursor-pointer shadow-lg shadow-rose-900/30"
              >
                Desistir e Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sair da Tela Cheia Confirmation Modal */}
      {showExitFullscreenConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Sair da Tela Cheia e Anular Prova?
                </h4>
                <p className="text-xs text-rose-300 font-medium">
                  Protocolo Anti-Fraude Ativo
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Atenção: Ação Irreversível</span>
              </p>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Ao sair da tela cheia, a sua avaliação será <strong>imediatamente ANULADA e desclassificada</strong>, registrando nota zero (0%) no histórico.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitFullscreenConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md"
              >
                Permanecer na Prova (Tela Cheia)
              </button>
              <button
                type="button"
                onClick={handleConfirmExitFullscreen}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-rose-500/30"
              >
                Confirmar Saída e Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Initial Activation Modal / Overlay (if gesture was required by browser) */}
      {showFullscreenPrompt && !isFullscreen && !isAnnulled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-lg">
              <Maximize2 className="w-8 h-8 text-indigo-400" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold uppercase">
                Ambiente Seguro de Prova
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Iniciar Avaliação em Modo Tela Cheia
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Para garantir a integridade da prova e maximizar a visualização das questões e alternativas, o questionário será executado em <strong>Tela Cheia</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-1 text-slate-300">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Regras de Segurança:</span>
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5 pl-1">
                <li>Sair do modo tela cheia anula imediatamente o questionário</li>
                <li>Trocar de aba ou minimizar a janela cancela a prova</li>
                <li>As abas e cabeçalhos serão minimizados durante a resolução</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleManualEnterFullscreen}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/60 transition-all cursor-pointer ring-1 ring-indigo-400/50"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Entrar em Tela Cheia e Iniciar Prova</span>
            </button>
          </div>
        </div>
      )}

      {/* Question Statement Box */}
      <motion.div
        key={`question-${currentIndex}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-lg relative"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold text-xs">
              QUESTÃO {currentIndex + 1}
            </span>
            <span className="text-xs text-slate-400 font-medium">de {questions.length}</span>
          </div>

          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              currentQuestion.difficulty === "Fácil"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : currentQuestion.difficulty === "Difícil"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            {currentQuestion.difficulty || "Médio"}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
          {currentQuestion.questionText}
        </h3>
      </motion.div>

      {/* Unanswered Mandatory Warning Banner */}
      <AnimatePresence>
        {showUnansweredWarning && !selectedAnswer && (
          <motion.div
            key="unanswered-warning-banner"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/85 via-amber-900/40 to-slate-900 border-2 border-amber-500 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-xl"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertCircle className="w-5 h-5 animate-pulse text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <p className="font-extrabold text-white text-xs sm:text-sm">
                  Resposta Obrigatória
                </p>
                <p className="text-amber-200/90 text-[11px] sm:text-xs">
                  Selecione uma das alternativas (A, B, C ou D) antes de avançar para a próxima pergunta.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUnansweredWarning(false)}
              className="p-1.5 text-amber-400 hover:text-white rounded-lg hover:bg-amber-900/50 transition-colors cursor-pointer shrink-0"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Choices (A, B, C, D) with Animated Feedback */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {showInstantExplanation
              ? "Selecione a alternativa correta:"
              : "Selecione a alternativa (você pode alterar sua resposta livremente):"}
          </p>
          {showInstantExplanation ? (
            showInstantFeedbackIndicator(selectedAnswer, isCurrentSelectionCorrect)
          ) : selectedAnswer ? (
            <span className="text-[11px] text-indigo-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              Alternativa {selectedAnswer} marcada
            </span>
          ) : null}
        </div>

        <div className="grid gap-2.5">
          {options.map((opt) => {
            const isSelected = selectedAnswer === opt.letter;
            const isCorrect = opt.letter.toUpperCase() === currentQuestion.correctOption.toUpperCase();
            // In Raio mode: Once an answer has been chosen for this question, LOCK all options
            // In Free mode: Never disabled, user can change answer at any time
            const isOptionLocked = showInstantExplanation && selectedAnswer !== undefined;

            return (
              <OptionCard
                key={`${currentIndex}-${opt.letter}`}
                letter={opt.letter}
                text={opt.text}
                isSelected={isSelected}
                isCorrect={isCorrect}
                showResult={showInstantExplanation && selectedAnswer !== undefined}
                disabled={isOptionLocked}
                onClick={() => handleSelectOption(opt.letter)}
              />
            );
          })}
        </div>
      </div>

      {/* Dynamic Explanation & Rationale Box - ONLY shown when Lightning Mode (Raio) is active */}
      <AnimatePresence mode="wait">
        {showInstantExplanation && selectedAnswer && (
          <motion.div
            key={`explanation-${currentIndex}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`p-4 sm:p-5 rounded-3xl border text-xs space-y-2.5 shadow-xl ${
              isCurrentSelectionCorrect
                ? "bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/40"
                : "bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-800/80">
              <div className="flex items-center gap-2 font-bold">
                {isCurrentSelectionCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                      <span>Excelente! Você acertou (+{formatQuizPoints(pointsPerQuestion)} pontos no Placar)</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-rose-300 font-extrabold">
                      Resposta Incorreta • O gabarito é a Opção {currentQuestion.correctOption}
                    </span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold hidden sm:inline">
                Fundamentação Oficial
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed font-medium">
              {currentQuestion.explanation}
            </p>

            {currentQuestion.sourceExcerpt && (
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <Quote className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="italic leading-relaxed">{currentQuestion.sourceExcerpt}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sticky Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-3 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {showInstantExplanation ? (
            /* Lightning Mode (Raio Ativo): Dispensar botões de Anterior e Próxima, avanço é 100% automático */
            <div className="w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold text-xs flex items-center gap-2 shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>Modo Raio: Avanço Automático ao Responder</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                {selectedAnswer ? (
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Opção {selectedAnswer} registrada</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-400/90 animate-pulse flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Selecione uma opção</span>
                  </span>
                )}

                {currentIndex === questions.length - 1 && selectedAnswer && (
                  <button
                    id="quiz-finish-btn"
                    type="button"
                    onClick={handleFinish}
                    className="px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/40 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Finalizar Quiz</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Free Mode (Raio Desativado): Exibir botões Anterior e Próxima / Finalizar normalmente */
            <>
              <button
                id="quiz-prev-btn"
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              {/* Center Selection Status */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold">
                {selectedAnswer ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Alternativa {selectedAnswer} selecionada
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Selecione uma opção para avançar
                  </span>
                )}
              </div>

              {currentIndex === questions.length - 1 ? (
                <button
                  id="quiz-finish-btn"
                  type="button"
                  onClick={handleFinish}
                  className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    selectedAnswer
                      ? "bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/30 ring-1 ring-emerald-400/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-amber-500/60 hover:text-amber-300"
                  }`}
                  title={!selectedAnswer ? "Selecione uma resposta antes de finalizar" : "Finalizar e ver resultado"}
                >
                  {selectedAnswer ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                  )}
                  <span>Finalizar e Ver Resultado</span>
                </button>
              ) : (
                <button
                  id="quiz-next-btn"
                  type="button"
                  onClick={handleNext}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                    selectedAnswer
                      ? "bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-indigo-600/20 ring-1 ring-indigo-400/40"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-amber-500/60 hover:text-amber-300"
                  }`}
                  title={!selectedAnswer ? "Selecione uma resposta antes de prosseguir" : "Avançar para a próxima questão"}
                >
                  <span>Próxima</span>
                  {selectedAnswer ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper for top status badge in instant mode
function showInstantFeedbackIndicator(
  selectedAnswer?: OptionLetter,
  isCorrect?: boolean
) {
  if (!selectedAnswer) return null;
  if (isCorrect) {
    return (
      <span className="text-[11px] text-emerald-400 font-extrabold flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5" /> Acerto registrado
      </span>
    );
  }
  return (
    <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
      <Info className="w-3.5 h-3.5" /> Veja a fundamentação abaixo
    </span>
  );
}


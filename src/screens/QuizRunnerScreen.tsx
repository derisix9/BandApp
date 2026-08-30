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
} from "lucide-react";
import { Quiz, OptionLetter } from "../types";
import { OptionCard } from "../components/OptionCard";
import {
  playCorrectSound,
  playIncorrectSound,
  playTimeoutAlertSound,
} from "../utils/audioEffects";

interface QuizRunnerScreenProps {
  quiz: Quiz;
  onFinishQuiz: (
    scorePercent: number,
    correctCount: number,
    answers: Record<number, OptionLetter>,
    timeSpentSeconds?: number
  ) => void;
  onNavigateBack: () => void;
}

export const QuizRunnerScreen: React.FC<QuizRunnerScreenProps> = ({
  quiz,
  onFinishQuiz,
  onNavigateBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, OptionLetter>>({});
  // Lightning Mode (Raio): When TRUE -> Instant feedback, sound effects, and answer lock.
  // When FALSE -> Free Mode: No sound, no answer reveal, user can freely change answers.
  const [showInstantExplanation, setShowInstantExplanation] = useState(true);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [questionAutoAdvanceNotice, setQuestionAutoAdvanceNotice] = useState<string | null>(null);

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

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentIndex];

  // Scroll to top and reset question timer on question index change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowUnansweredWarning(false);
    if (isIndividualTimer) {
      setQuestionSecondsRemaining(configuredDurationSeconds);
    }
  }, [currentIndex, isIndividualTimer, configuredDurationSeconds]);

  // Main countdown timer ticker
  useEffect(() => {
    if (timeExpired) return;

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
    currentIndex,
    questions.length,
    configuredDurationSeconds,
  ]);

  // Auto-finish on general or last-question timer expiration
  useEffect(() => {
    if (timeExpired) {
      handleFinish();
    }
  }, [timeExpired]);

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

    // Sound & Confetti feedback ONLY when Lightning Mode is active
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
    }

    // In Free Mode or on first pick in Lightning Mode, update selected answer
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: letter,
    }));
  };

  const handleNext = () => {
    // Block advancing if current question has not been answered
    if (!userAnswers[currentIndex]) {
      setShowUnansweredWarning(true);
      return;
    }

    setShowUnansweredWarning(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
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

    let correct = 0;
    questions.forEach((q, idx) => {
      const chosen = userAnswers[idx];
      if (chosen && chosen.toUpperCase() === q.correctOption.toUpperCase()) {
        correct++;
      }
    });

    const percent = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const timeSpent = isTimed
      ? !isIndividualTimer
        ? Math.max(1, configuredDurationSeconds - generalSecondsRemaining)
        : Math.max(1, elapsedSeconds)
      : Math.max(1, elapsedSeconds);

    onFinishQuiz(percent, correct, userAnswers, timeSpent);
  };

  const options: { letter: OptionLetter; text: string }[] = [
    { letter: "A", text: currentQuestion.optionA },
    { letter: "B", text: currentQuestion.optionB },
    { letter: "C", text: currentQuestion.optionC },
    { letter: "D", text: currentQuestion.optionD },
  ];

  return (
    <div id="quiz-runner-screen" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Progress, Timer & Quick Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowQuestionGrid(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Respondidas: <strong className="text-white">{answeredCount}</strong> de {questions.length}
            </span>
          </button>

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

            {/* Lightning Mode (Raio) Switch Button - Matching Screenshot */}
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
      {questionAutoAdvanceNotice && (
        <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500 text-amber-200 text-xs flex items-center gap-2.5 animate-in fade-in zoom-in duration-200">
          <Timer className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
          <span className="font-bold">{questionAutoAdvanceNotice}</span>
        </div>
      )}

      {/* Time Expired Notice */}
      {timeExpired && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-bold">Tempo Esgotado!</p>
            <p className="text-rose-300/90">O tempo estabelecido pelo administrador expirou. Calculando pontuação...</p>
          </div>
        </div>
      )}

      {/* Quick Question Selector Modal */}
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

            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {questions.map((_, idx) => {
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
                      <span>Excelente! Você acertou (+50 pontos no Placar)</span>
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


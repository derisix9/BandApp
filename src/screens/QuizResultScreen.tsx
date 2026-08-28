import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  RotateCcw,
  Home,
  FileDown,
  Copy,
  Trophy,
  Loader2,
  CheckCircle2,
  XCircle,
  Quote,
  Check,
  X,
  BookOpen,
  Filter,
  Columns,
  List,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  FileCheck,
} from "lucide-react";
import { Quiz, OptionLetter, UserAccount } from "../types";
import { exportQuizResultToPdf } from "../utils/pdfExport";

interface QuizResultScreenProps {
  quiz: Quiz;
  scorePercent: number;
  correctCount: number;
  userAnswers: Record<number, OptionLetter>;
  currentUser?: UserAccount | null;
  onPlayAgain: () => void;
  onNavigateHome: () => void;
  onNavigateLeaderboard?: () => void;
}

type QuestionFilter = "all" | "errors" | "correct";
type ViewMode = "side-by-side" | "compact";

export const QuizResultScreen: React.FC<QuizResultScreenProps> = ({
  quiz,
  scorePercent,
  correctCount,
  userAnswers,
  currentUser,
  onPlayAgain,
  onNavigateHome,
  onNavigateLeaderboard,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  
  // Default filter to errors if the user had mistakes, so they can immediately review them
  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const errorCount = totalQuestions - correctCount;
  
  const [filter, setFilter] = useState<QuestionFilter>(errorCount > 0 ? "errors" : "all");
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");

  useEffect(() => {
    if (scorePercent >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, [scorePercent]);

  let ratingText = "Atenção! Pratique Novamente";
  let ratingColor = "text-rose-400 border-rose-500/40 bg-rose-500/10";
  if (scorePercent >= 90) {
    ratingText = "Excelente! Domínio Completo";
    ratingColor = "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  } else if (scorePercent >= 70) {
    ratingText = "Muito Bom! Bom Desempenho";
    ratingColor = "text-indigo-400 border-indigo-500/40 bg-indigo-500/10";
  } else if (scorePercent >= 50) {
    ratingText = "Razoável! Vale a Pena Revisar";
    ratingColor = "text-amber-400 border-amber-500/40 bg-amber-500/10";
  }

  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      exportQuizResultToPdf({
        quiz,
        scorePercent,
        correctCount,
        userAnswers,
        userEmail: currentUser?.email || "Estudante BandApp",
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportText = () => {
    let text = `=== ${quiz.title.toUpperCase()} ===\n`;
    text += `Categoria: ${quiz.category}\n`;
    text += `Total de Questões: ${totalQuestions}\n`;
    text += `Sistema Americano (4 opções: A, B, C, D | 1 correta)\n`;
    text += `Aproveitamento: ${scorePercent}% (${correctCount}/${totalQuestions} acertos)\n\n`;
    text += `--------------------------------------------------\n\n`;

    questions.forEach((q, idx) => {
      text += `QUESTÃO ${idx + 1} (${q.difficulty || "Médio"})\n`;
      text += `${q.questionText}\n\n`;
      text += `A) ${q.optionA}\n`;
      text += `B) ${q.optionB}\n`;
      text += `C) ${q.optionC}\n`;
      text += `D) ${q.optionD}\n\n`;
      text += `>> Resposta Correta: [ ${q.correctOption} ]\n`;
      text += `Sua Resposta: [ ${userAnswers[idx] || "Não respondida"} ]\n`;
      text += `Explicação: ${q.explanation}\n`;
      if (q.sourceExcerpt) {
        text += `Referência: "${q.sourceExcerpt}"\n`;
      }
      text += `\n--------------------------------------------------\n\n`;
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }

    // Direct text download
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz.title.replace(/\s+/g, "_")}_gabarito.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter questions according to user selection
  const filteredQuestions = questions
    .map((q, originalIndex) => ({
      question: q,
      originalIndex,
      userChoice: userAnswers[originalIndex],
      isCorrect:
        userAnswers[originalIndex] &&
        userAnswers[originalIndex].toUpperCase() === q.correctOption.toUpperCase(),
    }))
    .filter((item) => {
      if (filter === "errors") return !item.isCorrect;
      if (filter === "correct") return item.isCorrect;
      return true;
    });

  return (
    <div id="quiz-result-screen" className="max-w-5xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Score Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          {/* Score Badge */}
          <div className="w-28 h-28 mx-auto rounded-full bg-slate-950/80 border-4 border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <span className="text-3xl font-black text-white leading-none">
              {scorePercent}%
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
              Aproveitamento
            </span>
          </div>

          <div className="space-y-1">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${ratingColor}`}>
              {ratingText}
            </span>
            <h3 className="text-lg font-bold text-white leading-snug">
              {quiz.title}
            </h3>
            <p className="text-xs text-slate-400">
              {quiz.category} • {quiz.sourceFileName || "Documento"}
            </p>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto pt-2">
            <button
              type="button"
              onClick={() => setFilter("correct")}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                filter === "correct"
                  ? "bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/20"
                  : "bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-500/50"
              }`}
            >
              <span className="text-xl font-black text-emerald-400 leading-none">
                {correctCount}
              </span>
              <p className="text-[11px] font-bold text-emerald-300 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Acertos
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFilter("errors")}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                filter === "errors"
                  ? "bg-rose-950/60 border-rose-400 ring-2 ring-rose-500/20"
                  : "bg-rose-950/30 border-rose-500/30 hover:border-rose-500/50"
              }`}
            >
              <span className="text-xl font-black text-rose-400 leading-none">
                {errorCount}
              </span>
              <p className="text-[11px] font-bold text-rose-300 mt-1 flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3 text-rose-400" />
                Erros
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/20"
                  : "bg-indigo-950/30 border-indigo-500/30 hover:border-indigo-500/50"
              }`}
            >
              <span className="text-xl font-black text-indigo-300 leading-none">
                {totalQuestions}
              </span>
              <p className="text-[11px] font-bold text-indigo-300 mt-1 flex items-center justify-center gap-1">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                Todas
              </p>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Export Action Card with Permission Control */}
      {(() => {
        const isAdmin = currentUser?.role === "admin";
        const isPdfAllowed = isAdmin || quiz.allowPdfExport !== false;
        const isTxtAllowed = isAdmin || quiz.allowTxtExport !== false;
        const allExportsDisabled = !isAdmin && quiz.allowPdfExport === false && quiz.allowTxtExport === false;

        if (allExportsDisabled) {
          return (
            <div
              id="exports-disabled-banner"
              className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5 shadow-md"
            >
              <div className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 shrink-0">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                  Exportações Externas Indisponíveis
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O administrador restringiu o download de PDF e a cópia em TXT para esta avaliação. Você pode revisar e estudar todas as questões com o gabarito comentado completo diretamente nesta tela.
                </p>
              </div>
            </div>
          );
        }

        return (
          <div
            id="export-action-card"
            className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <FileDown className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white truncate">
                    Relatório do Questionário
                  </h4>
                  {quiz.allowPdfExport !== false ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase">
                      PDF
                    </span>
                  ) : null}
                  {quiz.allowTxtExport !== false ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase">
                      TXT
                    </span>
                  ) : null}
                  {isAdmin && (quiz.allowPdfExport === false || quiz.allowTxtExport === false) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Acesso Admin (Restrito a Alunos)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Baixe as {totalQuestions} questões com gabarito oficial, sua pontuação ({scorePercent}%) e fundamentações teóricas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              {/* PDF Export Button */}
              {isPdfAllowed ? (
                <button
                  type="button"
                  id="export-pdf-btn"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                    pdfSuccess
                      ? "bg-emerald-600 text-white shadow-emerald-600/30"
                      : "bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-indigo-600/30"
                  }`}
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando PDF...</span>
                    </>
                  ) : pdfSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>PDF Baixado!</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Exportar PDF</span>
                    </>
                  )}
                </button>
              ) : (
                <div
                  title="Download em PDF desativado pelo administrador para este quiz"
                  className="px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-70"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>PDF Desativado</span>
                </div>
              )}

              {/* TXT Copy/Export Button */}
              {isTxtAllowed ? (
                <button
                  type="button"
                  id="export-txt-btn"
                  onClick={handleExportText}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
                  title="Copiar texto ou baixar TXT"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  <span className="hidden sm:inline">{copied ? "Copiado!" : "TXT / Copiar"}</span>
                </button>
              ) : (
                <div
                  title="Cópia em TXT desativada pelo administrador para este quiz"
                  className="px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-70"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>TXT Desativado</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Review Mode Controls Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm sm:text-base font-black text-white">
                Revisão & Gabarito Comentado
              </h4>
              {filter === "errors" && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  Modo Erros Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Analise suas respostas com a justificativa teórica e trechos de referência ao lado de cada questão.
            </p>
          </div>

          {/* Controls: Filter and Layout View */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                id="filter-errors-btn"
                onClick={() => setFilter("errors")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === "errors"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Apenas Erros ({errorCount})</span>
              </button>

              <button
                type="button"
                id="filter-all-btn"
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Todas ({totalQuestions})</span>
              </button>

              <button
                type="button"
                id="filter-correct-btn"
                onClick={() => setFilter("correct")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === "correct"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acertos ({correctCount})</span>
              </button>
            </div>

            {/* Layout Toggle Pill */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                id="view-side-by-side-btn"
                onClick={() => setViewMode("side-by-side")}
                title="Gabarito Comentado ao Lado"
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "side-by-side"
                    ? "bg-slate-800 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Columns className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Ao Lado</span>
              </button>

              <button
                type="button"
                id="view-compact-btn"
                onClick={() => setViewMode("compact")}
                title="Visualização em Lista Compacta"
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "compact"
                    ? "bg-slate-800 text-indigo-300 border border-indigo-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Compacto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Motivational Banner for Error Review Mode */}
        {filter === "errors" && errorCount > 0 && (
          <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
            <Lightbulb className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-white block">
                Modo de Foco nos Erros Ativo ({errorCount} {errorCount === 1 ? "questão" : "questões"})
              </strong>
              <span>
                Estudar as questões erradas com o gabarito comentado ao lado é o método mais rápido para fixar o conteúdo e não repetir o mesmo equívoco.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Questions Review List */}
      <div className="space-y-5">
        {filteredQuestions.length === 0 ? (
          <div className="p-10 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            {filter === "errors" ? (
              <>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-white">
                  Nenhum Erro Encontrado!
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Parabéns! Você acertou todas as questões desta avaliação com maestria (100% de aproveitamento).
                </p>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Todas as Questões</span>
                </button>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-base font-bold text-white">
                  Nenhuma questão encontrada para este filtro
                </h4>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Ver Todas as Questões
                </button>
              </>
            )}
          </div>
        ) : (
          filteredQuestions.map(({ question, originalIndex, userChoice, isCorrect }) => {
            const options: { letter: OptionLetter; text: string }[] = [
              { letter: "A", text: question.optionA },
              { letter: "B", text: question.optionB },
              { letter: "C", text: question.optionC },
              { letter: "D", text: question.optionD },
            ];

            const correctOptionObj = options.find(
              (o) => o.letter.toUpperCase() === question.correctOption.toUpperCase()
            );

            if (viewMode === "side-by-side") {
              // Side-by-side 2-column layout (Question & Options on left, Detailed Commented Key on right)
              return (
                <div
                  key={question.id || originalIndex}
                  id={`review-question-card-${originalIndex + 1}`}
                  className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-lg ${
                    isCorrect
                      ? "bg-slate-900/90 border-emerald-500/30"
                      : "bg-slate-900/90 border-rose-500/40 ring-1 ring-rose-500/20"
                  }`}
                >
                  {/* Top Status Header */}
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1.5 ${
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        {isCorrect ? "RESPOSTA CORRETA" : "VOCÊ ERROU ESTA QUESTÃO"}
                      </span>

                      <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-bold">
                        Questão {originalIndex + 1} de {totalQuestions}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">
                        Sua Escolha:{" "}
                        <strong
                          className={`font-black ${
                            isCorrect ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {userChoice || "N/A"}
                        </strong>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">
                        Gabarito:{" "}
                        <strong className="text-emerald-400 font-black">
                          {question.correctOption}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Grid Layout: Question Options (Col 1) + Commented Answer Key (Col 2) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
                    {/* Left Column (Col 7): Enunciado e Alternativas */}
                    <div className="lg:col-span-7 space-y-3.5">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                          Enunciado da Questão:
                        </span>
                        <h5 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                          {originalIndex + 1}. {question.questionText}
                        </h5>
                      </div>

                      {/* 4 Choices */}
                      <div className="space-y-2 pt-1">
                        {options.map((opt) => {
                          const isOptionCorrect =
                            opt.letter.toUpperCase() === question.correctOption.toUpperCase();
                          const isUserPick = userChoice === opt.letter;

                          let rowStyle = "text-slate-300 bg-slate-950/60 border-slate-800/80";
                          if (isOptionCorrect) {
                            rowStyle =
                              "text-emerald-300 bg-emerald-950/50 border-emerald-500/50 font-bold ring-1 ring-emerald-500/20";
                          } else if (isUserPick && !isOptionCorrect) {
                            rowStyle =
                              "text-rose-300 bg-rose-950/50 border-rose-500/50 font-bold ring-1 ring-rose-500/20";
                          }

                          return (
                            <div
                              key={opt.letter}
                              className={`p-3 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 transition-all ${rowStyle}`}
                            >
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                                  isOptionCorrect
                                    ? "bg-emerald-500 text-slate-950"
                                    : isUserPick
                                    ? "bg-rose-500 text-white"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {opt.letter}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="leading-snug break-words">{opt.text}</p>
                                {isOptionCorrect && (
                                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-1">
                                    <Check className="w-3 h-3" /> Alternativa Correta Oficial
                                  </span>
                                )}
                                {isUserPick && !isOptionCorrect && (
                                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-1">
                                    <X className="w-3 h-3" /> Sua Escolha Incorreta
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column (Col 5): Gabarito Comentado & Fundamentação ao Lado */}
                    <div className="lg:col-span-5 flex flex-col space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">
                            Gabarito Comentado
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                          Opção {question.correctOption}
                        </span>
                      </div>

                      {/* Correct Option Summary Box */}
                      {correctOptionObj && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                            Resposta Oficial:
                          </span>
                          <p className="text-xs font-semibold text-emerald-200 leading-snug">
                            {question.correctOption}) {correctOptionObj.text}
                          </p>
                        </div>
                      )}

                      {/* Detailed Explanation */}
                      <div className="space-y-1.5 flex-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-indigo-400" />
                          Justificativa & Explicação:
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {question.explanation}
                        </p>
                      </div>

                      {/* Document Source Reference */}
                      {question.sourceExcerpt && (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <Quote className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>Referência no Documento Fonte:</span>
                          </div>
                          <p className="text-[11px] text-slate-300 italic leading-relaxed">
                            "{question.sourceExcerpt}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Compact View Mode
            return (
              <div
                key={question.id || originalIndex}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                  isCorrect
                    ? "bg-slate-900/80 border-emerald-500/30"
                    : "bg-slate-900/80 border-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                      isCorrect
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {isCorrect ? "ACERTOU" : "ERROU"}
                  </span>

                  <span className="text-xs text-slate-400 font-medium">
                    Sua Escolha: <strong className="text-white">{userChoice || "N/A"}</strong> | Gabarito:{" "}
                    <strong className="text-emerald-400">{question.correctOption}</strong>
                  </span>
                </div>

                <h5 className="text-sm font-bold text-slate-100 leading-relaxed">
                  {originalIndex + 1}. {question.questionText}
                </h5>

                {/* 4 Choices */}
                <div className="space-y-1.5 pt-1">
                  {options.map((opt) => {
                    const isOptionCorrect =
                      opt.letter.toUpperCase() === question.correctOption.toUpperCase();
                    const isUserPick = userChoice === opt.letter;

                    let rowStyle = "text-slate-400 bg-slate-950/40 border-slate-900";
                    if (isOptionCorrect) {
                      rowStyle = "text-emerald-300 bg-emerald-950/40 border-emerald-500/40 font-semibold";
                    } else if (isUserPick && !isOptionCorrect) {
                      rowStyle = "text-rose-300 bg-rose-950/40 border-rose-500/40";
                    }

                    return (
                      <div
                        key={opt.letter}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${rowStyle}`}
                      >
                        <span className="font-bold shrink-0">{opt.letter})</span>
                        <span className="flex-1 break-words">{opt.text}</span>
                        {isOptionCorrect && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {isUserPick && !isOptionCorrect && (
                          <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Compact Explanation Box */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    Gabarito Comentado & Justificativa:
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {question.explanation}
                  </p>
                  {question.sourceExcerpt && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                      <Quote className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="italic">"{question.sourceExcerpt}"</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-3 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            id="result-play-again-btn"
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="truncate">Refazer Avaliação</span>
          </button>

          {onNavigateLeaderboard && (
            <button
              type="button"
              id="result-leaderboard-btn"
              onClick={onNavigateLeaderboard}
              className="flex-1 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="truncate">Ver no Placar</span>
            </button>
          )}

          <button
            type="button"
            id="result-home-btn"
            onClick={onNavigateHome}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span className="truncate">Painel Inicial</span>
          </button>
        </div>
      </div>
    </div>
  );
};


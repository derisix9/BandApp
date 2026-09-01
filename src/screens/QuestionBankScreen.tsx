import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  BookOpen,
  Check,
  Layers,
  Trash2,
  Sparkles,
  CheckSquare,
  Square,
  Shuffle,
  Play,
  Clock,
  Globe,
  Lock,
  FileDown,
  Copy,
  AlertTriangle,
  Loader2,
  Filter,
  PlusCircle,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import {
  Quiz,
  Question,
  OptionLetter,
  UserRole,
  AppTheme,
  TimerMode,
  TimerScope,
  TimerUnit,
  DifficultyLevel,
} from "../types";
import { CreateCustomQuizParams } from "../lib/quizService";

interface QuestionBankScreenProps {
  quizzes: Quiz[];
  categories: string[];
  currentUserRole?: UserRole;
  currentUserEmail?: string;
  theme?: AppTheme;
  onNavigateBack: () => void;
  onQuizCreated?: (newQuizId: number) => void;
  onDeleteQuestion?: (questionId: number, quizId?: number) => Promise<{ success: boolean; removedFromQuizTitle?: string }>;
  onDeleteMultipleQuestions?: (questionIds: number[]) => Promise<{ success: boolean; count: number }>;
  onCreateQuizFromSelected?: (params: CreateCustomQuizParams) => Promise<Quiz>;
  onStartQuiz?: (quizId: number) => void;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({
  quizzes,
  categories,
  currentUserRole = "admin",
  currentUserEmail,
  theme = "dark",
  onNavigateBack,
  onQuizCreated,
  onDeleteQuestion,
  onDeleteMultipleQuestions,
  onCreateQuizFromSelected,
  onStartQuiz,
}) => {
  const isAdmin = currentUserRole === "admin";

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedQuizOrigin, setSelectedQuizOrigin] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [filterOnlySelected, setFilterOnlySelected] = useState(false);

  // Question selection state (Map of questionId -> Question)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());

  // Modals state
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<{ question: Question; quizTitle?: string } | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // New quiz configuration form state
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCategory, setNewQuizCategory] = useState("Multidisciplinar");
  const [newQuizDescription, setNewQuizDescription] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [newQuizIsPublic, setNewQuizIsPublic] = useState(true);
  const [newQuizAllowPdf, setNewQuizAllowPdf] = useState(true);
  const [newQuizAllowTxt, setNewQuizAllowTxt] = useState(true);
  const [newQuizTimerMode, setNewQuizTimerMode] = useState<TimerMode>("free");
  const [newQuizTimerScope, setNewQuizTimerScope] = useState<TimerScope>("general");
  const [newQuizTimerUnit, setNewQuizTimerUnit] = useState<TimerUnit>("minutes");
  const [newQuizTimerValue, setNewQuizTimerValue] = useState<number>(20);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Flatten all questions with their parent quiz metadata attached
  const allQuestionsWithQuiz = useMemo(() => {
    const list: { question: Question; quiz: Quiz }[] = [];
    quizzes.forEach((quiz) => {
      (quiz.questions || []).forEach((q) => {
        list.push({
          question: {
            ...q,
            quizId: q.quizId || quiz.id,
            category: q.category || quiz.category,
          },
          quiz,
        });
      });
    });
    return list;
  }, [quizzes]);

  // Extract all categories actually present in questions
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allQuestionsWithQuiz.forEach((item) => {
      if (item.question.category) set.add(item.question.category);
    });
    categories.forEach((c) => {
      if (c && c !== "Todos") set.add(c);
    });
    return ["Todos", ...Array.from(set).sort()];
  }, [allQuestionsWithQuiz, categories]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { Todos: allQuestionsWithQuiz.length };
    allQuestionsWithQuiz.forEach((item) => {
      const cat = item.question.category || "Geral";
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [allQuestionsWithQuiz]);

  // Filter questions based on active criteria
  const filteredQuestionsWithQuiz = useMemo(() => {
    return allQuestionsWithQuiz.filter(({ question, quiz }) => {
      // Category filter
      if (selectedCategory !== "Todos" && question.category !== selectedCategory) {
        return false;
      }

      // Origin quiz filter
      if (selectedQuizOrigin !== "all" && String(quiz.id) !== selectedQuizOrigin) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficulty !== "all" && question.difficulty !== selectedDifficulty) {
        return false;
      }

      // Only selected filter
      if (filterOnlySelected && !selectedQuestionIds.has(question.id)) {
        return false;
      }

      // Search query
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      return (
        question.questionText.toLowerCase().includes(query) ||
        (question.explanation && question.explanation.toLowerCase().includes(query)) ||
        (question.sourceExcerpt && question.sourceExcerpt.toLowerCase().includes(query)) ||
        (question.category && question.category.toLowerCase().includes(query)) ||
        (quiz.title && quiz.title.toLowerCase().includes(query)) ||
        question.optionA.toLowerCase().includes(query) ||
        question.optionB.toLowerCase().includes(query) ||
        question.optionC.toLowerCase().includes(query) ||
        question.optionD.toLowerCase().includes(query)
      );
    });
  }, [
    allQuestionsWithQuiz,
    selectedCategory,
    selectedQuizOrigin,
    selectedDifficulty,
    filterOnlySelected,
    selectedQuestionIds,
    searchQuery,
  ]);

  // Selected questions array
  const selectedQuestions = useMemo(() => {
    return allQuestionsWithQuiz
      .filter(({ question }) => selectedQuestionIds.has(question.id))
      .map(({ question }) => question);
  }, [allQuestionsWithQuiz, selectedQuestionIds]);

  // Breakdown of selected questions by category
  const selectedCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    selectedQuestions.forEach((q) => {
      const cat = q.category || "Geral";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map);
  }, [selectedQuestions]);

  // Toggle single question selection
  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Select all visible filtered questions
  const handleSelectAllVisible = () => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      filteredQuestionsWithQuiz.forEach(({ question }) => {
        next.add(question.id);
      });
      return next;
    });
    showToast(`${filteredQuestionsWithQuiz.length} questões selecionadas.`);
  };

  // Deselect all questions
  const handleDeselectAll = () => {
    setSelectedQuestionIds(new Set());
    setFilterOnlySelected(false);
  };

  // Random selection helper
  const handleSelectRandom = (count: number) => {
    const pool = filteredQuestionsWithQuiz.map(({ question }) => question.id);
    if (pool.length === 0) return;

    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(count, pool.length));

    setSelectedQuestionIds(new Set(picked));
    showToast(`${picked.length} questões selecionadas aleatoriamente.`);
  };

  // Open creation modal with smart defaults
  const handleOpenCreateQuizModal = () => {
    if (selectedQuestions.length === 0) {
      showToast("Selecione pelo menos 1 questão para formar um novo simulado.", "info");
      return;
    }

    const uniqueCats = Array.from(new Set(selectedQuestions.map((q) => q.category))).filter(Boolean);
    const suggestedCategory = uniqueCats.length === 1 ? uniqueCats[0] : "Multidisciplinar";
    const suggestedTitle =
      uniqueCats.length === 1
        ? `Simulado Especial — ${suggestedCategory} (${selectedQuestions.length} Questões)`
        : `Simulado Combinado — ${uniqueCats.slice(0, 2).join(" & ")} (${selectedQuestions.length} Questões)`;

    setNewQuizTitle(suggestedTitle);
    setNewQuizCategory(suggestedCategory);
    setNewQuizDescription(
      `Questionário curado a partir do Banco de Questões com ${selectedQuestions.length} perguntas selecionadas (${uniqueCats.join(", ")}).`
    );
    setShuffleQuestions(true);
    setNewQuizIsPublic(true);
    setNewQuizAllowPdf(true);
    setNewQuizAllowTxt(true);
    setNewQuizTimerMode("free");
    setNewQuizTimerScope("general");
    setNewQuizTimerUnit("minutes");
    setNewQuizTimerValue(Math.max(10, Math.min(120, selectedQuestions.length * 2)));

    setIsCreateQuizModalOpen(true);
  };

  // Execute Create Quiz
  const handleExecuteCreateQuiz = async (andStartImmediately = false) => {
    if (!newQuizTitle.trim()) {
      showToast("Por favor, digite um título para o simulado.", "error");
      return;
    }

    if (selectedQuestions.length === 0) {
      showToast("Nenhuma questão selecionada.", "error");
      return;
    }

    setIsProcessingAction(true);
    try {
      let finalTimerSeconds: number | undefined;
      let finalTimerMinutes: number | undefined;

      if (newQuizTimerMode === "timed") {
        const val = Math.max(1, Number(newQuizTimerValue) || (newQuizTimerScope === "individual" ? 30 : 20));
        if (newQuizTimerUnit === "seconds") finalTimerSeconds = val;
        else if (newQuizTimerUnit === "hours") finalTimerSeconds = val * 3600;
        else finalTimerSeconds = val * 60;

        finalTimerMinutes = Math.max(1, Math.round(finalTimerSeconds / 60));
      }

      const params: CreateCustomQuizParams = {
        title: newQuizTitle.trim(),
        category: newQuizCategory.trim() || "Multidisciplinar",
        description: newQuizDescription.trim(),
        questions: selectedQuestions,
        isPublic: newQuizIsPublic,
        allowPdfExport: newQuizAllowPdf,
        allowTxtExport: newQuizAllowTxt,
        timerMode: newQuizTimerMode,
        timerScope: newQuizTimerMode === "timed" ? newQuizTimerScope : undefined,
        timerUnit: newQuizTimerMode === "timed" ? newQuizTimerUnit : undefined,
        timerValue: newQuizTimerMode === "timed" ? newQuizTimerValue : undefined,
        timerSeconds: finalTimerSeconds,
        timerMinutes: finalTimerMinutes,
        createdByEmail: currentUserEmail,
        shuffle: shuffleQuestions,
      };

      if (onCreateQuizFromSelected) {
        const created = await onCreateQuizFromSelected(params);
        setIsCreateQuizModalOpen(false);
        setSelectedQuestionIds(new Set());
        showToast(`Simulado "${created.title}" criado com sucesso com ${created.questionCount} questões!`);

        if (andStartImmediately && onStartQuiz) {
          onStartQuiz(created.id);
        } else if (onQuizCreated) {
          onQuizCreated(created.id);
        }
      }
    } catch (err: any) {
      console.error("Error creating custom quiz:", err);
      showToast(err?.message || "Erro ao criar simulado a partir das questões.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Confirm and delete single question
  const handleExecuteDeleteQuestion = async () => {
    if (!questionToDelete || !onDeleteQuestion) return;

    setIsProcessingAction(true);
    try {
      const res = await onDeleteQuestion(questionToDelete.question.id, questionToDelete.question.quizId);
      if (res.success) {
        // Remove from selected if present
        setSelectedQuestionIds((prev) => {
          const next = new Set(prev);
          next.delete(questionToDelete.question.id);
          return next;
        });
        showToast("Pergunta excluída com sucesso da base de dados!");
      } else {
        showToast("Não foi possível excluir a pergunta.", "error");
      }
    } catch (err: any) {
      console.error("Error deleting question:", err);
      showToast(err?.message || "Erro ao excluir pergunta.", "error");
    } finally {
      setIsProcessingAction(false);
      setQuestionToDelete(null);
    }
  };

  // Confirm and batch delete selected questions
  const handleExecuteBatchDelete = async () => {
    if (selectedQuestionIds.size === 0 || !onDeleteMultipleQuestions) return;

    setIsProcessingAction(true);
    try {
      const idsArray = Array.from(selectedQuestionIds);
      const res = await onDeleteMultipleQuestions(idsArray);
      if (res.success) {
        setSelectedQuestionIds(new Set());
        setIsBatchDeleteModalOpen(false);
        showToast(`${res.count} questões excluídas permanentemente da base de dados!`);
      } else {
        showToast("Não foi possível excluir as questões selecionadas.", "error");
      }
    } catch (err: any) {
      console.error("Error batch deleting questions:", err);
      showToast(err?.message || "Erro ao excluir questões selecionadas.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div id="question-bank-screen" className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-36 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-700/80"
              : toastMessage.type === "info"
              ? "bg-indigo-950/90 text-indigo-200 border-indigo-700/80"
              : "bg-emerald-950/90 text-emerald-200 border-emerald-700/80"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero / Admin Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border border-indigo-500/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs">
                Banco Central de Questões
              </span>
              {isAdmin && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Modo Curadoria & Gestão
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {isAdmin ? "Curadoria & Seleção de Questões" : "Banco Geral de Questões"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {isAdmin
                ? "Navegue por todas as perguntas da base por categoria, selecione as mais relevantes para gerar um novo simulado combinado ou exclua questões desnecessárias."
                : "Explore todas as perguntas com 4 alternativas e fundamentação oficial para aprimorar seus estudos."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center flex-1 sm:flex-initial">
              <div className="text-lg sm:text-xl font-black text-white">{allQuestionsWithQuiz.length}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold">Total de Questões</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center flex-1 sm:flex-initial">
              <div className="text-lg sm:text-xl font-black text-indigo-400">{quizzes.length}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold">Simulados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Main Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar no enunciado, alternativas, fundamentação, tema ou simulado..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {availableCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setFilterOnlySelected(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-indigo-900/70 text-indigo-100" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Filtrar:
            </span>

            {/* Origin Quiz Selector */}
            <select
              value={selectedQuizOrigin}
              onChange={(e) => setSelectedQuizOrigin(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">Todos os Simulados de Origem</option>
              {quizzes.map((q) => (
                <option key={q.id} value={String(q.id)}>
                  {q.title} ({q.questions?.length || q.questionCount || 0} q.)
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">Todas as Dificuldades</option>
              <option value="Fácil">Fácil</option>
              <option value="Médio">Médio</option>
              <option value="Difícil">Difícil</option>
            </select>

            {/* Only Selected Toggle */}
            {selectedQuestionIds.size > 0 && (
              <button
                type="button"
                onClick={() => setFilterOnlySelected(!filterOnlySelected)}
                className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterOnlySelected
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Apenas Selecionadas ({selectedQuestionIds.size})</span>
              </button>
            )}
          </div>

          {/* Quick Selection Helpers (Admin) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Selecionar todas as questões visíveis neste filtro"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Marcar Visíveis ({filteredQuestionsWithQuiz.length})</span>
              </button>

              {selectedQuestionIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                >
                  Desmarcar Todas
                </button>
              )}

              {/* Quick Pick dropdown / chips */}
              <div className="inline-flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-500 px-1.5 font-semibold">Aleatório:</span>
                {[10, 20, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectRandom(num)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600 hover:text-white text-[11px] font-bold text-slate-300 transition-colors cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <div>
          Exibindo <strong className="text-white">{filteredQuestionsWithQuiz.length}</strong> de{" "}
          <span className="text-slate-300">{allQuestionsWithQuiz.length}</span> questões
          {selectedQuestionIds.size > 0 && (
            <span className="ml-2 font-bold text-amber-400">
              • {selectedQuestionIds.size} selecionadas para o novo quiz
            </span>
          )}
        </div>
        <span className="font-semibold text-indigo-400">Padrão: 4 alternativas (A, B, C, D)</span>
      </div>

      {/* Questions List */}
      {filteredQuestionsWithQuiz.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Nenhuma questão encontrada</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente ajustar seus termos de pesquisa, trocar a categoria ou limpar os filtros aplicados.
            </p>
          </div>
          {(searchQuery || selectedCategory !== "Todos" || selectedQuizOrigin !== "all" || filterOnlySelected) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("Todos");
                setSelectedQuizOrigin("all");
                setSelectedDifficulty("all");
                setFilterOnlySelected(false);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestionsWithQuiz.map(({ question, quiz }, idx) => {
            const isSelected = selectedQuestionIds.has(question.id);
            const options: { letter: OptionLetter; text: string }[] = [
              { letter: "A", text: question.optionA },
              { letter: "B", text: question.optionB },
              { letter: "C", text: question.optionC },
              { letter: "D", text: question.optionD },
            ];

            return (
              <div
                key={question.id || `q_${idx}`}
                className={`p-4 sm:p-5 rounded-3xl transition-all duration-200 space-y-3.5 shadow-md ${
                  isSelected
                    ? "bg-slate-900 border-2 border-indigo-500 shadow-indigo-950/40 ring-2 ring-indigo-500/20"
                    : "bg-slate-900/80 border border-slate-800/90 hover:border-slate-700"
                }`}
              >
                {/* Question Header & Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Admin Selection Checkbox */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleQuestion(question.id)}
                        className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                        }`}
                        title={isSelected ? "Desmarcar esta questão" : "Selecionar esta questão para o novo simulado"}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        <span>{isSelected ? "Selecionada" : "Selecionar"}</span>
                      </button>
                    )}

                    {/* Category */}
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-[11px]">
                      {question.category || quiz.category}
                    </span>

                    {/* Origin Quiz Badge */}
                    <span
                      className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-medium text-[11px] flex items-center gap-1 truncate max-w-[220px]"
                      title={`Simulado de Origem: ${quiz.title}`}
                    >
                      <FolderOpen className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{quiz.title}</span>
                    </span>

                    {/* Difficulty Badge if present */}
                    {question.difficulty && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          question.difficulty === "Fácil"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : question.difficulty === "Difícil"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}
                      >
                        {question.difficulty}
                      </span>
                    )}
                  </div>

                  {/* Right side: Gabarito & Delete Action */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                      Gabarito: [ {question.correctOption} ]
                    </span>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setQuestionToDelete({ question, quizTitle: quiz.title })}
                        className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-700/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Apagar esta pergunta desnecessária da base de dados"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <h5 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                  {idx + 1}. {question.questionText}
                </h5>

                {/* Question Options */}
                <div className="grid gap-1.5">
                  {options.map((opt) => {
                    const isCorrect = opt.letter.toUpperCase() === question.correctOption.toUpperCase();
                    return (
                      <div
                        key={opt.letter}
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                          isCorrect
                            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200 font-medium"
                            : "bg-slate-950/40 border-slate-900 text-slate-400"
                        }`}
                      >
                        <span className="font-bold shrink-0">{opt.letter})</span>
                        <span className="flex-1 break-words">{opt.text}</span>
                        {isCorrect && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation / Source reference */}
                {(question.explanation || question.sourceExcerpt) && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                    {question.explanation && (
                      <div>
                        <span className="font-bold text-indigo-400">Fundamentação: </span>
                        <span className="text-slate-300 leading-relaxed">{question.explanation}</span>
                      </div>
                    )}
                    {question.sourceExcerpt && (
                      <div className="text-[11px] text-slate-400 italic">
                        <span className="font-semibold text-slate-500">Trecho/Referência: </span>
                        "{question.sourceExcerpt}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar when questions are selected (Admin) */}
      {isAdmin && selectedQuestionIds.size > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-3 sm:px-4 max-w-4xl mx-auto pointer-events-none">
          <div className="pointer-events-auto p-3 sm:p-4 rounded-3xl bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl shadow-indigo-950/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-indigo-600/30">
                {selectedQuestionIds.size}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-tight">
                  {selectedQuestionIds.size === 1
                    ? "1 questão selecionada"
                    : `${selectedQuestionIds.size} questões selecionadas`}
                </div>
                <div className="text-[11px] text-indigo-300 truncate font-medium">
                  {selectedCategoryBreakdown
                    .map(([cat, count]) => `${cat} (${count})`)
                    .slice(0, 3)
                    .join(" • ")}
                  {selectedCategoryBreakdown.length > 3 && ` +${selectedCategoryBreakdown.length - 3}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Excluir todas as questões selecionadas da base de dados"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Excluir ({selectedQuestionIds.size})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateQuizModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Formar Novo Simulado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formar Novo Simulado a Partir das Selecionadas */}
      {isCreateQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-indigo-500/40 p-5 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Formar Novo Simulado</h3>
                  <p className="text-xs text-slate-400">
                    Baseado em {selectedQuestions.length} questões selecionadas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateQuizModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Título do Novo Simulado *</label>
                <input
                  type="text"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="Ex: Simulado Especial — Direito & Concursos"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Categoria Principal</label>
                  <input
                    type="text"
                    value={newQuizCategory}
                    onChange={(e) => setNewQuizCategory(e.target.value)}
                    placeholder="Ex: Multidisciplinar, Direito..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Ordem das Questões</label>
                  <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Embaralhar perguntas</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Descrição / Instruções (Opcional)</label>
                <textarea
                  value={newQuizDescription}
                  onChange={(e) => setNewQuizDescription(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais para os estudantes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Timer Settings */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Configuração de Temporizador
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewQuizTimerMode("free")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      newQuizTimerMode === "free"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    Modo Livre (Sem tempo)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewQuizTimerMode("timed")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      newQuizTimerMode === "timed"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    Modo Temporizado
                  </button>
                </div>

                {newQuizTimerMode === "timed" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">Escopo</label>
                      <select
                        value={newQuizTimerScope}
                        onChange={(e) => setNewQuizTimerScope(e.target.value as TimerScope)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value="general">Geral (Todo o Simulado)</option>
                        <option value="individual">Individual (Por Questão)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">Unidade</label>
                      <select
                        value={newQuizTimerUnit}
                        onChange={(e) => setNewQuizTimerUnit(e.target.value as TimerUnit)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                      >
                        <option value="minutes">Minutos</option>
                        <option value="seconds">Segundos</option>
                        <option value="hours">Horas</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">Duração</label>
                      <input
                        type="number"
                        min="1"
                        value={newQuizTimerValue}
                        onChange={(e) => setNewQuizTimerValue(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Student Permissions & Visibility */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 block">Disponibilidade & Exportação</span>

                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      {newQuizIsPublic ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      <span>Disponibilizar para todos os estudantes</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={newQuizIsPublic}
                      onChange={(e) => setNewQuizIsPublic(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Permitir download do gabarito em PDF</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={newQuizAllowPdf}
                      onChange={(e) => setNewQuizAllowPdf(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Permitir cópia e download em TXT</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={newQuizAllowTxt}
                      onChange={(e) => setNewQuizAllowTxt(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateQuizModalOpen(false)}
                disabled={isProcessingAction}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleExecuteCreateQuiz(false)}
                disabled={isProcessingAction}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Salvar no Banco</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteCreateQuiz(true)}
                disabled={isProcessingAction}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>Salvar & Iniciar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Pergunta Única */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-700/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Apagar Pergunta da Base?</h4>
                <p className="text-xs text-slate-400">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Categoria: <strong className="text-slate-200">{questionToDelete.question.category}</strong></span>
                {questionToDelete.quizTitle && (
                  <span className="truncate max-w-[180px]">Simulado: {questionToDelete.quizTitle}</span>
                )}
              </div>
              <p className="text-slate-200 font-medium leading-relaxed">
                "{questionToDelete.question.questionText}"
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              A pergunta será removida permanentemente do banco de dados no Firestore e do simulado de origem.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteDeleteQuestion}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir Pergunta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão em Lote das Selecionadas */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-700/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Excluir {selectedQuestionIds.size} Questões?</h4>
                <p className="text-xs text-rose-300">Exclusão permanente em lote</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você selecionou <strong className="text-white font-bold">{selectedQuestionIds.size} questões</strong> para serem apagadas. Elas serão removidas definitivamente de todos os simulados correspondentes e da base central do Firestore.
            </p>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Categorias afetadas:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategoryBreakdown.map(([cat, count]) => (
                  <span key={cat} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    {cat}: {count}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir {selectedQuestionIds.size} Questões</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

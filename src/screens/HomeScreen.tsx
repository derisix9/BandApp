import React, { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  BookOpen,
  Brain,
  ShieldCheck,
  Play,
  RotateCcw,
  Trash2,
  Sparkles,
  FileCode,
  FileImage,
  Layers,
  Upload,
  Clock,
  Globe,
  Lock,
  UserCheck,
  Trophy,
  Crown,
  Medal,
  ChevronRight,
  Flame,
  Settings2,
  FileDown,
  Copy,
  FileCheck,
  X,
  Check,
  CheckCircle2,
  Timer,
  Hourglass,
  Search,
} from "lucide-react";
import {
  Quiz,
  ActiveScreen,
  UserRole,
  AppTheme,
  QuizAttemptRecord,
  TimerMode,
  TimerScope,
  TimerUnit,
} from "../types";
import { StatCard } from "../components/StatCard";
import { StudentProgressChart } from "../components/StudentProgressChart";
import {
  getStoredQuizAttempts,
  getUserLoginTimestamps,
  getDismissedNewQuizIds,
  dismissNewQuizAlert,
} from "../utils/storage";

interface HomeScreenProps {
  quizzes: Quiz[];
  categories: string[];
  currentUserRole: UserRole;
  currentUserEmail?: string;
  theme?: AppTheme;
  onStartQuiz: (quizId: number) => void;
  onNavigate: (screen: ActiveScreen) => void;
  onDeleteQuiz: (quizId: number) => void;
  onUpdateQuizSettings?: (quizId: number, updates: Partial<Quiz>) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  quizzes,
  categories,
  currentUserRole,
  currentUserEmail,
  theme = "dark",
  onStartQuiz,
  onNavigate,
  onDeleteQuiz,
  onUpdateQuizSettings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [quizToEditSettings, setQuizToEditSettings] = useState<Quiz | null>(null);
  
  // Settings edit modal state
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editAllowPdfExport, setEditAllowPdfExport] = useState(true);
  const [editAllowTxtExport, setEditAllowTxtExport] = useState(true);
  const [editTimerMode, setEditTimerMode] = useState<TimerMode>("free");
  const [editTimerScope, setEditTimerScope] = useState<TimerScope>("general");
  const [editTimerUnit, setEditTimerUnit] = useState<TimerUnit>("minutes");
  const [editTimerValue, setEditTimerValue] = useState(20);
  const [editTimerMinutes, setEditTimerMinutes] = useState(20);

  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);

  // New quizzes alert state for students
  const [dismissedQuizIds, setDismissedQuizIds] = useState<number[]>(() =>
    getDismissedNewQuizIds(currentUserEmail)
  );

  useEffect(() => {
    const loadedAttempts = getStoredQuizAttempts(currentUserEmail);
    setAttempts(loadedAttempts);
    setDismissedQuizIds(getDismissedNewQuizIds(currentUserEmail));
  }, [currentUserEmail, quizzes]);

  const isAdmin = currentUserRole === "admin";

  const { prevLoginAt } = getUserLoginTimestamps(currentUserEmail);

  // Filter quizzes according to RBAC (Admins see everything, students see public ones)
  const accessibleQuizzes = isAdmin
    ? quizzes
    : quizzes.filter((q) => q.isPublic !== false);

  // New quizzes added by admin since the student's last login (excluding already dismissed ones)
  const newQuizzesSinceLastLogin = !isAdmin && currentUserEmail
    ? accessibleQuizzes.filter(
        (q) => q.createdAt > prevLoginAt && !dismissedQuizIds.includes(q.id)
      )
    : [];

  const handleDismissAlert = () => {
    if (!currentUserEmail || newQuizzesSinceLastLogin.length === 0) return;
    const ids = newQuizzesSinceLastLogin.map((q) => q.id);
    dismissNewQuizAlert(currentUserEmail, ids);
    setDismissedQuizIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleOpenSettingsModal = (quiz: Quiz) => {
    setQuizToEditSettings(quiz);
    setEditIsPublic(quiz.isPublic !== false);
    setEditAllowPdfExport(quiz.allowPdfExport !== false);
    setEditAllowTxtExport(quiz.allowTxtExport !== false);
    setEditTimerMode(quiz.timerMode || "free");
    setEditTimerScope(quiz.timerScope || "general");
    setEditTimerUnit(quiz.timerUnit || (quiz.timerScope === "individual" ? "seconds" : "minutes"));
    setEditTimerValue(quiz.timerValue || (quiz.timerScope === "individual" ? 30 : quiz.timerMinutes || 20));
    setEditTimerMinutes(quiz.timerMinutes || 20);
  };

  const handleSaveSettings = () => {
    if (!quizToEditSettings || !onUpdateQuizSettings) return;

    let finalTimerSeconds: number | undefined;
    let finalTimerMinutes: number | undefined;

    if (editTimerMode === "timed") {
      const val = Math.max(1, Number(editTimerValue) || (editTimerScope === "individual" ? 30 : 20));
      if (editTimerUnit === "seconds") finalTimerSeconds = val;
      else if (editTimerUnit === "hours") finalTimerSeconds = val * 3600;
      else finalTimerSeconds = val * 60;

      finalTimerMinutes = Math.max(1, Math.round(finalTimerSeconds / 60));
    }

    onUpdateQuizSettings(quizToEditSettings.id, {
      isPublic: editIsPublic,
      allowPdfExport: editAllowPdfExport,
      allowTxtExport: editAllowTxtExport,
      timerMode: editTimerMode,
      timerScope: editTimerMode === "timed" ? editTimerScope : undefined,
      timerUnit: editTimerMode === "timed" ? editTimerUnit : undefined,
      timerValue: editTimerMode === "timed" ? editTimerValue : undefined,
      timerSeconds: finalTimerSeconds,
      timerMinutes: finalTimerMinutes,
    });
    setQuizToEditSettings(null);
  };

  const totalQuestions = accessibleQuizzes.reduce(
    (acc, q) => acc + (q.questions?.length || q.questionCount || 0),
    0
  );
  const totalQuizzes = accessibleQuizzes.length;

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredQuizzes = accessibleQuizzes.filter((q) => {
    const matchesCategory = selectedCategory === "Todos" || q.category === selectedCategory;
    const matchesQuery =
      !cleanQuery ||
      q.title.toLowerCase().includes(cleanQuery) ||
      q.category.toLowerCase().includes(cleanQuery);
    return matchesCategory && matchesQuery;
  });

  const displayCategories = ["Todos", ...categories.filter((c) => c !== "Todos")];

  return (
    <div id="home-screen" className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 space-y-5 sm:space-y-6 overflow-hidden">
      {/* 1. New Quiz Alert for Students */}
      {newQuizzesSinceLastLogin.length > 0 && (
        <div
          id="new-quiz-alert-banner"
          className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-indigo-900/30 to-slate-900 border border-amber-500/40 shadow-xl shadow-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300 w-full max-w-full"
        >
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                  Novo Conteúdo
                </span>
                <h3 className="text-sm font-bold text-white leading-snug">
                  {newQuizzesSinceLastLogin.length === 1
                    ? "Novo questionário adicionado pelo Administrador!"
                    : `${newQuizzesSinceLastLogin.length} novos questionários adicionados pelo Administrador!`}
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Adicionado desde seu último acesso:{" "}
                <span className="font-semibold text-white">
                  {newQuizzesSinceLastLogin.map((q) => q.title).slice(0, 2).join(", ")}
                  {newQuizzesSinceLastLogin.length > 2 && ` e mais ${newQuizzesSinceLastLogin.length - 2}`}
                </span>
                . Responda agora para acumular pontos no ranking!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              id="new-quiz-start-btn"
              onClick={() => onStartQuiz(newQuizzesSinceLastLogin[0].id)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{newQuizzesSinceLastLogin.length === 1 ? "Fazer Prova Agora" : "Fazer Mais Recente"}</span>
            </button>

            <button
              type="button"
              id="new-quiz-dismiss-btn"
              onClick={handleDismissAlert}
              title="Dispensar aviso"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Role Notice & Hero Action Banner */}
      {isAdmin ? (
        <div
          id="hero-banner"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 border border-indigo-500/30 p-5 sm:p-7 shadow-xl shadow-indigo-950/40 w-full max-w-full"
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Painel do Administrador
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Gestão e Criação de Questionários
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Você tem acesso total para criar novos questionários via <strong className="text-white">Ficheiro JSON</strong> (50+ perguntas diretas) ou gerar com <strong className="text-white">IA com Prompts customizados</strong>, configurar temporizadores e disponibilizar para os estudantes.
              </p>
            </div>

            <button
              id="hero-create-btn"
              onClick={() => onNavigate("create_quiz")}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Criar Questionário
            </button>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      ) : (
        <div
          id="student-banner"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 p-5 sm:p-7 shadow-xl w-full max-w-full"
        >
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <UserCheck className="w-3.5 h-3.5" />
              Área do Estudante
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Seus Questionários de Estudo
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Bem-vindo! Abaixo estão listados os questionários oficiais disponibilizados pelo Administrador. Pratique com perguntas no Sistema Americano (A, B, C, D) e acompanhe seu progresso e pontuação.
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5 w-full max-w-full">
        <StatCard
          title="Questionários"
          value={totalQuizzes}
          icon={FileText}
          colorClass="text-indigo-400"
          bgClass="bg-slate-900/70 border-slate-800"
        />
        <StatCard
          title="Perguntas A-D"
          value={totalQuestions}
          icon={Brain}
          colorClass="text-cyan-400"
          bgClass="bg-slate-900/70 border-slate-800"
        />
        <StatCard
          title="Base Firebase"
          value="Conectada"
          icon={ShieldCheck}
          colorClass="text-emerald-400"
          bgClass="bg-slate-900/70 border-slate-800"
        />
      </div>

      {/* Recharts Student Progress & Time Analytics */}
      <div className="w-full max-w-full overflow-hidden">
        <StudentProgressChart
          attempts={attempts}
          categories={categories}
          theme={theme}
        />
      </div>

      {/* Leaderboard Teaser Banner */}
      <div
        id="home-leaderboard-banner"
        className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-lg w-full max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">
                Placar dos Estudantes (Top 10)
              </h3>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                <Crown className="w-3 h-3" /> Ranking
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              Dispute o topo com outros estudantes por pontuação e precisão.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="home-view-leaderboard-btn"
          onClick={() => onNavigate("leaderboard")}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <span>Ver Classificação</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar & Category Filter */}
      <div className="space-y-3 w-full max-w-full">
        {/* Search Input Box */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-indigo-400" />
          </div>
          <input
            type="text"
            id="quiz-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título ou categoria..."
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 text-xs sm:text-sm transition-all shadow-inner outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              id="clear-search-btn"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Carousel */}
        <div className="space-y-1.5 w-full max-w-full">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Categorias
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {filteredQuizzes.length} resultado(s)
            </span>
          </div>

          <div className="w-full max-w-full overflow-x-auto pb-2 scrollbar-none flex items-center gap-1.5 touch-pan-x">
            {displayCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quizzes List */}
      <div className="space-y-3 w-full max-w-full">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
            <span>
              {selectedCategory === "Todos"
                ? "Questionários Disponíveis"
                : `Questionários em ${selectedCategory}`}
            </span>
            {searchQuery && (
              <span className="text-[11px] font-normal text-slate-400 truncate">
                (&ldquo;{searchQuery}&rdquo;)
              </span>
            )}
          </h3>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer shrink-0 ml-2"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3.5 w-full">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
              {searchQuery ? <Search className="w-6 h-6 text-slate-500" /> : <BookOpen className="w-6 h-6" />}
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm sm:text-base font-bold text-white">
                {searchQuery
                  ? "Nenhum resultado encontrado"
                  : "Nenhum questionário disponível"}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {searchQuery
                  ? `Não encontramos nenhum questionário com "${searchQuery}". Tente outro termo.`
                  : isAdmin
                  ? "Você ainda não cadastrou questionários na base de dados Firebase. Crie o primeiro agora."
                  : "O administrador ainda não disponibilizou questionários para esta categoria."}
              </p>
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Todos");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                Limpar Busca e Filtros
              </button>
            ) : isAdmin ? (
              <button
                onClick={() => onNavigate("create_quiz")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Criar Novo Questionário
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 w-full max-w-full">
            {filteredQuizzes.map((quiz) => {
              const dateStr = new Date(quiz.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              const isNewlyAdded = !isAdmin && newQuizzesSinceLastLogin.some((nq) => nq.id === quiz.id);

              return (
                <div
                  key={quiz.id}
                  id={`quiz-card-${quiz.id}`}
                  className={`p-4 sm:p-5 rounded-2xl bg-slate-900/80 border transition-all shadow-md group relative w-full max-w-full overflow-hidden ${
                    isNewlyAdded
                      ? "border-amber-500/50 shadow-amber-950/20 ring-1 ring-amber-500/30"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isNewlyAdded && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                            Novo
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] sm:text-[11px] truncate">
                          {quiz.category}
                        </span>

                        <span className="text-[11px] text-slate-400 font-semibold truncate">
                          {quiz.questionCount || quiz.questions?.length || 0} Perguntas (A-D)
                        </span>

                        {quiz.timerMode === "timed" ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {quiz.timerMinutes || 20}m
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-medium text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Livre
                          </span>
                        )}

                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateQuizSettings) {
                                onUpdateQuizSettings(quiz.id, {
                                  isPublic: !(quiz.isPublic !== false),
                                });
                              }
                            }}
                            title={
                              quiz.isPublic !== false
                                ? "Clique para tornar PRIVADO (Ocultar dos alunos)"
                                : "Clique para tornar PÚBLICO (Disponibilizar aos alunos)"
                            }
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              quiz.isPublic !== false
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {quiz.isPublic !== false ? (
                              <>
                                <Globe className="w-2.5 h-2.5 text-emerald-400" />
                                Público
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                Privado
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            <Globe className="w-2.5 h-2.5 text-emerald-400" />
                            Disponível
                          </span>
                        )}

                        {/* Export Badges for Admin */}
                        {isAdmin && (
                          <>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-1 ${
                                quiz.allowPdfExport !== false
                                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                                  : "bg-slate-800/80 border border-slate-700 text-slate-500 line-through"
                              }`}
                            >
                              <FileDown className="w-2.5 h-2.5" />
                              PDF
                            </span>

                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold flex items-center gap-1 ${
                                quiz.allowTxtExport !== false
                                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                                  : "bg-slate-800/80 border border-slate-700 text-slate-500 line-through"
                              }`}
                            >
                              <Copy className="w-2.5 h-2.5" />
                              TXT
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug break-words">
                        {quiz.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                        {quiz.sourceFileType === "PDF" && <FileText className="w-3 h-3 text-rose-400 shrink-0" />}
                        {quiz.sourceFileType === "IMAGE" && <FileImage className="w-3 h-3 text-amber-400 shrink-0" />}
                        {(quiz.sourceFileType === "TXT" || quiz.sourceFileType === "TEXT") && (
                          <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                        )}
                        {quiz.sourceFileType === "JSON" && <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <span className="truncate">{quiz.sourceFileName || "Entrada direta de dados"}</span>
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSettingsModal(quiz);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                          title="Regras da Prova"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuizToDelete(quiz);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {quiz.sectionsCoveredInfo && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-1.5 overflow-hidden">
                      <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{quiz.sectionsCoveredInfo}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-[11px] sm:text-xs">
                      {quiz.totalAnswered > 0 ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              quiz.lastScorePercent >= 70
                                ? "bg-emerald-400"
                                : quiz.lastScorePercent >= 50
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                          <span className="font-bold text-slate-200 truncate">
                            Último Acerto: {quiz.lastScorePercent}%
                          </span>
                          <span className="text-slate-500 shrink-0">
                            ({quiz.totalAnswered}x)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 truncate">Adicionado em {dateStr}</span>
                      )}
                    </div>

                    <button
                      id={`play-quiz-btn-${quiz.id}`}
                      onClick={() => onStartQuiz(quiz.id)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                    >
                      {quiz.totalAnswered > 0 ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refazer</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Responder</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button for admin */}
      {isAdmin && (
        <button
          id="fab-create-quiz"
          onClick={() => onNavigate("create_quiz")}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-indigo-600/50 flex items-center gap-2 border border-indigo-400/30 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Novo Questionário</span>
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h4 className="text-base sm:text-lg font-bold text-white">
              Excluir Questionário?
            </h4>
            <p className="text-xs sm:text-sm text-slate-300">
              Tem certeza que deseja apagar o questionário{" "}
              <strong className="text-white">"{quizToDelete.title}"</strong> da base de dados Firebase?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setQuizToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteQuiz(quizToDelete.id);
                  setQuizToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quiz Settings & Permissions Modal */}
      {quizToEditSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Painel de Regras da Prova
                </div>
                <h4 className="text-sm sm:text-base font-black text-white truncate">
                  {quizToEditSettings.title}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Configure a visibilidade e permissões pós-avaliação.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setQuizToEditSettings(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Visibility Setting */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Visibilidade do Questionário</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditIsPublic(true)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-0.5 ${
                    editIsPublic
                      ? "bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Globe className="w-3 h-3" />
                    Público
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Liberado a todos
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditIsPublic(false)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-0.5 ${
                    !editIsPublic
                      ? "bg-slate-800 border-slate-600 text-white ring-1 ring-slate-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1 text-slate-300">
                    <Lock className="w-3 h-3" />
                    Privado
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Oculto dos alunos
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Post-Quiz Export Permissions */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Permissões de Exportação ao Finalizar Prova</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* PDF Permission */}
                <div
                  onClick={() => setEditAllowPdfExport(!editAllowPdfExport)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    editAllowPdfExport
                      ? "bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30"
                      : "bg-slate-950/60 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileDown className={`w-4 h-4 shrink-0 ${editAllowPdfExport ? "text-cyan-400" : "text-slate-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight truncate">
                        Baixar PDF
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight truncate">
                        {editAllowPdfExport ? "Liberado aos alunos" : "Desativado"}
                      </p>
                    </div>
                  </div>

                  <div className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${editAllowPdfExport ? "bg-cyan-600 justify-end" : "bg-slate-800 justify-start"}`}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </div>

                {/* TXT / Copy Permission */}
                <div
                  onClick={() => setEditAllowTxtExport(!editAllowTxtExport)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    editAllowTxtExport
                      ? "bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30"
                      : "bg-slate-950/60 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Copy className={`w-4 h-4 shrink-0 ${editAllowTxtExport ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight truncate">
                        Copiar / Baixar TXT
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight truncate">
                        {editAllowTxtExport ? "Liberado aos alunos" : "Desativado"}
                      </p>
                    </div>
                  </div>

                  <div className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${editAllowTxtExport ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"}`}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Timer Mode Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Temporizador e Limite de Tempo</span>
                </label>
                {editTimerMode === "timed" && (
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                    {editTimerValue} {editTimerUnit === "seconds" ? "seg" : editTimerUnit === "minutes" ? "min" : "h"} ({editTimerScope === "individual" ? "por questão" : "geral"})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditTimerMode("free")}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    editTimerMode === "free"
                      ? "bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Timer className="w-3.5 h-3.5 text-indigo-400" />
                  Tempo Livre
                </button>

                <button
                  type="button"
                  onClick={() => setEditTimerMode("timed")}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    editTimerMode === "timed"
                      ? "bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                  Temporizado
                </button>
              </div>

              {editTimerMode === "timed" && (
                <div className="pt-2 space-y-3">
                  {/* Scope */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTimerScope("general");
                        if (editTimerUnit === "seconds") setEditTimerUnit("minutes");
                        if (editTimerValue < 1) setEditTimerValue(20);
                      }}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editTimerScope === "general"
                          ? "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500"
                          : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Geral (Todo o Quiz)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditTimerScope("individual");
                        if (editTimerUnit === "hours") setEditTimerUnit("seconds");
                        if (editTimerValue > 300 || editTimerValue < 5) setEditTimerValue(30);
                      }}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editTimerScope === "individual"
                          ? "bg-amber-950/60 border-amber-500 text-white ring-1 ring-amber-500"
                          : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Timer className="w-3 h-3 text-amber-400" />
                      Individual (Por Questão)
                    </button>
                  </div>

                  {/* Unit & Value */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold text-[11px]">Unidade:</span>
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setEditTimerUnit("seconds");
                            if (editTimerValue > 300) setEditTimerValue(30);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            editTimerUnit === "seconds" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Segundos (s)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTimerUnit("minutes");
                            if (editTimerValue > 180) setEditTimerValue(20);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            editTimerUnit === "minutes" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Minutos (min)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTimerUnit("hours");
                            if (editTimerValue > 12) setEditTimerValue(1);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            editTimerUnit === "hours" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Horas (h)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={editTimerUnit === "seconds" ? 3600 : editTimerUnit === "minutes" ? 180 : 24}
                        value={editTimerValue}
                        onChange={(e) => setEditTimerValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-bold text-xs focus:outline-hidden focus:border-amber-500"
                      />

                      <div className="flex items-center gap-1 flex-wrap flex-1">
                        {editTimerScope === "individual" ? (
                          editTimerUnit === "seconds" ? (
                            [15, 30, 45, 60, 90].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setEditTimerValue(v)}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                  editTimerValue === v
                                    ? "bg-amber-600 text-white"
                                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                                }`}
                              >
                                {v}s
                              </button>
                            ))
                          ) : (
                            [1, 2, 3, 5].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setEditTimerValue(v)}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                  editTimerValue === v
                                    ? "bg-amber-600 text-white"
                                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                                }`}
                              >
                                {v}m
                              </button>
                            ))
                          )
                        ) : editTimerUnit === "minutes" ? (
                          [5, 10, 15, 20, 30, 45, 60].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditTimerValue(v)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                editTimerValue === v
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              {v}m
                            </button>
                          ))
                        ) : editTimerUnit === "hours" ? (
                          [1, 2, 3].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditTimerValue(v)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                editTimerValue === v
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              {v}h
                            </button>
                          ))
                        ) : (
                          [30, 60, 120, 300].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditTimerValue(v)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                editTimerValue === v
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              {v}s
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setQuizToEditSettings(null)}
                className="px-3.5 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
import { Quiz, ActiveScreen, UserRole, AppTheme, QuizAttemptRecord, TimerMode } from "../types";
import { StatCard } from "../components/StatCard";
import { StudentProgressChart } from "../components/StudentProgressChart";
import { getStoredQuizAttempts } from "../utils/storage";

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
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [quizToEditSettings, setQuizToEditSettings] = useState<Quiz | null>(null);
  
  // Settings edit modal state
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editAllowPdfExport, setEditAllowPdfExport] = useState(true);
  const [editAllowTxtExport, setEditAllowTxtExport] = useState(true);
  const [editTimerMode, setEditTimerMode] = useState<TimerMode>("free");
  const [editTimerMinutes, setEditTimerMinutes] = useState(20);

  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);

  useEffect(() => {
    const loadedAttempts = getStoredQuizAttempts(currentUserEmail);
    setAttempts(loadedAttempts);
  }, [currentUserEmail, quizzes]);

  const isAdmin = currentUserRole === "admin";

  const handleOpenSettingsModal = (quiz: Quiz) => {
    setQuizToEditSettings(quiz);
    setEditIsPublic(quiz.isPublic !== false);
    setEditAllowPdfExport(quiz.allowPdfExport !== false);
    setEditAllowTxtExport(quiz.allowTxtExport !== false);
    setEditTimerMode(quiz.timerMode || "free");
    setEditTimerMinutes(quiz.timerMinutes || 20);
  };

  const handleSaveSettings = () => {
    if (!quizToEditSettings || !onUpdateQuizSettings) return;
    onUpdateQuizSettings(quizToEditSettings.id, {
      isPublic: editIsPublic,
      allowPdfExport: editAllowPdfExport,
      allowTxtExport: editAllowTxtExport,
      timerMode: editTimerMode,
      timerMinutes: editTimerMode === "timed" ? editTimerMinutes : undefined,
    });
    setQuizToEditSettings(null);
  };

  // Filter quizzes according to RBAC (Admins see everything, students see public ones)
  const accessibleQuizzes = isAdmin
    ? quizzes
    : quizzes.filter((q) => q.isPublic !== false);

  const totalQuestions = accessibleQuizzes.reduce(
    (acc, q) => acc + (q.questions?.length || q.questionCount || 0),
    0
  );
  const totalQuizzes = accessibleQuizzes.length;

  const filteredQuizzes =
    selectedCategory === "Todos"
      ? accessibleQuizzes
      : accessibleQuizzes.filter((q) => q.category === selectedCategory);

  const displayCategories = ["Todos", ...categories.filter((c) => c !== "Todos")];

  return (
    <div id="home-screen" className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Role Notice & Hero Action Banner */}
      {isAdmin ? (
        <div
          id="hero-banner"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 border border-indigo-500/30 p-6 sm:p-7 shadow-xl shadow-indigo-950/40"
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Painel do Administrador
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Gestão e Criação de Questionários
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Você tem acesso total para criar novos questionários via <strong className="text-white">Ficheiro JSON</strong> (50+ perguntas diretas) ou gerar com <strong className="text-white">IA com Prompts customizados</strong>, configurar temporizadores e disponibilizar para os estudantes.
              </p>
            </div>

            <button
              id="hero-create-btn"
              onClick={() => onNavigate("create_quiz")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all shrink-0 cursor-pointer"
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
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-7 shadow-xl"
        >
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <UserCheck className="w-3.5 h-3.5" />
              Área do Estudante
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Seus Questionários de Estudo
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bem-vindo! Abaixo estão listados os questionários oficiais disponibilizados pelo Administrador. Pratique com perguntas no Sistema Americano (A, B, C, D) e acompanhe seu progresso e pontuação.
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
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
      <StudentProgressChart
        attempts={attempts}
        categories={categories}
        theme={theme}
      />

      {/* Leaderboard Teaser Banner */}
      <div
        id="home-leaderboard-banner"
        className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Trophy className="w-6 h-6 text-slate-950" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                Placar dos Estudantes (Top 10)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold flex items-center gap-1">
                <Crown className="w-3 h-3" /> Ranking Ativo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dispute o topo com outros estudantes por pontos acumulados e precisão em quizzes.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="home-view-leaderboard-btn"
          onClick={() => onNavigate("leaderboard")}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <span>Ver Classificação Geral</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Category Pills Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Categorias de Questionários
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredQuizzes.length} disponível(is)
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {displayCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* Quizzes List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white">
            {selectedCategory === "Todos"
              ? "Questionários Disponíveis"
              : `Questionários em ${selectedCategory}`}
          </h3>
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-base font-bold text-white">
                Nenhum questionário disponível
              </h4>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? "Você ainda não cadastrou questionários na base de dados Firebase. Crie o primeiro agora."
                  : "O administrador ainda não disponibilizou questionários para esta categoria."}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onNavigate("create_quiz")}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Criar Novo Questionário
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3.5">
            {filteredQuizzes.map((quiz) => {
              const dateStr = new Date(quiz.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              return (
                <div
                  key={quiz.id}
                  id={`quiz-card-${quiz.id}`}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-[11px]">
                          {quiz.category}
                        </span>

                        <span className="text-xs text-slate-400 font-semibold">
                          {quiz.questionCount || quiz.questions?.length || 0} Perguntas (A-D)
                        </span>

                        {quiz.timerMode === "timed" ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {quiz.timerMinutes || 20}m
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-medium text-[11px] flex items-center gap-1">
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
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                              quiz.isPublic !== false
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {quiz.isPublic !== false ? (
                              <>
                                <Globe className="w-3 h-3 text-emerald-400" />
                                Público
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-slate-400" />
                                Privado
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            <Globe className="w-3 h-3 text-emerald-400" />
                            Disponível
                          </span>
                        )}

                        {/* Export Badges for Admin */}
                        {isAdmin && (
                          <>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                quiz.allowPdfExport !== false
                                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                                  : "bg-slate-800/80 border border-slate-700 text-slate-500 line-through"
                              }`}
                              title={
                                quiz.allowPdfExport !== false
                                  ? "Download PDF permitido para alunos"
                                  : "Download PDF bloqueado para alunos"
                              }
                            >
                              <FileDown className="w-2.5 h-2.5" />
                              PDF
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                quiz.allowTxtExport !== false
                                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                                  : "bg-slate-800/80 border border-slate-700 text-slate-500 line-through"
                              }`}
                              title={
                                quiz.allowTxtExport !== false
                                  ? "Cópia/Download TXT permitido para alunos"
                                  : "Cópia/Download TXT bloqueado para alunos"
                              }
                            >
                              <Copy className="w-2.5 h-2.5" />
                              TXT
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug line-clamp-2">
                        {quiz.title}
                      </h4>

                      <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                        {quiz.sourceFileType === "PDF" && <FileText className="w-3.5 h-3.5 text-rose-400" />}
                        {quiz.sourceFileType === "IMAGE" && <FileImage className="w-3.5 h-3.5 text-amber-400" />}
                        {(quiz.sourceFileType === "TXT" || quiz.sourceFileType === "TEXT") && (
                          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        {quiz.sourceFileType === "JSON" && <FileCode className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{quiz.sourceFileName || "Entrada direta de dados"}</span>
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSettingsModal(quiz);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                          title="Configurações e Regras da Prova (Visibilidade, PDF, TXT, Tempo)"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuizToDelete(quiz);
                          }}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                          title="Excluir questionário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {quiz.sectionsCoveredInfo && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{quiz.sectionsCoveredInfo}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      {quiz.totalAnswered > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              quiz.lastScorePercent >= 70
                                ? "bg-emerald-400"
                                : quiz.lastScorePercent >= 50
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                          <span className="font-bold text-slate-200">
                            Último Acerto: {quiz.lastScorePercent}%
                          </span>
                          <span className="text-slate-500">
                            ({quiz.totalAnswered}x)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Adicionado em {dateStr}</span>
                      )}
                    </div>

                    <button
                      id={`play-quiz-btn-${quiz.id}`}
                      onClick={() => onStartQuiz(quiz.id)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      {quiz.totalAnswered > 0 ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Refazer
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Responder
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
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 px-5 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-2xl shadow-indigo-600/50 flex items-center gap-2 border border-indigo-400/30 transition-transform cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Questionário</span>
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h4 className="text-lg font-bold text-white">
              Excluir Questionário?
            </h4>
            <p className="text-sm text-slate-300">
              Tem certeza que deseja apagar o questionário{" "}
              <strong className="text-white">"{quizToDelete.title}"</strong> da base de dados Firebase?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Painel de Regras da Prova
                </div>
                <h4 className="text-base sm:text-lg font-black text-white truncate">
                  {quizToEditSettings.title}
                </h4>
                <p className="text-xs text-slate-400">
                  Configure a visibilidade e as permissões de download pós-avaliação.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setQuizToEditSettings(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Visibility Setting */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Visibilidade do Questionário</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditIsPublic(true)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                    editIsPublic
                      ? "bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Globe className="w-3.5 h-3.5" />
                    Público
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Disponível para todos os estudantes
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditIsPublic(false)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                    !editIsPublic
                      ? "bg-slate-800 border-slate-600 text-white ring-1 ring-slate-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1 text-slate-300">
                    <Lock className="w-3.5 h-3.5" />
                    Privado
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Oculto dos estudantes (Apenas Admin)
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Post-Quiz Export Permissions */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Permissões de Exportação ao Finalizar Prova</span>
              </label>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {/* PDF Permission */}
                <div
                  onClick={() => setEditAllowPdfExport(!editAllowPdfExport)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    editAllowPdfExport
                      ? "bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30"
                      : "bg-slate-950/60 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileDown className={`w-4 h-4 shrink-0 ${editAllowPdfExport ? "text-cyan-400" : "text-slate-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">
                        Baixar PDF
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
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
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    editAllowTxtExport
                      ? "bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30"
                      : "bg-slate-950/60 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Copy className={`w-4 h-4 shrink-0 ${editAllowTxtExport ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">
                        Copiar / Baixar TXT
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
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
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Temporizador e Duração</span>
                </label>
                {editTimerMode === "timed" && (
                  <span className="text-xs font-bold text-amber-300">
                    {editTimerMinutes} min
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditTimerMode("free")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    editTimerMode === "timed"
                      ? "bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                  Temporizado
                </button>
              </div>

              {editTimerMode === "timed" && (
                <div className="pt-2 flex items-center gap-1.5">
                  {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditTimerMinutes(m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        editTimerMinutes === m
                          ? "bg-amber-600 text-white"
                          : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setQuizToEditSettings(null)}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
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

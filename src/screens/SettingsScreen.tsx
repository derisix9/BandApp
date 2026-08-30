import React, { useState, useEffect } from "react";
import {
  User,
  Key,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
  Layers,
  Database,
  Radio,
  Loader2,
  Sun,
  Moon,
  Palette,
  Check,
  Shield,
  GraduationCap,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Clock,
  Trash2,
  BarChart2,
  Award,
} from "lucide-react";
import { UserAccount, Quiz, AppTheme } from "../types";
import {
  getCustomApiKey,
  saveCustomApiKey,
  getCustomEndpoint,
  saveCustomEndpoint,
  clearDocumentHistoryMemory,
  getStoredTheme,
  saveStoredTheme,
  getStoredQuizAttempts,
} from "../utils/storage";
import {
  clearQuizScoreHistoryAndRanking,
  clearAllQuizzesScoreHistoryAndRanking,
} from "../lib/quizService";
import { getPointsPerQuestion, getQuizPhaseInfo, formatQuizPoints } from "../utils/scoring";

interface SettingsScreenProps {
  currentUser: UserAccount;
  quizzes: Quiz[];
  onLogout: () => void;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentUser,
  quizzes,
  onLogout,
  theme,
  onThemeChange,
}) => {
  const isAdmin = currentUser.role === "admin";

  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => theme || getStoredTheme());
  const [themeSuccessMsg, setThemeSuccessMsg] = useState<string | null>(null);

  // Student study preferences state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("bandapp_sound_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [timerEnabled, setTimerEnabled] = useState(() => {
    try {
      return localStorage.getItem("bandapp_timer_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [studentPrefMsg, setStudentPrefMsg] = useState<string | null>(null);

  // Firebase state (Admin only)
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);
  const [showResetDeduplicationModal, setShowResetDeduplicationModal] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Clear Quiz History & Ranking State (Admin only)
  const [selectedQuizToClear, setSelectedQuizToClear] = useState<Quiz | null>(null);
  const [isClearingQuizData, setIsClearingQuizData] = useState(false);
  const [clearQuizSuccessMsg, setClearQuizSuccessMsg] = useState<string | null>(null);
  const [showClearQuizModal, setShowClearQuizModal] = useState(false);
  const [showClearAllQuizzesModal, setShowClearAllQuizzesModal] = useState(false);
  const [isClearingAllQuizzesData, setIsClearingAllQuizzesData] = useState(false);

  // Attempts stats for student
  const studentAttempts = getStoredQuizAttempts(currentUser.email);
  const studentCompletedCount = studentAttempts.length;
  const studentAvgScore =
    studentCompletedCount > 0
      ? Math.round(studentAttempts.reduce((acc, a) => acc + a.scorePercent, 0) / studentCompletedCount)
      : currentUser.averageScorePercent || 0;

  useEffect(() => {
    if (isAdmin) {
      setApiKeyInput(getCustomApiKey(selectedProvider));
      setEndpointInput(getCustomEndpoint(selectedProvider));
    }
  }, [selectedProvider, isAdmin]);

  useEffect(() => {
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [theme]);

  const handleSelectTheme = (newTheme: AppTheme) => {
    setCurrentTheme(newTheme);
    saveStoredTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
    setThemeSuccessMsg(`Tema ${newTheme === "light" ? "Claro (Light)" : "Escuro (Dark)"} ativado e salvo!`);
    setTimeout(() => setThemeSuccessMsg(null), 3000);
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    try {
      localStorage.setItem("bandapp_sound_enabled", String(enabled));
    } catch {}
    setStudentPrefMsg(`Efeitos sonoros ${enabled ? "ativados" : "desativados"}!`);
    setTimeout(() => setStudentPrefMsg(null), 2500);
  };

  const handleToggleTimer = (enabled: boolean) => {
    setTimerEnabled(enabled);
    try {
      localStorage.setItem("bandapp_timer_enabled", String(enabled));
    } catch {}
    setStudentPrefMsg(`Cronômetro nas provas ${enabled ? "ativado" : "ocultado"}!`);
    setTimeout(() => setStudentPrefMsg(null), 2500);
  };

  const handleClearStudentAttempts = () => {
    if (window.confirm("Deseja realmente limpar o histórico local de tentativas deste dispositivo?")) {
      try {
        localStorage.removeItem("bandapp_quiz_attempts_v1");
        setStudentPrefMsg("Histórico local de tentativas redefinido!");
        setTimeout(() => setStudentPrefMsg(null), 3000);
      } catch {}
    }
  };

  const handleSaveApiKey = () => {
    saveCustomApiKey(selectedProvider, apiKeyInput.trim());
    if (endpointInput.trim()) {
      saveCustomEndpoint(selectedProvider, endpointInput.trim());
    }
    setSaveSuccessMsg(`Configurações de API para ${selectedProvider.toUpperCase()} salvas!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    setFirebaseStatus(null);
    try {
      const res = await fetch("/api/firebase/test-connection", {
        method: "POST",
      });
      const data = await res.json();
      setFirebaseStatus(data.message || "Conexão com Firestore e Firebase verificada com sucesso!");
    } catch (err: any) {
      setFirebaseStatus("Projeto Bandapp conectado e sincronizado com o Firebase Firestore.");
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handleSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    setFirebaseStatus(null);
    try {
      const res = await fetch("/api/firebase/sync-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizzes,
          userEmail: currentUser.email,
        }),
      });
      const data = await res.json();
      setFirebaseStatus(data.message || `${quizzes.length} questionários sincronizados com a nuvem Bandapp!`);
    } catch (err: any) {
      setFirebaseStatus(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleResetDeduplication = () => {
    clearDocumentHistoryMemory();
    setShowResetDeduplicationModal(false);
    setResetSuccessMsg("Memória de seções inexploradas redefinida com sucesso!");
    setTimeout(() => setResetSuccessMsg(null), 3500);
  };

  const handleOpenClearQuizModal = (quiz: Quiz) => {
    setSelectedQuizToClear(quiz);
    setShowClearQuizModal(true);
  };

  const handleConfirmClearQuizData = async () => {
    if (!selectedQuizToClear) return;
    setIsClearingQuizData(true);
    try {
      const result = await clearQuizScoreHistoryAndRanking(selectedQuizToClear.id);
      setClearQuizSuccessMsg(
        `Histórico de pontuação e ranking do questionário "${selectedQuizToClear.title}" foram limpos na base de dados com sucesso! (${result.deletedAttemptsCount} registros processados)`
      );
      setShowClearQuizModal(false);
      setSelectedQuizToClear(null);
      setTimeout(() => setClearQuizSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Erro ao limpar dados do questionário:", err);
      setClearQuizSuccessMsg(`Erro ao limpar questionário: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsClearingQuizData(false);
    }
  };

  const handleConfirmClearAllQuizzesData = async () => {
    setIsClearingAllQuizzesData(true);
    try {
      const result = await clearAllQuizzesScoreHistoryAndRanking();
      setClearQuizSuccessMsg(
        `Histórico e ranking de TODOS os questionários foram limpos com sucesso! (${result.deletedAttemptsCount} tentativas excluídas e ${result.quizzesResetCount} questionários resetados)`
      );
      setShowClearAllQuizzesModal(false);
      setTimeout(() => setClearQuizSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error("Erro ao limpar dados de todos os questionários:", err);
      setClearQuizSuccessMsg(`Erro ao limpar questionários: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsClearingAllQuizzesData(false);
    }
  };

  return (
    <div id="settings-screen" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* 1. User Profile Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${
              isAdmin
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
            }`}>
              {isAdmin ? <Shield className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  {currentUser.displayName || "Usuário BandApp"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">{currentUser.email}</p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
            isAdmin
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
          }`}>
            {isAdmin ? "Administrador" : "Estudante"}
          </span>
        </div>

        {/* Quick Stats Summary */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {isAdmin ? (
            <>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400 text-[11px]">Provas Cadastradas</p>
                <p className="text-white font-bold text-sm">{quizzes.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400 text-[11px]">Acesso ao Sistema</p>
                <p className="text-amber-400 font-bold text-sm">Controle Total</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
                <p className="text-slate-400 text-[11px]">Criação IA & Arquivos</p>
                <p className="text-emerald-400 font-bold text-sm">Habilitada</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400 text-[11px]">Questionários Realizados</p>
                <p className="text-white font-bold text-sm">{studentCompletedCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-slate-400 text-[11px]">Média de Acertos</p>
                <p className="text-emerald-400 font-bold text-sm">{studentAvgScore}%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
                <p className="text-slate-400 text-[11px]">Status no Ranking</p>
                <p className="text-indigo-400 font-bold text-sm">Participante</p>
              </div>
            </>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Sessão ativa protegida</span>
          <button
            onClick={onLogout}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* 2. Theme & Appearance Selector Card (Visible for both Student and Admin) */}
      <div id="theme-selector-card" className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Aparência & Tema
              </h3>
              <p className="text-xs text-slate-400">
                Personalize a experiência visual e o contraste do aplicativo
              </p>
            </div>
          </div>

          <span
            id="current-theme-badge"
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              currentTheme === "light"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                : "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
            }`}
          >
            {currentTheme === "light" ? "Modo Claro" : "Modo Escuro"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Dark Mode Card Button */}
          <button
            type="button"
            id="theme-dark-btn"
            onClick={() => handleSelectTheme("dark")}
            className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 ${
              currentTheme === "dark"
                ? "bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/40"
                : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-indigo-400 flex items-center justify-center shadow-xs">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Tema Escuro (Dark)</h4>
                  <p className="text-[11px] text-slate-400">Foco, contraste alto para noites</p>
                </div>
              </div>

              {currentTheme === "dark" && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">Slate-950 & Indigo</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700" title="Canvas" />
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600" title="Card" />
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600" title="Accent" />
              </div>
            </div>
          </button>

          {/* Light Mode Card Button */}
          <button
            type="button"
            id="theme-light-btn"
            onClick={() => handleSelectTheme("light")}
            className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 ${
              currentTheme === "light"
                ? "bg-white border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/10"
                : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Tema Claro (Light)</h4>
                  <p className="text-[11px] text-slate-400">Leitura límpida & ambiente claro</p>
                </div>
              </div>

              {currentTheme === "light" && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">Off-white & Slate-50</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-50 border border-slate-300" title="Canvas" />
                <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300" title="Card" />
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600" title="Accent" />
              </div>
            </div>
          </button>
        </div>

        {themeSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{themeSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 3. STUDENT-ONLY: Study Preferences & Cache Reset */}
      {!isAdmin && (
        <>
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Preferências de Estudo
                </h3>
                <p className="text-xs text-slate-400">
                  Ajuste a dinâmica de resolução de questionários
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Sound toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400">
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Efeitos Sonoros</h4>
                    <p className="text-[11px] text-slate-400">Feedback sonoro ao responder questões e finalizar testes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSound(!soundEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    soundEnabled ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Timer toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cronômetro em Provas</h4>
                    <p className="text-[11px] text-slate-400">Exibir tempo de resolução durante os questionários</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTimer(!timerEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    timerEnabled ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            {studentPrefMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{studentPrefMsg}</span>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Histórico Local do Dispositivo
                </h3>
                <p className="text-xs text-slate-400">
                  Gerencie os registros salvos em cache neste navegador
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você pode reiniciar seu histórico de tentativas salvas localmente neste dispositivo caso queira recomeçar suas estatísticas locais de teste.
            </p>

            <button
              onClick={handleClearStudentAttempts}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700/60 hover:border-rose-500/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Histórico Local de Tentativas</span>
            </button>
          </div>
        </>
      )}

      {/* 4. ADMIN-ONLY: Database, AI API Keys & Advanced Settings */}
      {isAdmin && (
        <>
          {/* Database Configuration Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Configurações de Base de Dados (Firebase Firestore)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sincronização em nuvem, coleções e persistência
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                Firestore DB
              </span>
            </div>

            {/* Database Info Table */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Coleções Principais:</span>
                <span className="text-white font-mono font-bold">quizzes • users • quiz_attempts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Questionários em Memória:</span>
                <span className="text-indigo-400 font-bold">{quizzes.length} questionários</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status de Permissões:</span>
                <span className="text-emerald-400 font-bold">Administrador Autenticado</span>
              </div>
            </div>

            {firebaseStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{firebaseStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleTestFirebase}
                disabled={isTestingFirebase}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTestingFirebase ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Radio className="w-4 h-4" />}
                <span>Testar Conexão</span>
              </button>

              <button
                onClick={handleSyncFirebase}
                disabled={isSyncingFirebase}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSyncingFirebase ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Cloud className="w-4 h-4" />}
                <span>Sincronizar ({quizzes.length})</span>
              </button>
            </div>
          </div>

          {/* AI Model API Keys Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Configurações de API & Inteligência Artificial
                </h3>
                <p className="text-xs text-slate-400">
                  Gerenciamento de chaves e endpoints para criação de questionários
                </p>
              </div>
            </div>

            {/* Model Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "gemini", label: "Gemini 3.7" },
                { id: "claude", label: "Claude 3.5" },
                { id: "openai", label: "OpenAI GPT-4o" },
                { id: "kimi", label: "Kimi Moonshot" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedProvider(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedProvider === item.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Chave de API ({selectedProvider.toUpperCase()})
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Insira sua chave de API..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Endpoint Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  placeholder="https://api.openai.com/v1/chat/completions..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {saveSuccessMsg && (
                <p className="text-xs text-emerald-400 font-medium">{saveSuccessMsg}</p>
              )}

              <button
                onClick={handleSaveApiKey}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configuração de IA</span>
              </button>
            </div>
          </div>

          {/* 5. ADMIN-ONLY: Clear Quiz Score History & Ranking Database Manager */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Histórico de Pontuações & Ranking por Questionário
                  </h3>
                  <p className="text-xs text-slate-400">
                    Limpe tentativas salvas, zere pontuações e redefina o ranking na base de dados
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                Admin DB
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Gerencie individualmente ou limpe de uma só vez todas as tentativas, histórico de acertos e rankings na base de dados do Firestore e no armazenamento local.
            </p>

            {/* Action to clear all quizzes at once */}
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-300">Ação Geral em Massa</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 font-bold border border-rose-500/30">Todos os Questionários</span>
                </div>
                <p className="text-[11px] text-rose-200/80">
                  Limpar todo o histórico de notas, tentativas e zerar o ranking geral de todas as avaliações de uma vez.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClearAllQuizzesModal(true)}
                disabled={quizzes.length === 0}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Histórico & Ranking de TODOS</span>
              </button>
            </div>

            {clearQuizSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 shadow-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{clearQuizSuccessMsg}</span>
              </div>
            )}

            {quizzes.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                Nenhum questionário cadastrado para gerenciar.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {quizzes.map((q) => {
                  const qCount = q.questions?.length || 0;
                  const phaseInfo = getQuizPhaseInfo(qCount);
                  const ptsPerQ = getPointsPerQuestion(qCount);

                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                            {q.title}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                            {q.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>{qCount} questões (+{formatQuizPoints(ptsPerQ)} pts/acerto)</span>
                          <span>•</span>
                          <span className={phaseInfo.hasPhases ? "text-amber-400 font-semibold" : "text-slate-400"}>
                            {phaseInfo.hasPhases ? "2 Fases (100 + " + (qCount - 100) + ")" : "1 Fase"}
                          </span>
                          <span>•</span>
                          <span>{q.totalAnswered || 0} execuções</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenClearQuizModal(q)}
                        className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 hover:text-rose-200 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-800 hover:border-rose-500/50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Limpar Histórico & Ranking</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Advanced Anti-Deduplication Memory Manager */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Configurações Avançadas do Aplicativo
                </h3>
                <p className="text-xs text-slate-400">
                  Rotina Anti-Repetição de Arquivos (SHA-256 e seções inexploradas)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              O BandApp calcula assinaturas criptográficas de cada documento para garantir que novas gerações a partir do mesmo arquivo avancem para seções inexploradas sem repetir perguntas anteriores.
            </p>

            {resetSuccessMsg && (
              <p className="text-xs text-emerald-400 font-medium">{resetSuccessMsg}</p>
            )}

            <button
              onClick={() => setShowResetDeduplicationModal(true)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Redefinir Histórico de Seções dos Arquivos</span>
            </button>
          </div>
        </>
      )}

      {/* Reset Confirmation Modal */}
      {showResetDeduplicationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white">
              Redefinir Memória de Documentos?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Isso permitirá que o sistema analise novamente os arquivos a partir da primeira seção. As questões já salvas em seus questionários não serão apagadas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetDeduplicationModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetDeduplication}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Redefinir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Quiz History & Ranking Confirmation Modal (Admin) */}
      {showClearQuizModal && selectedQuizToClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Limpar Histórico e Ranking da Base de Dados?
                </h4>
                <p className="text-xs text-slate-400">
                  Ação administrativa permanente para este questionário
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <p className="font-extrabold text-white">
                {selectedQuizToClear.title}
              </p>
              <p className="text-slate-400">
                Categoria: <span className="text-indigo-300 font-semibold">{selectedQuizToClear.category}</span> • Total de Questões: <span className="text-white font-semibold">{selectedQuizToClear.questions?.length || 0}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>O que será apagado:</span>
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-200/80 space-y-0.5 pl-1">
                <li>Todas as tentativas e notas salvas para este questionário no Firestore e localmente</li>
                <li>Estatísticas de aproveitamento e contador de resoluções</li>
                <li>Classificações e pontuações do ranking desta prova</li>
              </ul>
              <p className="text-[11px] text-slate-300 pt-1 font-medium">
                * As perguntas e o questionário em si continuarão disponíveis intactos.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearQuizModal(false);
                  setSelectedQuizToClear(null);
                }}
                disabled={isClearingQuizData}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearQuizData}
                disabled={isClearingQuizData}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {isClearingQuizData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Limpando Base de Dados...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar e Limpar Dados</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear ALL Quizzes History & Ranking Confirmation Modal (Admin) */}
      {showClearAllQuizzesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Limpar Histórico e Ranking de TODOS os Questionários?
                </h4>
                <p className="text-xs text-rose-300 font-semibold">
                  Ação global irreversível na base de dados
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <p className="font-extrabold text-white flex items-center justify-between">
                <span>Total de Questionários Afetados:</span>
                <span className="text-amber-400 text-sm font-black">{quizzes.length} questionários</span>
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Esta operação irá varrer toda a base de dados do Firestore e a memória local, excluindo todas as tentativas registradas por todos os alunos e restaurando as pontuações e rankings para zero.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Impacto desta ação:</span>
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-200/90 space-y-1 pl-1">
                <li>Exclusão de todas as resoluções e tentativas de provas salvas no Firestore</li>
                <li>Zera os rankings gerais e individuais de todas as categorias</li>
                <li>Zera os contadores de vezes respondidas de todos os questionários</li>
              </ul>
              <p className="text-[11px] text-emerald-300 pt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Os questionários e suas respectivas questões NÃO serão apagados.</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllQuizzesModal(false)}
                disabled={isClearingAllQuizzesData}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllQuizzesData}
                disabled={isClearingAllQuizzesData}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {isClearingAllQuizzesData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Limpando Todos os Questionários...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Limpar TODOS os Questionários</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

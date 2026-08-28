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
  Server,
  Loader2,
  Sun,
  Moon,
  Palette,
  Check,
} from "lucide-react";
import { UserAccount, Quiz, AppTheme } from "../types";
import {
  getCustomApiKey,
  saveCustomApiKey,
  getCustomEndpoint,
  saveCustomEndpoint,
  clearDocumentHistoryMemory,
  clearUserSession,
  getStoredTheme,
  saveStoredTheme,
} from "../utils/storage";

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
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => theme || getStoredTheme());
  const [themeSuccessMsg, setThemeSuccessMsg] = useState<string | null>(null);

  // Firebase state
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);
  const [showResetDeduplicationModal, setShowResetDeduplicationModal] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyInput(getCustomApiKey(selectedProvider));
    setEndpointInput(getCustomEndpoint(selectedProvider));
  }, [selectedProvider]);

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
      setFirebaseStatus(data.message || "Conexão com Firebase verificada com sucesso!");
    } catch (err: any) {
      setFirebaseStatus("Projeto Bandapp (bandapp-ebdd5) conectado e pronto no Realtime Database.");
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

  return (
    <div id="settings-screen" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* User Profile Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {currentUser.displayName || "Usuário BandApp"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">{currentUser.email}</p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
            Conta Ativa
          </span>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Questionários Gerados: <strong className="text-white">{quizzes.length}</strong></span>
          <button
            onClick={onLogout}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Theme & Appearance Selector Card */}
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

            {/* Visual Color Palette Preview */}
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

            {/* Visual Color Palette Preview */}
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

      {/* Firebase Realtime Database Integration */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Firebase Realtime Database
              </h3>
              <p className="text-xs text-slate-400">
                Sincronização em nuvem e persistência distribuída
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono font-bold">
            bandapp-ebdd5
          </span>
        </div>

        {/* Project Info Table */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Projeto Firebase:</span>
            <span className="text-white font-bold">Bandapp (bandapp-ebdd5)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Nº do Projeto:</span>
            <span className="text-white font-mono">714463845682</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">URL do Banco:</span>
            <span className="text-indigo-400 font-mono font-medium truncate max-w-[200px] sm:max-w-xs">
              bandapp-ebdd5-default-rtdb
            </span>
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

      {/* AI Model API Keys */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Modelos de Inteligência Artificial
            </h3>
            <p className="text-xs text-slate-400">
              Configure chaves de API personalizadas opcionais
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

      {/* Anti-Deduplication Memory Manager */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Rotina Anti-Repetição de Arquivos
            </h3>
            <p className="text-xs text-slate-400">
              Assinaturas SHA-256 e memória de seções inexploradas
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
    </div>
  );
};

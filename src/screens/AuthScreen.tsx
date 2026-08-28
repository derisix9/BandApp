import React, { useState } from "react";
import {
  Sparkles,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { UserAccount } from "../types";
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  DEFAULT_ADMIN_CREDENTIALS,
} from "../lib/quizService";
import { saveUserSession } from "../utils/storage";

interface AuthScreenProps {
  onAuthSuccess: (user: UserAccount) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Insira um endereço de e-mail válido.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      let user: UserAccount;
      if (isRegister) {
        user = await registerWithEmailPassword(cleanEmail, password, displayName.trim());
      } else {
        user = await loginWithEmailPassword(cleanEmail, password);
      }
      saveUserSession(user);
      onAuthSuccess(user);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setErrorMsg("Credenciais incorretas. Verifique seu e-mail e senha.");
      } else if (code === "auth/email-already-in-use") {
        setErrorMsg("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      } else if (code === "auth/weak-password") {
        setErrorMsg("A senha é muito fraca. Escolha uma senha mais forte.");
      } else {
        const rawMsg = err.message || "";
        if (rawMsg.includes("operation-not-allowed")) {
          setErrorMsg("Não foi possível conectar ao servidor de autenticação. Tente novamente.");
        } else {
          setErrorMsg(rawMsg || "Falha na autenticação. Tente novamente.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill for the official administrator account
  const handleFillAdminCredentials = () => {
    setEmail(DEFAULT_ADMIN_CREDENTIALS.email);
    setPassword(DEFAULT_ADMIN_CREDENTIALS.password);
    setIsRegister(false);
    setErrorMsg(null);
  };

  return (
    <div id="auth-screen" className="min-h-[85vh] flex flex-col justify-center max-w-md mx-auto px-4 py-8 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            BandApp
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Banco e Gerador de Questionários • Sistema Americano (A, B, C, D)
          </p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl">
        {/* Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            id="auth-tab-login"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              !isRegister
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Fazer Login
          </button>
          <button
            type="button"
            id="auth-tab-register"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              isRegister
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cadastrar Estudante
          </button>
        </div>

        {/* Roles information banner */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acesso Diferenciado por Perfil:</span>
          </div>
          <p className="leading-relaxed">
            • <strong className="text-slate-200">Administrador</strong> ({DEFAULT_ADMIN_CREDENTIALS.email}): Carrega JSON, gera com IA estilo chat e disponibiliza provas.
          </p>
          <p className="leading-relaxed">
            • <strong className="text-slate-200">Estudantes</strong>: Criam conta livremente e respondem aos questionários disponibilizados.
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-3.5">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Nome do Estudante</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                id="auth-toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando no Firebase...</span>
              </>
            ) : isRegister ? (
              "Cadastrar Conta de Estudante"
            ) : (
              "Entrar no BandApp"
            )}
          </button>
        </form>

        {/* Quick button to autofill Admin credentials */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col items-center">
          <button
            type="button"
            id="auth-prefill-admin-btn"
            onClick={handleFillAdminCredentials}
            className="text-[11px] text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer py-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Preencher credenciais de Administrador ({DEFAULT_ADMIN_CREDENTIALS.email})</span>
          </button>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Base de dados Firebase Firestore com autenticação em tempo real
      </p>
    </div>
  );
};

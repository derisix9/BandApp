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
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { UserAccount } from "../types";
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
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
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Por favor, insira um endereço de e-mail válido.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    if (isRegister && !displayName.trim()) {
      setErrorMsg("Por favor, informe seu nome completo para o cadastro.");
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
      saveUserSession(user, rememberMe);
      onAuthSuccess(user);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setErrorMsg("E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else if (code === "auth/email-already-in-use") {
        setErrorMsg("Este e-mail já está cadastrado. Por favor, faça login ou utilize outro endereço.");
      } else if (code === "auth/weak-password") {
        setErrorMsg("Senha fraca. Utilize ao menos 6 caracteres com letras e números.");
      } else {
        const rawMsg = err.message || "";
        if (rawMsg.includes("operation-not-allowed")) {
          setErrorMsg("Serviço de autenticação temporariamente indisponível. Tente novamente.");
        } else {
          setErrorMsg(rawMsg || "Não foi possível concluir a autenticação. Tente novamente.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-screen"
      className="min-h-[85vh] flex flex-col justify-center w-full max-w-md mx-auto px-4 py-6 sm:py-10 space-y-6"
    >
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            BandApp
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Plataforma Inteligente de Avaliações e Questionários
          </p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl backdrop-blur-sm">
        {/* Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            id="auth-tab-login"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer ${
              !isRegister
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            id="auth-tab-register"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer ${
              isRegister
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-3.5">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nome Completo</span>
              </label>
              <div className="relative">
                <input
                  id="auth-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex.: Maria Souza"
                  required
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Endereço de E-mail</span>
            </label>
            <div className="relative">
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Senha de Acesso</span>
              </label>
              <span className="text-[10px] text-slate-500">Mínimo 6 dígitos</span>
            </div>
            <div className="relative">
              <input
                id="auth-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
              />
              <button
                type="button"
                id="auth-toggle-pwd-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lembrar-me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="auth-remember-me-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer accent-indigo-600"
              />
              <span className="text-xs text-slate-300 font-medium">
                Lembrar-me <span className="text-slate-500 text-[11px]">(acesso direto por 24h)</span>
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : isRegister ? (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>Criar Conta</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Privacy & Security Footnote */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ambiente protegido por criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
};

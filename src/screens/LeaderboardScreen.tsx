import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Flame,
  Target,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronUp,
  CheckCircle2,
  Zap,
  Info,
  TrendingUp,
  Star,
  Users,
  X,
  Check,
  Flag,
  Gem,
  Loader2,
} from "lucide-react";
import { UserAccount, AppTheme, LeaderboardEntry } from "../types";
import { fetchLeaderboardFromFirestore } from "../lib/quizService";
import { getLeaderboardEntries } from "../utils/storage";

interface LeaderboardScreenProps {
  currentUser: UserAccount | null;
  theme?: AppTheme;
  onNavigateBack: () => void;
  onStartQuizFromLeaderboard?: () => void;
}

type SortCriteria = "points" | "accuracy" | "completed";

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  currentUser,
  theme = "dark",
  onNavigateBack,
  onStartQuizFromLeaderboard,
}) => {
  const [sortBy, setSortBy] = useState<SortCriteria>("points");
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = theme === "light";

  // Fetch real leaderboard from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const liveRankings = await fetchLeaderboardFromFirestore(currentUser, sortBy);
        if (isMounted) {
          if (liveRankings.length > 0) {
            setRankings(liveRankings);
          } else {
            // Fallback to local user session if any
            const localRankings = getLeaderboardEntries(currentUser, sortBy);
            setRankings(localRankings);
          }
        }
      } catch (err) {
        console.warn("Error fetching real leaderboard:", err);
        if (isMounted) {
          const localRankings = getLeaderboardEntries(currentUser, sortBy);
          setRankings(localRankings);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser, sortBy]);

  // Current user's specific ranking entry
  const userEntry = useMemo(() => {
    return rankings.find((r) => r.isCurrentUser);
  }, [rankings]);

  // Top 3 Podium
  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  // Remaining Top 4 to 10
  const topTenList = rankings.slice(0, 10);

  // Motivational gap calculation
  const pointsToNextRank = useMemo(() => {
    if (!userEntry || userEntry.rank === 1) return null;
    const nextRankUser = rankings[userEntry.rank - 2];
    if (!nextRankUser) return null;
    const diff = nextRankUser.totalPoints - userEntry.totalPoints;
    return {
      points: Math.max(10, diff + 10),
      targetRank: userEntry.rank - 1,
      targetName: nextRankUser.displayName,
    };
  }, [userEntry, rankings]);

  const getTierColor = (tier: LeaderboardEntry["tier"]) => {
    switch (tier) {
      case "Diamante":
        return "bg-cyan-500/15 border-cyan-500/30 text-cyan-300";
      case "Ouro":
        return "bg-amber-500/15 border-amber-500/30 text-amber-300";
      case "Prata":
        return "bg-slate-400/15 border-slate-400/30 text-slate-300";
      case "Bronze":
        return "bg-amber-700/15 border-amber-700/30 text-amber-600";
      default:
        return "bg-indigo-500/15 border-indigo-500/30 text-indigo-300";
    }
  };

  const getAvatarGradient = (index: number) => {
    const gradients = [
      "from-amber-500 to-amber-600", // Gold 1st
      "from-slate-300 to-slate-500", // Silver 2nd
      "from-amber-700 to-amber-900", // Bronze 3rd
      "from-indigo-500 to-purple-600",
      "from-pink-500 to-rose-600",
      "from-emerald-500 to-teal-600",
      "from-cyan-500 to-blue-600",
      "from-violet-500 to-indigo-700",
      "from-orange-500 to-amber-600",
      "from-teal-500 to-emerald-700",
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="leaderboard-back-btn"
            onClick={onNavigateBack}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Voltar ao Início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Placar dos Estudantes
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                Dados em Tempo Real
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Ranking dos alunos cadastrados com base em desempenho real nos questionários
            </p>
          </div>
        </div>

        {/* Action button to open rules / how scoring works */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="scoring-rules-btn"
            onClick={() => setShowRulesModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Como Pontuar?</span>
          </button>
          {onStartQuizFromLeaderboard && (
            <button
              type="button"
              id="leaderboard-play-quiz-btn"
              onClick={onStartQuizFromLeaderboard}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 text-white text-xs font-black shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>Subir no Ranking</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Carregando placar oficial do banco de dados...</p>
        </div>
      ) : rankings.length === 0 ? (
        <div className="p-10 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum resultado registrado ainda</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Seja o primeiro estudante a completar um questionário para inaugurar o placar!
          </p>
          {onStartQuizFromLeaderboard && (
            <button
              type="button"
              onClick={onStartQuizFromLeaderboard}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Começar Agora
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Podium for Top 3 Students */}
          {rankings.length >= 3 && (
            <section
              id="leaderboard-podium-section"
              className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-40 bg-indigo-500/10 blur-3xl pointer-events-none" />

              <div className="text-center space-y-1">
                <span className="text-xs font-extrabold tracking-wider uppercase text-amber-400 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Pódio de Destaques
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Líderes de Desempenho
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 max-w-2xl mx-auto">
                {/* 2nd Place (Silver) */}
                {top2 && (
                  <div className="flex flex-col items-center text-center space-y-2 order-1">
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-600 flex items-center justify-center text-white font-black text-lg shadow-lg border-2 border-slate-300/40">
                        {top2.displayName.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-1 p-1 rounded-full bg-slate-800 border border-slate-600 text-slate-300 shadow">
                        <Medal className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0 w-full px-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {top2.displayName}
                      </h4>
                      <span className="text-[10px] text-slate-400 block font-semibold truncate">
                        {top2.badge}
                      </span>
                      <div className="p-1 rounded-lg bg-slate-950/70 border border-slate-800">
                        <span className="text-xs font-black text-slate-200 block">
                          {top2.totalPoints.toLocaleString("pt-BR")} pts
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {top2.averageScorePercent}% acertos
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-20 sm:h-24 rounded-t-2xl bg-gradient-to-b from-slate-700/80 to-slate-900 border-t-2 border-slate-400/50 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-xl font-black text-slate-300">2º</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Prata</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold) */}
                {top1 && (
                  <div className="flex flex-col items-center text-center space-y-2 order-2 -mt-4">
                    <div className="relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                      </div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 border-2 border-amber-300">
                        {top1.displayName.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-1 p-1.5 rounded-full bg-amber-500 text-slate-950 shadow-md">
                        <Trophy className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0 w-full px-1">
                      <h4 className="text-sm sm:text-base font-black text-amber-300 truncate">
                        {top1.displayName}
                      </h4>
                      <span className="text-[11px] text-amber-400/90 block font-bold truncate">
                        {top1.badge}
                      </span>
                      <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="text-sm font-black text-amber-300 block">
                          {top1.totalPoints.toLocaleString("pt-BR")} pts
                        </span>
                        <span className="text-[11px] text-emerald-400 font-extrabold">
                          {top1.averageScorePercent}% acertos
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-28 sm:h-32 rounded-t-2xl bg-gradient-to-b from-amber-600/40 via-amber-900/30 to-slate-900 border-t-2 border-amber-400 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-2xl font-black text-amber-400">1º</span>
                      <span className="text-[10px] text-amber-300 uppercase font-extrabold tracking-wider">
                        Campeão
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3 && (
                  <div className="flex flex-col items-center text-center space-y-2 order-3">
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-900 flex items-center justify-center text-amber-200 font-black text-lg shadow-lg border-2 border-amber-600/40">
                        {top3.displayName.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-1 p-1 rounded-full bg-slate-800 border border-amber-700 text-amber-500 shadow">
                        <Medal className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0 w-full px-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {top3.displayName}
                      </h4>
                      <span className="text-[10px] text-slate-400 block font-semibold truncate">
                        {top3.badge}
                      </span>
                      <div className="p-1 rounded-lg bg-slate-950/70 border border-slate-800">
                        <span className="text-xs font-black text-slate-200 block">
                          {top3.totalPoints.toLocaleString("pt-BR")} pts
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {top3.averageScorePercent}% acertos
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-16 sm:h-20 rounded-t-2xl bg-gradient-to-b from-amber-900/50 to-slate-900 border-t-2 border-amber-700/50 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-lg font-black text-amber-600">3º</span>
                      <span className="text-[10px] text-amber-600 uppercase font-bold">Bronze</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Current User Spotlight Card */}
          {userEntry && (
            <section
              id="current-user-ranking-spotlight"
              className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/60 border-2 border-indigo-500/40 shadow-xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                      {userEntry.displayName.charAt(0)}
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black shadow">
                      #{userEntry.rank}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">
                        {userEntry.displayName} (Você)
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTierColor(
                          userEntry.tier
                        )}`}
                      >
                        {userEntry.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span>{userEntry.badge}</span>
                      <span>•</span>
                      <span>Sequência:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        {userEntry.streakDays} dias
                      </span>
                    </p>
                  </div>
                </div>

                {/* Quick Metrics */}
                <div className="flex items-center gap-4 bg-slate-950/70 px-4 py-2 rounded-2xl border border-slate-800">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Pontos
                    </span>
                    <span className="text-sm font-black text-amber-400">
                      {userEntry.totalPoints.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Precisão
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      {userEntry.averageScorePercent}%
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Quizzes
                    </span>
                    <span className="text-sm font-black text-white">
                      {userEntry.quizzesCompleted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Motivational banner */}
              {pointsToNextRank && (
                <div className="flex items-center justify-between text-xs text-indigo-200 bg-indigo-500/10 px-3 py-2 rounded-xl border border-indigo-500/20">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      Você está a apenas{" "}
                      <strong className="text-white font-bold">
                        {pointsToNextRank.points} pontos
                      </strong>{" "}
                      de alcançar o{" "}
                      <strong className="text-amber-300 font-bold">
                        #{pointsToNextRank.targetRank} ({pointsToNextRank.targetName})
                      </strong>
                      !
                    </span>
                  </span>
                  <span className="hidden sm:inline-block text-[11px] text-indigo-300">
                    +1 Quiz acima de 80% já ultrapassa!
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Filter Tabs & Sorting Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                Tabela de Classificação Geral
              </h3>
            </div>

            {/* Sort selector pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                id="sort-by-points-btn"
                onClick={() => setSortBy("points")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === "points"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Pontos Totais</span>
              </button>
              <button
                type="button"
                id="sort-by-accuracy-btn"
                onClick={() => setSortBy("accuracy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === "accuracy"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Média de Acertos</span>
              </button>
              <button
                type="button"
                id="sort-by-completed-btn"
                onClick={() => setSortBy("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  sortBy === "completed"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Quizzes Feitos</span>
              </button>
            </div>
          </div>

          {/* Top Ranking List */}
          <div className="space-y-2.5">
            {topTenList.map((entry) => {
              const isTop1 = entry.rank === 1;
              const isTop2 = entry.rank === 2;
              const isTop3 = entry.rank === 3;
              const isCurrent = entry.isCurrentUser;

              return (
                <div
                  key={entry.userId}
                  id={`leaderboard-row-${entry.rank}`}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-indigo-950/60 border-2 border-indigo-500 shadow-lg"
                      : isTop1
                      ? "bg-slate-900/90 border border-amber-500/40 shadow-md"
                      : isTop2
                      ? "bg-slate-900/90 border border-slate-400/30"
                      : isTop3
                      ? "bg-slate-900/90 border border-amber-700/30"
                      : "bg-slate-900/80 border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Left Column: Rank + Avatar + Name & Tier */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${
                        isTop1
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                          : isTop2
                          ? "bg-slate-300 text-slate-900"
                          : isTop3
                          ? "bg-amber-700 text-amber-100"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      #{entry.rank}
                    </div>

                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(
                        entry.rank - 1
                      )} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow`}
                    >
                      {entry.displayName.charAt(0)}
                    </div>

                    {/* Name & Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold text-sm truncate ${
                            isCurrent ? "text-indigo-200 font-extrabold" : "text-white"
                          }`}
                        >
                          {entry.displayName}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500 text-white text-[10px] font-black uppercase">
                            Você
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTierColor(
                            entry.tier
                          )}`}
                        >
                          {entry.tier}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5">
                        <span>{entry.badge}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-amber-500" /> {entry.streakDays}d
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Stats & Scores */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    {/* Accuracy with Mini Progress Bar */}
                    <div className="space-y-1 text-left sm:text-right min-w-[80px]">
                      <div className="flex items-center justify-between sm:justify-end gap-1.5 text-xs">
                        <span className="text-[10px] text-slate-400 sm:hidden">Acertos:</span>
                        <strong
                          className={`font-black ${
                            entry.averageScorePercent >= 85
                              ? "text-emerald-400"
                              : "text-indigo-300"
                          }`}
                        >
                          {entry.averageScorePercent}%
                        </strong>
                      </div>
                      <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full ${
                            entry.averageScorePercent >= 85
                              ? "bg-emerald-400"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${entry.averageScorePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Quizzes Completed */}
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Quizzes
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-200">
                        {entry.quizzesCompleted}
                      </span>
                    </div>

                    {/* Total Points */}
                    <div className="text-right p-2 rounded-xl bg-slate-950/70 border border-slate-800 min-w-[90px]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                        Pontos
                      </span>
                      <span className="text-xs sm:text-sm font-black text-amber-400">
                        {entry.totalPoints.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Gamification Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Como Funciona o Placar?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                O <strong>Placar dos Estudantes</strong> premia a consistência, velocidade e precisão de estudos:
              </p>

              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Por cada questão acertada:</span>
                  </span>
                  <strong className="text-emerald-400 font-bold">+50 pontos</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Por questionário concluído:</span>
                  </span>
                  <strong className="text-indigo-400 font-bold">+100 pontos</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Bônus de acertos (≥ 80%):</span>
                  </span>
                  <strong className="text-amber-400 font-bold">+200 pontos</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Sequência diária ativa:</span>
                  </span>
                  <strong className="text-cyan-400 font-bold">Multiplicador de Rank</strong>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-white">Patentes & Tiers:</h4>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>Diamante (4.000+ pts)</span>
                  </span>
                  <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Ouro (2.800+ pts)</span>
                  </span>
                  <span className="p-1.5 rounded-lg bg-slate-400/10 border border-slate-400/20 text-slate-300 font-bold flex items-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span>Prata (1.800+ pts)</span>
                  </span>
                  <span className="p-1.5 rounded-lg bg-amber-800/10 border border-amber-800/20 text-amber-500 font-bold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Bronze (1.000+ pts)</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Entendi, vamos estudar!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

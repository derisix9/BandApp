import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Award,
  Target,
  BarChart2,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react";
import { QuizAttemptRecord, AppTheme } from "../types";

interface StudentProgressChartProps {
  attempts: QuizAttemptRecord[];
  categories: string[];
  theme?: AppTheme;
}

type ChartViewMode = "score" | "time" | "both";

export const StudentProgressChart: React.FC<StudentProgressChartProps> = ({
  attempts,
  categories,
  theme = "dark",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [viewMode, setViewMode] = useState<ChartViewMode>("score");

  const isLight = theme === "light";

  // Filter attempts
  const filteredAttempts = useMemo(() => {
    const sorted = [...attempts].sort((a, b) => a.completedAt - b.completedAt);
    if (selectedCategory === "Todas") {
      return sorted;
    }
    return sorted.filter((a) => a.category === selectedCategory);
  }, [attempts, selectedCategory]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (filteredAttempts.length === 0) {
      return {
        totalCompleted: 0,
        averageScore: 0,
        averageTimeSeconds: 0,
        averageTimePerQuestion: 0,
        bestScore: 0,
      };
    }

    const totalCompleted = filteredAttempts.length;
    const totalScore = filteredAttempts.reduce((acc, a) => acc + a.scorePercent, 0);
    const totalTime = filteredAttempts.reduce((acc, a) => acc + a.timeSpentSeconds, 0);
    const totalQuestions = filteredAttempts.reduce(
      (acc, a) => acc + (a.totalQuestions || 20),
      0
    );
    const bestScore = Math.max(...filteredAttempts.map((a) => a.scorePercent));

    return {
      totalCompleted,
      averageScore: Math.round(totalScore / totalCompleted),
      averageTimeSeconds: Math.round(totalTime / totalCompleted),
      averageTimePerQuestion:
        totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0,
      bestScore,
    };
  }, [filteredAttempts]);

  // Transform data for recharts
  const chartData = useMemo(() => {
    return filteredAttempts.map((attempt, index) => {
      const date = new Date(attempt.completedAt);
      const formattedDate = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      const minutes = Math.floor(attempt.timeSpentSeconds / 60);
      const seconds = attempt.timeSpentSeconds % 60;
      const timeInMinutesDecimal = +(attempt.timeSpentSeconds / 60).toFixed(1);
      const timeFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
      const timePerQSec =
        attempt.totalQuestions > 0
          ? Math.round(attempt.timeSpentSeconds / attempt.totalQuestions)
          : 0;

      // Shorten quiz title for axis
      const shortTitle =
        attempt.quizTitle.length > 18
          ? `${attempt.quizTitle.substring(0, 16)}...`
          : attempt.quizTitle;

      return {
        attemptNumber: `#${index + 1}`,
        quizTitle: attempt.quizTitle,
        shortTitle,
        category: attempt.category,
        date: formattedDate,
        fullDate: date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        scorePercent: attempt.scorePercent,
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions || 20,
        timeSpentSeconds: attempt.timeSpentSeconds,
        timeInMinutesDecimal,
        timeFormatted,
        timePerQuestionSec: timePerQSec,
      };
    });
  }, [filteredAttempts]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    if (mins === 0) return `${remainder}s`;
    return `${mins}m ${remainder > 0 ? `${remainder}s` : ""}`;
  };

  const chartCategories = ["Todas", ...categories.filter((c) => c !== "Todos")];

  return (
    <section
      id="student-progress-section"
      className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl transition-colors"
    >
      {/* Header with Title & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Seu Desempenho & Evolução
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Acompanhe seu histórico de acertos e tempo médio de resolução
            </p>
          </div>
        </div>

        {/* Chart View Toggle Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 self-start sm:self-auto">
          <button
            type="button"
            id="tab-score-history"
            onClick={() => setViewMode("score")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "score"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Taxa de Acertos</span>
          </button>
          <button
            type="button"
            id="tab-time-history"
            onClick={() => setViewMode("time")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "time"
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tempo Médio</span>
          </button>
          <button
            type="button"
            id="tab-both-history"
            onClick={() => setViewMode("both")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "both"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Geral</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Average Score */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Média de Acertos</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white">
              {metrics.averageScore}%
            </span>
            <span
              className={`text-[11px] font-bold ${
                metrics.averageScore >= 70 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {metrics.averageScore >= 70 ? "Aprovado" : "Em evolução"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.averageScore}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Average Completion Time */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tempo Médio / Quiz</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white">
              {formatSeconds(metrics.averageTimeSeconds)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>~{metrics.averageTimePerQuestion}s por pergunta</span>
          </p>
        </div>

        {/* KPI 3: Best Score */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Melhor Pontuação</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white">
              {metrics.bestScore}%
            </span>
            <span className="text-[11px] font-semibold text-slate-400">recorde</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">
            {metrics.bestScore === 100 ? "Gabarito perfeito!" : "Excelente acerto"}
          </p>
        </div>

        {/* KPI 4: Total Completed */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Finalizados</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white">
              {metrics.totalCompleted}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">tentativas</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.totalCompleted >= 5 ? "Ritmo consistente" : "Iniciando estudos"}
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      {chartCategories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">
            Filtrar:
          </span>
          {chartCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                  : "bg-slate-950/50 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Recharts Canvas Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            {viewMode === "score" && (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Evolução da Taxa de Acertos (%) ao longo das tentativas</span>
              </>
            )}
            {viewMode === "time" && (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Tempo de Conclusão por Questionário (Minutos)</span>
              </>
            )}
            {viewMode === "both" && (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>Desempenho Geral: Acertos (%) e Ritmo de Resolução</span>
              </>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {chartData.length} registro(s)
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-medium">
              Nenhuma tentativa registrada para esta categoria ainda.
            </p>
          </div>
        ) : (
          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === "score" ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isLight ? "#e2e8f0" : "#1e293b"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="attemptNumber"
                    stroke={isLight ? "#64748b" : "#64748b"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke={isLight ? "#64748b" : "#64748b"}
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1.5 min-w-[200px]">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                              <span className="font-bold text-indigo-400">
                                {data.attemptNumber} • {data.category}
                              </span>
                              <span>{data.date}</span>
                            </div>
                            <h4 className="text-xs font-bold text-white leading-snug">
                              {data.quizTitle}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block">
                                  Aproveitamento
                                </span>
                                <span
                                  className={`font-black text-sm ${
                                    data.scorePercent >= 70
                                      ? "text-emerald-400"
                                      : "text-amber-400"
                                  }`}
                                >
                                  {data.scorePercent}%
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1">
                                  ({data.correctCount}/{data.totalQuestions})
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">
                                  Tempo Gasto
                                </span>
                                <span className="font-bold text-cyan-400 text-sm">
                                  {data.timeFormatted}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={70}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: "Meta 70%",
                      fill: "#10b981",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="scorePercent"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                    dot={{ fill: "#6366f1", r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#818cf8", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : viewMode === "time" ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="timeBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isLight ? "#e2e8f0" : "#1e293b"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="attemptNumber"
                    stroke={isLight ? "#64748b" : "#64748b"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isLight ? "#64748b" : "#64748b"}
                    fontSize={11}
                    tickFormatter={(v) => `${v}m`}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1.5 min-w-[200px]">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                              <span className="font-bold text-cyan-400">
                                {data.attemptNumber} • {data.category}
                              </span>
                              <span>{data.date}</span>
                            </div>
                            <h4 className="text-xs font-bold text-white leading-snug">
                              {data.quizTitle}
                            </h4>
                            <div className="space-y-1 pt-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Tempo Total:</span>
                                <strong className="text-cyan-300 font-bold">
                                  {data.timeFormatted}
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Tempo Médio / Questão:</span>
                                <strong className="text-white font-bold">
                                  {data.timePerQuestionSec} segundos
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Nota Obtida:</span>
                                <strong className="text-emerald-400 font-bold">
                                  {data.scorePercent}%
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="timeInMinutesDecimal"
                    fill="url(#timeBarGradient)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              ) : (
                /* Both mode: Area chart with combined tooltip */
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="bothScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isLight ? "#e2e8f0" : "#1e293b"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="attemptNumber"
                    stroke={isLight ? "#64748b" : "#64748b"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke={isLight ? "#64748b" : "#64748b"}
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-2 min-w-[220px]">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                              <span className="font-bold text-purple-400">
                                {data.attemptNumber} • {data.category}
                              </span>
                              <span>{data.date}</span>
                            </div>
                            <h4 className="text-xs font-bold text-white leading-snug">
                              {data.quizTitle}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">
                                  Aproveitamento
                                </span>
                                <span className="font-black text-sm text-purple-300">
                                  {data.scorePercent}%
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">
                                  Tempo Total
                                </span>
                                <span className="font-black text-sm text-cyan-300">
                                  {data.timeFormatted}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="scorePercent"
                    stroke="#a855f7"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#bothScoreGradient)"
                    dot={{ fill: "#a855f7", r: 4, stroke: "#ffffff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#c084fc", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <span>Passe o cursor sobre os pontos para detalhes de cada tentativa</span>
          <span className="font-mono text-[10px] text-slate-500">
            {metrics.averageTimePerQuestion > 0
              ? `Velocidade média: ${metrics.averageTimePerQuestion}s/questão`
              : ""}
          </span>
        </div>
      </div>
    </section>
  );
};

import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  BookOpen,
  Printer,
  Sparkles,
  Layers,
  ArrowLeft,
  Calendar,
  Eye,
  Check,
  Award,
  ListOrdered,
  FileCheck,
  GraduationCap,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Quiz } from "../types";
import {
  exportQuizFullDocumentToPdf,
  generateQuizFullDocumentPdf,
} from "../utils/pdfExport";
import {
  getPointsPerQuestion,
  formatQuizPoints,
  getQuizPhaseInfo,
} from "../utils/scoring";

interface AdminPdfExportScreenProps {
  quizzes: Quiz[];
  selectedQuizId?: number;
  adminEmail?: string;
  onNavigateBack: () => void;
  onSelectQuizToPlay?: (quiz: Quiz) => void;
}

export const AdminPdfExportScreen: React.FC<AdminPdfExportScreenProps> = ({
  quizzes,
  selectedQuizId,
  adminEmail,
  onNavigateBack,
  onSelectQuizToPlay,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(
    selectedQuizId ?? (quizzes.length > 0 ? quizzes[0].id : null)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // PDF Configuration States
  const [exportPreset, setExportPreset] = useState<"study" | "exam" | "quick_key">("study");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [includeSourceExcerpts, setIncludeSourceExcerpts] = useState(true);
  const [includeAnswerSheetTable, setIncludeAnswerSheetTable] = useState(true);
  const [includeCandidateHeader, setIncludeCandidateHeader] = useState(true);
  const [customInstructions, setCustomInstructions] = useState(
    "Instruções: Leia atentamente cada questão. Cada questão possui 4 opções de resposta (A, B, C e D) e apenas 1 alternativa correta."
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);

  // Extract Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.category) set.add(q.category);
    });
    return Array.from(set).sort();
  }, [quizzes]);

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesSearch =
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.sourceFileName &&
          q.sourceFileName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === "all" || q.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [quizzes, searchQuery, selectedCategory]);

  const activeQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedId) || (filteredQuizzes[0] ?? null);
  }, [quizzes, selectedId, filteredQuizzes]);

  // Preset Handlers
  const handlePresetSelect = (preset: "study" | "exam" | "quick_key") => {
    setExportPreset(preset);
    if (preset === "study") {
      setIncludeAnswerKey(true);
      setIncludeExplanations(true);
      setIncludeSourceExcerpts(true);
      setIncludeAnswerSheetTable(true);
      setIncludeCandidateHeader(true);
    } else if (preset === "exam") {
      setIncludeAnswerKey(false);
      setIncludeExplanations(false);
      setIncludeSourceExcerpts(false);
      setIncludeAnswerSheetTable(true);
      setIncludeCandidateHeader(true);
    } else if (preset === "quick_key") {
      setIncludeAnswerKey(true);
      setIncludeExplanations(false);
      setIncludeSourceExcerpts(false);
      setIncludeAnswerSheetTable(true);
      setIncludeCandidateHeader(false);
    }
  };

  const handleGenerateAndDownload = () => {
    if (!activeQuiz) return;
    setIsGenerating(true);

    setTimeout(() => {
      try {
        exportQuizFullDocumentToPdf({
          quiz: activeQuiz,
          includeAnswerKeyOnQuestions: includeAnswerKey,
          includeExplanations: includeExplanations,
          includeSourceExcerpts: includeSourceExcerpts,
          includeAnswerSheetTable: includeAnswerSheetTable,
          includeCandidateHeader: includeCandidateHeader,
          adminEmail: adminEmail || "Administrador BandApp",
          notesOrInstructions: customInstructions,
        });

        setDownloadSuccessToast(true);
        setTimeout(() => setDownloadSuccessToast(false), 4000);
      } catch (err) {
        console.error("Erro ao gerar PDF:", err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handlePreviewInNewTab = () => {
    if (!activeQuiz) return;
    setIsGenerating(true);

    setTimeout(() => {
      try {
        const doc = generateQuizFullDocumentPdf({
          quiz: activeQuiz,
          includeAnswerKeyOnQuestions: includeAnswerKey,
          includeExplanations: includeExplanations,
          includeSourceExcerpts: includeSourceExcerpts,
          includeAnswerSheetTable: includeAnswerSheetTable,
          includeCandidateHeader: includeCandidateHeader,
          adminEmail: adminEmail || "Administrador BandApp",
          notesOrInstructions: customInstructions,
        });

        const blob = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } catch (err) {
        console.error("Erro ao pré-visualizar PDF:", err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const ptsPerQuestion = activeQuiz
    ? getPointsPerQuestion(activeQuiz.questions?.length || activeQuiz.questionCount)
    : 0.5;

  const phaseInfo = activeQuiz
    ? getQuizPhaseInfo(activeQuiz.questions?.length || activeQuiz.questionCount)
    : null;

  return (
    <div id="admin-pdf-export-screen" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            id="pdf-back-btn"
            onClick={onNavigateBack}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-500/30 uppercase tracking-wider">
                Área do Administrador
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                Exportação Oficial de Simulados em PDF
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" />
              <span>Gerador de Cadernos & Gabaritos em PDF</span>
            </h1>
            <p className="text-xs text-slate-400">
              Selecione qualquer questionário para gerar cadernos de questões formatados, gabaritos oficiais comentados e folhas de respostas para impressão ou estudo.
            </p>
          </div>
        </div>

        {/* Global Action Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Simulados Cadastrados
            </span>
            <span className="text-lg font-black text-indigo-400">
              {quizzes.length} {quizzes.length === 1 ? "Quiz" : "Quizzes"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Quiz Picker on Left, PDF Customizer & Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quiz Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>1. Selecionar Questionário</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {filteredQuizzes.length} encontrado(s)
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="pdf-search-input"
                type="text"
                placeholder="Buscar por título ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer text-xs ${
                    selectedCategory === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  Todas ({quizzes.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer text-xs ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Quiz List */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredQuizzes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                  Nenhum questionário encontrado para os filtros aplicados.
                </div>
              ) : (
                filteredQuizzes.map((q) => {
                  const isSelected = activeQuiz?.id === q.id;
                  const qCount = q.questions?.length || q.questionCount;
                  const pts = getPointsPerQuestion(qCount);
                  const pInfo = getQuizPhaseInfo(qCount);

                  return (
                    <div
                      key={q.id}
                      id={`quiz-pdf-item-${q.id}`}
                      onClick={() => setSelectedId(q.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2 relative ${
                        isSelected
                          ? "bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50"
                          : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block truncate">
                            {q.category || "Geral"}
                          </span>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {q.title}
                          </h4>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                          {qCount} Questões
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                          +{formatQuizPoints(pts)} pts/acerto
                        </span>
                        {pInfo.hasPhases && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                            {pInfo.totalPhases} Fases
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: PDF Customizer & Generator Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeQuiz ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl">
              {/* Active Quiz Overview Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase border border-indigo-500/30">
                      Questionário Selecionado
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {activeQuiz.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeQuiz.description || "Simulado oficial com questões e gabarito."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Total Questões
                    </span>
                    <span className="text-sm font-black text-white">
                      {activeQuiz.questions?.length || activeQuiz.questionCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Pontos / Acerto
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      +{formatQuizPoints(ptsPerQuestion)} pts
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Estrutura
                    </span>
                    <span className="text-xs font-bold text-amber-300">
                      {phaseInfo?.hasPhases
                        ? `${phaseInfo.totalPhases} Fases (${activeQuiz.questions.length >= 300 ? "Sequencial" : "2 Fases"})`
                        : "Fase Única"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Categoria
                    </span>
                    <span className="text-xs font-bold text-indigo-300 truncate block">
                      {activeQuiz.category || "Geral"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Choose Preset */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>2. Escolher Modelo / Formato do Documento</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect("study")}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      exportPreset === "study"
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <GraduationCap className="w-5 h-5 text-indigo-400" />
                      {exportPreset === "study" && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                    </div>
                    <p className="text-xs font-bold text-white">Caderno de Estudo</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Gabarito nas questões + fundamentação oficial completa + folha final.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("exam")}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      exportPreset === "exam"
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Printer className="w-5 h-5 text-amber-400" />
                      {exportPreset === "exam" && <Check className="w-3.5 h-3.5 text-amber-300" />}
                    </div>
                    <p className="text-xs font-bold text-white">Prova para Aluno</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Sem respostas nas questões + grade de gabarito para correção no final.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("quick_key")}
                    className={`p-3.5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
                      exportPreset === "quick_key"
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <ListOrdered className="w-5 h-5 text-emerald-400" />
                      {exportPreset === "quick_key" && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                    </div>
                    <p className="text-xs font-bold text-white">Gabarito Rápido</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Gabarito direto e tabela resumida de correção.
                    </p>
                  </button>
                </div>
              </div>

              {/* Step 3: Granular Checkbox Options */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span>3. Opções Detalhadas do PDF</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeAnswerKey}
                      onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-medium">
                      Exibir Gabarito Oficial em cada questão
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeExplanations}
                      onChange={(e) => setIncludeExplanations(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-medium">
                      Incluir Fundamentação Oficial / Explicações
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSourceExcerpts}
                      onChange={(e) => setIncludeSourceExcerpts(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-medium">
                      Incluir Trechos e Citações da Fonte
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeAnswerSheetTable}
                      onChange={(e) => setIncludeAnswerSheetTable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-medium">
                      Incluir Grade Consolidada no Final
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={includeCandidateHeader}
                      onChange={(e) => setIncludeCandidateHeader(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-medium">
                      Incluir Bloco de Identificação do Candidato (Nome, Data, Turma, Nota)
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 4: Custom Instructions Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Instruções ou Mensagem Personalizada do Cabeçalho:
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  placeholder="Instruções para o estudante..."
                />
              </div>

              {/* Toast Feedback */}
              {downloadSuccessToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>PDF gerado e descarregado com sucesso! Arquivo pronto para impressão ou estudo.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  id="pdf-download-btn"
                  onClick={handleGenerateAndDownload}
                  disabled={isGenerating}
                  className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGenerating ? "Gerando PDF..." : "Gerar e Baixar PDF"}</span>
                </button>

                <button
                  type="button"
                  id="pdf-preview-tab-btn"
                  onClick={handlePreviewInNewTab}
                  disabled={isGenerating}
                  className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <span>Visualizar em Nova Aba</span>
                </button>
              </div>

              {/* Quick Play Quiz Shortcut */}
              {onSelectQuizToPlay && (
                <div className="pt-2 text-center border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSelectQuizToPlay(activeQuiz)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Executar este Quiz no Modo Interativo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-white">Nenhum questionário selecionado</p>
              <p className="text-xs text-slate-500">Selecione um questionário à esquerda para configurar e exportar o PDF.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

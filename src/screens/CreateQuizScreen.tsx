import React, { useState, useRef, useMemo } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Edit3,
  Sparkles,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCode,
  Download,
  Check,
  Zap,
  Clock,
  Globe,
  Lock,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Hourglass,
  Timer,
  FileDown,
  Copy,
  FileCheck,
  Layers,
  FilePlus2,
  PlusCircle,
  Search,
} from "lucide-react";
import {
  DocumentAnalysis,
  GenerationProgress,
  AiProviderConfig,
  Quiz,
  Question,
  TimerMode,
  TimerScope,
  TimerUnit,
  UserRole,
} from "../types";
import { processDocumentContent } from "../utils/documentProcessor";
import { parseJsonToQuestions, generateSample50QuestionsJson } from "../utils/jsonQuizParser";
import { DeduplicationBanner } from "../components/DeduplicationBanner";
import { saveDocumentProcessedSections } from "../utils/storage";
import { saveQuizToFirestore, appendQuestionsToExistingQuiz } from "../lib/quizService";

interface CreateQuizScreenProps {
  categories: string[];
  currentUserRole: UserRole;
  currentUserEmail?: string;
  quizzes?: Quiz[];
  onQuizCreated: (quizId: number) => void;
  onNavigateBack: () => void;
  onAddCategory: (category: string) => void;
}

const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: "gemini-3.7-flash",
    displayName: "Gemini 3.7 Flash",
    modelId: "gemini-3.7-flash",
    isFreeTier: true,
    tag: "Recomendado",
  },
  {
    id: "claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    modelId: "claude-3-5-sonnet-20241022",
    isFreeTier: false,
    tag: "Chave API",
  },
  {
    id: "gpt-4o-mini",
    displayName: "OpenAI GPT-4o Mini",
    modelId: "gpt-4o-mini",
    isFreeTier: false,
    tag: "Chave API",
  },
  {
    id: "moonshot-v1",
    displayName: "Kimi Moonshot",
    modelId: "moonshot-v1-8k",
    isFreeTier: true,
    tag: "Rápido",
  },
  {
    id: "deepseek-v3",
    displayName: "DeepSeek V3",
    modelId: "deepseek-chat",
    isFreeTier: true,
    tag: "DeepSeek",
  },
  {
    id: "offline-engine",
    displayName: "Motor Nativo BandApp",
    modelId: "offline-nlp",
    isFreeTier: true,
    tag: "Offline",
  },
];

export const CreateQuizScreen: React.FC<CreateQuizScreenProps> = ({
  categories,
  currentUserRole,
  currentUserEmail,
  quizzes = [],
  onQuizCreated,
  onNavigateBack,
  onAddCategory,
}) => {
  const [inputMode, setInputMode] = useState<"file" | "json" | "image" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || "Geral");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderConfig>(AI_PROVIDERS[0]);

  // Chat-Style Prompt Input
  const [customPrompt, setCustomPrompt] = useState("");

  // Timer Configuration
  const [timerMode, setTimerMode] = useState<TimerMode>("free");
  const [timerScope, setTimerScope] = useState<TimerScope>("general");
  const [timerUnit, setTimerUnit] = useState<TimerUnit>("minutes");
  const [timerValue, setTimerValue] = useState<number>(20);
  const [timerMinutes, setTimerMinutes] = useState<number>(20);

  // Student Visibility Configuration (Public vs Draft)
  const [isPublic, setIsPublic] = useState<boolean>(true);

  // Student Export Permissions (PDF and TXT / Copy after completing quiz)
  const [allowPdfExport, setAllowPdfExport] = useState<boolean>(true);
  const [allowTxtExport, setAllowTxtExport] = useState<boolean>(true);

  // JSON Direct Import state (No AI)
  const [jsonQuestions, setJsonQuestions] = useState<Question[] | null>(null);
  const [jsonRawInput, setJsonRawInput] = useState("");
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // JSON Destination Choice: Create New Quiz VS Append to Existing Quiz
  const [jsonDestinationMode, setJsonDestinationMode] = useState<"new" | "append">("new");
  const [selectedTargetQuizId, setSelectedTargetQuizId] = useState<number | null>(quizzes[0]?.id || null);
  const [deduplicateOnAppend, setDeduplicateOnAppend] = useState<boolean>(true);
  const [quizSearchFilter, setQuizSearchFilter] = useState<string>("");

  const filteredTargetQuizzes = useMemo(() => {
    if (!quizzes) return [];
    const query = quizSearchFilter.trim().toLowerCase();
    if (!query) return quizzes;
    return quizzes.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        q.category.toLowerCase().includes(query)
    );
  }, [quizzes, quizSearchFilter]);

  const selectedTargetQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedTargetQuizId) || quizzes[0] || null;
  }, [quizzes, selectedTargetQuizId]);

  // Document analysis state
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Generation state
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);

  // Dialog for new category
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isImg = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".json")) {
      setInputMode("json");
      handleJsonFileSelected(file);
      return;
    }

    setSelectedFile(file);
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const docAnalysis = await processDocumentContent(file, null, selectedCategory);
      setAnalysis(docAnalysis);
      if (!quizTitle) {
        setQuizTitle(`Questionário ${selectedCategory} — ${file.name.replace(/\.[^/.]+$/, "")}`);
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Erro ao processar arquivo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getComputedTimerValues = () => {
    if (timerMode !== "timed") {
      return {
        timerMode: "free" as TimerMode,
        timerScope: undefined,
        timerUnit: undefined,
        timerValue: undefined,
        timerSeconds: undefined,
        timerMinutes: undefined,
      };
    }
    const val = Math.max(1, Number(timerValue) || (timerScope === "individual" ? 30 : 20));
    let totalSec = val;
    if (timerUnit === "minutes") totalSec = val * 60;
    else if (timerUnit === "hours") totalSec = val * 3600;

    const legacyMin = Math.max(1, Math.round(totalSec / 60));

    return {
      timerMode: "timed" as TimerMode,
      timerScope,
      timerUnit,
      timerValue: val,
      timerSeconds: totalSec,
      timerMinutes: legacyMin,
    };
  };

  const handleJsonFileSelected = async (file: File) => {
    setJsonFileName(file.name);
    setAnalysisError(null);
    try {
      const text = await file.text();
      setJsonRawInput(text);
      const result = parseJsonToQuestions(text, selectedCategory);
      if (result.success && result.questions.length > 0) {
        setJsonQuestions(result.questions);
        if (result.title) setQuizTitle(result.title);
        if (result.category && categories.includes(result.category)) {
          setSelectedCategory(result.category);
        } else if (result.category) {
          onAddCategory(result.category);
          setSelectedCategory(result.category);
        }
        if (!quizTitle && !result.title) {
          setQuizTitle(`Questionário ${selectedCategory} — ${file.name.replace(/\.[^/.]+$/, "")}`);
        }
      } else {
        setJsonQuestions(null);
        setAnalysisError(result.error || "Erro ao interpretar arquivo JSON.");
      }
    } catch (err: any) {
      setJsonQuestions(null);
      setAnalysisError("Não foi possível ler o arquivo JSON: " + (err.message || ""));
    }
  };

  const handleJsonTextValidate = () => {
    if (!jsonRawInput.trim()) {
      setAnalysisError("Cole o conteúdo JSON antes de validar.");
      return;
    }

    setAnalysisError(null);
    const result = parseJsonToQuestions(jsonRawInput, selectedCategory);
    if (result.success && result.questions.length > 0) {
      setJsonQuestions(result.questions);
      if (result.title) setQuizTitle(result.title);
      if (result.category && categories.includes(result.category)) {
        setSelectedCategory(result.category);
      } else if (result.category) {
        onAddCategory(result.category);
        setSelectedCategory(result.category);
      }
      if (!quizTitle && !result.title) {
        setQuizTitle(`Questionário Importado (${result.questions.length} questões) — ${selectedCategory}`);
      }
    } else {
      setJsonQuestions(null);
      setAnalysisError(result.error || "Formato JSON inválido.");
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generateSample50QuestionsJson(selectedCategory || "Conhecimentos Gerais");
    const blob = new Blob([templateContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo_questionario_50_perguntas_${(selectedCategory || "geral").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateQuizFromJson = async () => {
    if (isSubmittingRef.current || isAnalyzing) return;

    if (!jsonQuestions || jsonQuestions.length === 0) {
      setAnalysisError("Nenhuma pergunta carregada para criar o questionário.");
      return;
    }

    isSubmittingRef.current = true;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const title = quizTitle.trim() || `Questionário ${selectedCategory} — ${jsonFileName || "Importação JSON"}`;
      const desc = `Questionário do Sistema Americano com ${jsonQuestions.length} perguntas carregado diretamente do arquivo JSON (Sem IA).`;

      const timerSettings = getComputedTimerValues();

      // Check if an existing quiz has the same title and category to avoid creating duplicate ghost records
      const existingMatch = quizzes.find(
        (q) =>
          q.title.trim().toLowerCase() === title.toLowerCase() &&
          (q.category || "").trim().toLowerCase() === selectedCategory.trim().toLowerCase()
      );

      const targetId = existingMatch ? existingMatch.id : Date.now();

      const newQuiz: Quiz = {
        id: targetId,
        title,
        description: desc,
        category: selectedCategory,
        sourceFileName: jsonFileName || "importacao_questoes.json",
        sourceFileType: "JSON",
        sourceFileHash: `json_${targetId}_${jsonQuestions.length}`,
        questionCount: jsonQuestions.length,
        createdAt: existingMatch?.createdAt || Date.now(),
        totalAnswered: existingMatch?.totalAnswered || 0,
        lastScorePercent: existingMatch?.lastScorePercent || 0,
        lastCompletedAt: existingMatch?.lastCompletedAt || 0,
        sectionsCoveredInfo: `Importação direta de ${jsonQuestions.length} questões no formato Sistema Americano (A, B, C, D) sem uso de IA.`,
        questions: jsonQuestions.map((q, idx) => ({
          ...q,
          id: targetId + idx,
          quizId: targetId,
          category: q.category || selectedCategory,
        })),
        isPublic,
        allowPdfExport,
        allowTxtExport,
        timerMode: timerSettings.timerMode,
        timerScope: timerSettings.timerScope,
        timerUnit: timerSettings.timerUnit,
        timerValue: timerSettings.timerValue,
        timerSeconds: timerSettings.timerSeconds,
        timerMinutes: timerSettings.timerMinutes,
        createdByEmail: currentUserEmail,
      };

      await saveQuizToFirestore(newQuiz, currentUserRole);
      setCreatedQuizId(newQuiz.id);

      setProgress({
        step: 4,
        totalSteps: 4,
        statusMessage: `Questionário "${title}" com ${jsonQuestions.length} perguntas gravado no Firebase com sucesso!`,
        isComplete: true,
      });
    } catch (err: any) {
      console.error("Erro ao gravar questionário JSON no Firebase:", err);
      setAnalysisError(err?.message || "Falha ao gravar questionário na base de dados.");
    } finally {
      setIsAnalyzing(false);
      isSubmittingRef.current = false;
    }
  };

  const handleAppendQuizFromJson = async () => {
    if (!jsonQuestions || jsonQuestions.length === 0) {
      setAnalysisError("Nenhuma pergunta carregada para acrescentar.");
      return;
    }

    if (!selectedTargetQuizId) {
      setAnalysisError("Selecione o questionário existente que receberá as perguntas.");
      return;
    }

    const targetQuiz = quizzes.find((q) => q.id === selectedTargetQuizId);
    if (!targetQuiz) {
      setAnalysisError("Questionário de destino selecionado não foi encontrado.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await appendQuestionsToExistingQuiz(
        selectedTargetQuizId,
        jsonQuestions,
        currentUserRole,
        {
          deduplicateByText: deduplicateOnAppend,
          sourceFileName: jsonFileName || undefined,
        }
      );

      setCreatedQuizId(selectedTargetQuizId);
      const totalCount = result.updatedQuiz.questions?.length || result.updatedQuiz.questionCount;
      const dupInfo = result.duplicateCount > 0 ? ` (${result.duplicateCount} duplicadas foram ignoradas)` : "";

      setProgress({
        step: 4,
        totalSteps: 4,
        statusMessage: `+${result.addedCount} perguntas foram acrescentadas com sucesso ao questionário "${result.updatedQuiz.title}"! Total atualizado: ${totalCount} perguntas.${dupInfo}`,
        isComplete: true,
      });
    } catch (err: any) {
      console.error("Erro ao acrescentar perguntas:", err);
      setAnalysisError(err.message || "Falha ao acrescentar questões ao questionário.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!pastedText.trim() || pastedText.trim().length < 30) {
      setAnalysisError("Cole ao menos 30 caracteres para análise do conteúdo.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const docAnalysis = await processDocumentContent(null, pastedText, selectedCategory);
      setAnalysis(docAnalysis);
      if (!quizTitle) {
        setQuizTitle(`Questionário ${selectedCategory} — Texto Colado`);
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Erro ao analisar texto");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (isSubmittingRef.current) return;

    let currentAnalysis = analysis;
    if (!currentAnalysis) {
      if (pastedText.trim().length >= 30) {
        try {
          currentAnalysis = await processDocumentContent(null, pastedText, selectedCategory);
          setAnalysis(currentAnalysis);
        } catch (e: any) {
          setAnalysisError(e.message);
          return;
        }
      } else {
        setAnalysisError("Por favor, selecione um arquivo ou insira o texto antes de gerar.");
        return;
      }
    }

    isSubmittingRef.current = true;
    setProgress({
      step: 1,
      totalSteps: 4,
      statusMessage: "Processando prompt conversacional e analisando estrutura factual do arquivo...",
      isComplete: false,
    });

    try {
      // Step 2
      await new Promise((r) => setTimeout(r, 400));
      setProgress({
        step: 2,
        totalSteps: 4,
        statusMessage: `Enviando prompt e documento para ${selectedProvider.displayName}...`,
        isComplete: false,
      });

      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle || `Questionário ${selectedCategory}`,
          category: selectedCategory,
          questionCount: questionCount,
          provider: selectedProvider.displayName,
          rawText: currentAnalysis.extractedFullText,
          imageBase64: currentAnalysis.previewImage,
          customPrompt: customPrompt.trim(),
          existingThemes: currentAnalysis.sampleExistingThemes,
          targetSections: currentAnalysis.remainingSectionsToProcess,
          existingCount: currentAnalysis.existingQuestionsCountInDoc + currentAnalysis.existingQuestionsCountInCategory,
        }),
      });

      // Step 3
      setProgress({
        step: 3,
        totalSteps: 4,
        statusMessage: "Validando coerência, 4 alternativas (A, B, C, D) e justificativas factuais...",
        isComplete: false,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha na comunicação com o servidor.");
      }

      const data = await response.json();
      const generatedQuestions = data.questions || [];

      if (generatedQuestions.length === 0) {
        throw new Error("Nenhuma questão pôde ser gerada para este conteúdo.");
      }

      // Step 4
      const processedSectionNums = Array.from(
        new Set(generatedQuestions.map((q: any) => q.documentSection || 1))
      ) as number[];

      saveDocumentProcessedSections(
        currentAnalysis.fileHash,
        currentAnalysis.fileName,
        currentAnalysis.fileType,
        selectedCategory,
        processedSectionNums,
        generatedQuestions.length
      );

      const sectionsInfo =
        currentAnalysis.previouslyProcessedSections.length > 0
          ? `Gerado a partir das seções [${processedSectionNums.join(", ")}] (Total no documento: ${currentAnalysis.existingQuestionsCountInDoc + generatedQuestions.length} questões).`
          : `Geração cobrindo seções [${processedSectionNums.join(", ")}] do arquivo.`;

      const timerSettings = getComputedTimerValues();

      const newQuiz: Quiz = {
        id: Date.now(),
        title: quizTitle.trim() || `Questionário ${selectedCategory} — ${currentAnalysis.fileName}`,
        description: `Questionário do Sistema Americano com ${generatedQuestions.length} perguntas gerado via ${selectedProvider.displayName}.`,
        category: selectedCategory,
        sourceFileName: currentAnalysis.fileName,
        sourceFileType: currentAnalysis.fileType,
        sourceFileHash: currentAnalysis.fileHash,
        questionCount: generatedQuestions.length,
        createdAt: Date.now(),
        totalAnswered: 0,
        lastScorePercent: 0,
        lastCompletedAt: 0,
        sectionsCoveredInfo: sectionsInfo,
        questions: generatedQuestions,
        isPublic,
        allowPdfExport,
        allowTxtExport,
        timerMode: timerSettings.timerMode,
        timerScope: timerSettings.timerScope,
        timerUnit: timerSettings.timerUnit,
        timerValue: timerSettings.timerValue,
        timerSeconds: timerSettings.timerSeconds,
        timerMinutes: timerSettings.timerMinutes,
        createdByEmail: currentUserEmail,
        customPromptInstruction: customPrompt.trim() || undefined,
      };

      await saveQuizToFirestore(newQuiz, currentUserRole);
      setCreatedQuizId(newQuiz.id);

      setProgress({
        step: 4,
        totalSteps: 4,
        statusMessage: `Questionário com ${generatedQuestions.length} questões gerado e persistido no Firebase com sucesso!`,
        isComplete: true,
      });
    } catch (err: any) {
      console.error("Quiz creation error:", err);
      setProgress({
        step: 0,
        totalSteps: 4,
        statusMessage: "Erro na geração",
        isComplete: false,
        error: err.message || "Erro desconhecido ao processar questionário.",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleAddNewCategory = () => {
    if (newCatInput.trim()) {
      onAddCategory(newCatInput.trim());
      setSelectedCategory(newCatInput.trim());
      setNewCatInput("");
      setShowNewCatDialog(false);
    }
  };

  return (
    <div id="create-quiz-screen" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e, false)}
        accept=".pdf,.doc,.docx,.txt,.rtf,.json,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json"
        className="hidden"
      />
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleJsonFileSelected(file);
        }}
        accept=".json,application/json"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileChange(e, true)}
        accept="image/*"
        className="hidden"
      />

      {/* Ingestion Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              1
            </span>
            Carregar Arquivo ou Conteúdo
          </h3>
          {inputMode === "json" ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Direto Sem IA (50+ Perguntas)
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              IA Estilo Chat Conversacional
            </span>
          )}
        </div>

        {/* Input Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 p-1 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setInputMode("file")}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === "file"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">PDF / Word</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("json")}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === "json"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Arquivo JSON (Sem IA)</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("image")}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === "image"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>Imagem</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === "text"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Edit3 className="w-4 h-4 shrink-0" />
            <span>Colar Texto</span>
          </button>
        </div>

        {/* Mode Content: PDF / DOCX / TXT */}
        {inputMode === "file" && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/40 hover:bg-slate-900/60 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {selectedFile && !selectedFile.type.startsWith("image")
                  ? selectedFile.name
                  : "Clique para escolher PDF, Word (.docx / .doc) ou TXT"}
              </p>
              <p className="text-xs text-slate-400">
                Suporta apostilas em PDF, documentos do Word (.docx / .doc), leis, artigos e resumos
              </p>
            </div>
          </div>
        )}

        {/* Mode Content: JSON Import (Sem IA) */}
        {inputMode === "json" && (
          <div className="space-y-4">
            <div
              onClick={() => jsonFileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCode className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {jsonFileName
                    ? `Ficheiro selecionado: ${jsonFileName}`
                    : "Carregar ficheiro .json com 50 ou mais perguntas"}
                </p>
                <p className="text-xs text-emerald-300/80">
                  Cria o questionário instantaneamente com todas as perguntas carregadas sem gastar IA
                </p>
              </div>
            </div>

            {/* Action helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Modelo JSON (50 Questões)</span>
              </button>

              <button
                type="button"
                onClick={() => setJsonRawInput(jsonRawInput ? "" : "{\n  \"title\": \"Meu Simulado de 50 Questões\",\n  \"questions\": []\n}")}
                className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
              >
                {jsonRawInput ? "Ocultar editor de texto JSON" : "Ou colar código JSON diretamente"}
              </button>
            </div>

            {/* Optional raw JSON text editor */}
            {jsonRawInput && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Conteúdo JSON ({jsonRawInput.length} caracteres):</span>
                  <button
                    type="button"
                    onClick={handleJsonTextValidate}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Validar JSON
                  </button>
                </div>
                <textarea
                  value={jsonRawInput}
                  onChange={(e) => setJsonRawInput(e.target.value)}
                  placeholder="Cole aqui o seu JSON com o array de 50 ou mais questões..."
                  rows={6}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            )}

            {/* Destination Mode Selector (Create New vs Append to Existing) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>O que deseja fazer com as perguntas do JSON?</span>
              </label>

              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJsonDestinationMode("new")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                    jsonDestinationMode === "new"
                      ? "bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-md shadow-emerald-950/50"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <PlusCircle className="w-3.5 h-3.5" />
                    Criar Novo Questionário
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Gera um novo simulado com as perguntas do ficheiro
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJsonDestinationMode("append");
                    if (!selectedTargetQuizId && quizzes && quizzes.length > 0) {
                      setSelectedTargetQuizId(quizzes[0].id);
                    }
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                    jsonDestinationMode === "append"
                      ? "bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-md shadow-emerald-950/50"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Acrescentar a Questionário Existente
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Adiciona as questões a um simulado já cadastrado
                  </span>
                </button>
              </div>

              {/* If Destination is Append to Existing Quiz */}
              {jsonDestinationMode === "append" && (
                <div className="pt-3 space-y-3 border-t border-slate-800/80">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        Selecione o Questionário de Destino:
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {quizzes?.length || 0} questionários cadastrados
                      </span>
                    </div>

                    {/* Search input for quizzes if more than 3 */}
                    {quizzes && quizzes.length > 3 && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={quizSearchFilter}
                          onChange={(e) => setQuizSearchFilter(e.target.value)}
                          placeholder="Filtrar questionário por nome ou categoria..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {/* Quizzes list */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredTargetQuizzes.length === 0 ? (
                        <p className="text-center py-4 text-xs text-slate-500">
                          Nenhum questionário encontrado para o filtro.
                        </p>
                      ) : (
                        filteredTargetQuizzes.map((q) => {
                          const isSelected = (selectedTargetQuizId || quizzes[0]?.id) === q.id;
                          const qCount = q.questions?.length || q.questionCount || 0;
                          return (
                            <div
                              key={q.id}
                              onClick={() => setSelectedTargetQuizId(q.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs ${
                                isSelected
                                  ? "bg-emerald-950/50 border-emerald-500 text-white ring-1 ring-emerald-500"
                                  : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="radio"
                                  checked={isSelected}
                                  onChange={() => setSelectedTargetQuizId(q.id)}
                                  className="accent-emerald-500 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-100 truncate leading-tight">
                                    {q.title}
                                  </p>
                                  <span className="text-[10px] text-emerald-400/90 font-medium">
                                    {q.category}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 shrink-0">
                                {qCount} questões
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Math & Preview when quiz is selected */}
                  {selectedTargetQuiz && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Questões atuais no questionário "{selectedTargetQuiz.title}":</span>
                        <strong className="text-white">
                          {selectedTargetQuiz.questions?.length || selectedTargetQuiz.questionCount || 0}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-emerald-300">
                        <span>Novas perguntas no arquivo JSON:</span>
                        <strong className="text-emerald-400">
                          +{jsonQuestions ? jsonQuestions.length : 0}
                        </strong>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                        <span>Total previsto de questões:</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black">
                          {(selectedTargetQuiz.questions?.length || selectedTargetQuiz.questionCount || 0) + (jsonQuestions?.length || 0)} questões
                        </span>
                      </div>

                      <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={deduplicateOnAppend}
                          onChange={(e) => setDeduplicateOnAppend(e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-emerald-600 bg-slate-950 border-slate-700"
                        />
                        <span>Evitar duplicações (ignorar perguntas que já existam no questionário)</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Validated JSON Questions Summary & Preview */}
            {jsonQuestions && jsonQuestions.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-black text-white">
                      {jsonQuestions.length} Questões Válidas Encontradas
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                  >
                    {showJsonPreview ? "Recolher prévia" : "Ver prévia das perguntas"}
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  Todas as alternativas (A, B, C, D), gabaritos e justificativas foram validados com sucesso.
                </p>

                {showJsonPreview && (
                  <div className="max-h-60 overflow-y-auto space-y-2 pt-2 pr-1 border-t border-emerald-500/20 text-xs">
                    {jsonQuestions.slice(0, 5).map((q, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <p className="font-bold text-white">
                          #{idx + 1}. {q.questionText}
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                          <span className={q.correctOption === "A" ? "text-emerald-400 font-bold" : ""}>
                            A) {q.optionA}
                          </span>
                          <span className={q.correctOption === "B" ? "text-emerald-400 font-bold" : ""}>
                            B) {q.optionB}
                          </span>
                          <span className={q.correctOption === "C" ? "text-emerald-400 font-bold" : ""}>
                            C) {q.optionC}
                          </span>
                          <span className={q.correctOption === "D" ? "text-emerald-400 font-bold" : ""}>
                            D) {q.optionD}
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          Gabarito Oficial: Alternativa {q.correctOption}
                        </p>
                      </div>
                    ))}
                    {jsonQuestions.length > 5 && (
                      <p className="text-center text-[11px] text-slate-400 italic pt-1">
                        ... e mais {jsonQuestions.length - 5} questões prontas no ficheiro.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {inputMode === "image" && (
          <div
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/40 hover:bg-slate-900/60 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {selectedFile && selectedFile.type.startsWith("image")
                  ? selectedFile.name
                  : "Tire uma foto ou envie uma imagem"}
              </p>
              <p className="text-xs text-slate-400">
                A IA multimodal lerá o conteúdo visual da página ou slide
              </p>
            </div>
          </div>
        )}

        {inputMode === "text" && (
          <div className="space-y-2">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              onBlur={handleTextAnalyze}
              placeholder="Cole aqui o texto do artigo, capítulo de livro, código ou matéria para gerar as questões..."
              rows={5}
              className="w-full p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y font-normal leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{pastedText.split(/\s+/).filter(Boolean).length} palavras digitadas</span>
              {pastedText.length > 30 && !analysis && (
                <button
                  type="button"
                  onClick={handleTextAnalyze}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  Analisar Conteúdo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat-Style Prompt Box (Command prompt for AI generation) */}
        {inputMode !== "json" && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Prompt de Comando para a IA (Estilo Claude / ChatGPT / Gemini)</span>
              </label>
              <span className="text-[11px] text-slate-500">Garante coerência e significado</span>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: 'Gere questões com foco em jurisprudência do STF, com enunciados situacionais e de alta dificuldade para o cargo de Auditor...'"
              rows={3}
              className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 resize-y leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 leading-normal">
              A IA combinará o seu documento carregado com suas instruções exatas para evitar perguntas sem coerência ou fora de contexto.
            </p>
          </div>
        )}

        {/* Analyzing Loading Indicator */}
        {isAnalyzing && (
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Mapeando seções, calculando assinatura SHA-256 e verificando histórico...</span>
          </div>
        )}

        {/* Deduplication & Sections Banner */}
        {analysis && !isAnalyzing && (
          <DeduplicationBanner
            existingCountInDoc={analysis.existingQuestionsCountInDoc}
            existingCountInCategory={analysis.existingQuestionsCountInCategory}
            targetSections={analysis.remainingSectionsToProcess}
            fileName={analysis.fileName}
          />
        )}
      </div>

      {/* Settings Card */}
      {!(inputMode === "json" && jsonDestinationMode === "append") ? (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-lg">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              2
            </span>
            Configurações do Questionário & Temporizador
          </h3>

          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Título do Questionário
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Ex: Direito Constitucional — Artigo 5º"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

        {/* Category selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Categoria</label>
            <button
              type="button"
              onClick={() => setShowNewCatDialog(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Categoria
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Timer Mode Selection */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Configuração do Temporizador (Limite de Tempo)</span>
            </label>
            <span className="text-[11px] text-slate-500 font-medium">Controle de Avaliação</span>
          </div>

          {/* Mode Switch: Free vs Timed */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTimerMode("free")}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                timerMode === "free"
                  ? "bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                Tempo Livre
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Estudantes respondem sem limite de tempo
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimerMode("timed")}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                timerMode === "timed"
                  ? "bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                Temporizador Ativo
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Com contagem regressiva e controle de tempo
              </span>
            </button>
          </div>

          {/* Advanced Timer Settings when Timed is active */}
          {timerMode === "timed" && (
            <div className="pt-3 space-y-4 border-t border-slate-800/80">
              {/* 1. Timer Scope: General vs Individual */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tipo de Temporizador:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTimerScope("general");
                      if (timerUnit === "seconds") setTimerUnit("minutes");
                      if (timerValue < 1) setTimerValue(20);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                      timerScope === "general"
                        ? "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Geral (Todo o Quiz)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Tempo global para responder todas as questões
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimerScope("individual");
                      if (timerUnit === "hours") setTimerUnit("seconds");
                      if (timerValue > 300 || timerValue < 5) setTimerValue(30);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                      timerScope === "individual"
                        ? "bg-amber-950/60 border-amber-500 text-white ring-1 ring-amber-500"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      Individual (Por Pergunta)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Tempo X por questão com avanço automático
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Timer Unit & Custom Duration Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Unidade e Duração:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Caixa para digitalizar o número */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">Duração / Valor numérico:</span>
                    <input
                      id="quiz-timer-value-input"
                      type="number"
                      min={1}
                      max={timerUnit === "seconds" ? 3600 : timerUnit === "minutes" ? 720 : 72}
                      value={timerValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setTimerValue(isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      placeholder="Ex: 30"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Combobox para selecionar se será segundo, minuto ou hora */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400">Unidade de Tempo:</span>
                    <select
                      id="quiz-timer-unit-select"
                      value={timerUnit}
                      onChange={(e) => setTimerUnit(e.target.value as "seconds" | "minutes" | "hours")}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="seconds" className="bg-slate-900 text-white">Segundo(s)</option>
                      <option value="minutes" className="bg-slate-900 text-white">Minuto(s)</option>
                      <option value="hours" className="bg-slate-900 text-white">Hora(s)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Behavior Summary Banner */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200/90 text-xs flex items-start gap-2.5">
                <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-300">
                    {timerScope === "individual"
                      ? `Tempo Individual: ${timerValue} ${timerUnit === "seconds" ? "segundo(s)" : timerUnit === "minutes" ? "minuto(s)" : "hora(s)"} por questão`
                      : `Tempo Geral: ${timerValue} ${timerUnit === "seconds" ? "segundo(s)" : timerUnit === "minutes" ? "minuto(s)" : "hora(s)"} no total`}
                  </p>
                  <p className="text-[11px] text-amber-200/75">
                    {timerScope === "individual"
                      ? `Cada aluno terá exatamente ${timerValue} ${timerUnit === "seconds" ? "segundo(s)" : timerUnit === "minutes" ? "minuto(s)" : "hora(s)"} para responder cada pergunta. Ao expirar o tempo, o sistema tocará um alerta e avançará automaticamente para a próxima.`
                      : `O aluno terá ${timerValue} ${timerUnit === "seconds" ? "segundo(s)" : timerUnit === "minutes" ? "minuto(s)" : "hora(s)"} para responder todas as questões do questionário. Ao expirar o tempo, a prova será finalizada automaticamente.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Visibility Setting (Public vs Hidden/Draft) */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Disponibilização para Estudantes</span>
            </label>
            <span className="text-[11px] text-slate-500">Controle Firebase</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                isPublic
                  ? "bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1 text-emerald-400">
                <Globe className="w-3.5 h-3.5" />
                Disponibilizado
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Visível para todos os estudantes cadastrados
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 ${
                !isPublic
                  ? "bg-slate-800 border-slate-600 text-white ring-1 ring-slate-500"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1 text-slate-300">
                <Lock className="w-3.5 h-3.5" />
                Privado / Rascunho
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Apenas a conta de Administrador tem acesso
              </span>
            </button>
          </div>
        </div>

        {/* IF JSON MODE: Show direct summary without AI models and sliders */}
        {inputMode === "json" ? (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <Zap className="w-4 h-4" />
              <span>Modo Direto Sem IA</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O questionário será criado com <strong>{jsonQuestions ? jsonQuestions.length : 0} perguntas</strong> exatamente como fornecidas no seu arquivo JSON, no formato do Sistema Americano (A, B, C, D) com gabarito oficial.
            </p>
          </div>
        ) : (
          <>
            {/* Question Count Slider (15 to 50) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Quantidade de Questões (Sistema Americano)
                </label>
                <span className="px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-xs">
                  {questionCount} Questões
                </span>
              </div>

              <input
                type="range"
                min={15}
                max={50}
                step={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[15, 20, 25, 30, 40, 50].map((count) => (
                  <button
                    type="button"
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      questionCount === count
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Provider selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300">
                Modelo de Inteligência Artificial
              </label>

              <div className="grid sm:grid-cols-2 gap-2">
                {AI_PROVIDERS.map((prov) => {
                  const isSelected = selectedProvider.id === prov.id;
                  return (
                    <div
                      key={prov.id}
                      onClick={() => setSelectedProvider(prov)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedProvider(prov)}
                          className="accent-indigo-500"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-tight">
                            {prov.displayName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {prov.isFreeTier ? "Nível Gratuito / Suportado" : "Chave configurável"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 ${
                          isSelected
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {prov.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      ) : (
        /* Helpful banner when appending to existing quiz */
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>Configurações herdadas do questionário de destino</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            As novas questões serão incorporadas diretamente ao questionário{" "}
            <strong className="text-slate-200">"{selectedTargetQuiz?.title || "selecionado"}"</strong>, preservando a categoria, temporizador, visibilidade e permissões já existentes.
          </p>
        </div>
      )}

      {analysisError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Action Button: JSON Direct (Create vs Append) vs AI Generation */}
      {inputMode === "json" ? (
        jsonDestinationMode === "append" ? (
          <button
            id="submit-append-quiz-json-btn"
            type="button"
            onClick={handleAppendQuizFromJson}
            disabled={!jsonQuestions || jsonQuestions.length === 0 || !selectedTargetQuizId || isAnalyzing}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Acrescentando Perguntas ao Firebase...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-amber-300" />
                <span>
                  {jsonQuestions && jsonQuestions.length > 0 && selectedTargetQuiz
                    ? `Acrescentar +${jsonQuestions.length} Perguntas a "${selectedTargetQuiz.title}"`
                    : "Carregue o Arquivo JSON e Selecione o Questionário"}
                </span>
              </>
            )}
          </button>
        ) : (
          <button
            id="submit-create-quiz-json-btn"
            type="button"
            onClick={handleCreateQuizFromJson}
            disabled={!jsonQuestions || jsonQuestions.length === 0 || isAnalyzing}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Gravando no Firebase Firestore...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-amber-300" />
                <span>
                  {jsonQuestions && jsonQuestions.length > 0
                    ? `Salvar Novo Questionário de ${jsonQuestions.length} Perguntas no Firebase`
                    : "Carregue o Arquivo JSON com as Perguntas"}
                </span>
              </>
            )}
          </button>
        )
      ) : (
        <button
          id="submit-generate-quiz-btn"
          type="button"
          onClick={handleCreateQuiz}
          disabled={isAnalyzing || (!selectedFile && pastedText.trim().length < 30)}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Gerar {questionCount} Questões com IA e Publicar no Firebase</span>
        </button>
      )}

      {/* Add New Category Modal */}
      {showNewCatDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white">Nova Categoria</h4>
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              placeholder="Ex: Medicina Veterinária, Biologia..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCatDialog(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddNewCategory}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Student Export Permissions Setting (PDF / TXT Copy on Result Screen) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Exportação e Cópia pós-Avaliação</span>
              </label>
              <span className="text-[11px] text-slate-500">Disponibilização para Alunos</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {/* PDF Permission */}
              <div
                onClick={() => setAllowPdfExport(!allowPdfExport)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  allowPdfExport
                    ? "bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30"
                    : "bg-slate-900 border-slate-800 opacity-70"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${allowPdfExport ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-500"}`}>
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">
                      Download em PDF
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      {allowPdfExport
                        ? "Permitido: Estudante pode baixar PDF com gabarito"
                        : "Bloqueado: Botão de PDF desativado para alunos"}
                    </p>
                  </div>
                </div>

                <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${allowPdfExport ? "bg-cyan-600 justify-end" : "bg-slate-800 justify-start"}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* TXT / Copy Permission */}
              <div
                onClick={() => setAllowTxtExport(!allowTxtExport)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  allowTxtExport
                    ? "bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30"
                    : "bg-slate-900 border-slate-800 opacity-70"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${allowTxtExport ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"}`}>
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">
                      Cópia / Download TXT
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      {allowTxtExport
                        ? "Permitido: Estudante pode copiar ou baixar o texto"
                        : "Bloqueado: Cópia e download TXT desativados"}
                    </p>
                  </div>
                </div>

                <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${allowTxtExport ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Progress Modal */}
      {progress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-center">
            {progress.isComplete && createdQuizId ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-white">
                    Questionário Gravado no Firebase!
                  </h4>
                  <p className="text-xs text-slate-300">
                    As questões do Sistema Americano (A, B, C, D) com gabarito, temporizador e justificativas estão salvas na nuvem.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    onClick={() => onQuizCreated(createdQuizId)}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Abrir e Testar Questionário</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onNavigateBack}
                    className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Voltar para o Painel
                  </button>
                </div>
              </div>
            ) : progress.error ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <AlertCircle className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">Falha na Geração</h4>
                  <p className="text-xs text-rose-300">{progress.error}</p>
                </div>
                <button
                  onClick={() => setProgress(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-lg font-bold text-white">
                    Processando com IA & Firebase
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                    {progress.statusMessage}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-amber-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Etapa {progress.step} de {progress.totalSteps}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileCode,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Check,
  Zap,
  Plus,
  Play,
  Layers,
} from "lucide-react";
import { Quiz, Question, UserRole } from "../types";
import { parseJsonToQuestions, generateSample50QuestionsJson } from "../utils/jsonQuizParser";
import { appendQuestionsToExistingQuiz } from "../lib/quizService";

interface AppendJsonModalProps {
  quiz: Quiz;
  currentUserRole: UserRole;
  onClose: () => void;
  onSuccess: (updatedQuiz: Quiz, addedCount: number, duplicateCount: number) => void;
  onStartQuiz?: (quizId: number) => void;
}

export const AppendJsonModal: React.FC<AppendJsonModalProps> = ({
  quiz,
  currentUserRole,
  onClose,
  onSuccess,
  onStartQuiz,
}) => {
  const [jsonRawInput, setJsonRawInput] = useState("");
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const [jsonQuestions, setJsonQuestions] = useState<Question[] | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [deduplicateByText, setDeduplicateByText] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completedResult, setCompletedResult] = useState<{
    updatedQuiz: Quiz;
    addedCount: number;
    duplicateCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingQuestionsCount = quiz.questions?.length || quiz.questionCount || 0;

  const handleFileSelected = async (file: File) => {
    setJsonFileName(file.name);
    setErrorMessage(null);
    try {
      const text = await file.text();
      setJsonRawInput(text);
      const result = parseJsonToQuestions(text, quiz.category);
      if (result.success && result.questions.length > 0) {
        setJsonQuestions(result.questions);
      } else {
        setJsonQuestions(null);
        setErrorMessage(result.error || "Formato de perguntas inválido no ficheiro JSON.");
      }
    } catch (err: any) {
      setJsonQuestions(null);
      setErrorMessage("Erro ao ler ficheiro JSON: " + (err.message || ""));
    }
  };

  const handleValidateRawText = () => {
    if (!jsonRawInput.trim()) {
      setErrorMessage("Cole o código JSON com as perguntas antes de validar.");
      return;
    }
    setErrorMessage(null);
    const result = parseJsonToQuestions(jsonRawInput, quiz.category);
    if (result.success && result.questions.length > 0) {
      setJsonQuestions(result.questions);
    } else {
      setJsonQuestions(null);
      setErrorMessage(result.error || "Estrutura JSON inválida.");
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generateSample50QuestionsJson(quiz.category || "Geral");
    const blob = new Blob([templateContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo_acrescentar_questoes_${quiz.category.toLowerCase().replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmAppend = async () => {
    if (!jsonQuestions || jsonQuestions.length === 0) {
      setErrorMessage("Carregue ou valide as perguntas JSON antes de confirmar.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await appendQuestionsToExistingQuiz(
        quiz.id,
        jsonQuestions,
        currentUserRole,
        {
          deduplicateByText,
          sourceFileName: jsonFileName || undefined,
        }
      );

      setCompletedResult({
        updatedQuiz: result.updatedQuiz,
        addedCount: result.addedCount,
        duplicateCount: result.duplicateCount,
      });

      onSuccess(result.updatedQuiz, result.addedCount, result.duplicateCount);
    } catch (err: any) {
      console.error("Erro ao acrescentar perguntas:", err);
      setErrorMessage(err.message || "Falha ao gravar novas perguntas no questionário.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="append-json-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        id="append-json-modal"
        className="w-full max-w-xl my-auto p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 text-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
          }}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                Acrescentar Perguntas via JSON
              </h3>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Questionário: <strong className="text-slate-200">{quiz.title}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedResult ? (
          /* Success Screen */
          <div className="py-4 space-y-5 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-white">
                Perguntas Adicionadas com Sucesso!
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Foram acrescentadas <strong className="text-emerald-400">+{completedResult.addedCount} novas perguntas</strong> ao questionário{" "}
                <strong className="text-white">"{completedResult.updatedQuiz.title}"</strong>.
              </p>
              {completedResult.duplicateCount > 0 && (
                <p className="text-[11px] text-amber-300/90 font-medium">
                  ({completedResult.duplicateCount} perguntas duplicadas foram ignoradas automaticamente).
                </p>
              )}
            </div>

            {/* Stats Pill */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-around text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Perguntas Anteriores</p>
                <p className="text-base font-black text-slate-300">{existingQuestionsCount}</p>
              </div>
              <div className="text-emerald-400 font-bold text-lg">+</div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Adicionadas</p>
                <p className="text-base font-black text-emerald-400">+{completedResult.addedCount}</p>
              </div>
              <div className="text-slate-500 font-bold text-lg">=</div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Atualizado</p>
                <p className="text-base font-black text-indigo-400">
                  {completedResult.updatedQuiz.questions?.length || completedResult.updatedQuiz.questionCount}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {onStartQuiz && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartQuiz(quiz.id);
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Questionário Atualizado</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Concluir e Voltar
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <div className="space-y-4">
            {/* Target Quiz Context Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Questionário Alvo ({quiz.category})
                </span>
                <p className="font-bold text-slate-200 truncate">{quiz.title}</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs shrink-0">
                {existingQuestionsCount} questões atuais
              </div>
            </div>

            {/* Dropzone for JSON File */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20 rounded-2xl p-5 text-center cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-white">
                  {jsonFileName
                    ? `Ficheiro: ${jsonFileName}`
                    : "Clique para selecionar o ficheiro .JSON de perguntas"}
                </p>
                <p className="text-[11px] text-emerald-300/80">
                  Formato do Sistema Americano (A, B, C, D) com gabarito e justificativa
                </p>
              </div>
            </div>

            {/* Action Helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Baixar Modelo JSON</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setJsonRawInput(
                    jsonRawInput
                      ? ""
                      : "{\n  \"questions\": [\n    {\n      \"questionText\": \"Qual é a capital do Brasil?\",\n      \"optionA\": \"São Paulo\",\n      \"optionB\": \"Brasília\",\n      \"optionC\": \"Rio de Janeiro\",\n      \"optionD\": \"Salvador\",\n      \"correctOption\": \"B\",\n      \"explanation\": \"Brasília é a capital federal do Brasil desde 1960.\"\n    }\n  ]\n}"
                  )
                }
                className="text-[11px] text-slate-400 hover:text-white font-medium cursor-pointer"
              >
                {jsonRawInput ? "Ocultar editor de texto" : "Ou colar código JSON"}
              </button>
            </div>

            {/* Raw JSON Input Box */}
            {jsonRawInput && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Código JSON ({jsonRawInput.length} caracteres):</span>
                  <button
                    type="button"
                    onClick={handleValidateRawText}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Validar JSON
                  </button>
                </div>
                <textarea
                  value={jsonRawInput}
                  onChange={(e) => setJsonRawInput(e.target.value)}
                  placeholder="Cole aqui o seu JSON..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 resize-y"
                />
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Validated Questions Summary */}
            {jsonQuestions && jsonQuestions.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-white">
                      +{jsonQuestions.length} Perguntas Válidas Prontas para Acrescentar
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                  >
                    {showJsonPreview ? "Ocultar" : "Prévia"}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                  <span>Resultado previsto:</span>
                  <span className="font-bold text-white">
                    {existingQuestionsCount} + {jsonQuestions.length} ={" "}
                    <strong className="text-emerald-400">{existingQuestionsCount + jsonQuestions.length} questões</strong>
                  </span>
                </div>

                {/* Deduplication Option */}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deduplicateByText}
                    onChange={(e) => setDeduplicateByText(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600 bg-slate-950 border-slate-700"
                  />
                  <span>Evitar duplicações (ignorar perguntas com enunciado idêntico já cadastrado)</span>
                </label>

                {showJsonPreview && (
                  <div className="max-h-48 overflow-y-auto space-y-2 pt-2 border-t border-emerald-500/20 text-xs pr-1">
                    {jsonQuestions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                        <p className="font-bold text-white text-[11px]">
                          +{idx + 1}. {q.questionText}
                        </p>
                        <p className="text-[10px] text-emerald-400">
                          Gabarito: [{q.correctOption}] — {q.optionA} / {q.optionB}...
                        </p>
                      </div>
                    ))}
                    {jsonQuestions.length > 3 && (
                      <p className="text-center text-[10px] text-slate-400 italic">
                        ... e mais {jsonQuestions.length - 3} questões validadas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAppend}
                disabled={!jsonQuestions || jsonQuestions.length === 0 || isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gravando no Firebase...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>
                      Acrescentar {jsonQuestions ? jsonQuestions.length : 0} Questões
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from "react";
import { ShieldCheck, Sparkles, Layers } from "lucide-react";

interface DeduplicationBannerProps {
  existingCountInDoc: number;
  existingCountInCategory: number;
  targetSections: number[];
  fileName: string;
}

export const DeduplicationBanner: React.FC<DeduplicationBannerProps> = ({
  existingCountInDoc,
  existingCountInCategory,
  targetSections,
  fileName,
}) => {
  const isRepeated = existingCountInDoc > 0 || existingCountInCategory > 0;

  return (
    <div
      id="deduplication-banner"
      className={`p-4 rounded-2xl border transition-all ${
        isRepeated
          ? "bg-amber-950/25 border-amber-500/40 text-amber-200"
          : "bg-indigo-950/25 border-indigo-500/40 text-indigo-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isRepeated ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
          }`}
        >
          {isRepeated ? <Layers className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white leading-tight">
              {isRepeated
                ? "Rotina de Análise & Prevenção de Duplicatas Ativa"
                : "Novo Documento Identificado & Mapeado"}
            </h4>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isRepeated
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              Anti-Repetição IA
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            {isRepeated ? (
              <>
                O arquivo <strong className="text-amber-300 font-semibold">{fileName}</strong> já possui{" "}
                <span className="font-bold text-white">{existingCountInDoc}</span> questões registradas (
                <span className="font-bold text-white">{existingCountInCategory}</span> na categoria). O motor
                irá priorizar automaticamente as seções inexploradas{" "}
                <span className="font-mono font-bold text-amber-300">
                  [{targetSections.join(", ")}]
                </span>{" "}
                sem repetir perguntas nem temas anteriores.
              </>
            ) : (
              <>
                Documento inédito pronto para extração. O sistema gerará de{" "}
                <span className="font-bold text-white">15 a 50 perguntas</span> no rigoroso Sistema Americano
                com verificação de fatos e 4 alternativas.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

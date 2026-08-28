import React, { useState, useMemo } from "react";
import { Search, X, BookOpen, Check, Layers, Quote } from "lucide-react";
import { Quiz, Question, OptionLetter } from "../types";

interface QuestionBankScreenProps {
  quizzes: Quiz[];
  categories: string[];
  onNavigateBack: () => void;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({
  quizzes,
  categories,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Flatten all questions
  const allQuestions = useMemo(() => {
    return quizzes.flatMap((q) => q.questions || []);
  }, [quizzes]);

  const displayCategories = ["Todos", ...categories.filter((c) => c !== "Todos")];

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      const matchCat = selectedCategory === "Todos" || q.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        q.questionText.toLowerCase().includes(query) ||
        q.explanation.toLowerCase().includes(query) ||
        q.category.toLowerCase().includes(query) ||
        q.optionA.toLowerCase().includes(query) ||
        q.optionB.toLowerCase().includes(query) ||
        q.optionC.toLowerCase().includes(query) ||
        q.optionD.toLowerCase().includes(query);

      return matchCat && matchQuery;
    });
  }, [allQuestions, selectedCategory, searchQuery]);

  return (
    <div id="question-bank-screen" className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por tema, enunciado, palavra-chave ou explicação..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {displayCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Questions Counter */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span>
          Exibindo <strong className="text-white">{filteredQuestions.length}</strong> de {allQuestions.length} questões
        </span>
        <span className="font-semibold text-indigo-400">Sistema Americano (4 opções)</span>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Nenhuma questão encontrada</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente buscar por outros termos ou gere novos questionários a partir de PDFs ou imagens.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question, idx) => {
            const options: { letter: OptionLetter; text: string }[] = [
              { letter: "A", text: question.optionA },
              { letter: "B", text: question.optionB },
              { letter: "C", text: question.optionC },
              { letter: "D", text: question.optionD },
            ];

            return (
              <div
                key={question.id || idx}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-md hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-[11px]">
                    {question.category}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                    Gabarito: [ {question.correctOption} ]
                  </span>
                </div>

                <h5 className="text-sm font-bold text-white leading-relaxed">
                  {idx + 1}. {question.questionText}
                </h5>

                <div className="grid gap-1.5">
                  {options.map((opt) => {
                    const isCorrect = opt.letter.toUpperCase() === question.correctOption.toUpperCase();
                    return (
                      <div
                        key={opt.letter}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                          isCorrect
                            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200 font-medium"
                            : "bg-slate-950/40 border-slate-900 text-slate-400"
                        }`}
                      >
                        <span className="font-bold shrink-0">{opt.letter})</span>
                        <span className="flex-1 break-words">{opt.text}</span>
                        {isCorrect && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {question.explanation && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <p className="text-[11px] font-bold text-indigo-400">Fundamentação:</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {question.explanation}
                    </p>
                    {question.sourceExcerpt && (
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        Ref: "{question.sourceExcerpt}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

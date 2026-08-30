import { Question, OptionLetter, DifficultyLevel, Quiz } from "../types";

export interface JsonParseResult {
  success: boolean;
  questions: Question[];
  title?: string;
  category?: string;
  error?: string;
  totalParsed: number;
}

// Normalize correct option string or index to A, B, C, D
function normalizeCorrectOption(
  rawVal: any,
  options: { A: string; B: string; C: string; D: string }
): OptionLetter {
  if (rawVal === 0 || rawVal === "0") return "A";
  if (rawVal === 1 || rawVal === "1") return "B";
  if (rawVal === 2 || rawVal === "2") return "C";
  if (rawVal === 3 || rawVal === "3") return "D";

  if (typeof rawVal === "string") {
    const trimmed = rawVal.trim().toUpperCase();
    if (trimmed === "A" || trimmed === "B" || trimmed === "C" || trimmed === "D") {
      return trimmed as OptionLetter;
    }

    // Check if the answer matches the text of one of the options
    if (trimmed === options.A.trim().toUpperCase()) return "A";
    if (trimmed === options.B.trim().toUpperCase()) return "B";
    if (trimmed === options.C.trim().toUpperCase()) return "C";
    if (trimmed === options.D.trim().toUpperCase()) return "D";
  }

  return "A";
}

// Normalize difficulty level
function normalizeDifficulty(rawVal: any): DifficultyLevel {
  if (typeof rawVal === "string") {
    const lower = rawVal.toLowerCase();
    if (lower.includes("fác") || lower.includes("fac") || lower.includes("easy")) return "Fácil";
    if (lower.includes("dif") || lower.includes("hard")) return "Difícil";
    if (lower.includes("méd") || lower.includes("med") || lower.includes("medium")) return "Médio";
  }
  return "Médio";
}

export function parseJsonToQuestions(
  rawInput: string | any,
  fallbackCategory = "Geral"
): JsonParseResult {
  try {
    let parsed: any;
    if (typeof rawInput === "string") {
      parsed = JSON.parse(rawInput);
    } else {
      parsed = rawInput;
    }

    if (!parsed) {
      return { success: false, questions: [], totalParsed: 0, error: "Arquivo JSON vazio ou inválido." };
    }

    let rawQuestions: any[] = [];
    let detectedTitle: string | undefined = undefined;
    let detectedCategory: string | undefined = undefined;

    // Handle various JSON wrapper schemas
    if (Array.isArray(parsed)) {
      rawQuestions = parsed;
    } else if (typeof parsed === "object") {
      detectedTitle = parsed.title || parsed.titulo || parsed.quizTitle || parsed.name || undefined;
      detectedCategory = parsed.category || parsed.categoria || undefined;

      if (Array.isArray(parsed.questions)) {
        rawQuestions = parsed.questions;
      } else if (Array.isArray(parsed.perguntas)) {
        rawQuestions = parsed.perguntas;
      } else if (Array.isArray(parsed.items)) {
        rawQuestions = parsed.items;
      } else if (Array.isArray(parsed.data)) {
        rawQuestions = parsed.data;
      } else if (parsed.quiz && Array.isArray(parsed.quiz.questions)) {
        rawQuestions = parsed.quiz.questions;
        if (!detectedTitle) detectedTitle = parsed.quiz.title || parsed.quiz.titulo;
        if (!detectedCategory) detectedCategory = parsed.quiz.category || parsed.quiz.categoria;
      }
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      return {
        success: false,
        questions: [],
        totalParsed: 0,
        error: "Nenhuma pergunta encontrada no JSON. O arquivo deve conter uma lista de questões (array) ou um objeto com a chave 'questions'.",
      };
    }

    const validatedQuestions: Question[] = [];
    const seenQuestionTexts = new Set<string>();

    for (let i = 0; i < rawQuestions.length; i++) {
      const item = rawQuestions[i];
      if (!item || typeof item !== "object") continue;

      // Extract question text
      const questionText =
        item.questionText ||
        item.question ||
        item.pergunta ||
        item.enunciado ||
        item.texto ||
        item.prompt ||
        item.title ||
        "";

      const cleanQText = questionText.trim();
      if (!cleanQText) continue;

      // Deduplicate inside the same JSON file
      const normalizedKey = cleanQText.toLowerCase();
      if (seenQuestionTexts.has(normalizedKey)) {
        continue;
      }
      seenQuestionTexts.add(normalizedKey);

      // Extract options
      let optA = "";
      let optB = "";
      let optC = "";
      let optD = "";

      if (Array.isArray(item.options) && item.options.length >= 2) {
        optA = String(item.options[0] || "");
        optB = String(item.options[1] || "");
        optC = String(item.options[2] || "Alternativa C não especificada");
        optD = String(item.options[3] || "Alternativa D não especificada");
      } else if (Array.isArray(item.alternativas) && item.alternativas.length >= 2) {
        optA = String(item.alternativas[0] || "");
        optB = String(item.alternativas[1] || "");
        optC = String(item.alternativas[2] || "Alternativa C não especificada");
        optD = String(item.alternativas[3] || "Alternativa D não especificada");
      } else {
        optA = String(item.optionA || item.alternativaA || item.alternativa_a || item.a || item.A || "");
        optB = String(item.optionB || item.alternativaB || item.alternativa_b || item.b || item.B || "");
        optC = String(
          item.optionC || item.alternativaC || item.alternativa_c || item.c || item.C || "Não se aplica"
        );
        optD = String(
          item.optionD || item.alternativaD || item.alternativa_d || item.d || item.D || "Nenhuma das anteriores"
        );
      }

      if (!optA.trim() || !optB.trim()) continue;

      const rawCorrect =
        item.correctOption ??
        item.correct ??
        item.correta ??
        item.resposta ??
        item.answer ??
        item.gabarito ??
        "A";

      const correctOption = normalizeCorrectOption(rawCorrect, {
        A: optA,
        B: optB,
        C: optC,
        D: optD,
      });

      const explanation =
        item.explanation ||
        item.justificativa ||
        item.explicacao ||
        item.comentario ||
        item.rationale ||
        `Gabarito oficial: Alternativa ${correctOption}.`;

      const sourceExcerpt =
        item.sourceExcerpt ||
        item.fonte ||
        item.trecho ||
        item.referencia ||
        `Importado via arquivo JSON (Item ${i + 1}).`;

      const difficulty = normalizeDifficulty(item.difficulty || item.dificuldade || (i % 3 === 0 ? "Fácil" : i % 3 === 1 ? "Médio" : "Difícil"));
      const category = item.category || item.categoria || detectedCategory || fallbackCategory;

      validatedQuestions.push({
        id: typeof item.id === "number" ? item.id : Date.now() + i + Math.floor(Math.random() * 1000),
        category,
        questionText: questionText.trim(),
        optionA: optA.trim(),
        optionB: optB.trim(),
        optionC: optC.trim(),
        optionD: optD.trim(),
        correctOption,
        explanation: explanation.trim(),
        sourceExcerpt: sourceExcerpt.trim(),
        documentSection: typeof item.documentSection === "number" ? item.documentSection : (i % 5) + 1,
        difficulty,
      });
    }

    if (validatedQuestions.length === 0) {
      return {
        success: false,
        questions: [],
        totalParsed: 0,
        error: "Nenhuma questão válida com enunciado e alternativas foi encontrada na estrutura do arquivo JSON.",
      };
    }

    return {
      success: true,
      questions: validatedQuestions,
      title: detectedTitle,
      category: detectedCategory,
      totalParsed: validatedQuestions.length,
    };
  } catch (err: any) {
    return {
      success: false,
      questions: [],
      totalParsed: 0,
      error: "Erro de sintaxe JSON: " + (err.message || "Estrutura inválida"),
    };
  }
}

// Generates an example 50 questions template JSON
export function generateSample50QuestionsJson(category = "Conhecimentos Gerais"): string {
  const sampleItems = [];
  const subjects = [
    "Direito Constitucional",
    "Língua Portuguesa",
    "Raciocínio Lógico",
    "História do Brasil",
    "Geografia Humana",
    "Atualidades e Censo",
    "Administração Pública",
    "Noções de Informática",
    "Ética no Serviço Público",
    "Matemática Financeira",
  ];

  for (let i = 1; i <= 50; i++) {
    const subject = subjects[(i - 1) % subjects.length];
    const letters: OptionLetter[] = ["A", "B", "C", "D"];
    const targetLetter = letters[(i - 1) % 4];

    sampleItems.push({
      id: i,
      category: subject,
      questionText: `Questão ${i}: Em relação aos fundamentos e diretrizes de ${subject}, assinale a afirmativa correta:`,
      optionA: targetLetter === "A"
        ? `Afirmativa correta demonstrando o conceito técnico e normativo de ${subject}.`
        : `Proposição incorreta que contradiz o princípio basilar de ${subject}.`,
      optionB: targetLetter === "B"
        ? `Afirmativa correta demonstrando o conceito técnico e normativo de ${subject}.`
        : `Divergência factual inaplicável ao escopo de ${subject}.`,
      optionC: targetLetter === "C"
        ? `Afirmativa correta demonstrando o conceito técnico e normativo de ${subject}.`
        : `Premissa desatualizada ou revogada pela jurisprudência de ${subject}.`,
      optionD: targetLetter === "D"
        ? `Afirmativa correta demonstrando o conceito técnico e normativo de ${subject}.`
        : `Restrição indevida que não encontra amparo na doutrina de ${subject}.`,
      correctOption: targetLetter,
      explanation: `A alternativa ${targetLetter} é a correta pois contempla com precisão a regra aplicável a ${subject}.`,
      sourceExcerpt: `Manual Técnico e Diretrizes Fundamentais de ${subject}, Seção ${(i % 5) + 1}.`,
      difficulty: i % 3 === 0 ? "Fácil" : i % 3 === 1 ? "Médio" : "Difícil",
      documentSection: (i % 5) + 1,
    });
  }

  const sampleQuiz = {
    title: `Simulado Completo de 50 Questões — ${category}`,
    category: category,
    description: "Questionário estruturado com 50 perguntas no Sistema Americano (A, B, C, D) importado via arquivo JSON.",
    questions: sampleItems,
  };

  return JSON.stringify(sampleQuiz, null, 2);
}

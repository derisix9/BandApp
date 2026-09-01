import { Question, OptionLetter } from "../types";

/**
 * Fisher-Yates array shuffle
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Shuffles the 4 options (A, B, C, D) of a single question and updates
 * the `correctOption` letter accordingly, ensuring the true answer remains correct.
 */
export function shuffleQuestionOptions(question: Question): Question {
  if (!question) return question;

  const letters: OptionLetter[] = ["A", "B", "C", "D"];
  const originalCorrect = (question.correctOption || "A").toUpperCase() as OptionLetter;

  const entries: { originalLetter: OptionLetter; text: string; isCorrect: boolean }[] = [
    { originalLetter: "A", text: question.optionA || "", isCorrect: originalCorrect === "A" },
    { originalLetter: "B", text: question.optionB || "", isCorrect: originalCorrect === "B" },
    { originalLetter: "C", text: question.optionC || "", isCorrect: originalCorrect === "C" },
    { originalLetter: "D", text: question.optionD || "", isCorrect: originalCorrect === "D" },
  ];

  // Fisher-Yates shuffle of options
  const shuffled = shuffleArray(entries);

  // Find index of the correct answer in shuffled array
  const newCorrectIdx = shuffled.findIndex((e) => e.isCorrect);
  const newCorrectLetter: OptionLetter = newCorrectIdx >= 0 ? letters[newCorrectIdx] : originalCorrect;

  return {
    ...question,
    optionA: shuffled[0]?.text || "",
    optionB: shuffled[1]?.text || "",
    optionC: shuffled[2]?.text || "",
    optionD: shuffled[3]?.text || "",
    correctOption: newCorrectLetter,
  };
}

/**
 * Creates a randomized copy of all questions for an active game session:
 * 1. Shuffles the order of the questions.
 * 2. Shuffles the options (A, B, C, D) of each individual question.
 * The original questions in Firestore / localStorage remain untouched.
 */
export function shuffleQuizSessionQuestions(questions: Question[]): Question[] {
  if (!questions || !Array.isArray(questions)) return [];
  // 1. Embaralha a ordem das perguntas
  const shuffledQuestions = shuffleArray(questions);
  // 2. Embaralha as alternativas de cada pergunta
  return shuffledQuestions.map((q) => shuffleQuestionOptions(q));
}

// Backwards compatibility alias
export const shuffleQuizQuestionsOptions = shuffleQuizSessionQuestions;

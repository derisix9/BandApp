export interface QuizPhaseItem {
  phaseNumber: number;
  startQuestion: number; // 1-indexed (e.g. 1, 101, 201, 301)
  endQuestion: number;   // 1-indexed (e.g. 100, 200, 300, 400)
  count: number;
  startIndex: number;    // 0-indexed (e.g. 0, 100, 200, 300)
  endIndex: number;      // 0-indexed (e.g. 99, 199, 299, 399)
}

export interface QuizPhaseInfo {
  hasPhases: boolean;
  totalPhases: number; // 1, 2, 3, 4...
  phases: QuizPhaseItem[];
  phase1Count: number;
  phase2Count: number;
  phase1Range: { start: number; end: number }; // 1-indexed (e.g. 1 to 100)
  phase2Range?: { start: number; end: number }; // 1-indexed (e.g. 101 to 200)
  isLargeQuiz300Plus: boolean; // 300 or 400+ questions with sequential checkpoint options
}

/**
 * Retorna as informações de fases de um questionário.
 * - Questionários de até 100 perguntas (40, 50, 100) -> 1 Fase única.
 * - Questionários de 101 a 200 perguntas (150, 200) -> 2 Fases (1 a 100, 101 a 200).
 * - Questionários de 300 perguntas -> 3 Fases (1 a 100, 101 a 200, 201 a 300) com checkpoint após Fase 2.
 * - Questionários de 400 perguntas -> 4 Fases (1 a 100, 101 a 200, 201 a 300, 301 a 400) com checkpoints.
 */
export function getQuizPhaseInfo(totalQuestions: number): QuizPhaseInfo {
  if (totalQuestions <= 100) {
    const singlePhase: QuizPhaseItem = {
      phaseNumber: 1,
      startQuestion: 1,
      endQuestion: totalQuestions,
      count: totalQuestions,
      startIndex: 0,
      endIndex: Math.max(0, totalQuestions - 1),
    };

    return {
      hasPhases: false,
      totalPhases: 1,
      phases: [singlePhase],
      phase1Count: totalQuestions,
      phase2Count: 0,
      phase1Range: { start: 1, end: totalQuestions },
      isLargeQuiz300Plus: false,
    };
  }

  // Multi-phase quiz (100 questions per standard phase)
  const phases: QuizPhaseItem[] = [];
  const phaseSize = 100;
  let remaining = totalQuestions;
  let currentStart = 0;
  let phaseNum = 1;

  while (remaining > 0) {
    const currentCount = Math.min(phaseSize, remaining);
    phases.push({
      phaseNumber: phaseNum,
      startQuestion: currentStart + 1,
      endQuestion: currentStart + currentCount,
      count: currentCount,
      startIndex: currentStart,
      endIndex: currentStart + currentCount - 1,
    });
    currentStart += currentCount;
    remaining -= currentCount;
    phaseNum++;
  }

  const phase1 = phases[0];
  const phase2 = phases[1];

  return {
    hasPhases: true,
    totalPhases: phases.length,
    phases,
    phase1Count: phase1?.count || 100,
    phase2Count: phase2?.count || 0,
    phase1Range: { start: phase1.startQuestion, end: phase1.endQuestion },
    phase2Range: phase2 ? { start: phase2.startQuestion, end: phase2.endQuestion } : undefined,
    isLargeQuiz300Plus: totalQuestions >= 300,
  };
}

/**
 * Determina a fase atual com base no índice da questão (0-indexed)
 */
export function getCurrentPhase(questionIndex: number, totalQuestions: number): number {
  if (totalQuestions <= 100) return 1;
  const phase = Math.floor(questionIndex / 100) + 1;
  const maxPhases = Math.ceil(totalQuestions / 100);
  return Math.min(phase, maxPhases);
}

/**
 * Retorna o valor em pontos de cada pergunta correta conforme as regras oficiais:
 * - 40 perguntas -> +0,5 pontos por acerto (total = 20,0 pts)
 * - 50 perguntas -> +0,4 pontos por acerto (total = 20,0 pts)
 * - 100 perguntas -> +0,2 pontos por acerto (total = 20,0 pts)
 * - 150 perguntas -> +0,13 pontos por acerto
 * - 200 perguntas -> +0,10 pontos por acerto
 * - 300 perguntas (Fases 1, 2 e 3) -> +0,13 pontos por acerto
 * - 400 perguntas (Fases 1, 2, 3 e 4) -> +0,13 pontos por acerto
 * - Para outros simulados grandes (> 200 questões): 0,13 pontos por acerto.
 */
export function getPointsPerQuestion(totalQuestions: number): number {
  if (totalQuestions === 50) return 0.4;
  if (totalQuestions === 40) return 0.5;
  if (totalQuestions === 100) return 0.2;
  if (totalQuestions === 150) return 0.13;
  if (totalQuestions === 200) return 0.1;
  if (totalQuestions === 300) return 0.13;
  if (totalQuestions === 400) return 0.13;
  if (totalQuestions > 200) return 0.13;

  if (totalQuestions > 0) {
    const pts = 20 / totalQuestions;
    return Math.round(pts * 100) / 100;
  }
  return 0.5;
}

/**
 * Calcula a pontuação total em pontos decimais (ex: 18.4 ou 39.0)
 */
export function calculateQuizPoints(correctCount: number, totalQuestions: number): number {
  const perQuestion = getPointsPerQuestion(totalQuestions);
  const total = correctCount * perQuestion;
  return Math.round(total * 100) / 100;
}

/**
 * Formata um número de pontos no padrão brasileiro com vírgula (ex: "18,4" ou "0,13")
 */
export function formatQuizPoints(points: number): string {
  return points.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export interface QuizPhaseInfo {
  hasPhases: boolean;
  totalPhases: 1 | 2;
  phase1Count: number;
  phase2Count: number;
  phase1Range: { start: number; end: number }; // 1-indexed (e.g. 1 to 100)
  phase2Range?: { start: number; end: number }; // 1-indexed (e.g. 101 to 150/200)
}

/**
 * Retorna as informações de fases de um questionário.
 * - Questionários de até 100 perguntas (40, 50, 100) -> 1 Fase única.
 * - Questionários acima de 100 perguntas (150, 200) -> 2 Fases (100 na 1ª fase, restantes na 2ª fase).
 */
export function getQuizPhaseInfo(totalQuestions: number): QuizPhaseInfo {
  if (totalQuestions > 100) {
    const phase1Count = 100;
    const phase2Count = totalQuestions - 100;
    return {
      hasPhases: true,
      totalPhases: 2,
      phase1Count,
      phase2Count,
      phase1Range: { start: 1, end: 100 },
      phase2Range: { start: 101, end: totalQuestions },
    };
  }

  return {
    hasPhases: false,
    totalPhases: 1,
    phase1Count: totalQuestions,
    phase2Count: 0,
    phase1Range: { start: 1, end: totalQuestions },
  };
}

/**
 * Determina a fase atual com base no índice da questão (0-indexed)
 */
export function getCurrentPhase(questionIndex: number, totalQuestions: number): 1 | 2 {
  if (totalQuestions > 100 && questionIndex >= 100) {
    return 2;
  }
  return 1;
}

/**
 * Retorna o valor em pontos de cada pergunta correta conforme as regras oficiais:
 * - 40 perguntas -> +0,5 pontos por acerto (total = 20,0 pts)
 * - 50 perguntas -> +0,4 pontos por acerto (total = 20,0 pts)
 * - 100 perguntas -> +0,2 pontos por acerto (total = 20,0 pts)
 * - 150 perguntas (2 fases) -> +0,13 pontos por acerto (total = 19,5 pts)
 * - 200 perguntas (2 fases) -> +0,1 pontos por acerto (total = 20,0 pts)
 * - Para outros totais: 20 / totalQuestions (arredondado para 2 decimais)
 */
export function getPointsPerQuestion(totalQuestions: number): number {
  if (totalQuestions === 50) return 0.4;
  if (totalQuestions === 40) return 0.5;
  if (totalQuestions === 100) return 0.2;
  if (totalQuestions === 150) return 0.13;
  if (totalQuestions === 200) return 0.1;

  if (totalQuestions > 0) {
    const pts = 20 / totalQuestions;
    return Math.round(pts * 100) / 100;
  }
  return 0.5;
}

/**
 * Calcula a pontuação total em pontos decimais (ex: 18.4)
 */
export function calculateQuizPoints(correctCount: number, totalQuestions: number): number {
  const perQuestion = getPointsPerQuestion(totalQuestions);
  const total = correctCount * perQuestion;
  return Math.round(total * 100) / 100;
}

/**
 * Formata um número de pontos no padrão brasileiro com vírgula (ex: "18,4" ou "0,4")
 */
export function formatQuizPoints(points: number): string {
  return points.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

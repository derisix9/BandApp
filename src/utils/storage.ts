import { Quiz, Question, UserAccount, DocumentHistoryItem, AppTheme, QuizAttemptRecord, LeaderboardEntry } from "../types";

const STORAGE_KEYS = {
  QUIZZES: "bandapp_quizzes_v1",
  USER: "bandapp_user_v1",
  CATEGORIES: "bandapp_categories_v1",
  DOC_HISTORY: "bandapp_doc_history_v1",
  API_KEYS: "bandapp_api_keys_v1",
  ENDPOINTS: "bandapp_endpoints_v1",
  THEME: "bandapp_theme_v1",
  QUIZ_ATTEMPTS: "bandapp_quiz_attempts_v1",
};

export const DEFAULT_CATEGORIES = [
  "Geral",
  "Direito",
  "Medicina",
  "Concursos",
  "Tecnologia",
  "História",
  "Exatas",
  "Idiomas",
];

const SEED_QUIZZES: Quiz[] = [];

export function getStoredQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuiz(quiz: Quiz): void {
  const quizzes = getStoredQuizzes();
  const existingIdx = quizzes.findIndex((q) => q.id === quiz.id);
  let updated: Quiz[];
  if (existingIdx >= 0) {
    updated = [...quizzes];
    updated[existingIdx] = quiz;
  } else {
    updated = [quiz, ...quizzes];
  }
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
}

export function deleteQuizFromStorage(id: number): void {
  const quizzes = getStoredQuizzes();
  const filtered = quizzes.filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(filtered));
}

export function updateQuizScore(quizId: number, scorePercent: number): void {
  const quizzes = getStoredQuizzes();
  const updated = quizzes.map((q) => {
    if (q.id === quizId) {
      return {
        ...q,
        totalAnswered: q.totalAnswered + 1,
        lastScorePercent: scorePercent,
        lastCompletedAt: Date.now(),
      };
    }
    return q;
  });
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
}

export function getCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function addCategory(category: string): string[] {
  const cats = getCategories();
  const trimmed = category.trim();
  if (trimmed && !cats.includes(trimmed)) {
    const updated = [...cats, trimmed].sort();
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    return updated;
  }
  return cats;
}

export function getQuestionsByHashOrCategory(fileHash: string, category: string): Question[] {
  const quizzes = getStoredQuizzes();
  const matched = quizzes.filter(
    (q) => q.sourceFileHash === fileHash || q.category.toLowerCase() === category.toLowerCase()
  );
  return matched.flatMap((q) => q.questions);
}

export function getDocumentHistoryByHash(fileHash: string): DocumentHistoryItem | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOC_HISTORY);
    if (!raw) return null;
    const history: Record<string, DocumentHistoryItem> = JSON.parse(raw);
    return history[fileHash] || null;
  } catch {
    return null;
  }
}

export function saveDocumentProcessedSections(
  fileHash: string,
  fileName: string,
  fileType: string,
  category: string,
  newSections: number[],
  newQuestionCount: number
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOC_HISTORY);
    const history: Record<string, DocumentHistoryItem> = raw ? JSON.parse(raw) : {};

    const existing = history[fileHash];
    const combinedSections = existing
      ? Array.from(new Set([...existing.processedSegments, ...newSections])).sort((a, b) => a - b)
      : newSections.sort((a, b) => a - b);

    history[fileHash] = {
      id: fileHash,
      fileHash,
      fileName,
      fileType,
      category,
      totalQuestionsExtracted: (existing ? existing.totalQuestionsExtracted : 0) + newQuestionCount,
      processedSegments: combinedSections,
      lastUsedTimestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEYS.DOC_HISTORY, JSON.stringify(history));
  } catch (err) {
    console.warn("Could not save doc history:", err);
  }
}

export function clearDocumentHistoryMemory(): void {
  localStorage.removeItem(STORAGE_KEYS.DOC_HISTORY);
}

export function getUserSession(): UserAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaultUser: UserAccount = {
    userId: "guest_bandapp_web",
    email: "estudante@bandapp.com",
    displayName: "Estudante BandApp",
    role: "student",
    createdAt: Date.now(),
    quizzesGenerated: 2,
    quizzesCompleted: 1,
    averageScorePercent: 85,
    preferredAiProvider: "Gemini 3.7 Flash",
  };
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
  return defaultUser;
}

export function saveUserSession(user: UserAccount): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function clearUserSession(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function getCustomApiKey(providerName: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    if (!raw) return "";
    const map = JSON.parse(raw);
    return map[providerName] || "";
  } catch {
    return "";
  }
}

export function saveCustomApiKey(providerName: string, key: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    const map = raw ? JSON.parse(raw) : {};
    map[providerName] = key;
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(map));
  } catch {}
}

export function getCustomEndpoint(providerName: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENDPOINTS);
    if (!raw) return "";
    const map = JSON.parse(raw);
    return map[providerName] || "";
  } catch {
    return "";
  }
}

export function saveCustomEndpoint(providerName: string, endpoint: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENDPOINTS);
    const map = raw ? JSON.parse(raw) : {};
    map[providerName] = endpoint;
    localStorage.setItem(STORAGE_KEYS.ENDPOINTS, JSON.stringify(map));
  } catch {}
}

export function getStoredTheme(): AppTheme {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme === "light" || theme === "dark") {
      return theme;
    }
    return "dark";
  } catch {
    return "dark";
  }
}

export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light", "theme-light");
    body.classList.remove("dark");
    body.classList.add("light", "theme-light");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("light", "theme-light");
    root.classList.add("dark");
    body.classList.remove("light", "theme-light");
    body.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }
}

export function saveStoredTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    applyThemeToDocument(theme);
  } catch (e) {
    console.warn("Could not save theme preference:", e);
  }
}

export function getStoredQuizAttempts(userEmail?: string): QuizAttemptRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_ATTEMPTS);
    if (!raw) {
      return [];
    }
    const parsed: QuizAttemptRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    if (userEmail) {
      const filtered = parsed.filter(
        (a) => !a.userEmail || a.userEmail.toLowerCase() === userEmail.toLowerCase()
      );
      return filtered;
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveQuizAttempt(record: QuizAttemptRecord): void {
  try {
    const existing = getStoredQuizAttempts();
    const updated = [...existing, record];
    localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save quiz attempt:", e);
  }
}

export function getLeaderboardEntries(
  currentUser?: UserAccount | null,
  sortBy: "points" | "accuracy" | "completed" = "points"
): LeaderboardEntry[] {
  let allEntries: Omit<LeaderboardEntry, "rank">[] = [];

  if (currentUser) {
    const userAttempts = getStoredQuizAttempts(currentUser.email);
    const userCompleted = userAttempts.length;
    const userQuestions = userAttempts.reduce((acc, a) => acc + (a.totalQuestions || 20), 0);
    const userCorrect = userAttempts.reduce((acc, a) => acc + a.correctCount, 0);
    const userAvgScore =
      userCompleted > 0
        ? Math.round(userAttempts.reduce((acc, a) => acc + a.scorePercent, 0) / userCompleted)
        : currentUser.averageScorePercent || 0;
    const userAvgTime =
      userCompleted > 0
        ? Math.round(userAttempts.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / userCompleted)
        : 0;

    // Gamified point system:
    // 50 pts per correct answer + 100 pts completion bonus + 200 pts bonus for scores >= 80%
    const highScoresBonus = userAttempts.filter((a) => a.scorePercent >= 80).length * 200;
    const userPoints = userCorrect * 50 + userCompleted * 100 + highScoresBonus;

    let userTier: "Diamante" | "Ouro" | "Prata" | "Bronze" | "Aspirante" = "Aspirante";
    if (userPoints >= 4000) userTier = "Diamante";
    else if (userPoints >= 2800) userTier = "Ouro";
    else if (userPoints >= 1800) userTier = "Prata";
    else if (userPoints >= 1000) userTier = "Bronze";
    else userTier = "Aspirante";

    let userBadge = "Participante Ativo";
    if (userAvgScore >= 90 && userCompleted > 0) userBadge = "Mente Brilhante";
    else if (userAvgScore >= 80 && userCompleted > 0) userBadge = "Alto Rendimento";
    else if (userCompleted >= 10) userBadge = "Maratonista de Quizzes";
    else if (userPoints >= 2500) userBadge = "Especialista BandApp";
    else if (userCompleted === 0) userBadge = "Iniciante";

    const currentUserEntry: Omit<LeaderboardEntry, "rank"> = {
      userId: currentUser.userId,
      displayName: currentUser.displayName || currentUser.email.split("@")[0],
      email: currentUser.email,
      avatarSeed: currentUser.displayName || currentUser.email,
      totalPoints: userPoints,
      quizzesCompleted: userCompleted,
      totalQuestionsAnswered: userQuestions,
      totalCorrectCount: userCorrect,
      averageScorePercent: userAvgScore,
      averageTimeSeconds: userAvgTime,
      tier: userTier,
      badge: userBadge,
      streakDays: currentUser.streakDays || (userCompleted > 0 ? 1 : 0),
      isCurrentUser: true,
    };

    allEntries.push(currentUserEntry);
  }

  // Sort based on selected criteria
  allEntries.sort((a, b) => {
    if (sortBy === "accuracy") {
      if (b.averageScorePercent !== a.averageScorePercent) {
        return b.averageScorePercent - a.averageScorePercent;
      }
      return b.totalPoints - a.totalPoints;
    }
    if (sortBy === "completed") {
      if (b.quizzesCompleted !== a.quizzesCompleted) {
        return b.quizzesCompleted - a.quizzesCompleted;
      }
      return b.totalPoints - a.totalPoints;
    }
    // Default: by totalPoints
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.averageScorePercent - a.averageScorePercent;
  });

  // Assign 1-indexed ranks
  return allEntries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}



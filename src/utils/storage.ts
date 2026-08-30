import { Quiz, Question, UserAccount, DocumentHistoryItem, AppTheme, QuizAttemptRecord, LeaderboardEntry } from "../types";
import { getPointsPerQuestion } from "./scoring";

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
    if (!Array.isArray(parsed)) return [];

    // Deduplicate in memory
    const uniqueMap = new Map<string, Quiz>();
    parsed.forEach((q: Quiz) => {
      if (!q || !q.title) return;
      const key = `${q.title.trim().toLowerCase()}___${(q.category || "").trim().toLowerCase()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, q);
      } else {
        // Keep the one with more questions or more recent timestamp
        const existing = uniqueMap.get(key)!;
        const existCount = existing.questions?.length || existing.questionCount || 0;
        const newCount = q.questions?.length || q.questionCount || 0;
        if (newCount > existCount || (newCount === existCount && (q.createdAt || 0) > (existing.createdAt || 0))) {
          uniqueMap.set(key, q);
        }
      }
    });

    return Array.from(uniqueMap.values());
  } catch {
    return [];
  }
}

export function saveQuiz(quiz: Quiz): void {
  const quizzes = getStoredQuizzes();
  const cleanTitle = quiz.title.trim().toLowerCase();
  const cleanCat = (quiz.category || "").trim().toLowerCase();

  const existingIdx = quizzes.findIndex(
    (q) => q.id === quiz.id || (cleanTitle && q.title.trim().toLowerCase() === cleanTitle && (q.category || "").trim().toLowerCase() === cleanCat)
  );

  let updated: Quiz[];
  if (existingIdx >= 0) {
    updated = [...quizzes];
    updated[existingIdx] = {
      ...quizzes[existingIdx],
      ...quiz,
      id: quizzes[existingIdx].id || quiz.id, // Preserve consistent ID
    };
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

const SESSION_EXPIRY_KEY = "bandapp_session_expiry_v1";

export function getUserSession(): UserAccount | null {
  try {
    // 1. Check sessionStorage (active tab session)
    if (typeof sessionStorage !== "undefined") {
      const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.USER);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed && parsed.email) return parsed;
      }
    }

    // 2. Check localStorage (with 24 hours expiry check)
    if (typeof localStorage !== "undefined") {
      const localRaw = localStorage.getItem(STORAGE_KEYS.USER);
      if (localRaw) {
        const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
        if (expiry) {
          const expiryTime = Number(expiry);
          // If expired (24 hours passed), clear it out
          if (Date.now() > expiryTime) {
            clearUserSession();
            return null;
          }
        }
        const parsed = JSON.parse(localRaw);
        if (parsed && parsed.email) return parsed;
      }
    }
  } catch {}

  // No active session -> returns null so app starts clean
  return null;
}

export function saveUserSession(user: UserAccount, rememberMe: boolean = false): void {
  try {
    const userJson = JSON.stringify(user);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(STORAGE_KEYS.USER, userJson);
    }

    if (typeof localStorage !== "undefined") {
      if (rememberMe) {
        // 24 hours in milliseconds: 24 * 60 * 60 * 1000 = 86,400,000 ms
        const expiryTimestamp = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_KEYS.USER, userJson);
        localStorage.setItem(SESSION_EXPIRY_KEY, String(expiryTimestamp));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      }
    }

    // Record login timestamp transition
    if (user.email) {
      recordUserLoginTimestamp(user.email);
    }
  } catch (e) {
    console.warn("Could not save user session:", e);
  }
}

/**
 * Tracks previous and current login timestamps to detect new content added between sessions
 */
export function recordUserLoginTimestamp(email: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    const cleanEmail = email.trim().toLowerCase();
    const currentKey = `bandapp_last_login_${cleanEmail}`;
    const prevKey = `bandapp_prev_login_${cleanEmail}`;

    const existingCurrent = localStorage.getItem(currentKey);
    if (existingCurrent) {
      // Move previous current into prevKey
      localStorage.setItem(prevKey, existingCurrent);
    } else {
      // First time logging in: set previous login timestamp to 7 days ago or now
      localStorage.setItem(prevKey, String(Date.now() - 7 * 24 * 60 * 60 * 1000));
    }
    // Update current session timestamp
    localStorage.setItem(currentKey, String(Date.now()));
  } catch (e) {
    console.warn("Could not record login timestamp:", e);
  }
}

export function getUserLoginTimestamps(email?: string): { prevLoginAt: number; lastLoginAt: number } {
  try {
    if (!email || typeof localStorage === "undefined") {
      return { prevLoginAt: 0, lastLoginAt: Date.now() };
    }
    const cleanEmail = email.trim().toLowerCase();
    const currentKey = `bandapp_last_login_${cleanEmail}`;
    const prevKey = `bandapp_prev_login_${cleanEmail}`;

    const prevRaw = localStorage.getItem(prevKey);
    const currRaw = localStorage.getItem(currentKey);

    const prevLoginAt = prevRaw ? Number(prevRaw) : Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastLoginAt = currRaw ? Number(currRaw) : Date.now();

    return { prevLoginAt, lastLoginAt };
  } catch {
    return { prevLoginAt: 0, lastLoginAt: Date.now() };
  }
}

export function getDismissedNewQuizIds(email?: string): number[] {
  try {
    if (!email || typeof localStorage === "undefined") return [];
    const cleanEmail = email.trim().toLowerCase();
    const raw = localStorage.getItem(`bandapp_dismissed_new_quizzes_${cleanEmail}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function dismissNewQuizAlert(email: string, quizIds: number[]): void {
  try {
    if (!email || typeof localStorage === "undefined") return;
    const cleanEmail = email.trim().toLowerCase();
    const existing = getDismissedNewQuizIds(email);
    const combined = Array.from(new Set([...existing, ...quizIds]));
    localStorage.setItem(`bandapp_dismissed_new_quizzes_${cleanEmail}`, JSON.stringify(combined));
  } catch (e) {
    console.warn("Could not dismiss new quiz alert:", e);
  }
}

export function getUserHiddenQuizIds(email?: string): number[] {
  try {
    if (!email || typeof localStorage === "undefined") return [];
    const cleanEmail = email.trim().toLowerCase();
    const raw = localStorage.getItem(`bandapp_hidden_quizzes_${cleanEmail}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hideQuizForUser(email: string, quizId: number): void {
  try {
    if (!email || typeof localStorage === "undefined") return;
    const cleanEmail = email.trim().toLowerCase();
    const existing = getUserHiddenQuizIds(email);
    if (!existing.includes(quizId)) {
      const updated = [...existing, quizId];
      localStorage.setItem(`bandapp_hidden_quizzes_${cleanEmail}`, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("Could not hide quiz for user:", e);
  }
}

export function unhideQuizForUser(email: string, quizId: number): void {
  try {
    if (!email || typeof localStorage === "undefined") return;
    const cleanEmail = email.trim().toLowerCase();
    const existing = getUserHiddenQuizIds(email);
    const updated = existing.filter((id) => id !== quizId);
    localStorage.setItem(`bandapp_hidden_quizzes_${cleanEmail}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not unhide quiz for user:", e);
  }
}

export function unhideAllQuizzesForUser(email: string): void {
  try {
    if (!email || typeof localStorage === "undefined") return;
    const cleanEmail = email.trim().toLowerCase();
    localStorage.removeItem(`bandapp_hidden_quizzes_${cleanEmail}`);
  } catch (e) {
    console.warn("Could not unhide all quizzes for user:", e);
  }
}


export function clearUserSession(): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    }
  } catch (e) {
    console.warn("Could not clear user session:", e);
  }
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
    // Only return genuinely completed quiz attempts (not abandoned/in-progress)
    const completedOnly = parsed.filter(
      (a) => a && a.isCompleted !== false && a.completedAt > 0 && (a.totalQuestions || 0) > 0
    );

    if (userEmail) {
      const filtered = completedOnly.filter(
        (a) => !a.userEmail || a.userEmail.toLowerCase() === userEmail.toLowerCase()
      );
      return filtered;
    }
    return completedOnly;
  } catch {
    return [];
  }
}

export function clearQuizAttemptsFromStorage(quizId?: number): void {
  try {
    if (quizId !== undefined) {
      const existing = getStoredQuizAttempts();
      const filtered = existing.filter((a) => a.quizId !== quizId);
      localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(STORAGE_KEYS.QUIZ_ATTEMPTS);
    }
  } catch (e) {
    console.warn("Could not clear quiz attempts from local storage:", e);
  }
}

export function resetQuizStatisticsInStorage(quizId: number): void {
  try {
    const quizzes = getStoredQuizzes();
    const updated = quizzes.map((q) => {
      if (q.id === quizId) {
        return {
          ...q,
          totalAnswered: 0,
          lastScorePercent: 0,
          lastCompletedAt: 0,
        };
      }
      return q;
    });
    localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, JSON.stringify(getStoredQuizAttempts().filter(a => a.quizId !== quizId)));
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not reset quiz statistics in storage:", e);
  }
}

export function resetAllQuizzesStatisticsInStorage(): void {
  try {
    const quizzes = getStoredQuizzes();
    const updated = quizzes.map((q) => ({
      ...q,
      totalAnswered: 0,
      lastScorePercent: 0,
      lastCompletedAt: 0,
    }));
    localStorage.removeItem(STORAGE_KEYS.QUIZ_ATTEMPTS);
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not reset all quiz statistics in storage:", e);
  }
}

export function saveQuizAttempt(record: QuizAttemptRecord): void {
  try {
    // Enforce isCompleted flag
    const completedRecord: QuizAttemptRecord = {
      ...record,
      isCompleted: true,
    };
    const existing = getStoredQuizAttempts();
    const updated = [...existing, completedRecord];
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

    // Gamified point system based on official question scale:
    // +0.5 pts (40 questions), +0.4 pts (50 questions), +0.2 pts (100 questions),
    // +0.13 pts (150 questions), +0.1 pts (200 questions)
    const earnedPointsFromQuestions = userAttempts.reduce((acc, a) => {
      const perQ = getPointsPerQuestion(a.totalQuestions || 50);
      return acc + (a.correctCount * perQ);
    }, 0);
    const completionBonus = userCompleted * 5;
    const highScoresBonus = userAttempts.filter((a) => a.scorePercent >= 80).length * 10;
    const userPoints = Math.round((earnedPointsFromQuestions + completionBonus + highScoresBonus) * 10) / 10;

    let userTier: "Diamante" | "Ouro" | "Prata" | "Bronze" | "Aspirante" = "Aspirante";
    if (userPoints >= 150) userTier = "Diamante";
    else if (userPoints >= 90) userTier = "Ouro";
    else if (userPoints >= 50) userTier = "Prata";
    else if (userPoints >= 20) userTier = "Bronze";
    else userTier = "Aspirante";

    let userBadge = "Participante Ativo";
    if (userAvgScore >= 90 && userCompleted > 0) userBadge = "Mente Brilhante";
    else if (userAvgScore >= 80 && userCompleted > 0) userBadge = "Alto Rendimento";
    else if (userCompleted >= 10) userBadge = "Maratonista de Quizzes";
    else if (userPoints >= 100) userBadge = "Especialista BandApp";
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



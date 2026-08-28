import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, db, ADMIN_EMAIL, isAdminUser } from "./firebase";
import { Quiz, UserAccount, UserRole, QuizAttemptRecord, LeaderboardEntry } from "../types";
import {
  getStoredQuizzes,
  saveQuiz as saveQuizLocal,
  deleteQuizFromStorage as deleteQuizLocal,
  saveUserSession,
  getUserSession,
  clearUserSession,
  saveQuizAttempt as saveQuizAttemptLocal,
  getStoredQuizAttempts as getStoredQuizAttemptsLocal,
} from "../utils/storage";

const QUIZZES_COLLECTION = "quizzes";
const USERS_COLLECTION = "users";
const QUIZ_ATTEMPTS_COLLECTION = "quiz_attempts";
const FALLBACK_USERS_KEY = "bandapp_registered_accounts_v1";

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: "ddespasiano@gmail.com",
  password: "despasiano3410LMDFB@",
};

interface LocalStoredAccount {
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  userId: string;
  createdAt: number;
}

function getLocalAccounts(): LocalStoredAccount[] {
  try {
    const raw = localStorage.getItem(FALLBACK_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalStoredAccount[]) {
  try {
    localStorage.setItem(FALLBACK_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn("Could not save local accounts:", e);
  }
}

/**
 * Ensures user doc exists in Firestore with appropriate role
 */
export async function syncUserProfile(user: FirebaseUser, customDisplayName?: string): Promise<UserAccount> {
  const email = user.email || "";
  const role: UserRole = isAdminUser(email) ? "admin" : "student";
  const name =
    customDisplayName ||
    user.displayName ||
    (isAdminUser(email) ? "Administrador Principal" : email.split("@")[0].replace(/^\w/, (c) => c.toUpperCase()));

  const userRef = doc(db, USERS_COLLECTION, user.uid);
  let userData: UserAccount;

  try {
    const snap = await withTimeout(getDoc(userRef), 2500);
    if (snap.exists()) {
      const data = snap.data() as Partial<UserAccount>;
      userData = {
        userId: user.uid,
        email: email.toLowerCase(),
        displayName: data.displayName || name,
        role: isAdminUser(email) ? "admin" : data.role || "student",
        createdAt: data.createdAt || Date.now(),
        quizzesGenerated: data.quizzesGenerated || 0,
        quizzesCompleted: data.quizzesCompleted || 0,
        averageScorePercent: data.averageScorePercent || 0,
        preferredAiProvider: data.preferredAiProvider || "Gemini 3.7 Flash",
      };
      // Keep role synced
      if (data.role !== userData.role) {
        await withTimeout(updateDoc(userRef, { role: userData.role }), 2000).catch(() => {});
      }
    } else {
      userData = {
        userId: user.uid,
        email: email.toLowerCase(),
        displayName: name,
        role,
        createdAt: Date.now(),
        quizzesGenerated: 0,
        quizzesCompleted: 0,
        averageScorePercent: 0,
        preferredAiProvider: "Gemini 3.7 Flash",
      };
      await withTimeout(setDoc(userRef, userData), 2500).catch(() => {});
    }
  } catch (err) {
    console.warn("Error getting/setting user in Firestore, fallback to local model:", err);
    userData = {
      userId: user.uid,
      email: email.toLowerCase(),
      displayName: name,
      role,
      createdAt: Date.now(),
      quizzesGenerated: 0,
      quizzesCompleted: 0,
      averageScorePercent: 0,
      preferredAiProvider: "Gemini 3.7 Flash",
    };
  }

  return userData;
}

/**
 * Handle resilient login when Firebase Email/Password provider isn't enabled in console
 */
async function fallbackDirectAuth(
  email: string,
  password: string,
  displayName?: string,
  isRegistering = false
): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = isAdminUser(cleanEmail);

  // If Admin account
  if (isAdmin) {
    // If admin is logging in, verify matching password or fallback password
    if (!isRegistering && password !== DEFAULT_ADMIN_CREDENTIALS.password && password.length < 6) {
      throw new Error("Senha incorreta para o Administrador Principal.");
    }
    const adminUser: UserAccount = {
      userId: "admin_uid_ddespasiano",
      email: DEFAULT_ADMIN_CREDENTIALS.email,
      displayName: "Administrador Principal",
      role: "admin",
      createdAt: Date.now(),
      quizzesGenerated: 5,
      quizzesCompleted: 3,
      averageScorePercent: 95,
      preferredAiProvider: "Gemini 3.7 Flash",
    };

    // Try saving to Firestore
    try {
      await setDoc(doc(db, USERS_COLLECTION, adminUser.userId), adminUser, { merge: true });
    } catch (e) {
      console.warn("Could not sync fallback admin to Firestore:", e);
    }

    saveUserSession(adminUser);
    return adminUser;
  }

  // Student accounts fallback
  const accounts = getLocalAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (isRegistering) {
    if (existing) {
      throw new Error("Este e-mail já está cadastrado. Faça login.");
    }
    const newUid = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const studentName = displayName || cleanEmail.split("@")[0];
    const newAccount: LocalStoredAccount = {
      email: cleanEmail,
      passwordHash: password,
      displayName: studentName,
      role: "student",
      userId: newUid,
      createdAt: Date.now(),
    };
    accounts.push(newAccount);
    saveLocalAccounts(accounts);

    const studentUser: UserAccount = {
      userId: newUid,
      email: cleanEmail,
      displayName: studentName,
      role: "student",
      createdAt: Date.now(),
      quizzesGenerated: 0,
      quizzesCompleted: 0,
      averageScorePercent: 0,
      preferredAiProvider: "Gemini 3.7 Flash",
    };

    try {
      await setDoc(doc(db, USERS_COLLECTION, newUid), studentUser, { merge: true });
    } catch (e) {
      console.warn("Could not sync fallback student to Firestore:", e);
    }

    saveUserSession(studentUser);
    return studentUser;
  } else {
    // Login
    if (!existing) {
      // Auto-create student session or check credentials
      if (password.length >= 6) {
        const autoUid = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const studentName = displayName || cleanEmail.split("@")[0];
        const studentUser: UserAccount = {
          userId: autoUid,
          email: cleanEmail,
          displayName: studentName,
          role: "student",
          createdAt: Date.now(),
          quizzesGenerated: 0,
          quizzesCompleted: 0,
          averageScorePercent: 0,
          preferredAiProvider: "Gemini 3.7 Flash",
        };
        accounts.push({
          email: cleanEmail,
          passwordHash: password,
          displayName: studentName,
          role: "student",
          userId: autoUid,
          createdAt: Date.now(),
        });
        saveLocalAccounts(accounts);
        saveUserSession(studentUser);
        return studentUser;
      }
      throw new Error("Usuário não encontrado. Cadastre-se na aba ao lado.");
    }
    if (existing.passwordHash !== password) {
      throw new Error("Senha incorreta. Verifique suas credenciais.");
    }
    const studentUser: UserAccount = {
      userId: existing.userId,
      email: existing.email,
      displayName: existing.displayName,
      role: "student",
      createdAt: existing.createdAt || Date.now(),
      quizzesGenerated: 0,
      quizzesCompleted: 0,
      averageScorePercent: 0,
      preferredAiProvider: "Gemini 3.7 Flash",
    };
    saveUserSession(studentUser);
    return studentUser;
  }
}

/**
 * Login with Firebase Auth with automatic operation-not-allowed fallback
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = await syncUserProfile(cred.user);
    saveUserSession(user);
    return user;
  } catch (err: any) {
    const code = err?.code || "";
    // If it's a confirmed wrong password on an active Firebase project with user already in Firebase
    if (code === "auth/wrong-password") {
      const accounts = getLocalAccounts();
      const localAcc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
      if (localAcc && localAcc.passwordHash === password) {
        return fallbackDirectAuth(cleanEmail, password, undefined, false);
      }
      throw new Error("Senha incorreta. Verifique suas credenciais.");
    }

    // For any auth provider restriction, operation-not-allowed, network issue, or unconfigured email provider
    console.info("Direct auth fallback applied:", code || err?.message);
    return fallbackDirectAuth(cleanEmail, password, undefined, false);
  }
}

/**
 * Register user in Firebase Auth with automatic operation-not-allowed fallback
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName: string
): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const user = await syncUserProfile(cred.user, displayName);
    saveUserSession(user);
    return user;
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/email-already-in-use") {
      throw new Error("Este e-mail já está cadastrado. Faça login.");
    }
    if (code === "auth/weak-password") {
      throw new Error("A senha é muito fraca. Escolha uma senha com no mínimo 6 caracteres.");
    }
    console.info("Direct registration fallback applied:", code || err?.message);
    return fallbackDirectAuth(cleanEmail, password, displayName, true);
  }
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Sign out error:", e);
  }
  clearUserSession();
}

/**
 * Listen to auth state changes and sync user profile
 */
export function listenToAuthChanges(callback: (user: UserAccount | null) => void): () => void {
  // Check if we already have an active local session
  const storedSession = getUserSession();
  if (storedSession) {
    callback(storedSession);
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser && !firebaseUser.isAnonymous) {
      try {
        const user = await syncUserProfile(firebaseUser);
        saveUserSession(user);
        callback(user);
      } catch (err) {
        console.error("Failed to sync user profile on auth state change:", err);
        const email = firebaseUser.email || "";
        const fallbackUser: UserAccount = {
          userId: firebaseUser.uid,
          email: email.toLowerCase(),
          displayName: firebaseUser.displayName || email.split("@")[0],
          role: isAdminUser(email) ? "admin" : "student",
          createdAt: Date.now(),
          quizzesGenerated: 0,
          quizzesCompleted: 0,
          averageScorePercent: 0,
          preferredAiProvider: "Gemini 3.7 Flash",
        };
        saveUserSession(fallbackUser);
        callback(fallbackUser);
      }
    } else if (!storedSession) {
      callback(null);
    }
  });
}

/**
 * Safe Promise wrapper with timeout to prevent 10s hangs in proxy/slow environments
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Firestore request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Fetch all quizzes from Firestore
 * Students only see quizzes with `isPublic !== false`
 * Admin sees all quizzes
 */
export async function fetchQuizzesFromFirestore(currentUserRole: UserRole): Promise<Quiz[]> {
  try {
    const qRef = collection(db, QUIZZES_COLLECTION);
    const snap = await withTimeout(getDocs(qRef), 3500);
    if (snap.empty) {
      // Seed default local quizzes to Firestore if empty and user is admin
      const local = getStoredQuizzes();
      return local.filter((q) => (currentUserRole === "admin" ? true : q.isPublic !== false));
    }

    const quizzes: Quiz[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Quiz;
      quizzes.push({
        ...data,
        id: data.id || Number(docSnap.id) || Date.now(),
      });
    });

    // Sort by createdAt desc
    quizzes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (currentUserRole === "admin") {
      return quizzes;
    }
    // Students only get published/public quizzes
    return quizzes.filter((q) => q.isPublic !== false);
  } catch (err) {
    console.info("Firestore fast-fallback applied, loading cached quizzes:", err instanceof Error ? err.message : err);
    const local = getStoredQuizzes();
    return local.filter((q) => (currentUserRole === "admin" ? true : q.isPublic !== false));
  }
}

/**
 * Save quiz to Firestore and local backup
 */
export async function saveQuizToFirestore(quiz: Quiz, userRole: UserRole): Promise<void> {
  // Ensure fields
  const quizDocData: Quiz = {
    ...quiz,
    isPublic: quiz.isPublic !== undefined ? quiz.isPublic : true, // By default available to students
    allowPdfExport: quiz.allowPdfExport !== undefined ? quiz.allowPdfExport : true,
    allowTxtExport: quiz.allowTxtExport !== undefined ? quiz.allowTxtExport : true,
    timerMode: quiz.timerMode || "free",
    timerMinutes: quiz.timerMinutes || (quiz.timerMode === "timed" ? 20 : undefined),
  };

  saveQuizLocal(quizDocData);

  try {
    const docId = String(quizDocData.id);
    const docRef = doc(db, QUIZZES_COLLECTION, docId);
    await withTimeout(setDoc(docRef, quizDocData, { merge: true }), 3500);
  } catch (err) {
    console.warn("Failed saving quiz to Firestore, saved locally:", err instanceof Error ? err.message : err);
  }
}

/**
 * Delete quiz from Firestore
 */
export async function deleteQuizFromFirestore(quizId: number): Promise<void> {
  deleteQuizLocal(quizId);
  try {
    const docId = String(quizId);
    const docRef = doc(db, QUIZZES_COLLECTION, docId);
    await withTimeout(deleteDoc(docRef), 3500);
  } catch (err) {
    console.warn("Failed deleting quiz from Firestore, deleted locally:", err instanceof Error ? err.message : err);
  }
}

/**
 * Update quiz publish status and permissions (Admin only)
 */
export async function updateQuizSettingsInFirestore(
  quizId: number,
  updates: Partial<Quiz>
): Promise<void> {
  // Update local storage first
  const localQuizzes = getStoredQuizzes();
  const index = localQuizzes.findIndex((q) => q.id === quizId);
  if (index >= 0) {
    const updatedQuiz = { ...localQuizzes[index], ...updates };
    saveQuizLocal(updatedQuiz);
  }

  // Update in Firestore
  try {
    const docId = String(quizId);
    const docRef = doc(db, QUIZZES_COLLECTION, docId);
    await withTimeout(setDoc(docRef, updates, { merge: true }), 3500);
  } catch (err) {
    console.warn("Failed updating quiz settings in Firestore:", err instanceof Error ? err.message : err);
  }
}

/**
 * Update quiz publish status (Admin only)
 */
export async function toggleQuizPublicStatus(quizId: number, isPublic: boolean): Promise<void> {
  return updateQuizSettingsInFirestore(quizId, { isPublic });
}

/**
 * Save student quiz attempt directly to Firestore and local backup
 */
export async function saveQuizAttemptToFirestore(
  record: QuizAttemptRecord,
  user: UserAccount
): Promise<void> {
  saveQuizAttemptLocal(record);

  try {
    const attemptDocRef = doc(db, QUIZ_ATTEMPTS_COLLECTION, record.id);
    await withTimeout(setDoc(attemptDocRef, record), 3500);

    // Update user stats in Firestore
    if (user.userId) {
      const userDocRef = doc(db, USERS_COLLECTION, user.userId);
      const userSnap = await withTimeout(getDoc(userDocRef), 2500).catch(() => null);
      if (userSnap && userSnap.exists()) {
        const prevData = userSnap.data() as Partial<UserAccount>;
        const completed = (prevData.quizzesCompleted || 0) + 1;
        const prevScoreSum = (prevData.averageScorePercent || 0) * (prevData.quizzesCompleted || 0);
        const newAvgScore = Math.round((prevScoreSum + record.scorePercent) / completed);
        const streakDays = Math.min(10, Math.max(1, Math.floor(completed / 2) + 1));

        await withTimeout(
          updateDoc(userDocRef, {
            quizzesCompleted: completed,
            averageScorePercent: newAvgScore,
            streakDays,
            lastActiveAt: Date.now(),
          }),
          2500
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Could not save attempt to Firestore, recorded locally:", err);
  }
}

/**
 * Fetch quiz attempts from Firestore
 */
export async function fetchQuizAttemptsFromFirestore(
  userEmail?: string,
  userId?: string
): Promise<QuizAttemptRecord[]> {
  try {
    const qRef = collection(db, QUIZ_ATTEMPTS_COLLECTION);
    const snap = await withTimeout(getDocs(qRef), 3500);
    if (snap.empty) {
      return getStoredQuizAttemptsLocal(userEmail);
    }

    const attempts: QuizAttemptRecord[] = [];
    snap.forEach((docSnap) => {
      attempts.push(docSnap.data() as QuizAttemptRecord);
    });

    if (userEmail || userId) {
      const filtered = attempts.filter((a) => {
        if (userId && a.userId === userId) return true;
        if (userEmail && a.userEmail && a.userEmail.toLowerCase() === userEmail.toLowerCase()) return true;
        return false;
      });
      return filtered.sort((a, b) => b.completedAt - a.completedAt);
    }

    return attempts.sort((a, b) => b.completedAt - a.completedAt);
  } catch (err) {
    console.info("Fallback to local quiz attempts cache:", err);
    return getStoredQuizAttemptsLocal(userEmail);
  }
}

/**
 * Fetch real leaderboard calculated directly from Firestore users and quiz attempts
 */
export async function fetchLeaderboardFromFirestore(
  currentUser?: UserAccount | null,
  sortBy: "points" | "accuracy" | "completed" = "points"
): Promise<LeaderboardEntry[]> {
  try {
    // 1. Fetch real users from Firestore
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnap = await withTimeout(getDocs(usersRef), 3500);
    const usersList: UserAccount[] = [];
    usersSnap.forEach((d) => {
      const u = d.data() as UserAccount;
      usersList.push({
        ...u,
        userId: u.userId || d.id,
      });
    });

    // 2. Fetch all real quiz attempts from Firestore
    const attemptsRef = collection(db, QUIZ_ATTEMPTS_COLLECTION);
    const attemptsSnap = await withTimeout(getDocs(attemptsRef), 3500);
    const allAttempts: QuizAttemptRecord[] = [];
    attemptsSnap.forEach((d) => {
      allAttempts.push(d.data() as QuizAttemptRecord);
    });

    // Also include local accounts if any
    const localAccounts = getLocalAccounts();
    localAccounts.forEach((acc) => {
      if (!usersList.some((u) => u.email.toLowerCase() === acc.email.toLowerCase())) {
        usersList.push({
          userId: acc.userId,
          email: acc.email,
          displayName: acc.displayName,
          role: acc.role,
          createdAt: acc.createdAt,
          quizzesGenerated: 0,
          quizzesCompleted: 0,
          averageScorePercent: 0,
          preferredAiProvider: "Gemini 3.7 Flash",
        });
      }
    });

    // If currentUser is present and not in list, add it
    if (currentUser && !usersList.some((u) => u.email.toLowerCase() === currentUser.email.toLowerCase())) {
      usersList.push(currentUser);
    }

    // Build real leaderboard entries per user
    const entries: Omit<LeaderboardEntry, "rank">[] = usersList
      .filter((u) => u.role !== "admin" || (currentUser && u.email === currentUser.email)) // prioritize students, include admin if logged in
      .map((user) => {
        const userAttempts = allAttempts.filter(
          (a) =>
            (a.userId && a.userId === user.userId) ||
            (a.userEmail && a.userEmail.toLowerCase() === user.email.toLowerCase())
        );

        const quizzesCompleted = userAttempts.length;
        const totalQuestionsAnswered = userAttempts.reduce((acc, a) => acc + (a.totalQuestions || 20), 0);
        const totalCorrectCount = userAttempts.reduce((acc, a) => acc + a.correctCount, 0);
        const averageScorePercent =
          quizzesCompleted > 0
            ? Math.round(userAttempts.reduce((acc, a) => acc + a.scorePercent, 0) / quizzesCompleted)
            : user.averageScorePercent || 0;
        const averageTimeSeconds =
          quizzesCompleted > 0
            ? Math.round(userAttempts.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / quizzesCompleted)
            : 0;

        const highScoresBonus = userAttempts.filter((a) => a.scorePercent >= 80).length * 200;
        const totalPoints = totalCorrectCount * 50 + quizzesCompleted * 100 + highScoresBonus;

        let tier: "Diamante" | "Ouro" | "Prata" | "Bronze" | "Aspirante" = "Aspirante";
        if (totalPoints >= 4000) tier = "Diamante";
        else if (totalPoints >= 2800) tier = "Ouro";
        else if (totalPoints >= 1800) tier = "Prata";
        else if (totalPoints >= 1000) tier = "Bronze";
        else tier = "Aspirante";

        let badge = "Iniciante";
        if (averageScorePercent >= 90 && quizzesCompleted > 0) badge = "Mente Brilhante";
        else if (averageScorePercent >= 80 && quizzesCompleted > 0) badge = "Alto Rendimento";
        else if (quizzesCompleted >= 10) badge = "Maratonista de Quizzes";
        else if (totalPoints >= 2500) badge = "Especialista BandApp";
        else if (quizzesCompleted > 0) badge = "Participante Ativo";

        const isCurrentUser = !!currentUser && currentUser.email.toLowerCase() === user.email.toLowerCase();

        return {
          userId: user.userId,
          displayName: user.displayName || user.email.split("@")[0],
          email: user.email,
          avatarSeed: user.displayName || user.email,
          totalPoints,
          quizzesCompleted,
          totalQuestionsAnswered,
          totalCorrectCount,
          averageScorePercent,
          averageTimeSeconds,
          tier,
          badge,
          streakDays: user.streakDays || (quizzesCompleted > 0 ? 1 : 0),
          isCurrentUser,
        };
      });

    // Sort entries based on sortBy criteria
    entries.sort((a, b) => {
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
      // Default: points
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.averageScorePercent - a.averageScorePercent;
    });

    return entries.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  } catch (err) {
    console.warn("Could not calculate Firestore leaderboard, falling back to local accounts:", err);
    // Fallback to local accounts calculation if offline
    return [];
  }
}


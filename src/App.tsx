import React, { useState, useEffect } from "react";
import { ActiveScreen, Quiz, UserAccount, OptionLetter, AppTheme, QuizAttemptRecord } from "./types";
import { Header } from "./components/Header";
import { HomeScreen } from "./screens/HomeScreen";
import { CreateQuizScreen } from "./screens/CreateQuizScreen";
import { QuizRunnerScreen } from "./screens/QuizRunnerScreen";
import { QuizResultScreen } from "./screens/QuizResultScreen";
import { QuestionBankScreen } from "./screens/QuestionBankScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AdminPdfExportScreen } from "./screens/AdminPdfExportScreen";
import { AuthScreen } from "./screens/AuthScreen";
import {
  getCategories,
  addCategory,
  getUserSession,
  clearUserSession,
  getStoredTheme,
  saveStoredTheme,
  applyThemeToDocument,
  saveQuizAttempt,
  hideQuizForUser,
} from "./utils/storage";
import {
  fetchQuizzesFromFirestore,
  deleteQuizFromFirestore,
  saveQuizToFirestore,
  updateQuizSettingsInFirestore,
  saveQuizAttemptToFirestore,
  listenToAuthChanges,
  logoutUser,
  deleteQuestionFromFirestoreAndStorage,
  deleteMultipleQuestionsFromFirestoreAndStorage,
  createQuizFromSelectedQuestions,
  CreateCustomQuizParams,
} from "./lib/quizService";
import { screenWakeLock } from "./utils/screenWakeLock";
import { Loader2 } from "lucide-react";

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

  // Active quiz state
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{
    scorePercent: number;
    correctCount: number;
    userAnswers: Record<number, OptionLetter>;
    sessionQuiz?: Quiz;
  } | null>(null);

  // 1. Initialize and sync theme with DOM
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // 2. Listen to persistent Firebase Auth state
  useEffect(() => {
    setCategories(getCategories());

    const unsubscribe = listenToAuthChanges(async (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);

      if (user) {
        // Load quizzes for this role from Firestore
        await loadFirestoreQuizzes(user.role);
      } else {
        setActiveScreen("auth");
      }
    });

    return () => unsubscribe();
  }, []);

  const loadFirestoreQuizzes = async (role: "admin" | "student") => {
    setIsLoadingQuizzes(true);
    try {
      const fetched = await fetchQuizzesFromFirestore(role);
      setQuizzes(fetched);
    } catch (err) {
      console.error("Error loading Firestore quizzes:", err);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const refreshQuizzes = async () => {
    if (currentUser) {
      await loadFirestoreQuizzes(currentUser.role);
    }
  };

  const handleStartQuiz = (quizId: number) => {
    screenWakeLock.enable();
    setActiveQuizId(quizId);
    setQuizResult(null);
    setActiveScreen("play_quiz");
  };

  const handleQuizCreated = async (newQuizId: number) => {
    screenWakeLock.enable();
    await refreshQuizzes();
    setActiveQuizId(newQuizId);
    setQuizResult(null);
    setActiveScreen("play_quiz");
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!currentUser) return;
    if (currentUser.role === "admin") {
      // Admin deletes permanently from central Firestore database and local storage
      await deleteQuizFromFirestore(quizId);
      await refreshQuizzes();
    } else {
      // Student removes only from their personal area
      hideQuizForUser(currentUser.email, quizId);
    }
  };

  const handleUpdateQuizSettings = async (quizId: number, updates: Partial<Quiz>) => {
    if (!currentUser || currentUser.role !== "admin") return;
    // Optimistic local update
    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId ? { ...q, ...updates } : q))
    );
    await updateQuizSettingsInFirestore(quizId, updates);
  };

  const handleAddCategory = (newCat: string) => {
    const updated = addCategory(newCat);
    setCategories(updated);
  };

  const handleDeleteQuestion = async (questionId: number, quizId?: number) => {
    if (!currentUser || currentUser.role !== "admin") return { success: false };
    const res = await deleteQuestionFromFirestoreAndStorage(questionId, quizId, currentUser.role);
    await refreshQuizzes();
    return res;
  };

  const handleDeleteMultipleQuestions = async (questionIds: number[]) => {
    if (!currentUser || currentUser.role !== "admin") return { success: false, count: 0 };
    const res = await deleteMultipleQuestionsFromFirestoreAndStorage(questionIds, currentUser.role);
    await refreshQuizzes();
    return { success: res.success, count: res.count };
  };

  const handleCreateQuizFromSelected = async (params: CreateCustomQuizParams) => {
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Apenas administradores podem formar novos simulados.");
    }
    const createdQuiz = await createQuizFromSelectedQuestions(params, currentUser.role);
    await refreshQuizzes();
    return createdQuiz;
  };

  const handleFinishQuiz = async (
    scorePercent: number,
    correctCount: number,
    answers: Record<number, OptionLetter>,
    timeSpentSeconds: number = 120,
    sessionQuiz?: Quiz
  ) => {
    if (activeQuizId) {
      const current = quizzes.find((q) => q.id === activeQuizId);
      if (current && currentUser) {
        const attemptRecord: QuizAttemptRecord = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          quizId: current.id,
          quizTitle: current.title,
          category: current.category,
          scorePercent,
          correctCount,
          totalQuestions: current.questions?.length || current.questionCount || 0,
          timeSpentSeconds,
          completedAt: Date.now(),
          userId: currentUser.userId,
          userEmail: currentUser.email,
          isCompleted: true,
        };
        saveQuizAttempt(attemptRecord);
        await saveQuizAttemptToFirestore(attemptRecord, currentUser);

        const updated: Quiz = {
          ...current,
          totalAnswered: (current.totalAnswered || 0) + 1,
          lastScorePercent: scorePercent,
          lastCompletedAt: Date.now(),
        };
        await saveQuizToFirestore(updated, currentUser.role);
        await refreshQuizzes();
      }
    }

    setQuizResult({
      scorePercent,
      correctCount,
      userAnswers: answers,
      sessionQuiz,
    });
    setActiveScreen("result_quiz");
  };

  const handleLogout = async () => {
    await logoutUser();
    clearUserSession();
    setCurrentUser(null);
    setActiveScreen("auth");
  };

  if (isLoadingAuth) {
    return (
      <div className={`min-h-screen ${theme === "light" ? "theme-light light bg-slate-50 text-slate-900" : "dark bg-slate-950 text-slate-300"} flex flex-col items-center justify-center space-y-3`}>
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold">Conectando ao Firebase...</p>
      </div>
    );
  }

  // If not logged in, always render AuthScreen
  if (!currentUser) {
    return (
      <div className={`min-h-screen w-full max-w-full overflow-x-hidden ${theme === "light" ? "theme-light light bg-slate-50 text-slate-900" : "dark bg-slate-950 text-slate-100"} antialiased font-sans flex flex-col`}>
        <AuthScreen
          onAuthSuccess={async (user) => {
            setCurrentUser(user);
            await loadFirestoreQuizzes(user.role);
            setActiveScreen("home");
          }}
        />
      </div>
    );
  }

  const activeQuiz = quizzes.find((q) => q.id === activeQuizId) || quizzes[0];

  // Derive dynamic header title and subtitle
  let headerTitle = "BandApp";
  let headerSubtitle = currentUser.role === "admin" ? "Painel do Administrador" : "Área do Estudante";

  switch (activeScreen) {
    case "create_quiz":
      headerTitle = "Novo Questionário";
      headerSubtitle = "Sistema Americano (JSON ou IA com Chat)";
      break;
    case "play_quiz":
      headerTitle = activeQuiz?.title || "Questionário";
      headerSubtitle = `${activeQuiz?.category || "Geral"} • ${activeQuiz?.questionCount || 20} Perguntas`;
      break;
    case "result_quiz":
      headerTitle = "Resultado da Avaliação";
      headerSubtitle = activeQuiz?.title || "Desempenho";
      break;
    case "question_bank":
      headerTitle = "Banco de Questões";
      headerSubtitle = "Perguntas com 4 opções e fundamentação";
      break;
    case "leaderboard":
      headerTitle = "Placar dos Estudantes";
      headerSubtitle = "Top 10 • Pontuação Acumulada & Precisão";
      break;
    case "pdf_export":
      headerTitle = "Exportação de PDF & Gabarito";
      headerSubtitle = "Gere apostilas, cadernos de prova e folhas de respostas";
      break;
    case "settings":
      headerTitle = "Configurações & Firebase";
      headerSubtitle = `${currentUser.email} • ${currentUser.role === "admin" ? "Admin" : "Estudante"}`;
      break;
    case "auth":
      headerTitle = "BandApp";
      headerSubtitle = "Autenticação";
      break;
  }

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden ${theme === "light" ? "theme-light light" : "dark"} bg-slate-950 text-slate-100 antialiased font-sans flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200`}>
      {activeScreen !== "auth" && activeScreen !== "play_quiz" && (
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          activeScreen={activeScreen}
          theme={theme}
          onToggleTheme={() => {
            const nextTheme = theme === "light" ? "dark" : "light";
            setTheme(nextTheme);
            saveStoredTheme(nextTheme);
          }}
          onNavigate={(screen) => {
            if (screen === "create_quiz" && currentUser.role !== "admin") {
              return; // Guard: only admin can open create screen
            }
            setActiveScreen(screen);
          }}
          onBack={() => {
            setActiveScreen("home");
          }}
        />
      )}

      <main className="flex-1 w-full">
        {activeScreen === "home" && (
          <HomeScreen
            quizzes={quizzes}
            categories={categories}
            currentUserRole={currentUser.role}
            currentUserEmail={currentUser.email}
            theme={theme}
            onStartQuiz={handleStartQuiz}
            onNavigate={(screen) => {
              if (screen === "create_quiz" && currentUser.role !== "admin") {
                return;
              }
              setActiveScreen(screen);
            }}
            onDeleteQuiz={handleDeleteQuiz}
            onUpdateQuizSettings={handleUpdateQuizSettings}
            onRefreshQuizzes={refreshQuizzes}
          />
        )}

        {activeScreen === "create_quiz" && currentUser.role === "admin" && (
          <CreateQuizScreen
            categories={categories}
            currentUserRole={currentUser.role}
            currentUserEmail={currentUser.email}
            quizzes={quizzes}
            onQuizCreated={handleQuizCreated}
            onNavigateBack={() => setActiveScreen("home")}
            onAddCategory={handleAddCategory}
          />
        )}

        {activeScreen === "play_quiz" && activeQuiz && (
          <QuizRunnerScreen
            quiz={activeQuiz}
            onFinishQuiz={handleFinishQuiz}
            onNavigateBack={() => setActiveScreen("home")}
          />
        )}

        {activeScreen === "result_quiz" && activeQuiz && quizResult && (
          <QuizResultScreen
            quiz={quizResult.sessionQuiz || activeQuiz}
            scorePercent={quizResult.scorePercent}
            correctCount={quizResult.correctCount}
            userAnswers={quizResult.userAnswers}
            currentUser={currentUser}
            onPlayAgain={() => setActiveScreen("play_quiz")}
            onNavigateHome={() => setActiveScreen("home")}
            onNavigateLeaderboard={() => setActiveScreen("leaderboard")}
          />
        )}

        {activeScreen === "question_bank" && (
          <QuestionBankScreen
            quizzes={quizzes}
            categories={categories}
            currentUserRole={currentUser.role}
            currentUserEmail={currentUser.email}
            theme={theme}
            onNavigateBack={() => setActiveScreen("home")}
            onQuizCreated={handleQuizCreated}
            onDeleteQuestion={handleDeleteQuestion}
            onDeleteMultipleQuestions={handleDeleteMultipleQuestions}
            onCreateQuizFromSelected={handleCreateQuizFromSelected}
            onStartQuiz={handleStartQuiz}
          />
        )}

        {activeScreen === "leaderboard" && (
          <LeaderboardScreen
            currentUser={currentUser}
            theme={theme}
            onNavigateBack={() => setActiveScreen("home")}
            onStartQuizFromLeaderboard={() => {
              if (quizzes.length > 0) {
                handleStartQuiz(quizzes[0].id);
              } else {
                setActiveScreen("home");
              }
            }}
          />
        )}

        {activeScreen === "pdf_export" && (
          <AdminPdfExportScreen
            quizzes={quizzes}
            currentUserRole={currentUser.role}
            currentUserEmail={currentUser.email}
            theme={theme}
            onNavigateBack={() => setActiveScreen("home")}
          />
        )}

        {activeScreen === "settings" && (
          <SettingsScreen
            currentUser={currentUser}
            quizzes={quizzes}
            theme={theme}
            onRefreshQuizzes={refreshQuizzes}
            onThemeChange={(newTheme) => {
              setTheme(newTheme);
              saveStoredTheme(newTheme);
            }}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}

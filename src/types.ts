export type OptionLetter = "A" | "B" | "C" | "D";

export type DifficultyLevel = "Fácil" | "Médio" | "Difícil";

export interface Question {
  id: number;
  quizId?: number;
  category: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionLetter;
  explanation: string;
  sourceExcerpt: string;
  documentSection: number;
  difficulty: DifficultyLevel;
}

export type TimerMode = "free" | "timed";
export type TimerScope = "general" | "individual";
export type TimerUnit = "seconds" | "minutes" | "hours";

export interface Quiz {
  id: number;
  title: string;
  description: string;
  category: string;
  sourceFileName: string;
  sourceFileType: "PDF" | "DOCX" | "DOC" | "TXT" | "JSON" | "IMAGE" | "TEXT";
  sourceFileHash: string;
  questionCount: number;
  createdAt: number;
  totalAnswered: number;
  lastScorePercent: number;
  lastCompletedAt: number;
  sectionsCoveredInfo: string;
  questions: Question[];
  // New features
  isPublic?: boolean; // When true, students can view and play this quiz
  allowPdfExport?: boolean; // When true (default), students can download PDF on result screen
  allowTxtExport?: boolean; // When true (default), students can copy/download TXT on result screen
  timerMode?: TimerMode; // 'free' or 'timed'
  timerScope?: TimerScope; // 'general' (whole quiz) or 'individual' (per question)
  timerUnit?: TimerUnit; // 'seconds' | 'minutes' | 'hours'
  timerValue?: number; // Numeric value set by user
  timerSeconds?: number; // Normalized duration in seconds (per question or total)
  timerMinutes?: number; // Legacy duration in minutes when timerMode === 'timed'
  createdByEmail?: string;
  customPromptInstruction?: string; // Custom instruction provided by admin in chat/prompt mode
}

export interface DocumentAnalysis {
  fileHash: string;
  fileName: string;
  fileType: "PDF" | "DOCX" | "DOC" | "TXT" | "JSON" | "IMAGE" | "TEXT";
  totalWords: number;
  totalEstimatedSections: number;
  previouslyProcessedSections: number[];
  remainingSectionsToProcess: number[];
  existingQuestionsCountInDoc: number;
  existingQuestionsCountInCategory: number;
  sampleExistingThemes: string[];
  extractedFullText: string;
  previewImage?: string;
}

export type UserRole = "admin" | "student";

export interface UserAccount {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
  quizzesGenerated: number;
  quizzesCompleted: number;
  averageScorePercent: number;
  preferredAiProvider: string;
  streakDays?: number;
  lastActiveAt?: number;
  hiddenQuizIds?: number[];
}

export interface DocumentHistoryItem {
  id: string;
  fileHash: string;
  fileName: string;
  fileType: string;
  category: string;
  totalQuestionsExtracted: number;
  processedSegments: number[];
  lastUsedTimestamp: number;
}

export interface AiProviderConfig {
  id: string;
  displayName: string;
  modelId: string;
  isFreeTier: boolean;
  tag: string;
}

export interface GenerationProgress {
  step: number;
  totalSteps: number;
  statusMessage: string;
  isComplete: boolean;
  error?: string | null;
}

export type ActiveScreen =
  | "home"
  | "create_quiz"
  | "play_quiz"
  | "result_quiz"
  | "question_bank"
  | "leaderboard"
  | "settings"
  | "auth";

export type AppTheme = "dark" | "light";

export interface QuizAttemptRecord {
  id: string;
  quizId: number;
  quizTitle: string;
  category: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedAt: number;
  userId?: string;
  userEmail?: string;
  isCompleted?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  email: string;
  avatarSeed: string;
  totalPoints: number; // calculated as (totalCorrectCount * 50) + (quizzesCompleted * 100) + bonus
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrectCount: number;
  averageScorePercent: number;
  averageTimeSeconds: number;
  tier: "Diamante" | "Ouro" | "Prata" | "Bronze" | "Aspirante";
  badge: string;
  streakDays: number;
  isCurrentUser?: boolean;
}


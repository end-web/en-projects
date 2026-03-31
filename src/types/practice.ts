export interface QuestionTemplate {
  zh: string;
  en: string;
}

export interface Question {
  id: string;
  course: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  zh: string;
  en: string;
}

export interface CourseOption {
  key: number;
  title: string;
  subtitle: string;
  icon: string;
}

export interface SubmitResult {
  ok: boolean;
  expected: string;
  actual: string;
  grade: "Perfect" | "Great" | null;
  scoreDelta: number;
}

export interface ReviewToken {
  word: string;
  ipa: string;
  posLabel: string;
  gloss: string;
}

export type PracticeDataSource = "remote" | "unavailable";

export type PracticeMode = "normal" | "daily-challenge";

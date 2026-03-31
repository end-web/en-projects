import type { Question, QuestionTemplate } from "../types/practice";

type Difficulty = 1 | 2 | 3 | 4 | 5;

const DEFAULT_REMOTE_ENDPOINTS = [
  "https://fastly.jsdelivr.net/gh/end-web/en-projects@latest/src/data/questions.ts",
  "https://fastly.jsdelivr.net/gh/end-web/en-projects@main/src/data/questions.ts",
  "https://cdn.jsdelivr.net/gh/end-web/en-projects@main/src/data/questions.ts",
  "https://gcore.jsdelivr.net/gh/end-web/en-projects@main/src/data/questions.ts",
  "https://raw.githubusercontent.com/end-web/en-projects/main/src/data/questions.ts",
  "https://end-web.github.io/en-projects/question-bank.json"
];

export interface RemoteFetchOptions {
  timeoutMs?: number;
  retries?: number;
  endpoint?: string;
}

interface NormalizedQuestionLike {
  course: number;
  difficulty: Difficulty;
  zh: string;
  en: string;
}

interface RemoteTemplateEntry {
  zh?: unknown;
  en?: unknown;
}

function toDifficulty(raw: unknown): Difficulty | null {
  const value = Number(raw);
  if (Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as Difficulty;
  }
  return null;
}

function normalizeText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function normalizeQuestionItem(raw: unknown): NormalizedQuestionLike | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Record<string, unknown>;
  const course = Number(data.course);
  const difficulty = toDifficulty(data.difficulty);
  const zh = normalizeText(data.zh);
  const en = normalizeText(data.en);
  if (!Number.isInteger(course) || course < 1 || !difficulty || !zh || !en) {
    return null;
  }
  return { course, difficulty, zh, en };
}

function normalizeQuestionArray(raw: unknown): NormalizedQuestionLike[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeQuestionItem).filter((item): item is NormalizedQuestionLike => Boolean(item));
}

function parseCourseBank(raw: unknown): NormalizedQuestionLike[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const result: NormalizedQuestionLike[] = [];
  const bank = raw as Record<string, unknown>;
  for (const [courseKey, courseRaw] of Object.entries(bank)) {
    const course = Number(courseKey);
    if (!Number.isInteger(course) || course < 1 || !courseRaw || typeof courseRaw !== "object") {
      continue;
    }
    const difficultyMap = courseRaw as Record<string, unknown>;
    for (const [difficultyKey, templatesRaw] of Object.entries(difficultyMap)) {
      const difficulty = toDifficulty(difficultyKey);
      if (!difficulty || !Array.isArray(templatesRaw)) {
        continue;
      }
      for (const template of templatesRaw as RemoteTemplateEntry[]) {
        const zh = normalizeText(template?.zh);
        const en = normalizeText(template?.en);
        if (!zh || !en) {
          continue;
        }
        result.push({ course, difficulty, zh, en });
      }
    }
  }
  return result;
}

function toQuestions(items: NormalizedQuestionLike[]): Question[] {
  return items.map((item, index) => ({
    id: `remote-q-${index + 1}`,
    course: item.course,
    difficulty: item.difficulty,
    zh: item.zh,
    en: item.en
  }));
}

function parseQuestionsTs(content: string): NormalizedQuestionLike[] {
  const lines = content.split(/\r?\n/);
  let currentCourse: number | null = null;
  let currentDifficulty: Difficulty | null = null;
  const parsed: NormalizedQuestionLike[] = [];

  for (const line of lines) {
    const courseMatch = line.match(/^\s*(\d+):\s*\{\s*$/);
    if (courseMatch) {
      currentCourse = Number(courseMatch[1]);
      currentDifficulty = null;
      continue;
    }

    const difficultyMatch = line.match(/^\s*([1-5]):\s*\[\s*$/);
    if (difficultyMatch) {
      currentDifficulty = Number(difficultyMatch[1]) as Difficulty;
      continue;
    }

    const questionMatch = line.match(/\{\s*zh:\s*"([^"]+)"\s*,\s*en:\s*"([^"]+)"\s*\}/);
    if (questionMatch && currentCourse && currentDifficulty) {
      const zh = questionMatch[1].trim();
      const en = questionMatch[2].trim();
      if (zh && en) {
        parsed.push({
          course: currentCourse,
          difficulty: currentDifficulty,
          zh,
          en
        });
      }
    }
  }

  return parsed;
}

async function requestWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timerId);
  }
}

async function fetchEndpoint(endpoint: string, timeoutMs: number, retries: number): Promise<Question[]> {
  let attempts = 0;
  while (attempts <= retries) {
    try {
      const response = await requestWithTimeout(endpoint, timeoutMs);
      if (!response.ok) {
        throw new Error(`http-${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const body = (await response.json()) as unknown;
        const normalized =
          normalizeQuestionArray(body) ||
          [];
        if (normalized.length) {
          return toQuestions(normalized);
        }

        if (body && typeof body === "object") {
          const data = body as Record<string, unknown>;
          if (Array.isArray(data.questions)) {
            const fromQuestions = normalizeQuestionArray(data.questions);
            if (fromQuestions.length) {
              return toQuestions(fromQuestions);
            }
          }
          const fromCourseBank = parseCourseBank(data.courseBank);
          if (fromCourseBank.length) {
            return toQuestions(fromCourseBank);
          }
          const directCourseBank = parseCourseBank(body);
          if (directCourseBank.length) {
            return toQuestions(directCourseBank);
          }
        }
      }

      const text = await response.text();
      const fromTs = parseQuestionsTs(text);
      if (fromTs.length) {
        return toQuestions(fromTs);
      }

      try {
        const parsed = JSON.parse(text) as unknown;
        const fromArray = normalizeQuestionArray(parsed);
        if (fromArray.length) {
          return toQuestions(fromArray);
        }
      } catch {
        // ignore invalid json text
      }
      throw new Error("invalid-remote-payload");
    } catch {
      attempts += 1;
      if (attempts > retries) {
        break;
      }
    }
  }
  return [];
}

export async function fetchRemoteQuestions(options: RemoteFetchOptions = {}): Promise<Question[]> {
  const timeoutMs = options.timeoutMs ?? 12000;
  const retries = options.retries ?? 2;
  const envUrl = normalizeText(import.meta.env.VITE_REMOTE_QUESTION_URL);
  const endpoints = [options.endpoint, envUrl, ...DEFAULT_REMOTE_ENDPOINTS].filter(
    (item): item is string => Boolean(item)
  );

  for (const endpoint of endpoints) {
    const questions = await fetchEndpoint(endpoint, timeoutMs, retries);
    if (questions.length) {
      return questions;
    }
  }
  return [];
}

export function buildQuestionsFromCourseBank(
  courseBank: Record<number, Record<Difficulty, QuestionTemplate[]>>
): Question[] {
  const result: Question[] = [];
  let counter = 1;
  const difficulties: Difficulty[] = [1, 2, 3, 4, 5];
  for (let course = 1; course <= 5; course += 1) {
    for (const difficulty of difficulties) {
      const items = courseBank[course]?.[difficulty] ?? [];
      for (const item of items) {
        const zh = item.zh.trim();
        const en = item.en.trim();
        if (!zh || !en) {
          continue;
        }
        result.push({
          id: `local-q-${counter}`,
          course,
          difficulty,
          zh,
          en
        });
        counter += 1;
      }
    }
  }
  return result;
}

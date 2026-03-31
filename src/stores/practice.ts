import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { fetchRemoteQuestions } from "../services/remoteQuestions";
import type {
  CourseOption,
  PracticeDataSource,
  PracticeMode,
  Question,
  SubmitResult
} from "../types/practice";

function normalizeWord(text: string): string {
  return text
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getQuestionWords(question: Question): string[] {
  return question.en
    .replace(/[.,!?;:]+$/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function shuffleIndexes(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

const DAILY_CHALLENGE_STORAGE_KEY = "bydcc.daily-challenge-v1";
const REMOTE_RETRY_MS = 30000;

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createSeededIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function pickByDifficulty(
  allQuestions: Question[],
  difficulty: 1 | 2 | 3 | 4 | 5,
  dateKey: string
): Question | null {
  const primaryPool = allQuestions.filter((item) => item.difficulty === difficulty);
  const pool = primaryPool;
  if (!pool.length) {
    return null;
  }
  const idx = createSeededIndex(`${dateKey}-${difficulty}`, pool.length);
  return pool[idx];
}

function createDailyChallengeQuestions(allQuestions: Question[], dateKey: string): Question[] {
  const difficulties: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  const result: Question[] = [];
  for (const difficulty of difficulties) {
    const picked = pickByDifficulty(allQuestions, difficulty, dateKey);
    if (!picked) {
      continue;
    }
    result.push({
      ...picked,
      id: `daily-${dateKey}-${difficulty}-${picked.id}`
    });
  }
  return result;
}

function readDailyChallengeCache(dateKey: string): Question[] {
  try {
    const raw = window.localStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as { date?: string; questions?: Question[] };
    if (parsed?.date !== dateKey || !Array.isArray(parsed.questions)) {
      return [];
    }
    return parsed.questions.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.course === "number" &&
        typeof item.difficulty === "number" &&
        typeof item.zh === "string" &&
        typeof item.en === "string"
    );
  } catch {
    return [];
  }
}

function writeDailyChallengeCache(dateKey: string, questions: Question[]): void {
  try {
    window.localStorage.setItem(
      DAILY_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        date: dateKey,
        questions
      })
    );
  } catch {
    // ignore storage write failures
  }
}

export const usePracticeStore = defineStore("practice", () => {
  const courseOptions: CourseOption[] = [
    { key: 1, title: "水果", subtitle: "Fruits", icon: "🍎" },
    { key: 2, title: "动物", subtitle: "Animals", icon: "🐼" },
    { key: 3, title: "身体", subtitle: "Body", icon: "🧍" },
    { key: 4, title: "校园", subtitle: "Campus", icon: "🏫" },
    { key: 5, title: "生活", subtitle: "Life", icon: "🌤️" }
  ];
  const selectedCourse = ref(1);
  const mode = ref<PracticeMode>("normal");
  const currentIndex = ref(0);
  const draftWords = ref<string[]>([]);
  const showAnswer = ref(false);
  const correctCount = ref(0);
  const wrongCount = ref(0);
  const normalStreak = ref(0);
  const normalScore = ref(0);
  const randomOrder = ref<number[]>([]);
  const questionsRef = ref<Question[]>([]);
  const loadingQuestions = ref(false);
  const dataSource = ref<PracticeDataSource>("unavailable");
  const loadError = ref("");
  const remoteRetryTimer = ref<number | null>(null);
  function clearRemoteRetryTimer(): void {
    if (remoteRetryTimer.value !== null) {
      window.clearTimeout(remoteRetryTimer.value);
      remoteRetryTimer.value = null;
    }
  }

  function scheduleRemoteRetry(): void {
    clearRemoteRetryTimer();
    remoteRetryTimer.value = window.setTimeout(() => {
      void retryRemoteQuestions();
    }, REMOTE_RETRY_MS);
  }

  async function retryRemoteQuestions(): Promise<void> {
    if (dataSource.value === "remote") {
      return;
    }
    try {
      const remote = await fetchRemoteQuestions();
      if (remote.length) {
        questionsRef.value = remote;
        dataSource.value = "remote";
        loadError.value = "";
        clearRemoteRetryTimer();
        if (import.meta.env.DEV) {
          console.info("[practice] switched to remote question bank:", remote.length);
        }
      } else {
        scheduleRemoteRetry();
      }
    } catch {
      scheduleRemoteRetry();
    }
  }


  const dailyChallengeQuestions = ref<Question[]>([]);
  const dailyChallengeIndex = ref(0);
  const dailyChallengeDone = ref(false);
  const dailyChallengeScore = ref(0);
  const dailyChallengeCorrect = ref(0);
  const dailyChallengeWrong = ref(0);

  const filteredQuestions = computed(() =>
    questionsRef.value.filter((item) => item.course === selectedCourse.value)
  );

  const activeQuestions = computed(() =>
    mode.value === "daily-challenge" ? dailyChallengeQuestions.value : filteredQuestions.value
  );

  const currentQuestion = computed<Question | null>(() => {
    const list = activeQuestions.value;
    if (!list.length) {
      return null;
    }
    if (mode.value === "daily-challenge") {
      const item = list[dailyChallengeIndex.value];
      return item ?? null;
    }
    const realIndex = randomOrder.value[currentIndex.value] ?? 0;
    return list[realIndex] ?? list[0];
  });

  const total = computed(() => activeQuestions.value.length);
  const progressText = computed(() => {
    const index = mode.value === "daily-challenge" ? dailyChallengeIndex.value : currentIndex.value;
    return `${Math.min(index + 1, total.value)}/${total.value || 0}`;
  });
  const progressPercent = computed(() => {
    if (!total.value) {
      return 0;
    }
    const index = mode.value === "daily-challenge" ? dailyChallengeIndex.value : currentIndex.value;
    return Math.round((Math.min(index + 1, total.value) / total.value) * 100);
  });
  const accuracy = computed(() => {
    const right = mode.value === "daily-challenge" ? dailyChallengeCorrect.value : correctCount.value;
    const wrong = mode.value === "daily-challenge" ? dailyChallengeWrong.value : wrongCount.value;
    const totalSubmitted = right + wrong;
    if (!totalSubmitted) {
      return "0%";
    }
    return `${Math.round((right / totalSubmitted) * 100)}%`;
  });
  const streak = computed(() => (mode.value === "daily-challenge" ? 0 : normalStreak.value));
  const score = computed(() =>
    mode.value === "daily-challenge" ? dailyChallengeScore.value : normalScore.value
  );

  function resetForCurrentQuestion(): void {
    const question = currentQuestion.value;
    draftWords.value = question ? getQuestionWords(question).map(() => "") : [];
    showAnswer.value = false;
  }

  function rebuildOrder(): void {
    randomOrder.value = shuffleIndexes(filteredQuestions.value.length);
  }

  function resetNormalStats(): void {
    correctCount.value = 0;
    wrongCount.value = 0;
    normalStreak.value = 0;
    normalScore.value = 0;
  }

  function ensureDailyChallengeQuestions(): void {
    const dateKey = getTodayKey();
    const cached = readDailyChallengeCache(dateKey);
    const availableSet = new Set(
      questionsRef.value.map((item) => `${item.course}|${item.difficulty}|${item.zh}|${item.en}`)
    );
    const cacheValid =
      cached.length === 5 &&
      cached.every((item) =>
        availableSet.has(`${item.course}|${item.difficulty}|${item.zh}|${item.en}`)
      );
    if (cacheValid) {
      dailyChallengeQuestions.value = cached;
      return;
    }
    const generated = createDailyChallengeQuestions(questionsRef.value, dateKey);
    dailyChallengeQuestions.value = generated;
    if (generated.length === 5) {
      writeDailyChallengeCache(dateKey, generated);
    }
  }

  watch(selectedCourse, () => {
    currentIndex.value = 0;
    resetNormalStats();
    rebuildOrder();
    if (mode.value !== "daily-challenge") {
      resetForCurrentQuestion();
    }
  });

  watch(questionsRef, () => {
    if (mode.value !== "daily-challenge") {
      currentIndex.value = 0;
      rebuildOrder();
    }
    ensureDailyChallengeQuestions();
    resetForCurrentQuestion();
  });

  watch(currentQuestion, () => {
    resetForCurrentQuestion();
  });

  function setCourse(value: number): void {
    selectedCourse.value = value;
    if (mode.value === "daily-challenge") {
      mode.value = "normal";
      dailyChallengeDone.value = false;
      dailyChallengeIndex.value = 0;
    }
  }

  function updateWord(index: number, value: string): void {
    draftWords.value[index] = value.trim();
  }

  function getDraftText(): string {
    return draftWords.value.join(" ");
  }

  function getExpectedText(): string {
    return currentQuestion.value
      ? getQuestionWords(currentQuestion.value).join(" ")
      : "";
  }

  function revealAnswer(): void {
    showAnswer.value = true;
  }

  function nextQuestion(): void {
    const list = activeQuestions.value;
    if (!list.length) {
      return;
    }
    if (mode.value === "daily-challenge") {
      if (dailyChallengeIndex.value >= list.length - 1) {
        dailyChallengeDone.value = true;
        dailyChallengeIndex.value = list.length;
      } else {
        dailyChallengeIndex.value += 1;
      }
      resetForCurrentQuestion();
      return;
    }
    if (currentIndex.value >= filteredQuestions.value.length - 1) {
      rebuildOrder();
      currentIndex.value = 0;
    } else {
      currentIndex.value += 1;
    }
    resetForCurrentQuestion();
  }

  function submit(): SubmitResult {
    const expected = getExpectedText();
    const actual = getDraftText();
    const ok = normalizeWord(actual) === normalizeWord(expected);
    const expectedRaw = expected.trim();
    const actualRaw = actual.replace(/\s+/g, " ").trim();
    const isPerfect = ok && actualRaw === expectedRaw;
    const grade: SubmitResult["grade"] = ok ? (isPerfect ? "Perfect" : "Great") : null;
    const scoreDelta = ok ? (isPerfect ? 20 : 12) : 0;

    if (mode.value === "daily-challenge") {
      if (ok) {
        dailyChallengeCorrect.value += 1;
        dailyChallengeScore.value += scoreDelta;
      } else {
        dailyChallengeWrong.value += 1;
      }
    } else if (ok) {
      correctCount.value += 1;
      normalStreak.value += 1;
      normalScore.value += scoreDelta;
    } else {
      wrongCount.value += 1;
      normalStreak.value = 0;
    }

    return {
      ok,
      expected,
      actual,
      grade,
      scoreDelta
    };
  }

  async function initQuestions(): Promise<void> {
    loadingQuestions.value = true;
    loadError.value = "";
    try {
      const remote = await fetchRemoteQuestions();
      if (remote.length) {
        questionsRef.value = remote;
        dataSource.value = "remote";
        clearRemoteRetryTimer();
        if (import.meta.env.DEV) {
          console.info("[practice] using remote question bank:", remote.length);
        }
      } else {
        questionsRef.value = [];
        dataSource.value = "unavailable";
        loadError.value = "online-unavailable";
        scheduleRemoteRetry();
        if (import.meta.env.DEV) {
          console.warn("[practice] remote question bank unavailable");
        }
      }
    } catch {
      questionsRef.value = [];
      dataSource.value = "unavailable";
      loadError.value = "online-unavailable";
      scheduleRemoteRetry();
      if (import.meta.env.DEV) {
        console.warn("[practice] remote question fetch failed");
      }
    } finally {
      loadingQuestions.value = false;
      ensureDailyChallengeQuestions();
      if (mode.value !== "daily-challenge") {
        rebuildOrder();
      }
    }
  }

  function startDailyChallenge(): void {
    ensureDailyChallengeQuestions();
    mode.value = "daily-challenge";
    dailyChallengeIndex.value = 0;
    dailyChallengeDone.value = false;
    dailyChallengeScore.value = 0;
    dailyChallengeCorrect.value = 0;
    dailyChallengeWrong.value = 0;
    resetForCurrentQuestion();
  }

  function resetDailyChallenge(): void {
    ensureDailyChallengeQuestions();
    dailyChallengeIndex.value = 0;
    dailyChallengeDone.value = false;
    dailyChallengeScore.value = 0;
    dailyChallengeCorrect.value = 0;
    dailyChallengeWrong.value = 0;
    resetForCurrentQuestion();
  }

  function exitDailyChallenge(): void {
    mode.value = "normal";
    dailyChallengeDone.value = false;
    dailyChallengeIndex.value = 0;
    resetForCurrentQuestion();
  }

  rebuildOrder();
  ensureDailyChallengeQuestions();
  resetForCurrentQuestion();

  return {
    courseOptions,
    mode,
    dataSource,
    loadError,
    loadingQuestions,
    selectedCourse,
    questionsRef,
    filteredQuestions,
    currentQuestion,
    currentIndex,
    total,
    progressText,
    progressPercent,
    accuracy,
    streak,
    score,
    draftWords,
    showAnswer,
    dailyChallengeQuestions,
    dailyChallengeIndex,
    dailyChallengeDone,
    setCourse,
    updateWord,
    revealAnswer,
    nextQuestion,
    submit,
    initQuestions,
    retryRemoteQuestions,
    startDailyChallenge,
    resetDailyChallenge,
    exitDailyChallenge
  };
});

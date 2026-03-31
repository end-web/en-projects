import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { questions } from "../data/questions";
import type { CourseOption, Question, SubmitResult } from "../types/practice";

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

export const usePracticeStore = defineStore("practice", () => {
  const courseOptions: CourseOption[] = [
    { key: 1, title: "水果", subtitle: "Fruits", icon: "🍎" },
    { key: 2, title: "动物", subtitle: "Animals", icon: "🐼" },
    { key: 3, title: "身体", subtitle: "Body", icon: "🧍" },
    { key: 4, title: "校园", subtitle: "Campus", icon: "🏫" },
    { key: 5, title: "生活", subtitle: "Life", icon: "🌤️" }
  ];
  const selectedCourse = ref(1);
  const currentIndex = ref(0);
  const draftWords = ref<string[]>([]);
  const showAnswer = ref(false);
  const correctCount = ref(0);
  const wrongCount = ref(0);
  const streak = ref(0);
  const score = ref(0);
  const randomOrder = ref<number[]>([]);

  const filteredQuestions = computed(() =>
    questions.filter((item) => item.course === selectedCourse.value)
  );

  const currentQuestion = computed<Question | null>(() => {
    const list = filteredQuestions.value;
    if (!list.length) {
      return null;
    }
    const realIndex = randomOrder.value[currentIndex.value] ?? 0;
    return list[realIndex] ?? list[0];
  });

  const total = computed(() => filteredQuestions.value.length);
  const progressText = computed(
    () => `${Math.min(currentIndex.value + 1, total.value)}/${total.value || 0}`
  );
  const progressPercent = computed(() => {
    if (!total.value) {
      return 0;
    }
    return Math.round(((currentIndex.value + 1) / total.value) * 100);
  });
  const accuracy = computed(() => {
    const totalSubmitted = correctCount.value + wrongCount.value;
    if (!totalSubmitted) {
      return "0%";
    }
    return `${Math.round((correctCount.value / totalSubmitted) * 100)}%`;
  });

  function resetForCurrentQuestion(): void {
    const question = currentQuestion.value;
    draftWords.value = question ? getQuestionWords(question).map(() => "") : [];
    showAnswer.value = false;
  }

  function rebuildOrder(): void {
    randomOrder.value = shuffleIndexes(filteredQuestions.value.length);
  }

  watch(selectedCourse, () => {
    currentIndex.value = 0;
    correctCount.value = 0;
    wrongCount.value = 0;
    streak.value = 0;
    score.value = 0;
    rebuildOrder();
    resetForCurrentQuestion();
  });

  watch(currentQuestion, () => {
    resetForCurrentQuestion();
  });

  function setCourse(value: number): void {
    selectedCourse.value = value;
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
    if (!filteredQuestions.value.length) {
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

    if (ok) {
      correctCount.value += 1;
      streak.value += 1;
      score.value += scoreDelta;
    } else {
      wrongCount.value += 1;
      streak.value = 0;
    }

    return {
      ok,
      expected,
      actual,
      grade,
      scoreDelta
    };
  }

  rebuildOrder();
  resetForCurrentQuestion();

  return {
    courseOptions,
    selectedCourse,
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
    setCourse,
    updateWord,
    revealAnswer,
    nextQuestion,
    submit
  };
});

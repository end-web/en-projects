<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import CourseSidebar from "../components/CourseSidebar.vue";
import AnswerPanel from "../components/AnswerPanel.vue";
import BottomActions from "../components/BottomActions.vue";
import { usePracticeStore } from "../stores/practice";
import type { ReviewToken } from "../types/practice";
import { ipaDictionary } from "../data/ipaDictionary";

const store = usePracticeStore();

const disabledAction = computed(() => !store.currentQuestion);
const expectedWords = computed(() =>
  store.currentQuestion?.en.replace(/[.,!?;:]+$/g, "").split(/\s+/).filter(Boolean) ?? []
);
const feedbackType = ref<"success" | "error" | null>(null);
const feedbackText = ref("");
const showingReview = ref(false);
const reviewLoading = ref(false);
const reviewTokens = ref<ReviewToken[]>([]);
let feedbackTimer: number | null = null;
let reviewVersion = 0;
const ipaCache = new Map<string, string>(Object.entries(ipaDictionary));
const dailyLoading = ref(false);
const dailySentence = ref({
  en: "Loading daily sentence...",
  zh: "每日一句加载中",
  audio: ""
});
const fallbackQuotes = [
  { en: "Practice makes perfect", zh: "熟能生巧", audio: "" },
  { en: "Every day is a new chance to grow", zh: "每天都是成长的新机会", audio: "" },
  { en: "Small steps lead to big progress", zh: "小步积累成就大进步", audio: "" },
  { en: "Learning never stops", zh: "学习永不止步", audio: "" }
];
const fallbackCursor = ref(0);

const glossMap: Record<string, string> = {
  i: "我",
  like: "喜欢",
  to: "去/不定式",
  eat: "吃",
  fresh: "新鲜的",
  apples: "苹果",
  every: "每个",
  morning: "早上"
};

function getPosLabel(word: string): string {
  const lower = word.toLowerCase();
  if (["i", "you", "he", "she", "we", "they", "it"].includes(lower)) {
    return "代词";
  }
  if (["a", "an", "the"].includes(lower)) {
    return "限定词";
  }
  if (["to", "in", "on", "at", "for", "with", "of"].includes(lower)) {
    return "介词";
  }
  if (lower.endsWith("ing") || ["is", "are", "eat", "like", "go", "make"].includes(lower)) {
    return "动词";
  }
  if (lower.endsWith("ly")) {
    return "副词";
  }
  if (lower.endsWith("ful") || lower.endsWith("ous") || lower === "fresh") {
    return "形容词";
  }
  return "名词";
}

function buildReviewTokens(sentence: string): ReviewToken[] {
  const words = sentence.replace(/[.,!?;:]+$/g, "").split(/\s+/).filter(Boolean);
  return words.map((word) => {
    const key = word.toLowerCase();
    return {
      word,
      ipa: ipaCache.get(key) ?? "",
      posLabel: getPosLabel(word),
      gloss: glossMap[key] ?? ""
    };
  });
}

function normalizeIpa(raw: string): string {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("/") && value.endsWith("/")) {
    return value;
  }
  return `/${value}/`;
}

async function fetchIpaFromFreeDictionary(word: string): Promise<string> {
  const key = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!key) {
    return "";
  }
  if (ipaCache.has(key)) {
    return ipaCache.get(key) ?? "";
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`
    );
    if (!res.ok) {
      ipaCache.set(key, "");
      return "";
    }

    const data = (await res.json()) as Array<{
      phonetic?: string;
      phonetics?: Array<{ text?: string }>;
    }>;
    const first = data?.[0];
    const raw =
      first?.phonetic?.trim() ||
      first?.phonetics?.find((item) => item.text?.trim())?.text?.trim() ||
      "";
    const ipa = normalizeIpa(raw);
    ipaCache.set(key, ipa);
    return ipa;
  } catch {
    ipaCache.set(key, "");
    return "";
  }
}

async function enrichReviewTokensIpa(version: number): Promise<void> {
  const tokensSnapshot = [...reviewTokens.value];
  const loadingStart = Date.now();
  try {
    await Promise.all(tokensSnapshot.map((token) => fetchIpaFromFreeDictionary(token.word)));
    if (version !== reviewVersion || !showingReview.value) {
      return;
    }

    reviewTokens.value = tokensSnapshot.map((token) => {
      const key = token.word.toLowerCase().replace(/[^a-z']/g, "");
      return {
        ...token,
        ipa: ipaCache.get(key) || token.ipa
      };
    });
  } finally {
    const elapsed = Date.now() - loadingStart;
    const minLoadingMs = 1500;
    if (elapsed < minLoadingMs) {
      await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed));
    }
    if (version === reviewVersion) {
      reviewLoading.value = false;
    }
  }
}

function triggerFeedback(type: "success" | "error", text: string): void {
  feedbackType.value = null;
  feedbackText.value = "";
  window.requestAnimationFrame(() => {
    feedbackType.value = type;
    feedbackText.value = text;
  });

  if (feedbackTimer) {
    window.clearTimeout(feedbackTimer);
  }
  feedbackTimer = window.setTimeout(() => {
    feedbackType.value = null;
    feedbackText.value = "";
  }, 750);
}

function useFallbackDaily(): void {
  const item = fallbackQuotes[fallbackCursor.value % fallbackQuotes.length];
  fallbackCursor.value += 1;
  dailySentence.value = {
    en: item.en,
    zh: item.zh,
    audio: item.audio
  };
}

async function loadDailySentence(forceSwitch = false): Promise<void> {
  dailyLoading.value = true;
  const previous = dailySentence.value.en;
  try {
    const res = await fetch(`https://open.iciba.com/dsapi/?t=${Date.now()}`);
    if (!res.ok) {
      throw new Error("daily-api-failed");
    }
    const data = (await res.json()) as {
      content?: string;
      note?: string;
      tts?: string;
      mp3?: string;
    };
    const en = data.content?.trim() ?? "";
    const zh = data.note?.trim() ?? "";
    const audio = data.tts?.trim() || data.mp3?.trim() || "";

    if (!en) {
      throw new Error("daily-empty");
    }

    if (forceSwitch && en === previous) {
      useFallbackDaily();
    } else {
      dailySentence.value = {
        en,
        zh: zh || "暂无翻译",
        audio
      };
    }
  } catch {
    useFallbackDaily();
  } finally {
    dailyLoading.value = false;
  }
}

function handleRead(): void {
  const question = store.currentQuestion;
  if (!question) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    ElMessage.error("当前浏览器不支持朗读功能。");
    return;
  }

  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(question.en);
  const pickAndSpeak = () => {
    const voices = synth.getVoices();
    const englishVoice =
      voices.find((voice) => /en[-_]/i.test(voice.lang)) ??
      voices.find((voice) => /english/i.test(voice.name));
    if (englishVoice) {
      utter.voice = englishVoice;
    }
    synth.cancel();
    synth.speak(utter);
  };

  if (!synth.getVoices().length) {
    synth.onvoiceschanged = () => {
      pickAndSpeak();
      synth.onvoiceschanged = null;
    };
  } else {
    pickAndSpeak();
  }

  utter.lang = "en-US";
  utter.rate = 0.95;
  utter.pitch = 1;
}

function handleAnswer(): void {
  store.revealAnswer();
}

function handleSubmit(): void {
  if (!store.currentQuestion) {
    return;
  }

  if (showingReview.value) {
    if (reviewLoading.value) {
      return;
    }
    showingReview.value = false;
    reviewLoading.value = false;
    reviewTokens.value = [];
    reviewVersion += 1;
    store.nextQuestion();
    return;
  }

  const result = store.submit();

  if (result.ok) {
    triggerFeedback("success", result.grade ?? "Great");
    reviewTokens.value = buildReviewTokens(result.expected);
    reviewVersion += 1;
    const currentVersion = reviewVersion;
    showingReview.value = true;
    reviewLoading.value = true;
    void enrichReviewTokensIpa(currentVersion);
    return;
  }

  triggerFeedback("error", "Try Again");
}

function onWindowKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  const isTypingInput =
    target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
  if (event.key === "Enter" && !disabledAction.value && !isTypingInput) {
    handleSubmit();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onWindowKeydown);
  void loadDailySentence();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeydown);
});

watch(
  () => store.selectedCourse,
  () => {
    showingReview.value = false;
    reviewLoading.value = false;
    reviewTokens.value = [];
    feedbackType.value = null;
    feedbackText.value = "";
    reviewVersion += 1;
  }
);
</script>

<template>
  <main class="practice-page">
    <header class="page-header">
      <div class="head-left">
        <div class="title-wrap">
          <img class="logo-duck" src="/鸭子.jpg" alt="duck logo" />
          <div>
            <h1>想学英语吗？</h1>
            <p>用键盘输入英文，按 Enter 提交</p>
          </div>
        </div>
      </div>
      <p class="daily-inline daily-target" @click="loadDailySentence(true)" :title="dailySentence.zh">
        <span class="daily-en-inline">{{ dailyLoading ? "Loading..." : dailySentence.en }}</span>
        <span class="daily-zh-inline">{{ dailySentence.zh }}</span>
      </p>
    </header>
    <div class="content-grid">
      <CourseSidebar
        :course-options="store.courseOptions"
        :selected-course="store.selectedCourse"
        :total="store.total"
        @update:course="store.setCourse"
      />

      <div class="main-column">
        <section class="top-progress ios-card">
          <el-progress :percentage="store.progressPercent" :stroke-width="10" :show-text="false" />
          <div class="progress-meta">
            <span>进度 {{ store.progressText }}</span>
            <span>正确率 {{ store.accuracy }}</span>
            <span>连对 {{ store.streak }}</span>
            <span>积分 {{ store.score }}</span>
          </div>
        </section>

        <AnswerPanel
          :question="store.currentQuestion"
          :draft-words="store.draftWords"
          :expected-words="expectedWords"
          :show-answer="store.showAnswer"
          :progress-text="store.progressText"
          :accuracy="store.accuracy"
          :feedback-type="feedbackType"
          :feedback-text="feedbackText"
          :showing-review="showingReview"
          :review-loading="reviewLoading"
          :review-tokens="reviewTokens"
          @update-word="store.updateWord"
          @submit-request="handleSubmit"
        />
        <BottomActions
          :disabled="disabledAction"
          @read="handleRead"
          @answer="handleAnswer"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.practice-page {
  min-height: 100vh;
  padding: 24px;
  padding-bottom: 34px;
  max-width: 1240px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 18px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 14px;

  h1 {
    margin: 0 0 6px;
    font-size: 34px;
    letter-spacing: 0.5px;
    color: #2b3f67;
  }

  p {
    margin: 6px 0 0;
    color: #7a8fbf;
  }
}

.head-left {
  display: flex;
  align-items: center;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-duck {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(143, 169, 255, 0.55);
}

.daily-inline {
  margin: 0;
  max-width: 640px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(233, 241, 255, 0.9);
  color: #39538f;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  border: 1px solid #d6e3ff;
  text-align: center;
}

.daily-target {
  justify-self: center;
  width: min(440px, 100%);
}

.daily-en-inline {
  font-size: 15px;
  font-weight: 600;
  width: 100%;
  background: linear-gradient(90deg, #9a66ff 0%, #e06dcb 55%, #b67cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.daily-zh-inline {
  font-size: 13px;
  background: linear-gradient(90deg, #a874ff 0%, #ee88d4 55%, #c28cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  width: 100%;
}

.content-grid {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  gap: 18px;
}

.top-progress {
  padding: 12px 14px;
  margin-bottom: 14px;
}

.progress-meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #7a8fbf;
}

.main-column {
  display: flex;
  flex-direction: column;
}

@media (max-width: 1060px) {
  .practice-page {
    padding: 14px;
    padding-bottom: 92px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;

    h1 {
      font-size: 26px;
    }
  }

  .head-left {
    flex-direction: column;
    align-items: flex-start;
  }

  .daily-inline {
    max-width: 100%;
  }

  .daily-target {
    width: 100%;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>

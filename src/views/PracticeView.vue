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
const isChallengeMode = computed(() => store.mode === "daily-challenge");
const isWordTrainingMode = computed(() => store.mode === "word-training");
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
const wordTrainingLoading = ref(false);
const wordTrainingWord = ref("");
const wordTrainingDefinition = ref("");
const wordTrainingPhonetic = ref("");
const wordTrainingInput = ref("");
const wordTrainingFeedback = ref<"success" | "error" | null>(null);
const wordTrainingStats = ref({ total: 0, correct: 0 });
let wordPool: string[] | null = null;
const WORD_POOL_ENDPOINTS = [
  "https://fastly.jsdelivr.net/gh/first20hours/google-10000-english@master/20k.txt",
  "https://cdn.jsdelivr.net/gh/first20hours/google-10000-english@master/20k.txt"
];

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
    const providers = [
      `https://dummyjson.com/quotes/random?t=${Date.now()}`,
      `https://zenquotes.io/api/random?t=${Date.now()}`
    ];

    let en = "";
    let zh = "";

    for (const url of providers) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          continue;
        }
        const data = (await res.json()) as
          | { quote?: string; author?: string }
          | Array<{ q?: string; a?: string }>;

        if ("quote" in (data as { quote?: string })) {
          const item = data as { quote?: string; author?: string };
          en = item.quote?.trim() ?? "";
          const author = item.author?.trim() ?? "";
          zh = author ? `作者：${author}` : "每日一句";
        } else if (Array.isArray(data)) {
          const item = data[0];
          en = item?.q?.trim() ?? "";
          const author = item?.a?.trim() ?? "";
          zh = author ? `作者：${author}` : "每日一句";
        }

        if (en) {
          break;
        }
      } catch {
        // try next provider
      }
    }

    const audio = "";

    if (!en) {
      throw new Error("daily-empty");
    }

    if (forceSwitch && en === previous) {
      useFallbackDaily();
    } else {
      dailySentence.value = {
        en,
        zh,
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

async function ensureWordPool(): Promise<string[]> {
  if (wordPool?.length) {
    return wordPool;
  }
  for (const endpoint of WORD_POOL_ENDPOINTS) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        continue;
      }
      const text = await res.text();
      const words = text
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter((line) => /^[a-z]{3,12}$/.test(line));
      if (words.length) {
        wordPool = words;
        return words;
      }
    } catch {
      // try next endpoint
    }
  }
  return [];
}

async function pickOnlineWordCard(): Promise<{
  word: string;
  phonetic: string;
  definition: string;
} | null> {
  const pool = await ensureWordPool();
  if (!pool.length) {
    return null;
  }

  for (let i = 0; i < 16; i += 1) {
    const word = pool[Math.floor(Math.random() * pool.length)];
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (!res.ok) {
        continue;
      }
      const data = (await res.json()) as Array<{
        phonetic?: string;
        phonetics?: Array<{ text?: string }>;
        meanings?: Array<{ definitions?: Array<{ definition?: string }> }>;
      }>;
      const first = data?.[0];
      const definition =
        first?.meanings?.[0]?.definitions?.[0]?.definition?.trim() ||
        first?.meanings?.find((m) => m.definitions?.[0]?.definition?.trim())?.definitions?.[0]?.definition?.trim() ||
        "";
      if (!definition) {
        continue;
      }
      const phonetic =
        first?.phonetic?.trim() ||
        first?.phonetics?.find((item) => item.text?.trim())?.text?.trim() ||
        "";
      return { word, phonetic, definition };
    } catch {
      // pick another word
    }
  }

  return null;
}

async function loadWordTrainingCard(): Promise<void> {
  wordTrainingLoading.value = true;
  wordTrainingFeedback.value = null;
  wordTrainingInput.value = "";
  try {
    const card = await pickOnlineWordCard();
    if (!card) {
      ElMessage.error("在线单词数据暂不可用，请稍后重试");
      wordTrainingWord.value = "";
      wordTrainingDefinition.value = "";
      wordTrainingPhonetic.value = "";
      return;
    }
    wordTrainingWord.value = card.word;
    wordTrainingDefinition.value = card.definition;
    wordTrainingPhonetic.value = card.phonetic;
  } finally {
    wordTrainingLoading.value = false;
  }
}

function handleStartDailyChallenge(): void {
  showingReview.value = false;
  reviewLoading.value = false;
  reviewTokens.value = [];
  feedbackType.value = null;
  feedbackText.value = "";
  reviewVersion += 1;
  store.startDailyChallenge();
}

async function handleSelectWordTraining(): Promise<void> {
  if (isWordTrainingMode.value) {
    return;
  }
  showingReview.value = false;
  reviewLoading.value = false;
  reviewTokens.value = [];
  feedbackType.value = null;
  feedbackText.value = "";
  reviewVersion += 1;
  store.setMode("word-training");
  await loadWordTrainingCard();
}

function handleSelectChallenge(): void {
  if (isChallengeMode.value) {
    return;
  }
  handleStartDailyChallenge();
}

function handleExitDailyChallenge(): void {
  showingReview.value = false;
  reviewLoading.value = false;
  reviewTokens.value = [];
  feedbackType.value = null;
  feedbackText.value = "";
  reviewVersion += 1;
  store.exitDailyChallenge();
}

function handleResetDailyChallenge(): void {
  showingReview.value = false;
  reviewLoading.value = false;
  reviewTokens.value = [];
  feedbackType.value = null;
  feedbackText.value = "";
  reviewVersion += 1;
  store.resetDailyChallenge();
}

function handleAnswer(): void {
  store.revealAnswer();
}

function handleSubmit(): void {
  if (isWordTrainingMode.value) {
    const answer = wordTrainingInput.value.trim().toLowerCase();
    const expected = wordTrainingWord.value.trim().toLowerCase();
    if (!expected) {
      return;
    }
    wordTrainingStats.value.total += 1;
    if (answer === expected) {
      wordTrainingFeedback.value = "success";
      wordTrainingStats.value.correct += 1;
      ElMessage.success("回答正确");
      void loadWordTrainingCard();
    } else {
      wordTrainingFeedback.value = "error";
      ElMessage.error(`答案是：${wordTrainingWord.value}`);
    }
    return;
  }

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
  void store.initQuestions();
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

watch(
  () => store.mode,
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
        :mode="store.mode"
        :challenge-done="store.dailyChallengeDone"
        :word-training-active="isWordTrainingMode"
        :total="store.total"
        @update:course="store.setCourse"
        @select-challenge="handleSelectChallenge"
        @select-word-training="handleSelectWordTraining"
      />

      <div class="main-column">
        <section v-if="!isWordTrainingMode" class="top-progress ios-card">
          <el-progress :percentage="store.progressPercent" :stroke-width="10" :show-text="false" />
          <div class="progress-meta">
            <span>进度 {{ store.progressText }}</span>
            <span v-if="isChallengeMode">模式 每日挑战</span>
            <span>正确率 {{ store.accuracy }}</span>
            <span>连对 {{ store.streak }}</span>
            <span>积分 {{ store.score }}</span>
            <span v-if="isChallengeMode" class="challenge-inline-actions">
              <el-button text size="small" @click="handleResetDailyChallenge">重开</el-button>
              <el-button text size="small" @click="handleExitDailyChallenge">退出</el-button>
            </span>
          </div>
        </section>

        <section v-if="isWordTrainingMode" class="word-training-card ios-card">
          <h3>单词训练</h3>
          <p class="word-train-tip">根据释义写出对应英文单词（数据均来自在线词库和在线词典）</p>
          <template v-if="wordTrainingLoading">
            <p class="word-loading">正在加载在线单词...</p>
          </template>
          <template v-else-if="wordTrainingWord">
            <div class="word-meta">
              <span v-if="wordTrainingPhonetic">{{ wordTrainingPhonetic }}</span>
            </div>
            <p class="word-definition">{{ wordTrainingDefinition }}</p>
            <el-input
              v-model="wordTrainingInput"
              placeholder="输入英文单词"
              class="word-input"
              @keyup.enter="handleSubmit"
            />
            <div class="word-actions">
              <el-button round @click="loadWordTrainingCard">换一个</el-button>
              <el-button round type="primary" @click="handleSubmit">提交</el-button>
            </div>
            <p class="word-stats">
              正确率
              {{
                wordTrainingStats.total
                  ? `${Math.round((wordTrainingStats.correct / wordTrainingStats.total) * 100)}%`
                  : "0%"
              }}
              （{{ wordTrainingStats.correct }}/{{ wordTrainingStats.total }}）
            </p>
          </template>
        </section>
        <section
          v-else-if="isChallengeMode && store.dailyChallengeDone"
          class="challenge-finished ios-card"
        >
          <h3>今日挑战完成</h3>
          <p>你已完成 5/5 题，继续保持！</p>
          <div class="challenge-stats">
            <span>正确率 {{ store.accuracy }}</span>
            <span>得分 {{ store.score }}</span>
          </div>
          <div class="challenge-finish-actions">
            <el-button round @click="handleResetDailyChallenge">再练一次</el-button>
            <el-button round type="primary" @click="handleExitDailyChallenge">返回普通练习</el-button>
          </div>
        </section>
        <template v-else>
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
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.practice-page {
  min-height: 100vh;
  width: 100%;
  max-width: none;
  padding: clamp(20px, 2.2vw, 34px);
  padding-bottom: clamp(24px, 2.5vw, 44px);
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
  max-width: 880px;
  padding: 0;
  color: #39538f;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 10px;
  cursor: pointer;
  user-select: none;
  text-align: center;
}

.daily-target {
  justify-self: center;
  width: min(760px, 100%);
}

.daily-en-inline {
  font-size: clamp(16px, 2vw, 24px);
  font-weight: 600;
  background: linear-gradient(90deg, #9a66ff 0%, #e06dcb 55%, #b67cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.daily-zh-inline {
  font-size: clamp(14px, 1.8vw, 20px);
  background: linear-gradient(90deg, #a874ff 0%, #ee88d4 55%, #c28cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.daily-zh-inline::before {
  content: "—";
  margin-right: 8px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(290px, 22vw) minmax(0, 1fr);
  gap: clamp(16px, 1.4vw, 24px);
}

.top-progress {
  padding: 12px 14px;
  margin-bottom: 14px;
}

.progress-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #7a8fbf;
}

.challenge-inline-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.main-column {
  display: flex;
  flex-direction: column;
}

.word-training-card {
  padding: 22px;
  text-align: center;
}

.word-train-tip {
  margin: 0 0 14px;
  color: #6f82ac;
}

.word-loading {
  margin: 14px 0;
  color: #6f82ac;
}

.word-meta {
  margin-bottom: 10px;
  color: #7a8eb5;
  font-size: 14px;
}

.word-definition {
  margin: 0 auto 14px;
  max-width: 760px;
  font-size: 22px;
  line-height: 1.45;
  color: #2d3d62;
  font-weight: 700;
}

.word-input {
  margin: 0 auto;
  max-width: 420px;
}

.word-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.word-stats {
  margin-top: 12px;
  font-size: 13px;
  color: #6e81ac;
}

.challenge-finished {
  padding: 24px;
  text-align: center;

  h3 {
    margin: 0 0 10px;
    color: #2a3d65;
  }

  p {
    margin: 0;
    color: #6880b3;
  }
}

.challenge-stats {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 12px;
  color: #5c729f;
  font-size: 14px;
}

.challenge-finish-actions {
  margin-top: 18px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

@media (max-width: 1060px) {
  .practice-page {
    padding: 12px;
    padding-bottom: 90px;
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
    justify-content: flex-start;
    text-align: left;
    align-items: flex-start;
  }

  .daily-target {
    display: none;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .daily-en-inline,
  .daily-zh-inline {
    font-size: 15px;
    line-height: 1.45;
  }

  .progress-meta {
    gap: 8px 14px;
  }

  .word-definition {
    font-size: 18px;
  }

}
</style>

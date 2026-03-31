<script setup lang="ts">
import { gsap } from "gsap";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Question, ReviewToken } from "../types/practice";

const props = defineProps<{
  question: Question | null;
  draftWords: string[];
  expectedWords: string[];
  showAnswer: boolean;
  progressText: string;
  accuracy: string;
  feedbackType: "success" | "error" | null;
  feedbackText: string;
  showingReview: boolean;
  reviewLoading: boolean;
  reviewTokens: ReviewToken[];
}>();

const emit = defineEmits<{
  (event: "update-word", index: number, value: string): void;
  (event: "submit-request"): void;
}>();

const inputRefs = ref<Array<HTMLInputElement | null>>([]);
const loaderBarsRef = ref<HTMLElement | null>(null);
let barsTween: gsap.core.Tween | null = null;

watch(
  () => props.question?.id,
  async () => {
    await nextTick();
    focusFirstEditable();
  }
);

function focusFirstEditable(): void {
  if (props.expectedWords.length) {
    inputRefs.value[0]?.focus();
  }
}

function focusNext(from: number): void {
  for (let i = from + 1; i < props.expectedWords.length; i += 1) {
    inputRefs.value[i]?.focus();
    break;
  }
}

function focusPrev(from: number): void {
  inputRefs.value[Math.max(0, from - 1)]?.focus();
}

function onInput(index: number, event: Event): void {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  emit("update-word", index, value);
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === "Backspace" && !props.draftWords[index]) {
    focusPrev(index);
  }
  if (event.key === " ") {
    event.preventDefault();
    focusNext(index);
  }
  if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    emit("submit-request");
  }
}

function startLoaderAnimation(): void {
  const bars = loaderBarsRef.value?.querySelectorAll("span");
  if (!bars?.length) {
    return;
  }
  barsTween?.kill();
  gsap.set(bars, { transformOrigin: "center bottom", scaleY: 0.55, opacity: 0.65 });
  barsTween = gsap.to(bars, {
    scaleY: 1.65,
    opacity: 1,
    duration: 0.45,
    repeat: -1,
    yoyo: true,
    stagger: 0.09,
    ease: "sine.inOut"
  });
}

watch(
  () => props.reviewLoading,
  async (loading) => {
    if (loading) {
      await nextTick();
      startLoaderAnimation();
    } else {
      barsTween?.kill();
      barsTween = null;
    }
  }
);

onBeforeUnmount(() => {
  barsTween?.kill();
  barsTween = null;
});
</script>

<template>
  <section
    class="answer-panel ios-card"
    :class="{
      'is-success': feedbackType === 'success',
      'is-error': feedbackType === 'error'
    }"
  >
    <transition name="pop-grade">
      <div v-if="feedbackText" class="grade-float">{{ feedbackText }}</div>
    </transition>

    <template v-if="question">
      <template v-if="showingReview">
        <div class="review-wrap">
          <template v-if="reviewLoading">
            <div class="review-loading" role="status" aria-live="polite">
              <div class="loader-bars" ref="loaderBarsRef">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="review-hint">已提交，按 Enter 或点“提交”进入下一题</div>
            <div class="token-row">
              <div v-for="(token, idx) in reviewTokens" :key="`${token.word}-${idx}`" class="token-card">
                <div class="ipa">{{ token.ipa }}</div>
                <div class="word-chip" :style="{ background: `var(--chip-${(idx % 6) + 1})` }">
                  {{ token.word }}
                </div>
                <div class="pos">{{ token.posLabel }}</div>
                <div class="gloss">{{ token.gloss }}</div>
              </div>
            </div>
            <p class="cn-text review-cn">{{ question.zh }}</p>
          </template>
        </div>
      </template>
      <template v-else>
        <p class="cn-text">{{ question.zh }}</p>

        <div class="slots-wrap">
          <div
            v-for="(word, idx) in expectedWords"
            :key="`${question.id}-${idx}`"
            class="word-item"
            :class="{
              filled: Boolean(draftWords[idx]?.trim()),
              success: feedbackType === 'success',
              error: feedbackType === 'error'
            }"
            :style="{ width: `${Math.max(word.length * 20, 84)}px` }"
          >
            <input
              :ref="(el) => (inputRefs[idx] = (el as HTMLInputElement | null))"
              class="word-slot"
              :value="draftWords[idx]"
              @input="onInput(idx, $event)"
              @keydown="onKeydown(idx, $event)"
            />
            <div class="underline" />
          </div>
        </div>

        <p v-if="showAnswer" class="answer-text">答案：{{ expectedWords.join(" ") }}</p>
      </template>
    </template>

    <el-empty v-else description="当前专题暂无题目" />
  </section>
</template>

<style scoped lang="scss">
.answer-panel {
  padding: 24px;
  min-height: 460px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cn-text {
  font-size: 32px;
  line-height: 1.35;
  font-weight: 800;
  margin: 0 0 22px;
  color: #2f3d5f;
  text-align: center;
}

.slots-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 820px;
}

.review-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: 900px;
}

.review-hint {
  font-size: 13px;
  color: #4f6394;
  background: #edf3ff;
  border: 1px solid #d4e0ff;
  border-radius: 999px;
  padding: 6px 12px;
}

.review-loading {
  min-width: auto;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loader-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;

  span {
    width: 5px;
    height: 14px;
    border-radius: 999px;
    background: linear-gradient(180deg, #6ea0ff 0%, #d07fff 100%);
  }
}

.token-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.token-card {
  text-align: center;
}

.ipa {
  font-size: 12px;
  color: #8d95a9;
  margin-bottom: 4px;
}

.word-chip {
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 20px;
  color: #1b2a4a;
  font-weight: 700;
  border-bottom: 3px solid #4caf50;
}

.pos {
  margin-top: 4px;
  font-size: 11px;
  color: #7f8ca9;
  border: 1px solid #ccd4e3;
  border-radius: 999px;
  display: inline-block;
  padding: 1px 8px;
}

.gloss {
  margin-top: 4px;
  font-size: 13px;
  color: #54617a;
}

.word-item {
  position: relative;
}

.word-slot {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  text-align: center;
  color: #304169;
  font-size: 24px;
  line-height: 1.2;
  padding: 2px 0 8px;
}

.underline {
  height: 3px;
  border-radius: 999px;
  background: #d8dbe3;
  transition: background 0.2s ease;
}

.word-item.filled .underline {
  background: linear-gradient(90deg, #9cb7ff, #a59dff);
}

.word-item.success.filled .underline {
  background: #4caf50;
}

.word-item.error.filled .underline {
  background: #ef5350;
}

.answer-text {
  margin: 28px 0 0;
  color: #ffd166;
  font-size: 18px;
  font-weight: 600;
}

.review-cn {
  margin: 0;
}

.grade-float {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 26px;
  font-weight: 800;
  color: #4caf50;
  text-shadow: 0 8px 22px rgba(76, 175, 80, 0.35);
}

.is-error .grade-float {
  color: #ef5350;
  text-shadow: 0 8px 22px rgba(239, 83, 80, 0.3);
}

.is-success {
  animation: successFlash 0.45s ease;
}

.is-error {
  animation: errorShake 0.45s ease;
}

.pop-grade-enter-active,
.pop-grade-leave-active {
  transition: all 0.3s ease;
}

.pop-grade-enter-from,
.pop-grade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

@keyframes successFlash {
  0% {
    box-shadow: 0 0 0 rgba(64, 196, 99, 0);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(64, 196, 99, 0.6), 0 0 30px rgba(64, 196, 99, 0.3);
  }
  100% {
    box-shadow: 0 0 0 rgba(64, 196, 99, 0);
  }
}

@keyframes errorShake {
  0% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-4px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-3px);
  }
  80% {
    transform: translateX(3px);
  }
  100% {
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .answer-panel {
    padding: 16px;
    min-height: auto;
  }

  .cn-text {
    font-size: 24px;
  }

  .word-slot {
    font-size: 20px;
  }

  .word-chip {
    font-size: 18px;
  }
}
</style>

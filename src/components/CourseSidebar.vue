<script setup lang="ts">
import type { CourseOption } from "../types/practice";

defineProps<{
  courseOptions: CourseOption[];
  selectedCourse: CourseOption["key"];
  total: number;
}>();

const emit = defineEmits<{
  (event: "update:course", value: CourseOption["key"]): void;
}>();
</script>

<template>
  <aside class="course-sidebar ios-card">
    <div class="sidebar-header">
      <h3>常用语练习</h3>
      <span>{{ total }} 题</span>
    </div>

    <el-divider content-position="left">课程</el-divider>
    <div class="chip-group">
      <button
        v-for="item in courseOptions"
        :key="item.key"
        class="topic-card"
        :class="{ active: item.key === selectedCourse }"
        @click="emit('update:course', item.key)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="text-wrap">
          <span class="title">{{ item.title }}</span>
          <span class="subtitle">{{ item.subtitle }}</span>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.course-sidebar {
  padding: 18px;
  min-height: 100%;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  span {
    color: var(--ios-text-secondary);
    font-size: 13px;
  }
}

.chip-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topic-card {
  border: 1px solid #dfe6ff;
  background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
  color: #304169;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  .icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #eef3ff;
    font-size: 18px;
  }

  .text-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .title {
    font-size: 16px;
    font-weight: 700;
  }

  .subtitle {
    font-size: 12px;
    color: #7f8fb6;
  }

  &:hover {
    transform: translateY(-1px);
    border-color: #c7d5ff;
    box-shadow: 0 10px 24px rgba(91, 129, 255, 0.1);
  }
}

.topic-card.active {
  border-color: #7ea0ff;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
  box-shadow: 0 10px 24px rgba(73, 108, 255, 0.16);
}

@media (max-width: 1060px) {
  .chip-group {
    flex-direction: row;
    overflow-x: auto;
  }

  .topic-card {
    min-width: 138px;
  }
}
</style>

<script setup lang="ts">
defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  (event: "read"): void;
  (event: "answer"): void;
  (event: "submit"): void;
}>();
</script>

<template>
  <footer class="bottom-actions ios-card">
    <el-button size="large" round @click="emit('read')" :disabled="disabled">朗读</el-button>
    <el-button size="large" round @click="emit('answer')" :disabled="disabled">答案</el-button>
    <el-button
      size="large"
      round
      type="primary"
      @click="emit('submit')"
      :disabled="disabled"
    >
      提交
    </el-button>
  </footer>
</template>

<style scoped lang="scss">
.bottom-actions {
  position: sticky;
  bottom: 10px;
  display: flex;
  justify-content: center;
  gap: 14px;
  padding: 14px 18px;
  margin-top: 16px;

  :deep(.el-button) {
    min-width: 110px;
    font-weight: 700;
  }
}

@media (max-width: 768px) {
  .bottom-actions {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: 10px;
    z-index: 20;
    margin-top: 0;
    padding: 10px;
    gap: 8px;

    :deep(.el-button) {
      flex: 1;
      min-width: auto;
    }
  }
}
</style>

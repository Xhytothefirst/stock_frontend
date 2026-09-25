<script setup lang="ts">
/**
 * 统一筛选工具栏：等宽筛选项 + 整齐换行 + 行尾按钮插槽。
 * 每个直接子元素应携带 .filter-item（200px）或 .filter-item-lg（320px）。
 */
defineProps<{
  /** 隐藏底部分隔线（筛选区本身已有卡片背景时用） */
  noDivider?: boolean
}>()
</script>

<template>
  <div class="filter-bar">
    <div class="filter-bar-row">
      <slot />
      <div class="filter-bar-actions">
        <slot name="actions" />
      </div>
    </div>
    <a-divider v-if="!noDivider" :margin="12" />
  </div>
</template>

<style scoped>
.filter-bar {
  flex: none;
}

.filter-bar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

.filter-bar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

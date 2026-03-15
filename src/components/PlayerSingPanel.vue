<script setup lang="js">
const props = defineProps({
  statusText: { type: String, default: "" },
  waveLevels: { type: Array, default: () => [] },
  errorMessage: { type: String, default: "" },
  isReviewing: { type: Boolean, default: false },
  reviewRecord: { type: Object, default: null },
  engineType: { type: String, default: "" },
});

const emit = defineEmits(["save-review", "discard-review"]);

function formatDuration(durationMs) {
  const totalSec = Math.max(0, Math.round((durationMs || 0) / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function formatSize(sizeBytes) {
  if (!sizeBytes) return "0 KB";
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}
</script>

<template>
  <section class="sing-panel">
    <div class="panel-head">
      <span class="head-title">学唱</span>
      <span class="head-status">{{ statusText }}</span>
    </div>

    <div class="wave-wrap" aria-hidden="true">
      <span
        v-for="(level, idx) in waveLevels"
        :key="idx"
        class="wave-bar"
        :style="{ transform: `scaleY(${Math.max(0.06, level)})` }"
      />
    </div>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <div v-if="isReviewing && reviewRecord" class="review-card">
      <div class="review-meta">
        <span class="meta-item">时长 {{ formatDuration(reviewRecord.durationMs) }}</span>
        <span class="meta-item">大小 {{ formatSize(reviewRecord.sizeBytes) }}</span>
        <span class="meta-item">{{ reviewRecord.format?.toUpperCase() }}</span>
      </div>
      <audio class="review-audio" :src="reviewRecord.mixFileUriWeb || reviewRecord.mixFileUri" controls preload="metadata" />
      <div class="review-actions">
        <button class="action-btn btn-save" @click="emit('save-review')">保存到本地</button>
        <button class="action-btn btn-delete" @click="emit('discard-review')">删除</button>
      </div>
    </div>

    <p class="engine-tip">当前音频引擎：{{ engineType }}</p>
  </section>
</template>

<style scoped lang="less">
.sing-panel {
  margin: 0 16px 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(14, 165, 233, 0.24);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.86) 0%, rgba(240, 249, 255, 0.9) 100%);
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.12);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.head-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0369a1;
}

.head-status {
  font-size: 0.72rem;
  color: #0c4a6e;
}

.wave-wrap {
  margin-top: 10px;
  height: 44px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.wave-bar {
  flex: 1;
  min-width: 3px;
  height: 100%;
  border-radius: 999px;
  transform-origin: bottom;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.65) 0%, rgba(2, 132, 199, 0.9) 100%);
  transition: transform 0.08s linear;
}

.error-text {
  margin: 8px 0 0;
  font-size: 0.72rem;
  color: #b91c1c;
}

.review-card {
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(14, 165, 233, 0.18);
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.meta-item {
  font-size: 0.68rem;
  color: #075985;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
}

.review-audio {
  width: 100%;
  height: 34px;
}

.review-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 10px;
  font-size: 0.74rem;
  font-weight: 700;
}

.btn-save {
  color: #fff;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
}

.btn-delete {
  color: #9f1239;
  background: rgba(251, 207, 232, 0.5);
}

.engine-tip {
  margin: 10px 0 0;
  font-size: 0.64rem;
  color: rgba(3, 105, 161, 0.72);
}
</style>

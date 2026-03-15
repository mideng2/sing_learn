<script setup lang="js">
/**
 * 学唱合成录音预览弹窗：展示时长、大小、格式、音频播放与保存/删除操作
 */
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reviewRecord: { type: Object, default: null },
});

const emit = defineEmits(["save-review", "discard-review"]);
const nameDraft = ref("");

function getDefaultName(record) {
  return record?.customName || record?.songName || "我的演唱";
}

watch(
  () => props.reviewRecord,
  (record) => {
    nameDraft.value = getDefaultName(record);
  },
  { immediate: true }
);

function close() {
  emit("discard-review");
}

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

function onSave() {
  emit("save-review", String(nameDraft.value || "").trim());
}

function onDiscard() {
  emit("discard-review");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue && reviewRecord" class="modal-overlay" @click.self="close">
        <div class="modal-panel">
          <div class="modal-header">
            <span class="modal-title">合成录音</span>
            <button class="modal-close" @click="close" aria-label="关闭">×</button>
          </div>
          <div class="review-meta">
            <span class="meta-item">时长 {{ formatDuration(reviewRecord.durationMs) }}</span>
            <span class="meta-item">大小 {{ formatSize(reviewRecord.sizeBytes) }}</span>
            <span class="meta-item">{{ reviewRecord.format?.toUpperCase() }}</span>
          </div>
          <div class="name-editor">
            <label class="name-label">录音名称</label>
            <input v-model.trim="nameDraft" class="name-input" type="text" maxlength="64" placeholder="请输入录音名称" />
          </div>
          <audio
            class="review-audio"
            :src="reviewRecord.mixFileUriWeb || reviewRecord.mixFileUri"
            controls
            preload="metadata"
          />
          <div class="review-actions">
            <button class="action-btn btn-save" @click="onSave">保存到歌单</button>
            <button class="action-btn btn-delete" @click="onDiscard">删除</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="less">
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;

  .modal-panel {
    transition: transform 0.25s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-panel {
    transform: translateY(40px);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-panel {
  width: 100%;
  max-width: 420px;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0));
  background: linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 32px rgba(14, 165, 233, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0c4a6e;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: #64748b;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  line-height: 1;

  &:active {
    background: rgba(0, 0, 0, 0.06);
  }
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 0.72rem;
  color: #075985;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
}

.review-audio {
  width: 100%;
  height: 40px;
  margin-bottom: 14px;
}

.name-editor {
  margin-bottom: 12px;
}

.name-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: #075985;
}

.name-input {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 10px;
  padding: 0 10px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.85);
  color: #0c4a6e;
  font-size: 0.82rem;
}

.review-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.2s;

  &:active {
    transform: scale(0.97);
  }
}

.btn-save {
  color: #fff;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
}

.btn-delete {
  color: #9f1239;
  background: rgba(251, 207, 232, 0.5);
}
</style>

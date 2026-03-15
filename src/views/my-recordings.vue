<script setup lang="js">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRecordingStore } from "@/stores/recordingStore";

const recordingStore = useRecordingStore();
const { recordings } = storeToRefs(recordingStore);

const hasData = computed(() => recordings.value.length > 0);

function formatDate(timestamp) {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function formatDuration(durationMs) {
  const sec = Math.max(0, Math.round((durationMs || 0) / 1000));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function formatSize(sizeBytes) {
  if (!sizeBytes) return "--";
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)}MB`;
}

function revokeBlobUri(uri) {
  if (typeof uri === "string" && uri.startsWith("blob:")) {
    URL.revokeObjectURL(uri);
  }
}

function removeItem(record) {
  const removed = recordingStore.removeRecording(record.id);
  if (!removed) return;
  revokeBlobUri(removed.mixFileUri);
  revokeBlobUri(removed.voiceFileUri);
}
</script>

<template>
  <div class="my-recordings-view">
    <h1>我的演唱歌单</h1>
    <p v-if="!hasData" class="placeholder">暂时还没有保存的学唱音频，去播放页点击学唱开始录制吧。</p>

    <ul v-else class="recording-list">
      <li v-for="item in recordings" :key="item.id" class="recording-item">
        <div class="item-head">
          <div class="song-meta">
            <h2 class="song-name">{{ item.songName || "未命名歌曲" }}</h2>
            <p class="song-sub">{{ item.singer || "未知歌手" }}</p>
          </div>
          <button class="delete-btn" @click="removeItem(item)">删除</button>
        </div>

        <div class="meta-row">
          <span>{{ formatDate(item.createdAt) }}</span>
          <span>{{ formatDuration(item.durationMs) }}</span>
          <span>{{ formatSize(item.sizeBytes) }}</span>
          <span>{{ item.format?.toUpperCase?.() || "UNKNOWN" }}</span>
        </div>

        <audio class="item-audio" :src="item.mixFileUriWeb || item.mixFileUri" controls preload="metadata" />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="less">
.my-recordings-view {
  padding: calc(24px + env(safe-area-inset-top, 0)) calc(24px + env(safe-area-inset-right, 0)) calc(24px + env(safe-area-inset-bottom, 0)) calc(24px + env(safe-area-inset-left, 0));
  min-height: calc(100vh - 90px);
  min-height: calc(100dvh - 90px);
  box-sizing: border-box;
  background: linear-gradient(180deg, #f0faff 0%, #e0f2fe 100%);

  h1 {
    margin: 0 0 14px;
    font-size: 1.15rem;
    color: #075985;
  }

  .placeholder {
    color: #0369a1;
    margin: 16px 0 0;
    line-height: 1.6;
    font-size: 0.9rem;
  }

  .recording-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .recording-item {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(56, 189, 248, 0.22);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.08);
  }

  .item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .song-name {
    margin: 0;
    color: #0c4a6e;
    font-size: 0.95rem;
  }

  .song-sub {
    margin: 4px 0 0;
    color: rgba(7, 89, 133, 0.8);
    font-size: 0.75rem;
  }

  .delete-btn {
    border: none;
    border-radius: 10px;
    padding: 6px 10px;
    font-size: 0.72rem;
    font-weight: 700;
    color: #9f1239;
    background: rgba(251, 207, 232, 0.62);
  }

  .meta-row {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    span {
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(125, 211, 252, 0.25);
      color: #075985;
      font-size: 0.68rem;
    }
  }

  .item-audio {
    margin-top: 10px;
    width: 100%;
    height: 36px;
  }
}
</style>

<script setup lang="js">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { useRecordingStore } from "@/stores/recordingStore";

const SingingAudio = registerPlugin("SingingAudio");
const recordingStore = useRecordingStore();
const { recordings } = storeToRefs(recordingStore);
const nameDraftMap = ref({});

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

/** 用于下载文件名的日期格式：歌名+时间，如 20250315-2030 */
function formatDateForFileName(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}${mm}${dd}-${hh}${mi}`;
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
  delete nameDraftMap.value[record.id];
  revokeBlobUri(removed.mixFileUri);
  revokeBlobUri(removed.voiceFileUri);
}

function getDisplayName(record) {
  return record.customName || record.songName || "未命名录音";
}

function getNameDraft(record) {
  if (!nameDraftMap.value[record.id]) {
    nameDraftMap.value[record.id] = getDisplayName(record);
  }
  return nameDraftMap.value[record.id];
}

function setNameDraft(recordId, value) {
  nameDraftMap.value[recordId] = value;
}

function saveName(record) {
  const updated = recordingStore.updateRecordingName(record.id, nameDraftMap.value[record.id]);
  if (!updated) {
    nameDraftMap.value[record.id] = getDisplayName(record);
    return;
  }
  nameDraftMap.value[record.id] = updated.customName;
}

function sanitizeName(name) {
  return String(name || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 64);
}

async function downloadItem(record) {
  const sourceUrl = record.mixFileUriWeb || record.mixFileUri;
  if (!sourceUrl) return;
  const songName = sanitizeName(record.songName || getDisplayName(record)) || "我的演唱";
  const timePart = formatDateForFileName(record.createdAt);
  const baseName = timePart ? `${songName}_${timePart}` : songName;
  const extension = String(record.format || "m4a").toLowerCase();
  const fileName = `${baseName}.${extension}`;

  try {
    if (Capacitor.isNativePlatform()) {
      let exportUri = record.mixFileUri;
      try {
        const prepared = await SingingAudio.prepareExportFile({
          sourceUri: record.mixFileUri,
          fileName,
        });
        if (prepared?.fileUri) {
          exportUri = prepared.fileUri;
        }
      } catch (prepareErr) {
        console.warn("[Recordings] prepareExportFile failed, fallback to source uri", prepareErr);
      }
      await Share.share({
        title: "导出录音",
        text: fileName,
        url: exportUri,
        dialogTitle: "保存录音到本地",
      });
      return;
    }

    const response = await fetch(sourceUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("[Recordings] download failed", error);
    window.alert("下载失败，请稍后重试。");
  }
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
            <h2 class="song-name">{{ getDisplayName(item) }}</h2>
            <p class="song-sub">{{ item.singer || "未知歌手" }}</p>
          </div>
        </div>
        <div class="action-row">
          <input
            class="name-input"
            type="text"
            maxlength="64"
            :value="getNameDraft(item)"
            @input="setNameDraft(item.id, $event.target.value)"
            placeholder="录音名称"
          />
          <button type="button" class="btn-action btn-rename" @click="saveName(item)">改名</button>
          <button type="button" class="btn-action btn-download" @click="downloadItem(item)">下载</button>
          <button type="button" class="btn-action btn-delete" @click="removeItem(item)">删除</button>
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
  padding: calc(20px + env(safe-area-inset-top, 0)) calc(20px + env(safe-area-inset-right, 0)) calc(24px + env(safe-area-inset-bottom, 0)) calc(20px + env(safe-area-inset-left, 0));
  min-height: calc(100vh - 90px);
  min-height: calc(100dvh - 90px);
  box-sizing: border-box;
  background: linear-gradient(165deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%);

  h1 {
    margin: 0 0 20px;
    font-size: 1.35rem;
    font-weight: 700;
    color: #0c4a6e;
    letter-spacing: -0.02em;
  }

  .placeholder {
    color: #0369a1;
    margin: 20px 0 0;
    line-height: 1.65;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .recording-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .recording-item {
    padding: 18px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(56, 189, 248, 0.18);
    box-shadow:
      0 2px 8px rgba(14, 165, 233, 0.06),
      0 8px 24px rgba(14, 165, 233, 0.08);
  }

  .item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .song-meta {
    flex: 1;
    min-width: 0;
  }

  .song-name {
    margin: 0;
    color: #0c4a6e;
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  .song-sub {
    margin: 4px 0 0;
    color: rgba(7, 89, 133, 0.72);
    font-size: 0.8rem;
  }

  .action-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name-input {
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(56, 189, 248, 0.28);
    background: rgba(248, 250, 252, 0.9);
    color: #0c4a6e;
    font-size: 0.8rem;
    transition: border-color 0.2s, box-shadow 0.2s;

    &::placeholder {
      color: rgba(7, 89, 133, 0.45);
    }
    &:focus {
      outline: none;
      border-color: rgba(14, 165, 233, 0.5);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
  }

  .btn-action {
    flex-shrink: 0;
    height: 36px;
    border: none;
    border-radius: 10px;
    padding: 0 12px;
    font-size: 0.78rem;
    font-weight: 600;
    transition: transform 0.15s, opacity 0.2s;

    &:active {
      transform: scale(0.97);
      opacity: 0.9;
    }
  }

  .btn-rename {
    color: #0369a1;
    background: linear-gradient(180deg, rgba(186, 230, 253, 0.95) 0%, rgba(125, 211, 252, 0.55) 100%);
    box-shadow: 0 1px 2px rgba(14, 165, 233, 0.15);
  }

  .btn-download {
    color: #0c4a6e;
    background: linear-gradient(180deg, rgba(186, 230, 253, 0.95) 0%, rgba(125, 211, 252, 0.6) 100%);
    box-shadow: 0 1px 2px rgba(14, 165, 233, 0.2);
  }

  .btn-delete {
    color: #b91c1c;
    background: linear-gradient(180deg, rgba(254, 226, 226, 0.95) 0%, rgba(252, 165, 165, 0.5) 100%);
    box-shadow: 0 1px 2px rgba(185, 28, 28, 0.15);
  }

  .meta-row {
    margin-top: 14px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;

    span {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(125, 211, 252, 0.2);
      color: #075985;
      font-size: 0.7rem;
      font-weight: 500;
    }
  }

  .item-audio {
    margin-top: 14px;
    width: 100%;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
  }
}
</style>

import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "sing-learn:recordings";

function safeParseRecordings(raw) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

function createRecordingId() {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useRecordingStore = defineStore("recording", () => {
  const recordings = ref([]);

  function hydrate() {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    recordings.value = safeParseRecordings(raw);
  }

  function persist() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings.value));
  }

  function addRecording(payload) {
    const record = {
      id: payload.id || createRecordingId(),
      songId: payload.songId || "",
      songName: payload.songName || "",
      singer: payload.singer || "",
      mixFileUri: payload.mixFileUri || "",
      mixFileUriWeb: payload.mixFileUriWeb || payload.mixFileUri || "",
      voiceFileUri: payload.voiceFileUri || "",
      voiceFileUriWeb: payload.voiceFileUriWeb || payload.voiceFileUri || "",
      durationMs: payload.durationMs || 0,
      sizeBytes: payload.sizeBytes || 0,
      format: payload.format || "unknown",
      bitrateKbps: payload.bitrateKbps || 0,
      engineType: payload.engineType || "unknown",
      createdAt: payload.createdAt || Date.now(),
    };
    recordings.value.unshift(record);
    persist();
    return record;
  }

  function removeRecording(recordId) {
    const idx = recordings.value.findIndex((item) => item.id === recordId);
    if (idx === -1) return null;
    const [removed] = recordings.value.splice(idx, 1);
    persist();
    return removed;
  }

  function clearRecordings() {
    recordings.value = [];
    persist();
  }

  function getBySong(songId) {
    return recordings.value.filter((item) => item.songId === songId);
  }

  hydrate();

  return {
    recordings,
    addRecording,
    removeRecording,
    clearRecordings,
    getBySong,
  };
});

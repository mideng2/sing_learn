import { computed, onBeforeUnmount, ref } from "vue";
import { useRecordingStore } from "@/stores/recordingStore";
import { createAudioEngine } from "@/services/audio/audioEngine";

const WAVE_SIZE = 32;

function toErrorMessage(err) {
  if (err && typeof err === "object" && "message" in err) {
    return err.message || "操作失败，请稍后重试";
  }
  return "操作失败，请稍后重试";
}

function createInitialWave() {
  return Array.from({ length: WAVE_SIZE }, () => 0.04);
}

function revokeBlobUri(uri) {
  if (typeof uri === "string" && uri.startsWith("blob:")) {
    URL.revokeObjectURL(uri);
  }
}

export function useSingSession() {
  const recordingStore = useRecordingStore();
  const status = ref("idle");
  const errorMessage = ref("");
  const waveLevels = ref(createInitialWave());
  const singCurrentTime = ref(0);
  const reviewRecord = ref(null);
  const audioEngineType = ref("");

  const isRecording = computed(() => status.value === "recording");
  const isBusy = computed(() => status.value === "preparing" || status.value === "mixing");
  const isReviewing = computed(() => status.value === "review");
  const singButtonLabel = computed(() => (isRecording.value ? "结束" : "学唱"));
  const statusText = computed(() => {
    if (status.value === "preparing") return "正在准备录音";
    if (status.value === "recording") return "正在录制你的演唱";
    if (status.value === "mixing") return "正在合成音频";
    if (status.value === "review") return "合成完成，请选择保存或删除";
    return "点击学唱开始录制";
  });

  let audioEngine = createAudioEngine();
  audioEngineType.value = audioEngine.engineType;
  let pollTimer = null;

  function resetWave() {
    waveLevels.value = createInitialWave();
  }

  function pushWaveLevel(level) {
    const next = Math.max(0.03, Math.min(1, level || 0));
    const cloned = waveLevels.value.slice(1);
    cloned.push(next);
    waveLevels.value = cloned;
  }

  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(async () => {
      try {
        const metrics = await audioEngine.getLiveMetrics();
        singCurrentTime.value = metrics.currentTime || 0;
        pushWaveLevel(metrics.level || 0);
      } catch {
        pushWaveLevel(0.04);
      }
    }, 80);
  }

  function stopPolling() {
    if (!pollTimer) return;
    window.clearInterval(pollTimer);
    pollTimer = null;
  }

  async function clearReviewRecord() {
    if (!reviewRecord.value) return;
    try {
      await audioEngine.discardResult(reviewRecord.value);
    } catch {
      revokeBlobUri(reviewRecord.value.mixFileUri);
      revokeBlobUri(reviewRecord.value.voiceFileUri);
    }
    reviewRecord.value = null;
  }

  async function startSing(song) {
    if (!song || !song.instrument) {
      errorMessage.value = "该歌曲暂不支持学唱";
      return;
    }

    errorMessage.value = "";
    singCurrentTime.value = 0;
    resetWave();

    await clearReviewRecord();
    status.value = "preparing";
    console.log("[SingSession] startSing →", { songId: song?.id, instrument: song?.instrument });

    try {
      await audioEngine.startSession({ instrumentSrc: song.instrument });
      audioEngineType.value = audioEngine.engineType;
      console.log("[SingSession] recording started, engine:", audioEngine.engineType);
      status.value = "recording";
      startPolling();
    } catch (err) {
      console.error("[SingSession] startSing ✗", err);
      status.value = "idle";
      errorMessage.value = toErrorMessage(err);
    }
  }

  async function stopSing(song) {
    if (!song) return;
    stopPolling();
    status.value = "mixing";
    console.log("[SingSession] stopSing →", { songId: song?.id, instrument: song?.instrument });

    try {
      const rawSession = await audioEngine.stopSession();
      console.log("[SingSession] rawSession:", rawSession);

      const mixResult = await audioEngine.mixSession({ rawSession, song });
      console.log("[SingSession] mixResult:", mixResult);

      const stagedRecord = audioEngine.saveMix({ mixResult, song });
      console.log("[SingSession] stagedRecord:", stagedRecord);

      reviewRecord.value = stagedRecord;
      status.value = "review";
    } catch (err) {
      console.error("[SingSession] stopSing ✗", err);
      status.value = "idle";
      errorMessage.value = toErrorMessage(err);
      resetWave();
    }
  }

  async function toggleSing(song) {
    if (isBusy.value) return;
    if (isRecording.value) {
      await stopSing(song);
      return;
    }
    await startSing(song);
  }

  function saveReviewRecord() {
    if (!reviewRecord.value) return null;
    const saved = recordingStore.addRecording(reviewRecord.value);
    reviewRecord.value = null;
    status.value = "idle";
    errorMessage.value = "";
    resetWave();
    return saved;
  }

  async function discardReviewRecord() {
    if (!reviewRecord.value) return;
    await clearReviewRecord();
    status.value = "idle";
    errorMessage.value = "";
    resetWave();
  }

  async function dispose() {
    stopPolling();
    try {
      await audioEngine.destroy();
    } catch {
      // ignore cleanup errors
    }
  }

  onBeforeUnmount(() => {
    dispose();
  });

  return {
    status,
    statusText,
    errorMessage,
    waveLevels,
    singCurrentTime,
    reviewRecord,
    isRecording,
    isBusy,
    isReviewing,
    singButtonLabel,
    audioEngineType,
    toggleSing,
    saveReviewRecord,
    discardReviewRecord,
    dispose,
  };
}

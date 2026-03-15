import { Capacitor, registerPlugin } from "@capacitor/core";

const SingingAudio = registerPlugin("SingingAudio");

export function createCapAudioEngine() {
  const engineType = "capacitor-native";
  let sessionInstrumentSrc = "";
  let sessionStartAtSec = 0;
  let mixSettings = {
    instrumentVolume: 0.72,
    voiceVolume: 1,
  };

  function normalizeVolume(value, fallback) {
    const next = Number(value);
    if (Number.isNaN(next)) return fallback;
    return Math.max(0, Math.min(1.5, next));
  }

  function resolveMixSettings(next) {
    if (!next || typeof next !== "object") return mixSettings;
    mixSettings = {
      instrumentVolume: normalizeVolume(next.instrumentVolume, mixSettings.instrumentVolume),
      voiceVolume: normalizeVolume(next.voiceVolume, mixSettings.voiceVolume),
    };
    return mixSettings;
  }

  async function startSession(options) {
    const instrumentSrc = options.instrumentSrc || "";
    const startAtSec = Math.max(0, Number(options.startAtSec) || 0);
    if (!instrumentSrc) {
      throw new Error("缺少伴奏音频地址");
    }
    sessionInstrumentSrc = instrumentSrc;
    sessionStartAtSec = startAtSec;
    const nextMixSettings = resolveMixSettings(options.mixSettings);
    console.log("[CapAudio] startSession →", { instrumentSrc, startAtSec });
    try {
      await SingingAudio.startRecording({ instrumentSrc, startAtSec, ...nextMixSettings });
      console.log("[CapAudio] startSession ✓");
    } catch (err) {
      console.error("[CapAudio] startSession ✗", err);
      throw err;
    }
  }

  async function getLiveMetrics() {
    try {
      const result = await SingingAudio.getLiveMetrics();
      return {
        level: result.level || 0,
        currentTime: result.currentTime || 0,
      };
    } catch {
      return { level: 0, currentTime: 0 };
    }
  }

  async function stopSession() {
    console.log("[CapAudio] stopSession →");
    try {
      const result = await SingingAudio.stopRecording();
      console.log("[CapAudio] stopSession ✓", result);
      return {
        instrumentSrc: sessionInstrumentSrc,
        startAtSec: Number(result.startAtSec) || sessionStartAtSec || 0,
        voiceFileUri: result.voiceFileUri || "",
        voiceFileUriWeb: result.voiceFileUri ? Capacitor.convertFileSrc(result.voiceFileUri) : "",
        durationMs: result.durationMs || 0,
      };
    } catch (err) {
      console.error("[CapAudio] stopSession ✗", err);
      throw err;
    }
  }

  async function mixSession({ rawSession, song }) {
    const nextMixSettings = resolveMixSettings(rawSession.mixSettings);
    const params = {
      instrumentSrc: rawSession.instrumentSrc || song.instrument,
      voiceFileUri: rawSession.voiceFileUri,
      startAtSec: Math.max(0, Number(rawSession.startAtSec) || 0),
      songId: song.id,
      ...nextMixSettings,
    };
    console.log("[CapAudio] mixSession →", params);
    try {
      const result = await SingingAudio.mixAudio(params);
      console.log("[CapAudio] mixSession ✓", result);
      return {
        mixFileUri: result.mixFileUri || "",
        mixFileUriWeb: result.mixFileUri ? Capacitor.convertFileSrc(result.mixFileUri) : "",
        voiceFileUri: rawSession.voiceFileUri,
        voiceFileUriWeb: rawSession.voiceFileUriWeb || "",
      startAtSec: Math.max(0, Number(rawSession.startAtSec) || 0),
        durationMs: result.durationMs || rawSession.durationMs || 0,
        sizeBytes: result.sizeBytes || 0,
        format: result.format || "m4a",
        bitrateKbps: result.bitrateKbps || 0,
        engineType,
      };
    } catch (err) {
      console.error("[CapAudio] mixSession ✗", err);
      throw err;
    }
  }

  async function updateMixSettings(next) {
    const resolved = resolveMixSettings(next);
    // 始终传完整数字，避免桥接丢字段；录制中调节需在原生端实时生效
    const payload = {
      instrumentVolume: Number(resolved.instrumentVolume),
      voiceVolume: Number(resolved.voiceVolume),
    };
    try {
      await SingingAudio.updateMixSettings(payload);
    } catch {
      // 会话未开始时无需阻塞
    }
  }

  function saveMix({ mixResult, song }) {
    const mixFileUriWeb = mixResult.mixFileUriWeb || mixResult.mixFileUri;
    console.log("[CapAudio] saveMix mixFileUri:", mixResult.mixFileUri);
    console.log("[CapAudio] saveMix mixFileUriWeb:", mixFileUriWeb);
    return {
      id: `rec_${Date.now()}`,
      songId: song.id,
      songName: song.name,
      singer: song.singer,
      mixFileUri: mixResult.mixFileUri,
      mixFileUriWeb,
      voiceFileUri: mixResult.voiceFileUri || "",
      voiceFileUriWeb: mixResult.voiceFileUriWeb || mixResult.voiceFileUri || "",
      startAtSec: Math.max(0, Number(mixResult.startAtSec) || 0),
      durationMs: mixResult.durationMs,
      sizeBytes: mixResult.sizeBytes,
      format: mixResult.format,
      bitrateKbps: mixResult.bitrateKbps,
      engineType,
      createdAt: Date.now(),
    };
  }

  async function discardResult(payload) {
    if (!payload.mixFileUri && !payload.voiceFileUri) return;
    try {
      if (payload.mixFileUri) {
        await SingingAudio.deleteFile({ fileUri: payload.mixFileUri });
      }
      if (payload.voiceFileUri) {
        await SingingAudio.deleteFile({ fileUri: payload.voiceFileUri });
      }
    } catch {
      // 删除失败不阻塞
    }
  }

  async function destroy() {
    try {
      await SingingAudio.abortSession();
    } catch {
      // ignore
    }
  }

  return {
    engineType,
    startSession,
    stopSession,
    getLiveMetrics,
    updateMixSettings,
    mixSession,
    saveMix,
    discardResult,
    destroy,
  };
}

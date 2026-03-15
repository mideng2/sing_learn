import { Capacitor, registerPlugin } from "@capacitor/core";

const SingingAudio = registerPlugin("SingingAudio");

export function createCapAudioEngine() {
  const engineType = "capacitor-native";
  let sessionInstrumentSrc = "";

  async function startSession(options) {
    const instrumentSrc = options.instrumentSrc || "";
    if (!instrumentSrc) {
      throw new Error("缺少伴奏音频地址");
    }
    sessionInstrumentSrc = instrumentSrc;
    console.log("[CapAudio] startSession →", { instrumentSrc });
    try {
      await SingingAudio.startRecording({ instrumentSrc });
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
    const params = {
      instrumentSrc: rawSession.instrumentSrc || song.instrument,
      voiceFileUri: rawSession.voiceFileUri,
      songId: song.id,
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
    mixSession,
    saveMix,
    discardResult,
    destroy,
  };
}

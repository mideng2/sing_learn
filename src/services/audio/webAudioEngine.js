import { Howl } from "howler";

function encodeWavFromAudioBuffer(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, index) => audioBuffer.getChannelData(index));

  for (let i = 0; i < length; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function durationToBitrate(durationMs, sizeBytes) {
  if (!durationMs || !sizeBytes) return 0;
  return Math.round((sizeBytes * 8) / (durationMs / 1000) / 1000);
}

export function createWebAudioEngine() {
  const engineType = "web-fallback";
  let instrumentVolume = 0.72;
  let voiceVolume = 1;
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];
  let recordStartTs = 0;
  let instrumentSrc = "";
  let instrumentHowl = null;

  let audioContext = null;
  let analyserNode = null;
  let monitorGainNode = null;
  let sourceNode = null;
  let rafId = null;
  let liveLevel = 0;

  function resolveMixDurationSeconds(instrumentDuration, voiceDuration) {
    if (voiceDuration > 0 && instrumentDuration > 0) {
      return Math.min(voiceDuration, instrumentDuration);
    }
    if (voiceDuration > 0) return voiceDuration;
    if (instrumentDuration > 0) return instrumentDuration;
    return 0;
  }

  function clampVolume(value, fallback) {
    const next = Number(value);
    if (Number.isNaN(next)) return fallback;
    return Math.max(0, Math.min(1.5, next));
  }

  function applyLiveMixSettings() {
    if (monitorGainNode) {
      monitorGainNode.gain.value = voiceVolume;
    }
    if (instrumentHowl) {
      instrumentHowl.volume(instrumentVolume);
    }
  }

  async function setupMetering(stream) {
    audioContext = new AudioContext();
    await audioContext.resume().catch(() => {});
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;
    monitorGainNode = audioContext.createGain();
    monitorGainNode.gain.value = voiceVolume;
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyserNode);
    sourceNode.connect(monitorGainNode);
    monitorGainNode.connect(audioContext.destination);

    const timeData = new Float32Array(analyserNode.fftSize);
    const update = () => {
      analyserNode.getFloatTimeDomainData(timeData);
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i += 1) {
        sumSquares += timeData[i] * timeData[i];
      }
      const rms = Math.sqrt(sumSquares / timeData.length);
      liveLevel = Math.min(1, rms * 3.5);
      rafId = requestAnimationFrame(update);
    };
    update();
  }

  function teardownMetering() {
    cancelAnimationFrame(rafId);
    rafId = null;
    liveLevel = 0;
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (analyserNode) {
      analyserNode.disconnect();
      analyserNode = null;
    }
    if (monitorGainNode) {
      monitorGainNode.disconnect();
      monitorGainNode = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  }

  function stopInstrument() {
    if (!instrumentHowl) return;
    instrumentHowl.stop();
    instrumentHowl.unload();
    instrumentHowl = null;
  }

  async function startSession(options) {
    instrumentSrc = options.instrumentSrc || "";
    if (!instrumentSrc) {
      throw new Error("缺少伴奏音频地址");
    }

    updateMixSettings(options.mixSettings);

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    mediaRecorder = new MediaRecorder(mediaStream);
    chunks = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    await setupMetering(mediaStream);

    instrumentHowl = new Howl({
      src: [instrumentSrc],
      html5: true,
      onloaderror(_id, err) {
        console.error("伴奏加载失败", err);
      },
    });

    mediaRecorder.start(200);
    applyLiveMixSettings();
    instrumentHowl.play();
    recordStartTs = Date.now();
  }

  function updateMixSettings(settings) {
    if (!settings || typeof settings !== "object") return;
    instrumentVolume = clampVolume(settings.instrumentVolume, instrumentVolume);
    voiceVolume = clampVolume(settings.voiceVolume, voiceVolume);
    applyLiveMixSettings();
  }

  function getLiveMetrics() {
    const currentTime = instrumentHowl && instrumentHowl.playing() ? Number(instrumentHowl.seek()) || 0 : 0;
    return { level: liveLevel, currentTime };
  }

  async function stopSession() {
    if (!mediaRecorder) {
      throw new Error("当前没有正在进行的录音会话");
    }

    const voiceBlob = await new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        resolve(new Blob(chunks, { type: mimeType }));
      };
      mediaRecorder.stop();
    });

    const durationMs = Math.max(0, Date.now() - recordStartTs);

    stopInstrument();
    teardownMetering();
    mediaStream.getTracks().forEach((track) => track.stop());

    const rawSession = {
      instrumentSrc,
      voiceBlob,
      durationMs,
      voiceMimeType: voiceBlob.type || "audio/webm",
    };

    mediaRecorder = null;
    mediaStream = null;
    chunks = [];
    return rawSession;
  }

  async function decodeAudioBuffer(ctx, input) {
    const arrayBuffer = input instanceof Blob ? await input.arrayBuffer() : await (await fetch(input)).arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  async function mixSession({ rawSession }) {
    const tempContext = new AudioContext();
    const [instrumentBuffer, voiceBuffer] = await Promise.all([
      decodeAudioBuffer(tempContext, rawSession.instrumentSrc),
      decodeAudioBuffer(tempContext, rawSession.voiceBlob),
    ]);
    await tempContext.close();

    const mixDuration = resolveMixDurationSeconds(instrumentBuffer.duration, voiceBuffer.duration);
    const sampleRate = 44100;
    const length = Math.max(1, Math.ceil(mixDuration * sampleRate));
    const channels = 2;
    const offline = new OfflineAudioContext(channels, length, sampleRate);

    const instrumentSource = offline.createBufferSource();
    instrumentSource.buffer = instrumentBuffer;
    const instrumentGain = offline.createGain();
    instrumentGain.gain.value = instrumentVolume;
    instrumentSource.connect(instrumentGain).connect(offline.destination);
    instrumentSource.start(0, 0, mixDuration || instrumentBuffer.duration);

    const voiceSource = offline.createBufferSource();
    voiceSource.buffer = voiceBuffer;
    const voiceGain = offline.createGain();
    voiceGain.gain.value = voiceVolume;
    voiceSource.connect(voiceGain).connect(offline.destination);
    voiceSource.start(0, 0, mixDuration || voiceBuffer.duration);

    const mixedBuffer = await offline.startRendering();
    const mixBlob = encodeWavFromAudioBuffer(mixedBuffer);
    const durationMs = Math.round(mixDuration * 1000);

    return {
      mixBlob,
      voiceBlob: rawSession.voiceBlob,
      durationMs,
      sizeBytes: mixBlob.size,
      format: "wav",
      bitrateKbps: durationToBitrate(durationMs, mixBlob.size),
      engineType,
    };
  }

  function saveMix({ mixResult, song }) {
    const mixFileUri = URL.createObjectURL(mixResult.mixBlob);
    const voiceFileUri = URL.createObjectURL(mixResult.voiceBlob);
    return {
      id: `rec_${Date.now()}`,
      songId: song.id,
      songName: song.name,
      singer: song.singer,
      mixFileUri,
      voiceFileUri,
      durationMs: mixResult.durationMs,
      sizeBytes: mixResult.sizeBytes,
      format: mixResult.format,
      bitrateKbps: mixResult.bitrateKbps,
      engineType,
      createdAt: Date.now(),
    };
  }

  function discardResult(payload) {
    if (payload.mixFileUri && payload.mixFileUri.startsWith("blob:")) {
      URL.revokeObjectURL(payload.mixFileUri);
    }
    if (payload.voiceFileUri && payload.voiceFileUri.startsWith("blob:")) {
      URL.revokeObjectURL(payload.voiceFileUri);
    }
  }

  async function destroy() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    stopInstrument();
    teardownMetering();
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

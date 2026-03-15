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
  let chunks = [];
  let recordStartTs = 0;
  let instrumentSrc = "";
  let sessionStartAtSec = 0;
  let instrumentHowl = null;

  let audioContext = null;
  let analyserNode = null;
  let monitorGainNode = null;
  let sourceNode = null;
  let scriptProcessorNode = null;
  let mediaStream = null;
  let rafId = null;
  let liveLevel = 0;

  let recordedBuffers = [];
  let recordingSampleRate = 44100;

  function resolveMixDurationSeconds(instrumentDuration, voiceDuration, startAtSec = 0) {
    const availableInstrumentDuration = Math.max(0, instrumentDuration - Math.max(0, startAtSec));
    if (voiceDuration > 0 && availableInstrumentDuration > 0) {
      return Math.min(voiceDuration, availableInstrumentDuration);
    }
    if (voiceDuration > 0) return voiceDuration;
    if (availableInstrumentDuration > 0) return availableInstrumentDuration;
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
      instrumentHowl.volume(Math.min(1, instrumentVolume));
    }
  }

  async function setupAudioPipeline(stream) {
    audioContext = new AudioContext({
      latencyHint: "interactive",
      sampleRate: 44100,
    });
    await audioContext.resume().catch(() => {});
    recordingSampleRate = audioContext.sampleRate;

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 512;

    monitorGainNode = audioContext.createGain();
    monitorGainNode.gain.value = voiceVolume;

    sourceNode = audioContext.createMediaStreamSource(stream);

    sourceNode.connect(analyserNode);
    sourceNode.connect(monitorGainNode);
    monitorGainNode.connect(audioContext.destination);

    const bufferSize = 2048;
    scriptProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    recordedBuffers = [];

    scriptProcessorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      recordedBuffers.push(new Float32Array(inputData));
    };
    sourceNode.connect(scriptProcessorNode);
    scriptProcessorNode.connect(audioContext.destination);

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

  function buildVoiceAudioBuffer() {
    if (!recordedBuffers.length) return null;
    const totalLength = recordedBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of recordedBuffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }
    const audioBuffer = new AudioBuffer({
      numberOfChannels: 1,
      length: totalLength,
      sampleRate: recordingSampleRate,
    });
    audioBuffer.copyToChannel(merged, 0);
    return audioBuffer;
  }

  function teardownPipeline() {
    cancelAnimationFrame(rafId);
    rafId = null;
    liveLevel = 0;
    if (scriptProcessorNode) {
      scriptProcessorNode.onaudioprocess = null;
      scriptProcessorNode.disconnect();
      scriptProcessorNode = null;
    }
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
    sessionStartAtSec = Math.max(0, Number(options.startAtSec) || 0);
    if (!instrumentSrc) {
      throw new Error("缺少伴奏音频地址");
    }

    updateMixSettings(options.mixSettings);

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100,
        channelCount: 1,
      },
    });

    chunks = [];
    recordedBuffers = [];

    await setupAudioPipeline(mediaStream);

    instrumentHowl = new Howl({
      src: [instrumentSrc],
      html5: true,
      onloaderror(_id, err) {
        console.error("伴奏加载失败", err);
      },
    });

    applyLiveMixSettings();
    const soundId = instrumentHowl.play();
    instrumentHowl.once("play", () => {
      instrumentHowl.seek(sessionStartAtSec, soundId);
    }, soundId);
    recordStartTs = Date.now();
  }

  function updateMixSettings(settings) {
    if (!settings || typeof settings !== "object") return;
    instrumentVolume = clampVolume(settings.instrumentVolume, instrumentVolume);
    voiceVolume = clampVolume(settings.voiceVolume, voiceVolume);
    applyLiveMixSettings();
  }

  function getLiveMetrics() {
    const currentTime = instrumentHowl && instrumentHowl.playing() ? Number(instrumentHowl.seek()) || sessionStartAtSec : sessionStartAtSec;
    return { level: liveLevel, currentTime };
  }

  async function stopSession() {
    if (!mediaStream) {
      throw new Error("当前没有正在进行的录音会话");
    }

    const voiceAudioBuffer = buildVoiceAudioBuffer();

    const durationMs = Math.max(0, Date.now() - recordStartTs);

    stopInstrument();
    teardownPipeline();
    mediaStream.getTracks().forEach((track) => track.stop());

    const rawSession = {
      instrumentSrc,
      startAtSec: sessionStartAtSec,
      voiceAudioBuffer,
      durationMs,
    };

    mediaStream = null;
    chunks = [];
    recordedBuffers = [];
    return rawSession;
  }

  async function decodeAudioBuffer(ctx, input) {
    if (input instanceof AudioBuffer) return input;
    const arrayBuffer = input instanceof Blob ? await input.arrayBuffer() : await (await fetch(input)).arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  async function mixSession({ rawSession }) {
    const sampleRate = 44100;
    const tempContext = new AudioContext({ sampleRate });

    const voiceInput = rawSession.voiceAudioBuffer || rawSession.voiceBlob;
    const [instrumentBuffer, voiceBuffer] = await Promise.all([
      decodeAudioBuffer(tempContext, rawSession.instrumentSrc),
      decodeAudioBuffer(tempContext, voiceInput),
    ]);
    await tempContext.close();

    const startAtSec = Math.max(0, Number(rawSession.startAtSec) || 0);
    const mixDuration = resolveMixDurationSeconds(instrumentBuffer.duration, voiceBuffer.duration, startAtSec);
    const length = Math.max(1, Math.ceil(mixDuration * sampleRate));
    const channels = 2;
    const offline = new OfflineAudioContext(channels, length, sampleRate);

    const instrumentSource = offline.createBufferSource();
    instrumentSource.buffer = instrumentBuffer;
    const instrumentGain = offline.createGain();
    instrumentGain.gain.value = instrumentVolume;
    instrumentSource.connect(instrumentGain).connect(offline.destination);
    instrumentSource.start(0, startAtSec, mixDuration || Math.max(0, instrumentBuffer.duration - startAtSec));

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
      voiceBlob: encodeWavFromAudioBuffer(voiceBuffer),
      startAtSec,
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
      startAtSec: Math.max(0, Number(mixResult.startAtSec) || 0),
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
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    stopInstrument();
    teardownPipeline();
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

<script setup lang="js">
import { ref, onBeforeUnmount } from "vue";
import playIcon from "@/assets/icons/player-play.svg";
import pauseIcon from "@/assets/icons/player-pause.svg";
import micIcon from "@/assets/icons/player-mic.svg";
import lyricsIcon from "@/assets/icons/player-lyrics.svg";

const props = defineProps({
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 },
  playbackRate: { type: Number, default: 1 },
  isSingRecording: { type: Boolean, default: false },
  isSingBusy: { type: Boolean, default: false },
  singButtonLabel: { type: String, default: "学唱" },
});

const emit = defineEmits([
  "toggle-play",
  "cycle-rate",
  "open-lyrics-settings",
  "drag-start",
  "drag-move",
  "drag-end",
  "toggle-sing",
]);

const progressBarRef = ref(null);

function formatTime(sec) {
  if (!sec || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clientXToTime(clientX) {
  if (!progressBarRef.value || !props.duration) return 0;
  const rect = progressBarRef.value.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * props.duration;
}

function onMouseDown(e) {
  emit("drag-start", clientXToTime(e.clientX));
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e) {
  emit("drag-move", clientXToTime(e.clientX));
}

function onMouseUp() {
  emit("drag-end");
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
}

function onTouchStart(e) {
  emit("drag-start", clientXToTime(e.touches[0].clientX));
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd);
}

function onTouchMove(e) {
  e.preventDefault();
  emit("drag-move", clientXToTime(e.touches[0].clientX));
}

function onTouchEnd() {
  emit("drag-end");
  document.removeEventListener("touchmove", onTouchMove);
  document.removeEventListener("touchend", onTouchEnd);
}

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
  document.removeEventListener("touchmove", onTouchMove);
  document.removeEventListener("touchend", onTouchEnd);
});
</script>

<template>
  <div class="controls">
    <div class="progress-row">
      <span class="time time-current">{{ formatTime(currentTime) }}</span>
      <div
        ref="progressBarRef"
        class="progress-bar"
        @mousedown="onMouseDown"
        @touchstart.prevent="onTouchStart"
      >
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
          <div class="progress-thumb" :style="{ left: progressPercent + '%' }" />
        </div>
      </div>
      <span class="time time-total">{{ formatTime(duration) }}</span>
    </div>

    <div class="btn-row">
      <div class="btn-side btn-side-left">
        <button class="btn-chip btn-rate" @click="emit('cycle-rate')">
          <span class="chip-label">倍速</span>
          <span class="chip-value">{{ playbackRate === 1 ? "1.0x" : playbackRate + "x" }}</span>
        </button>
      </div>

      <button
        class="btn-play"
        :class="{ 'is-playing': isPlaying }"
        @click="emit('toggle-play')"
        :aria-label="isPlaying ? '暂停' : '播放'"
      >
        <img :src="isPlaying ? pauseIcon : playIcon" alt="" class="icon-play" />
      </button>

      <div class="btn-side btn-side-right">
        <button class="btn-chip btn-lyrics" @click="emit('open-lyrics-settings')">
          <img :src="lyricsIcon" alt="" class="icon-lyrics" />
          <span>歌词</span>
        </button>

        <button
          class="btn-chip btn-sing"
          :class="{ 'is-recording': isSingRecording, 'is-busy': isSingBusy }"
          :disabled="isSingBusy"
          :title="isSingBusy ? '处理中' : isSingRecording ? '结束录制并合成' : '开始学唱'"
          @click="emit('toggle-sing')"
        >
          <img :src="micIcon" alt="" class="icon-sing" />
          <span>{{ singButtonLabel }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.controls {
  flex-shrink: 0;
  padding: 12px 20px calc(16px + env(safe-area-inset-bottom, 0));
  touch-action: manipulation; /* 整块控制区避免双击缩放 */
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 30%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.92) 0%, rgba(204, 238, 255, 0.95) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1.5px solid rgba(125, 211, 252, 0.5);
  box-shadow: 0 -8px 24px rgba(56, 189, 248, 0.12);
}

button {
  appearance: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation; /* 避免双击触发页面缩放 */
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.time {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: #0284c7;
  min-width: 32px;
  font-variant-numeric: tabular-nums;

  &.time-current {
    text-align: right;
  }
  &.time-total {
    text-align: left;
  }
}

.progress-bar {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(14, 165, 233, 0.15);
  border-radius: 2px;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0284c7;
  box-shadow: 0 1px 6px rgba(2, 132, 199, 0.35);
  transform: translate(-50%, -50%);
  transition: left 0.1s linear;
}

.btn-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
}

.btn-side {
  display: flex;
  align-items: center;
}

.btn-side-left {
  justify-self: start;
}

.btn-side-right {
  justify-self: end;
  gap: 10px;
}

.btn-play {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #7dd3fc 0%, #38bdf8 56%, #0ea5e9 100%);
  border: 1px solid rgba(186, 230, 253, 0.95);
  border-radius: 50%;
  cursor: pointer;
  box-shadow:
    0 6px 18px rgba(14, 165, 233, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:active {
    transform: scale(0.92);
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
  }

  &:focus-visible {
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.9),
      0 0 0 6px rgba(14, 165, 233, 0.45),
      0 6px 18px rgba(14, 165, 233, 0.3);
  }

  .icon-play {
    width: 24px;
    height: 24px;
    filter: brightness(0) invert(1);
  }
}

.btn-play.is-playing {
  animation: play-pulse 2.1s ease-in-out infinite;
}

.btn-chip {
  min-width: 54px;
  height: 44px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(56, 189, 248, 0.12);
  border: 1.5px solid rgba(56, 189, 248, 0.3);
  border-radius: 14px;
  cursor: pointer;
  color: #0284c7;
  transition: background 0.2s, transform 0.15s, border-color 0.2s;
  font-family: inherit;

  &:active {
    transform: scale(0.94);
    background: rgba(56, 189, 248, 0.22);
  }

  &:focus-visible {
    border-color: rgba(2, 132, 199, 0.5);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
  }
}

.btn-rate {
  .chip-label {
    font-size: 0.62rem;
    font-weight: 600;
    line-height: 1;
    opacity: 0.82;
  }

  .chip-value {
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }
}

.btn-lyrics {
  .icon-lyrics {
    width: 18px;
    height: 18px;
  }

  span {
    font-size: 0.65rem;
    font-weight: 600;
  }
}

.btn-sing {
  background: rgba(186, 230, 253, 0.55);
  border-color: rgba(14, 165, 233, 0.28);
  transition: opacity 0.2s, background 0.2s, border-color 0.2s;

  .icon-sing {
    width: 18px;
    height: 18px;
    opacity: 0.88;
  }

  span {
    font-size: 0.65rem;
    font-weight: 600;
  }

  &.is-recording {
    background: linear-gradient(160deg, rgba(252, 165, 165, 0.34) 0%, rgba(248, 113, 113, 0.2) 100%);
    border-color: rgba(239, 68, 68, 0.45);
    color: #b91c1c;

    .icon-sing {
      opacity: 1;
      animation: sing-dot 1.2s ease-in-out infinite;
    }
  }

  &.is-busy {
    cursor: wait;
    opacity: 0.65;
  }
}

@media (max-width: 380px) {
  .btn-row {
    gap: 10px;
  }

  .btn-side-right {
    gap: 8px;
  }

  .btn-chip {
    min-width: 48px;
    height: 42px;
    padding: 6px 10px;
  }

  .btn-lyrics,
  .btn-sing {
    min-width: 46px;
  }
}

@keyframes play-pulse {
  0%,
  100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);
  }
  50% {
    transform: translateY(-1px) scale(1.04);
    box-shadow:
      0 8px 20px rgba(14, 165, 233, 0.38),
      0 0 0 6px rgba(56, 189, 248, 0.18);
  }
}

@keyframes sing-dot {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}
</style>

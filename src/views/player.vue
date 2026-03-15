<script setup lang="js">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSongStore } from "@/stores/songStore";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import PlayerLyrics from "@/components/PlayerLyrics.vue";
import PlayerControls from "@/components/PlayerControls.vue";
import LyricsSettingsModal from "@/components/LyricsSettingsModal.vue";
import OceanFloor from "@/components/OceanFloor.vue";
import backIcon from "@/assets/icons/player-back.svg";

const route = useRoute();
const router = useRouter();
const songStore = useSongStore();

const song = computed(() => songStore.getSongById(route.params.id));

const {
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  progressPercent,
  init: initPlayer,
  togglePlay,
  beginDrag,
  updateDrag,
  endDrag,
  cycleRate,
} = useAudioPlayer(() => song.value?.src);

const lyrics = ref([]);

function parseTime(timeStr) {
  const match = timeStr.match(/\[(\d+):(\d+\.\d+)\]/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseFloat(match[2]);
}

async function loadLyrics(path) {
  try {
    const res = await fetch(path);
    const data = await res.json();
    lyrics.value = data.map((item) => ({
      ...item,
      seconds: parseTime(item.time),
    }));
  } catch {
    lyrics.value = [];
  }
}

const allLyricFields = [
  { key: "jp", label: "原歌词" },
  { key: "jm", label: "假名" },
  { key: "zh", label: "中文翻译" },
  { key: "rm", label: "罗马音" },
];

const lyricFields = ref(allLyricFields.map((f) => ({ ...f, visible: f.key !== "rm" })));

const visibleFields = computed(() => lyricFields.value.filter((f) => f.visible));

const showLyricsModal = ref(false);

function goBack() {
  router.back();
}

onMounted(() => {
  if (song.value) {
    loadLyrics(song.value.lyrics);
    initPlayer();
  }
});
</script>

<template>
  <div class="player-view" v-if="song">
    <div class="bg-orb bg-orb-top" aria-hidden="true" />
    <div class="bg-orb bg-orb-bottom" aria-hidden="true" />

    <header class="player-header">
      <button class="btn-back" @click="goBack" aria-label="返回">
        <img :src="backIcon" alt="" class="icon-back" />
      </button>
      <div class="header-info">
        <span class="header-title">{{ song.name }}</span>
        <span class="header-singer">{{ song.singer }}</span>
      </div>
      <div class="header-spacer" />
    </header>

    <div class="player-main">
      <PlayerLyrics :lyrics="lyrics" :current-time="currentTime" :visible-fields="visibleFields" />
      <OceanFloor class="player-ocean" />
    </div>

    <PlayerControls
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :progress-percent="progressPercent"
      :playback-rate="playbackRate"
      @toggle-play="togglePlay"
      @cycle-rate="cycleRate"
      @open-lyrics-settings="showLyricsModal = true"
      @drag-start="beginDrag"
      @drag-move="updateDrag"
      @drag-end="endDrag"
    />

    <LyricsSettingsModal v-model="showLyricsModal" :fields="lyricFields" @update:fields="lyricFields = $event" />
  </div>

  <div class="player-empty" v-else>
    <p>歌曲未找到</p>
    <button @click="goBack">返回列表</button>
  </div>
</template>

<style scoped lang="less">
.player-view {
  position: relative;
  isolation: isolate;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 15% 15%, rgba(186, 230, 253, 0.25) 0%, rgba(186, 230, 253, 0) 35%),
    radial-gradient(circle at 82% 25%, rgba(125, 211, 252, 0.25) 0%, rgba(125, 211, 252, 0) 40%),
    linear-gradient(180deg, #f0faff 0%, #bae5fd9c 34%, #60a5faab 100%);
  font-family: "Nunito", "PingFang SC", sans-serif;
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  z-index: -1;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(10px);
}

.bg-orb-top {
  top: -140px;
  right: -80px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95) 0%, rgba(125, 211, 252, 0.28) 72%, rgba(125, 211, 252, 0) 100%);
}

.bg-orb-bottom {
  bottom: 90px;
  left: -90px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle at 65% 35%, rgba(14, 165, 233, 0.22) 0%, rgba(14, 165, 233, 0.05) 60%, rgba(14, 165, 233, 0) 100%);
}

.player-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.74) 0%, rgba(219, 244, 255, 0.82) 58%, rgba(186, 230, 253, 0.78) 100%);
  border-bottom: 1px solid rgba(125, 211, 252, 0.45);
  box-shadow: 0 6px 14px rgba(56, 189, 248, 0.12);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.btn-back {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 165, 233, 0.12);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: rgba(14, 165, 233, 0.2);
  }

  .icon-back {
    width: 20px;
    height: 20px;
    filter: brightness(0) saturate(100%) invert(29%) sepia(77%) saturate(1781%) hue-rotate(174deg) brightness(95%) contrast(102%);
  }
}

.header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #075985;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.35);
}

.header-singer {
  font-size: 0.78rem;
  color: rgba(3, 105, 161, 0.86);
  font-weight: 500;
}

.header-spacer {
  flex-shrink: 0;
  width: 36px;
}

.player-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.player-ocean {
  margin-top: -14px;
  opacity: 0.92;
  animation: ocean-fade-in 0.7s ease-out both;
}

.player-empty {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: linear-gradient(180deg, #e0f4ff 0%, #bae6fd 100%);
  font-family: "Nunito", "PingFang SC", sans-serif;

  p {
    font-size: 1.1rem;
    color: #0369a1;
    font-weight: 600;
  }

  button {
    padding: 10px 24px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
  }
}

@keyframes ocean-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 0.92;
    transform: translateY(0);
  }
}
</style>

<script setup lang="js">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSongStore } from "@/stores/songStore";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useSingSession } from "@/composables/useSingSession";
import PlayerLyrics from "@/components/PlayerLyrics.vue";
import PlayerControls from "@/components/PlayerControls.vue";
import PlayerSingPanel from "@/components/PlayerSingPanel.vue";
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

const {
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
} = useSingSession();

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
const lyricCurrentTime = computed(() => (isRecording.value ? singCurrentTime.value : currentTime.value));
const controlsCurrentTime = computed(() => (isRecording.value ? singCurrentTime.value : currentTime.value));

function goBack() {
  router.back();
}

async function onToggleSing() {
  if (!song.value) return;
  if (!isRecording.value && isPlaying.value) {
    togglePlay();
  }
  await toggleSing(song.value);
}

function onSaveReview() {
  saveReviewRecord();
}

async function onDiscardReview() {
  await discardReviewRecord();
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
      <PlayerLyrics :lyrics="lyrics" :current-time="lyricCurrentTime" :visible-fields="visibleFields" />
      <OceanFloor class="player-ocean" />
    </div>

    <PlayerSingPanel
      class="player-sing-panel"
      :status-text="statusText"
      :wave-levels="waveLevels"
      :error-message="errorMessage"
      :is-reviewing="isReviewing"
      :review-record="reviewRecord"
      :engine-type="audioEngineType"
      @save-review="onSaveReview"
      @discard-review="onDiscardReview"
    />

    <PlayerControls
      :is-playing="isPlaying"
      :current-time="controlsCurrentTime"
      :duration="duration"
      :progress-percent="progressPercent"
      :playback-rate="playbackRate"
      :is-sing-recording="isRecording"
      :is-sing-busy="isBusy"
      :sing-button-label="singButtonLabel"
      @toggle-play="togglePlay"
      @cycle-rate="cycleRate"
      @open-lyrics-settings="showLyricsModal = true"
      @drag-start="beginDrag"
      @drag-move="updateDrag"
      @drag-end="endDrag"
      @toggle-sing="onToggleSing"
    />

    <LyricsSettingsModal v-model="showLyricsModal" :fields="lyricFields" @update:fields="lyricFields = $event" />
  </div>

  <div class="player-empty" v-else>
    <p>歌曲未找到</p>
    <button @click="goBack">返回列表</button>
  </div>
</template>

<style scoped lang="less" src="./player.less"></style>

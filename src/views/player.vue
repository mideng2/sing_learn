<script setup lang="js">
import { ref, computed, onMounted, Teleport, Transition } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useSongStore } from "@/stores/songStore";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useSingSession } from "@/composables/useSingSession";
import PlayerLyrics from "@/components/PlayerLyrics.vue";
import PlayerControls from "@/components/PlayerControls.vue";
import PlayerSingPanel from "@/components/PlayerSingPanel.vue";
import PlayerVolumeModal from "@/components/PlayerVolumeModal.vue";
import LyricsSettingsModal from "@/components/LyricsSettingsModal.vue";
import SingReviewModal from "@/components/SingReviewModal.vue";
import OceanFloor from "@/components/OceanFloor.vue";
import Icon from "@/components/common/Icon.vue";

const route = useRoute();
const router = useRouter();
const songStore = useSongStore();
const { lyricFields } = storeToRefs(songStore);

const song = computed(() => songStore.getSongById(route.params.id));

const {
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  progressPercent,
  init: initPlayer,
  togglePlay,
  seekTo,
  beginDrag,
  updateDrag,
  endDrag,
  cycleRate,
} = useAudioPlayer(() => song.value?.src);

const {
  waveLevels,
  singCurrentTime,
  reviewRecord,
  statusText,
  errorMessage,
  audioEngineType,
  mixSettings,
  isRecording,
  isBusy,
  isReviewing,
  singButtonLabel,
  toggleSing,
  updateMixSettings,
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

const visibleFields = computed(() => lyricFields.value.filter((f) => f.visible));

const showLyricsModal = ref(false);
const showVolumeModal = ref(false);
const lyricCurrentTime = computed(() => (isRecording.value ? singCurrentTime.value : currentTime.value));
const controlsCurrentTime = computed(() => (isRecording.value ? singCurrentTime.value : currentTime.value));

function goBack() {
  router.back();
}

async function onToggleSing() {
  if (!song.value) return;
  // 若用户刚拖完进度条立即点击学唱，先落地拖动位置再开录。
  endDrag();
  const rawStartAtSec = Math.max(0, Number(currentTime.value) || 0);
  const maxStartAtSec = Math.max(0, Number(duration.value) || 0);
  const startAtSec = maxStartAtSec > 0 ? Math.min(rawStartAtSec, maxStartAtSec) : rawStartAtSec;
  if (!isRecording.value) {
    if (isPlaying.value) togglePlay();
  }
  await toggleSing(song.value, { startAtSec });
}

function onSaveReview(customName) {
  saveReviewRecord(customName);
}

async function onDiscardReview() {
  await discardReviewRecord();
}

function onInstrumentVolumeChange(value) {
  updateMixSettings({ instrumentVolume: value });
}

function onVoiceVolumeChange(value) {
  updateMixSettings({ voiceVolume: value });
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
        <Icon name="player-back" size="24px" class="icon-back" />
      </button>
      <div class="header-info">
        <span class="header-title">{{ song.name }}</span>
        <span class="header-singer">{{ song.singer }}</span>
      </div>
      <div class="header-spacer" />
    </header>

    <div class="player-main">
      <!-- <PlayerSingPanel :status-text="statusText" :error-message="errorMessage" :engine-type="audioEngineType" /> -->
      <PlayerLyrics :lyrics="lyrics" :current-time="lyricCurrentTime" :visible-fields="visibleFields" />
      <OceanFloor class="player-ocean" />
    </div>

    <PlayerControls
      :is-playing="isPlaying"
      :current-time="controlsCurrentTime"
      :duration="duration"
      :progress-percent="progressPercent"
      :playback-rate="playbackRate"
      :is-sing-recording="isRecording"
      :is-sing-busy="isBusy"
      :sing-button-label="singButtonLabel"
      :wave-levels="waveLevels"
      @toggle-play="togglePlay"
      @cycle-rate="cycleRate"
      @open-volume-settings="showVolumeModal = true"
      @open-lyrics-settings="showLyricsModal = true"
      @drag-start="beginDrag"
      @drag-move="updateDrag"
      @drag-end="endDrag"
      @toggle-sing="onToggleSing"
    />

    <LyricsSettingsModal
      v-model="showLyricsModal"
      :fields="lyricFields"
      @update:fields="songStore.setLyricFields"
    />

    <PlayerVolumeModal
      v-model="showVolumeModal"
      :instrument-volume="mixSettings.instrumentVolume"
      :voice-volume="mixSettings.voiceVolume"
      @update:instrument-volume="onInstrumentVolumeChange"
      @update:voice-volume="onVoiceVolumeChange"
    />

    <SingReviewModal :model-value="isReviewing && !!reviewRecord" :review-record="reviewRecord" @save-review="onSaveReview" @discard-review="onDiscardReview" />

    <Teleport to="body">
      <Transition name="loading-fade">
        <div v-if="isBusy" class="page-loading" aria-live="polite">
          <div class="page-loading-spinner" />
          <!-- <p class="page-loading-text">...</p> -->
        </div>
      </Transition>
    </Teleport>
  </div>

  <div class="player-empty" v-else>
    <p>歌曲未找到</p>
    <button @click="goBack">返回列表</button>
  </div>
</template>

<style scoped lang="less" src="./player.less"></style>

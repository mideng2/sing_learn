<script setup lang="js">
import { storeToRefs } from "pinia";
import { useSongStore } from "@/stores/songStore";
import { RouterLink } from "vue-router";
import OceanFloor from "@/components/OceanFloor.vue";
import fishHeaderBig from "@/assets/icons/fish-header-big.svg";
import fishHeaderSmall from "@/assets/icons/fish-header-small.svg";
import titleMusic from "@/assets/icons/title-music.svg";

const songStore = useSongStore();
const { songs } = storeToRefs(songStore);

/**
 * 将秒数格式化为 mm:ss
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

<template>
  <div class="playlist-view">
    <header class="header" aria-label="页面头部">
      <!-- 左侧小鱼群装饰 -->
      <div class="header-fish" aria-hidden="true">
        <img class="hfish hfish-big" :src="fishHeaderBig" alt="" />
        <img class="hfish hfish-sm" :src="fishHeaderSmall" alt="" />
        <span class="hbubble hb1" />
        <span class="hbubble hb2" />
      </div>

      <!-- 中央文字 -->
      <div class="header-text">
        <h1 class="title">
          <img class="title-icon" :src="titleMusic" alt="" />
          唱歌学语言
        </h1>
        <p class="subtitle">{{ songs.length }} 首好歌，点击开始学唱 ✦</p>
      </div>

      <!-- 右侧音符装饰 -->
      <div class="header-notes" aria-hidden="true">
        <span class="hnote hnote-1">♩</span>
        <span class="hnote hnote-2">♪</span>
      </div>
    </header>

    <ul class="song-list">
      <li v-for="(song, index) in songs" :key="index" class="song-item">
        <RouterLink :to="{ name: 'Player', params: { id: song.id } }" class="song-link">
          <span class="song-index">{{ index + 1 }}</span>
          <div class="song-info">
            <span class="song-name">{{ song.name }}</span>
            <span class="song-singer">{{ song.singer }}</span>
          </div>
          <span class="song-duration">{{ formatDuration(song.duration) }}</span>
        </RouterLink>
      </li>
    </ul>

    <!-- 海底小鱼装饰 -->
    <OceanFloor class="ocean-floor-wrap" />
  </div>
</template>

<style scoped lang="less">
.playlist-view {
  min-height: 100%;
  min-height: 100dvh; /* 移动端占满全屏 */
  box-sizing: border-box;
  padding: 24px 20px calc(32px + env(safe-area-inset-bottom, 0));
  background: linear-gradient(180deg, #e0f4ff 0%, #b8e8ff 30%, #7dd3fc 70%, #38bdf8 100%);
  font-family: "Nunito", "PingFang SC", sans-serif;
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: -24px -20px 14px;
  padding: 24px 20px;
  background:
    linear-gradient(180deg, rgba(224, 244, 255, 0.72) 0%, rgba(184, 232, 255, 0.58) 45%, rgba(125, 211, 252, 0.34) 100%),
    radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%);
  border-radius: 0 0 20px 20px;
  overflow: hidden;
  box-shadow:
    0 2px 12px rgba(14, 165, 233, 0.14),
    inset 0 -1px 0 rgba(255, 255, 255, 0.5);
}

.header::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 14px;
  background: linear-gradient(180deg, rgba(184, 232, 255, 0.28) 0%, rgba(184, 232, 255, 0) 100%);
  pointer-events: none;
}

/* 左侧小鱼区 */
.header-fish {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 90px;
  pointer-events: none;
  opacity: 0.9;
  filter: saturate(1.15) contrast(1.08);
}

.hfish {
  position: absolute;

  &.hfish-big {
    width: 54px;
    top: 50%;
    left: 8px;
    transform: translateY(-60%);
    animation: hfish-swim 7s ease-in-out infinite;
  }

  &.hfish-sm {
    width: 36px;
    bottom: 10px;
    left: 28px;
    animation: hfish-swim 9s ease-in-out infinite 1.5s;
    opacity: 0.75;
  }
}

@keyframes hfish-swim {
  0%,
  100% {
    transform: translateY(-60%) translateX(0);
  }
  50% {
    transform: translateY(-40%) translateX(5px);
  }
}

.hbubble {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.36);
  animation: hbubble-up 5s ease-in infinite;

  &.hb1 {
    width: 7px;
    height: 7px;
    left: 20px;
    bottom: 6px;
    animation-delay: 0s;
  }
  &.hb2 {
    width: 5px;
    height: 5px;
    left: 50px;
    bottom: 10px;
    animation-delay: 2.2s;
  }
}

@keyframes hbubble-up {
  0% {
    transform: translateY(0);
    opacity: 0.7;
  }
  100% {
    transform: translateY(-36px);
    opacity: 0;
  }
}

/* 中央文字 */
.header-text {
  position: relative;
  z-index: 1;
  text-align: center;
}

.title {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1.28rem;
  font-weight: 700;
  color: #0c4a6e;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.55);

  .title-icon {
    width: 22px;
    height: 24px;
    flex-shrink: 0;
  }
}

.subtitle {
  margin: 3px 0 0;
  font-size: 0.76rem;
  font-weight: 500;
  color: rgba(3, 105, 161, 0.82);
  letter-spacing: 0.03em;
}

/* 右侧音符 */
.header-notes {
  position: absolute;
  right: 14px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
}

.hnote {
  color: rgba(2, 132, 199, 0.62);
  line-height: 1;

  &.hnote-1 {
    font-size: 1.6rem;
    animation: note-float 4s ease-in-out infinite;
  }

  &.hnote-2 {
    font-size: 1.1rem;
    animation: note-float 5s ease-in-out infinite 1.2s;
  }
}

@keyframes note-float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-5px);
    opacity: 0.85;
  }
}

.song-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.song-item {
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 4px 12px rgba(14, 165, 233, 0.2),
    0 2px 4px rgba(255, 255, 255, 0.4) inset;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(14, 165, 233, 0.3),
      0 2px 4px rgba(255, 255, 255, 0.5) inset;
  }
}

.song-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(224, 242, 254, 0.9) 100%);
  backdrop-filter: blur(8px);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(186, 230, 253, 0.95) 100%);
  }
}

.song-index {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0284c7;
  background: rgba(56, 189, 248, 0.25);
  border-radius: 50%;
}

.song-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.song-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0c4a6e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-singer {
  font-size: 0.85rem;
  font-weight: 400;
  color: #0369a1;
  opacity: 0.85;
}

.song-duration {
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0284c7;
}

.ocean-floor-wrap {
  position: fixed;
  bottom: 76px;
  left: 20px;
  right: 0;
  margin: 0 -20px;
}
</style>

<script setup lang="js">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  lyrics: { type: Array, required: true },
  currentTime: { type: Number, default: 0 },
  visibleFields: { type: Array, required: true },
});

const wrapRef = ref(null);
const spacerH = ref(200);

const currentLineIndex = computed(() => {
  const t = props.currentTime;
  let idx = -1;
  for (let i = 0; i < props.lyrics.length; i++) {
    if (props.lyrics[i].seconds <= t) idx = i;
    else break;
  }
  return idx;
});

const upcomingLineIndex = computed(() => {
  if (!props.lyrics.length) return -1;
  const cur = currentLineIndex.value;
  const next = cur + 1;
  return next >= 0 && next < props.lyrics.length ? next : -1;
});

function scrollToActive() {
  const wrap = wrapRef.value;
  if (!wrap) return;
  const el = wrap.querySelector(".lyric-line.active");
  if (!el) return;
  const wrapRect = wrap.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const targetScroll = wrap.scrollTop + (elRect.top + elRect.height / 2 - (wrapRect.top + wrapRect.height / 2));
  wrap.scrollTo({ top: targetScroll, behavior: "smooth" });
}

function calcSpacer() {
  if (!wrapRef.value) return;
  const containerHalf = wrapRef.value.clientHeight / 2;
  spacerH.value = Math.max(120, Math.floor(containerHalf - 26));
}

watch(currentLineIndex, () => nextTick(scrollToActive));

onMounted(() => {
  nextTick(calcSpacer);
  window.addEventListener("resize", calcSpacer);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", calcSpacer);
});
</script>

<template>
  <div ref="wrapRef" class="lyrics-wrap">
    <div class="lyrics-spacer" :style="{ height: spacerH + 'px' }" />
    <div class="lyrics-inner">
      <div
        v-for="(line, i) in lyrics"
        :key="i"
        class="lyric-line"
        :class="{
          active: i === currentLineIndex,
          upcoming: i === upcomingLineIndex,
        }"
      >
        <p v-for="(field, idx) in visibleFields" :key="field.key" :class="`lyric-${idx} lyric-${field.key}`" v-show="line[field.key]">{{ line[field.key] }}</p>
      </div>
    </div>
    <div class="lyrics-spacer" :style="{ height: spacerH + 'px' }" />
  </div>
</template>

<style scoped lang="less">
.lyrics-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 32px 20px;
  -webkit-overflow-scrolling: touch;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 92%, transparent 100%);
}

.lyrics-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lyric-line {
  text-align: center;
  transition:
    transform 0.35s ease,
    opacity 0.35s ease;
  opacity: 0.4;
  transform: scale(0.95);

  &.active {
    opacity: 1;
    transform: scale(1);

    .lyric-0 {
      color: #033954;
    }
    .lyric-1 {
      color: #004c72;
    }
  }

  &.upcoming {
    opacity: 0.8;
    transform: scale(0.985);

    .lyric-0 {
      color: #03547c;
    }
    .lyric-1 {
      color: #015d86;
    }
  }
}

.lyric-0 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0369a1;
  line-height: 1.5;
}

.lyric-1 {
  margin: 3px 0 0;
  font-size: 1rem;
  color: #014c72;
  font-weight: 600;
  opacity: 0.9;
  line-height: 1.4;
}

.lyric-2 {
  margin: 3px 0 0;
  font-size: 0.85rem;
  color: #0d3b53;
  opacity: 0.6;
  line-height: 1.4;
}

.lyric-3 {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: #1d485d;
  opacity: 0.5;
  line-height: 1.4;
  letter-spacing: 0.02em;
}
</style>

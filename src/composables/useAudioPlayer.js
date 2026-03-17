import { ref, computed, onBeforeUnmount } from "vue";
import { Howl } from "howler";

/**
 * @param {() => string | undefined} getSrc - 返回音频文件路径的函数
 */
export function useAudioPlayer(getSrc) {
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const playbackRate = ref(1);
  const isDragging = ref(false);

  const rateOptions = [0.5, 0.75, 1, 1.25, 1.5];

  let howl = null;
  let rafId = null;
  let dragTime = 0;

  function startRaf() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateProgress);
  }

  function updateProgress() {
    if (!howl) return;
    if (!isDragging.value) {
      const pos = howl.seek();
      if (typeof pos === "number") currentTime.value = pos;
    }
    if (isPlaying.value) {
      rafId = requestAnimationFrame(updateProgress);
    }
  }

  function init() {
    const src = getSrc();
    if (!src) return;
    howl = new Howl({
      src: [src],
      html5: true,
      rate: playbackRate.value,
      onplay() {
        isPlaying.value = true;
        duration.value = howl.duration();
        startRaf();
      },
      onpause() {
        isPlaying.value = false;
      },
      onstop() {
        isPlaying.value = false;
      },
      onend() {
        isPlaying.value = false;
        currentTime.value = 0;
      },
      onload() {
        duration.value = howl.duration();
      },
    });
  }

  function togglePlay() {
    if (!howl) return;
    if (howl.playing()) {
      howl.pause();
    } else {
      howl.play();
    }
  }

  function seekTo(time) {
    if (!howl) return;
    howl.seek(time);
    currentTime.value = time;
    if (isPlaying.value) startRaf();
  }

  function beginDrag(time) {
    isDragging.value = true;
    dragTime = time;
    currentTime.value = time;
  }

  function updateDrag(time) {
    dragTime = time;
    currentTime.value = time;
  }

  function endDrag() {
    if (isDragging.value) {
      isDragging.value = false;
      seekTo(dragTime);
    }
  }

  function setPlaybackRate(rate) {
    const clamped = Math.min(2, Math.max(0.5, Number(rate) || 1));
    const rounded = Math.round(clamped * 10) / 10;
    playbackRate.value = rounded;
    if (howl) howl.rate(rounded);
  }

  const progressPercent = computed(() => {
    if (!duration.value) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  function destroy() {
    cancelAnimationFrame(rafId);
    if (howl) {
      howl.unload();
      howl = null;
    }
  }

  onBeforeUnmount(destroy);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isDragging,
    progressPercent,
    rateOptions,
    init,
    togglePlay,
    seekTo,
    beginDrag,
    updateDrag,
    endDrag,
    setPlaybackRate,
    destroy,
  };
}

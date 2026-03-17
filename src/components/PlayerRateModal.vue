<script setup lang="js">
import { computed } from "vue";
import BottomSheetModal from "@/components/common/BottomSheetModal.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  playbackRate: { type: Number, default: 1 },
});

const emit = defineEmits(["update:modelValue", "update:playback-rate"]);

function close() {
  emit("update:modelValue", false);
}

function onRateInput(event) {
  const raw = Number(event.target.value) || 1;
  const snapped = Math.round(raw * 10) / 10;
  emit("update:playback-rate", snapped);
}

const displayRate = computed(() => {
  const value = Number(props.playbackRate) || 1;
  return `${value.toFixed(1)}x`;
});
</script>

<template>
  <BottomSheetModal :model-value="modelValue" title="倍速播放" @update:model-value="close">
    <div class="rate-card">
      <div class="rate-meta">
        <p class="rate-label">当前倍速</p>
        <span class="rate-value">{{ displayRate }}</span>
      </div>

      <div class="rate-scale">
        <span class="rate-scale-text">0.5x</span>
        <span class="rate-scale-text">1.0x</span>
        <span class="rate-scale-text">1.5x</span>
        <span class="rate-scale-text">2.0x</span>
      </div>

      <input class="rate-slider" type="range" min="0.5" max="2" step="0.1" :value="playbackRate" @input="onRateInput" />
    </div>
  </BottomSheetModal>
</template>

<style scoped lang="less">
.rate-card {
  padding: 16px 16px 18px;
  border-radius: 14px;
  background: rgba(240, 249, 255, 0.9);
  box-shadow: 0 1px 4px rgba(14, 165, 233, 0.1);
  color: #0c4a6e;
}

.rate-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.rate-label {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0c4a6e;
}

.rate-value {
  min-width: 60px;
  padding: 6px 10px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 999px;
  background: rgba(186, 230, 253, 0.75);
  color: #0284c7;
}

.rate-scale {
  display: flex;
  justify-content: space-between;
  margin: 6px 2px 4px;
  font-size: 0.7rem;
  color: #64748b;
}

.rate-scale-text {
  min-width: 32px;
  text-align: center;
}

.rate-slider {
  width: 100%;
  margin-top: 4px;
  margin-bottom: 8px;
  appearance: none;
  height: 6px;
  background: linear-gradient(90deg, rgba(125, 211, 252, 0.9) 0%, rgba(14, 165, 233, 0.95) 100%);
  outline: none;
}

.rate-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: transparent;
}

.rate-slider::-webkit-slider-thumb {
  appearance: none;
  margin-top: -8px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.95);
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.22);
}

.rate-slider::-moz-range-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: transparent;
}

.rate-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.95);
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.22);
}
</style>

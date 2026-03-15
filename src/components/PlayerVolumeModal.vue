<script setup lang="js">
import BottomSheetModal from "@/components/common/BottomSheetModal.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  instrumentVolume: { type: Number, default: 0.72 },
  voiceVolume: { type: Number, default: 1 },
});

const emit = defineEmits(["update:modelValue", "update:instrument-volume", "update:voice-volume"]);

function close() {
  emit("update:modelValue", false);
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function onInstrumentInput(event) {
  emit("update:instrument-volume", Number(event.target.value) / 100);
}

function onVoiceInput(event) {
  emit("update:voice-volume", Number(event.target.value) / 100);
}
</script>

<template>
  <BottomSheetModal :model-value="modelValue" title="调节耳返与伴奏平衡" @update:model-value="close">
    <div class="slider-card">
      <div class="slider-meta">
        <div>
          <p class="slider-title">人声</p>
          <p class="slider-tip">控制耳返和导出混音里的人声强度</p>
        </div>
        <span class="slider-value">{{ formatPercent(voiceVolume) }}</span>
      </div>
      <input
        class="volume-slider"
        type="range"
        min="0"
        max="150"
        step="1"
        :value="Math.round(voiceVolume * 100)"
        @input="onVoiceInput"
      />
    </div>

    <div class="slider-card slider-card-secondary">
      <div class="slider-meta">
        <div>
          <p class="slider-title">伴奏</p>
          <p class="slider-tip">控制学唱时的伴奏音量和最终合成比例</p>
        </div>
        <span class="slider-value">{{ formatPercent(instrumentVolume) }}</span>
      </div>
      <input
        class="volume-slider"
        type="range"
        min="0"
        max="150"
        step="1"
        :value="Math.round(instrumentVolume * 100)"
        @input="onInstrumentInput"
      />
    </div>
  </BottomSheetModal>
</template>

<style scoped lang="less">
.slider-card {
  padding: 14px 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  border: none;
  box-shadow: 0 1px 4px rgba(14, 165, 233, 0.1);
}

.slider-card + .slider-card {
  margin-top: 12px;
}

.slider-card-secondary {
  background: rgba(240, 249, 255, 0.9);
}

.slider-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.slider-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0c4a6e;
}

.slider-tip {
  margin: 4px 0 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: #64748b;
}

.slider-value {
  flex-shrink: 0;
  min-width: 54px;
  padding: 6px 10px;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0284c7;
  border-radius: 999px;
  background: rgba(186, 230, 253, 0.75);
}

.volume-slider {
  width: 100%;
  height: 6px;
  appearance: none;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(125, 211, 252, 0.9) 0%, rgba(14, 165, 233, 0.95) 100%);
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.95);
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.22);
}

.volume-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.22);
}
</style>

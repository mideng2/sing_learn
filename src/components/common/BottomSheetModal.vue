<script setup lang="js">
/**
 * 可复用的底部弹窗：统一遮罩与面板样式（与歌词弹窗一致），通过 slot 传入标题与内容。
 */
const props = defineProps({
  /** 是否显示 */
  modelValue: { type: Boolean, default: false },
  /** 标题文案 */
  title: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-panel">
          <div class="modal-header">
            <span class="modal-title">{{ title }}</span>
            <button class="modal-close" @click="close" aria-label="关闭">×</button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="less">
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;

  .modal-panel {
    transition: transform 0.25s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-panel {
    transform: translateY(40px);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-panel {
  width: 100%;
  max-width: 420px;
  background: linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0));
  box-shadow: 0 -8px 32px rgba(14, 165, 233, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0c4a6e;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: #64748b;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  line-height: 1;

  &:active {
    background: rgba(0, 0, 0, 0.06);
  }
}

.modal-body {
  margin-top: 4px;
}
</style>

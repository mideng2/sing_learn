<script setup lang="js">
import BottomSheetModal from '@/components/common/BottomSheetModal.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  fields: { type: Array, required: true },
});

const emit = defineEmits(['update:modelValue', 'update:fields']);

function close() {
  emit('update:modelValue', false);
}

function toggleField(i) {
  const list = props.fields.map((f, idx) =>
    idx === i ? { ...f, visible: !f.visible } : f
  );
  emit('update:fields', list);
}

let dragIdx = -1;

function onDragStart(i) {
  dragIdx = i;
}

function onDragOver(e, i) {
  e.preventDefault();
  if (dragIdx === -1 || dragIdx === i) return;
  const list = [...props.fields];
  const [moved] = list.splice(dragIdx, 1);
  list.splice(i, 0, moved);
  emit('update:fields', list);
  dragIdx = i;
}

function onDragEnd() {
  dragIdx = -1;
}

let touchDragIdx = -1;
let touchClone = null;
let touchListEl = null;

function onTouchStart(e, i) {
  touchDragIdx = i;
  const el = e.currentTarget;
  touchListEl = el.parentElement;
  touchClone = el.cloneNode(true);
  touchClone.classList.add('drag-ghost');
  const rect = el.getBoundingClientRect();
  touchClone.style.width = rect.width + 'px';
  touchClone.style.left = rect.left + 'px';
  touchClone.style.top = rect.top + 'px';
  document.body.appendChild(touchClone);
  el.style.opacity = '0.3';
}

function onTouchMove(e) {
  if (touchDragIdx === -1 || !touchClone || !touchListEl) return;
  e.preventDefault();
  const touch = e.touches[0];
  touchClone.style.top = touch.clientY - touchClone.offsetHeight / 2 + 'px';
  const items = Array.from(touchListEl.children);
  for (let i = 0; i < items.length; i++) {
    if (i === touchDragIdx) continue;
    const rect = items[i].getBoundingClientRect();
    if (touch.clientY > rect.top && touch.clientY < rect.bottom) {
      const list = [...props.fields];
      const [moved] = list.splice(touchDragIdx, 1);
      list.splice(i, 0, moved);
      emit('update:fields', list);
      touchDragIdx = i;
      break;
    }
  }
}

function onTouchEnd() {
  if (touchClone) {
    touchClone.remove();
    touchClone = null;
  }
  if (touchListEl) {
    Array.from(touchListEl.children).forEach((el) => (el.style.opacity = ''));
    touchListEl = null;
  }
  touchDragIdx = -1;
}
</script>

<template>
  <BottomSheetModal :model-value="modelValue" title="歌词显示设置" @update:model-value="close">
    <p class="modal-tip">选择要显示的内容，拖拽调整顺序</p>
    <ul class="field-list">
      <li
        v-for="(field, i) in fields"
        :key="field.key"
        class="field-item"
        draggable="true"
        @dragstart="onDragStart(i)"
        @dragover="(e) => onDragOver(e, i)"
        @dragend="onDragEnd"
        @touchstart.passive="onTouchStart($event, i)"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <span class="field-handle">⠿</span>
        <span class="field-label">{{ field.label }}</span>
        <button
          class="field-toggle"
          :class="{ on: field.visible }"
          @click="toggleField(i)"
        >
          <span class="toggle-knob" />
        </button>
      </li>
    </ul>
  </BottomSheetModal>
</template>

<style scoped lang="less">
.modal-tip {
  margin: 0 0 14px;
  font-size: 0.78rem;
  color: #64748b;
}

.field-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(14, 165, 233, 0.1);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.2s;

  &:active {
    box-shadow: 0 4px 16px rgba(14, 165, 233, 0.2);
  }
}

.field-handle {
  font-size: 1.1rem;
  color: #94a3b8;
  line-height: 1;
  flex-shrink: 0;
}

.field-label {
  flex: 1;
  font-size: 0.92rem;
  font-weight: 600;
  color: #0c4a6e;
}

.field-toggle {
  position: relative;
  width: 44px;
  height: 26px;
  border-radius: 13px;
  border: none;
  cursor: pointer;
  background: #cbd5e1;
  transition: background 0.25s;
  flex-shrink: 0;
  padding: 0;

  &.on {
    background: #38bdf8;

    .toggle-knob {
      transform: translateX(18px);
    }
  }
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.25s;
}

:global(.drag-ghost) {
  position: fixed;
  z-index: 9999;
  opacity: 0.85;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.25);
  border-radius: 14px;
}
</style>

<script setup lang="js">
import { computed } from "vue";
import { getIcon } from "@icons";

const props = defineProps({
  /** 图标名，对应 @/assets/icons 下文件名（不含 .svg），如 'player-play'、'nav-playlist' */
  name: { type: String, required: true },
  /** 可选尺寸，如 '24px'、'1em'，默认 1em */
  size: { type: String, default: "1em" },
});

const svgContent = computed(() => getIcon(props.name));
</script>

<template>
  <span class="icon" :style="{ width: size, height: size }" aria-hidden="true">
    <span v-if="svgContent" class="icon-svg" v-html="svgContent" />
  </span>
</template>

<style scoped lang="less">
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: inherit;

  .icon-svg {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(svg) {
      width: 100%;
      height: 100%;
      display: block;
      /* 不强制 fill/stroke，由各 SVG 源文件内的 currentColor 继承父级 color */
    }
  }
}
</style>

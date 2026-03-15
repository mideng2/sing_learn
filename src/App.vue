<script setup lang="js">
</script>

<template>
  <div id="app" class="app">
    <router-view />
  </div>
</template>

<style scoped lang="less">
.app {
  min-height: 100vh;
  min-height: 100dvh; /* 移动端动态视口，避开浏览器地址栏 */
  /* 与播放列表一致的渐变，避免刘海/状态栏区域露出白底 */
  background: linear-gradient(180deg, #e0f4ff 0%, #b8e8ff 30%, #7dd3fc 70%, #38bdf8 100%);
}
</style>

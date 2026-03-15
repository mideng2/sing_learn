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
}
</style>

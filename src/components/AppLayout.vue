<script setup lang="js">
import { RouterLink } from "vue-router";
import Icon from "@/components/common/Icon.vue";
</script>

<template>
  <div class="app-layout">
    <main class="main">
      <router-view />
    </main>
    <nav class="nav">
      <RouterLink to="/" class="nav-item" active-class="active">
        <span class="nav-icon-wrap">
          <Icon name="nav-playlist" size="22px" class="nav-icon" />
        </span>
        <span class="nav-text">播放列表</span>
      </RouterLink>
      <RouterLink to="/my-recordings" class="nav-item" active-class="active">
        <span class="nav-icon-wrap">
          <Icon name="nav-recordings" size="22px" class="nav-icon" />
        </span>
        <span class="nav-text">我的演唱</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped lang="less">
.app-layout {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top, 0);
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
  padding-bottom: calc(76px + env(safe-area-inset-bottom, 0));
  font-family: "Nunito", "PingFang SC", sans-serif;
  /* 与页面一致的渐变，刘海区域不再露出白底 */
  background: linear-gradient(180deg, #e0f4ff 0%, #b8e8ff 30%, #7dd3fc 70%, #38bdf8 100%);
}

.main {
  flex: 1;
  min-height: 0;
}

.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(76px + env(safe-area-inset-bottom, 0));
  padding: 0 24px calc(env(safe-area-inset-bottom, 0));
  padding-left: calc(24px + env(safe-area-inset-left, 0));
  padding-right: calc(24px + env(safe-area-inset-right, 0));
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;

  /* 毛玻璃 + 渐变底色 */
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.88) 0%, rgba(204, 238, 255, 0.92) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  /* 顶部有一条淡蓝色光边 */
  border-top: 1.5px solid rgba(125, 211, 252, 0.6);

  /* 整体往上一点点圆角，营造悬浮感 */
  // border-radius: 22px 22px 0 0;
  box-shadow:
    0 -2px 16px rgba(56, 189, 248, 0.15),
    0 -6px 32px rgba(14, 165, 233, 0.08);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 20px;
  text-decoration: none;
  color: #7ec8e3;
  border-radius: 18px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:active {
    transform: scale(0.94);
  }

  &.active {
    color: #0284c7;

    .nav-icon-wrap {
      background: rgba(56, 189, 248, 0.18);
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.25);
    }
  }
}

.nav-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-text {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}
</style>

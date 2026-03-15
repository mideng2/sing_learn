<script setup lang="js">
import oceanWave from '@/assets/icons/ocean-wave.svg'
import fishOcean1 from '@/assets/icons/fish-ocean-1.svg'
import fishOcean2 from '@/assets/icons/fish-ocean-2.svg'
import fishOcean3 from '@/assets/icons/fish-ocean-3.svg'
</script>

<template>
  <div class="ocean-floor" aria-hidden="true">
    <img class="ocean-wave" :src="oceanWave" alt="" />

    <!-- 小鱼 1：向右游 -->
    <img class="fish fish-1" :src="fishOcean1" alt="" />

    <!-- 小鱼 2：向左游 -->
    <img class="fish fish-2" :src="fishOcean2" alt="" />

    <!-- 小鱼 3：小的 -->
    <img class="fish fish-3" :src="fishOcean3" alt="" />

    <!-- 气泡 -->
    <span class="bubble bubble-1" />
    <span class="bubble bubble-2" />
    <span class="bubble bubble-3" />
  </div>
</template>

<style scoped lang="less">
.ocean-floor {
  position: relative;
  width: 100vw;
  height: 110px;
  overflow: hidden;
  pointer-events: none;
}

.ocean-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px;
  object-fit: fill;
}

.fish {
  position: absolute;
}

.fish-1 {
  width: 56px;
  left: 8%;
  bottom: 28px;
  animation: swim 8s ease-in-out infinite;
}

.fish-2 {
  width: 52px;
  right: 12%;
  bottom: 16px;
  animation: swim-left 10s ease-in-out infinite 2s;
  transform: scaleX(-1);
}

.fish-3 {
  width: 40px;
  left: 50%;
  bottom: 32px;
  animation: swim 7s ease-in-out infinite 1s;
}

@keyframes swim {
  0%, 100% { transform: translateY(0) translateX(0); }
  25%       { transform: translateY(-5px) translateX(4px); }
  50%       { transform: translateY(-2px) translateX(8px); }
  75%       { transform: translateY(-6px) translateX(4px); }
}

@keyframes swim-left {
  0%, 100% { transform: scaleX(-1) translateY(0) translateX(0); }
  25%       { transform: scaleX(-1) translateY(-5px) translateX(4px); }
  50%       { transform: scaleX(-1) translateY(-2px) translateX(8px); }
  75%       { transform: scaleX(-1) translateY(-6px) translateX(4px); }
}

.bubble {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(125, 211, 252, 0.6);
  background: rgba(255, 255, 255, 0.3);
  animation: float-up 5s ease-in infinite;
}

.bubble-1 { width: 10px; height: 10px; left: 20%; bottom: 10px; animation-delay: 0s; }
.bubble-2 { width: 7px;  height: 7px;  left: 60%; bottom: 6px;  animation-delay: 2s; }
.bubble-3 { width: 12px; height: 12px; left: 80%; bottom: 14px; animation-delay: 3.5s; }

@keyframes float-up {
  0%   { transform: translateY(0);     opacity: 0.8; }
  80%  {                               opacity: 0.4; }
  100% { transform: translateY(-60px); opacity: 0;   }
}
</style>

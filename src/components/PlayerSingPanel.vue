<script setup lang="js">
defineProps({
  statusText: { type: String, default: "" },
  errorMessage: { type: String, default: "" },
  engineType: { type: String, default: "" },
});
</script>

<template>
  <section class="sing-panel">
    <div class="panel-head">
      <span class="head-title">学唱</span>
      <span class="head-status">{{ statusText }}</span>
    </div>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    <p class="tip-text">
      学唱前请佩戴耳机，开始后你会在耳机中听到自己的声音。
    </p>
    <p class="tip-text tip-text-sub">
      录制会优先使用系统当前输入设备，连接有线耳机或蓝牙耳机时通常会采集耳机麦克风。
    </p>

    <p class="engine-tip">当前音频引擎：{{ engineType }}</p>
  </section>
</template>

<style scoped lang="less">
.sing-panel {
  margin: 0 16px 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(14, 165, 233, 0.24);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.86) 0%, rgba(240, 249, 255, 0.9) 100%);
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.12);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.head-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0369a1;
}

.head-status {
  font-size: 0.72rem;
  color: #0c4a6e;
}

.error-text {
  margin: 8px 0 0;
  font-size: 0.72rem;
  color: #b91c1c;
}

.tip-text {
  margin: 8px 0 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: #0c4a6e;
}

.tip-text-sub {
  margin-top: 4px;
  color: rgba(12, 74, 110, 0.75);
}

.engine-tip {
  margin: 10px 0 0;
  font-size: 0.64rem;
  color: rgba(3, 105, 161, 0.72);
}
</style>

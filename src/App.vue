<template>
  <div class="noise-overlay"></div>
  <router-view></router-view>
</template>

<script setup>
// No script needed for this static background setup
</script>

<style>
/* 引入 Google Fonts (如果环境允许，否则回退到系统字体) */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Noto+Sans+SC:wght@400;700;900&display=swap');

:root {
  --neon-green: #ccff00;
  --neon-pink: #ff00ff;
  --neon-cyan: #00ffff;
  --neon-purple: #bf00ff;
  --deep-bg: #0a0a0a;
  --card-bg: #1a1a1a;
  --border-color: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'JetBrains Mono', 'Noto Sans SC', monospace, sans-serif;
  background-color: var(--deep-bg);
  color: white;
  overflow-x: hidden; /* 防止装饰溢出导致横向滚动 */
  overflow-y: auto;   /* 允许垂直滚动 */
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* 移动端增加外边距 */
}

/* 噪点纹理背景 */
.noise-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh; /* 固定高度覆盖全屏 */
  pointer-events: none;
  z-index: 0;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--deep-bg);
}
::-webkit-scrollbar-thumb {
  background: var(--neon-purple);
  border: 2px solid var(--deep-bg);
}
</style>

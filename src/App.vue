<template>
  <div class="noise-overlay"></div>
  <router-view></router-view>
</template>

<script setup>
// No script needed for this static background setup
</script>

<style>
/* 引入 Google Fonts: 
   CNY: 马善政毛笔字体, 思源宋体
   Neo-Brutalism: JetBrains Mono, Noto Sans SC 
*/
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@400;700;900&family=Noto+Serif+SC:wght@400;600;700;900&display=swap');

:root {
  /* --- CNY Theme Variables --- */
  --cny-red: #C41E3A;        /* 中国红 */
  --cny-dark-red: #720e1e;   /*以此深红作为背景基调 */
  --cny-gold: #FFD700;       /* 金色 */
  --cny-light-gold: #FFF8D5; /* 浅金/米白 */
  --cny-black: #2c0e0e;      /* 深褐色代替纯黑 */
  --cny-cream: #FFFDF0;      /* 宣纸白 */
  --cny-accent-orange: #FF6B00;
  --cny-green: #2E7D32;      /* 玉石绿 */
  
  --primary-font: 'Noto Serif SC', serif;
  --title-font: 'Ma Shan Zheng', cursive;

  /* --- Original Neo-Brutalism Variables (Restored for Admin Panel) --- */
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
  font-family: var(--primary-font);
  background-color: var(--cny-dark-red);
  color: var(--cny-cream);
  overflow-x: hidden;
  
  /* 祥云纹理背景 */
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(255, 215, 0, 0.05) 0%, transparent 25%);
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

/* 噪点纹理改为一种纸质纹理或者是红色的微噪点 */
.noise-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' opacity='0.1'/%3E%3C/svg%3E");
}

/* 全局滚动条样式 - 金镶玉风格 */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--cny-dark-red);
}
::-webkit-scrollbar-thumb {
  background: var(--cny-gold);
  border-radius: 4px;
  border: 2px solid var(--cny-dark-red);
}
</style>

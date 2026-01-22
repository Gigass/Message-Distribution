<template>
  <div class="container full-width">
    <!-- 登录遮罩 -->
    <div v-if="!isAuthenticated" class="auth-overlay">
       <div class="auth-box">
          <h2>🔐 抽奖授权</h2>
          <input 
            type="password" 
            v-model="passwordInput" 
            placeholder="请输入管理员口令"
            @keypress.enter="handleLogin"
          >
          <button @click="handleLogin" :disabled="isChecking">
             {{ isChecking ? '验证中...' : '解锁系统' }}
          </button>
          <div v-if="loginError" class="error-msg">口令错误</div>
       </div>
    </div>

    <!-- 背景装饰 -->
    <!-- 背景装饰 - 国潮波普灯笼 -->
    <div class="decoration lantern-left">
      <div class="lantern-string"></div>
      <div class="lantern-body"><div class="lantern-text">春</div></div>
      <div class="lantern-tassel"></div>
    </div>
    <div class="decoration lantern-right">
      <div class="lantern-string"></div>
      <div class="lantern-body"><div class="lantern-text">福</div></div>
      <div class="lantern-tassel"></div>
    </div>

    <!-- 粒子特效容器 -->
    <canvas ref="fireworksCanvas" class="fireworks-canvas"></canvas>

    <!-- 主布局 -->
    <div class="lottery-layout">
      
      <!-- 左侧：奖品与设置 -->
      <div class="side-panel left">
        <div class="panel-card glass-red">
          <h2>🎊 奖品设置 🎊</h2>
          <div class="prize-select-area">
            <div 
              v-for="prize in activePrizes" 
              :key="prize.id"
              class="prize-option"
              :class="{ active: selectedPrizeId === prize.id }"
              @click="selectPrize(prize)"
            >
              <div class="option-row">
                <span class="badge" :class="prize.level">{{ prize.levelLabel }}</span>
                <span class="name">{{ prize.name }}</span>
              </div>
              <div class="count-badge">余: {{ prize.remaining }}</div>
            </div>
            
            <div v-if="activePrizes.length === 0" class="empty-msg">
              暂无可用奖品，请联系管理员配置
            </div>

            <div 
              class="prize-option random" 
              :class="{ active: selectedPrizeId === null && activePrizes.length > 0 }"
              @click="selectRandomPrize"
              v-if="activePrizes.length > 0"
            >
              <div class="option-row">
                <span class="badge random-badge">❓</span>
                <span class="name">随机抽取幸运奖</span>
              </div>
            </div>
          </div>

          <div class="draw-settings" v-if="selectedPrize || selectedPrizeId === null">
             <label>本轮抽取人数:</label>
             <div class="count-selector">
                <button @click="drawCount = Math.max(1, drawCount - 1)">-</button>
                <input type="number" v-model="drawCount" min="1" max="10">
                <button @click="drawCount = Math.min(10, drawCount + 1)">+</button>
             </div>
          </div>
        </div>
      </div>

      <!-- 中间：抽奖舞台 -->
      <div class="main-stage">
        <div class="panel-card center-panel">
          <div class="title-area">
            <div class="year-tag">2026 Horse Year</div>
            <h1>幸运大抽奖</h1>
          </div>

          <!-- 滚动显示区域 -->
          <div class="rolling-display">
            <div class="rolling-content" :class="{ 'is-rolling': isRolling }">
              <div v-if="!currentResult && !isRolling" class="placeholder">
                {{ selectedPrize ? `准备抽取: ${selectedPrize.name}` : '谁是下一个幸运儿？' }}
              </div>
              <div v-else-if="isRolling" class="rolling-text">
                {{ rollingName }}
              </div>
              <div v-else class="result-display">
                <div v-for="winner in currentResult" :key="winner.id" class="winner-card-new">
                   <div class="winner-avatar">{{ winner.winnerName[0] }}</div>
                   <div class="winner-info">
                     <div class="w-name">{{ winner.winnerName }}</div>
                     <div class="w-id">{{ winner.winnerId }} | 桌号: {{ winner.winnerSeat }}</div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            class="draw-btn" 
            :disabled="isRolling || activePrizes.length === 0"
            @click="startDraw"
          >
            <div class="btn-inner">
              {{ isRolling ? '抽奖中...' : '开始抽奖' }}
            </div>
          </button>
        </div>
      </div>

      <!-- 右侧：中奖名单 -->
      <div class="side-panel right">
        <div class="panel-card glass-gold">
          <h2>🏆 幸运榜单 🏆</h2>
          <div class="winners-list">
             <div v-for="record in recentWinners" :key="record.id" class="winner-item">
               <div class="rank-icon" :class="record.prizeLevel">
                 {{ getLevelIcon(record.prizeLevel) }}
               </div>
               <div class="record-detail">
                 <div class="r-top">
                   <span class="r-name">{{ record.winnerName }}</span>
                   <span class="r-prize">{{ record.prizeName }}</span>
                 </div>
                 <div class="r-bottom">
                   {{ record.winnerId }} (桌号: {{ record.winnerSeat }})
                 </div>
               </div>
             </div>
             <div v-if="recentWinners.length === 0" class="empty-msg dark">
                虚位以待...
             </div>
          </div>
        </div>
        
        <div class="admin-link">
          <router-link to="/admin">后台管理</router-link>
        </div>
      </div>

    </div>

    <!-- 弹窗 -->
    <div v-if="showResultModal" class="modal-overlay show">
      <div class="modal result-modal">
        <div class="confetti-bg"></div>
        <h2>🎉 恭喜中奖 🎉</h2>
        <div class="modal-prize-name">{{ currentResult?.[0]?.prizeName }}</div>
        
        <div class="modal-winners-grid">
           <div v-for="w in currentResult" :key="w.id" class="modal-winner">
             <div class="mw-avatar">{{ w.winnerName[0] }}</div>
             <div class="mw-name">{{ w.winnerName }}</div>
             <div class="mw-seat">桌号: {{ w.winnerSeat }}</div>
           </div>
        </div>

        <button class="modal-close" @click="closeModal">收入囊中</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import confetti from 'canvas-confetti'

// State
const prizes = ref([])
const winners = ref([])
const candidates = ref([]) // Real data
const isRolling = ref(false)
const rollingName = ref('***')
const selectedPrizeId = ref(null)
const drawCount = ref(1)
const currentResult = ref(null)
const showResultModal = ref(false)

// Auth
const isAuthenticated = ref(false)
const passwordInput = ref('')
const verifiedToken = ref('') // Store token
const isChecking = ref(false)
const loginError = ref(false)

let rollingTimer = null

// Computed
const activePrizes = computed(() => {
  return prizes.value
    .filter(p => p.remaining > 0)
    .sort((a,b) => {
       const levels = ['special', 'first', 'second', 'third', 'participation']
       return levels.indexOf(a.level) - levels.indexOf(b.level)
    })
})

const selectedPrize = computed(() => {
  if (!selectedPrizeId.value) return null
  return activePrizes.value.find(p => p.id === selectedPrizeId.value)
})

const recentWinners = computed(() => {
   return winners.value.slice(0, 20) // Show top 20
})

// Lifecycle
onMounted(() => {
  // Initial fetch for public data
  fetchData()
})

const handleLogin = async () => {
  isChecking.value = true
  loginError.value = false
  try {
    const res = await fetch('/api/check-auth', {
      method: 'POST',
      headers: { 'x-auth-token': passwordInput.value }
    })
    const json = await res.json()
    if (json.success) {
      isAuthenticated.value = true
      verifiedToken.value = passwordInput.value
      fetchData() // Fetch sensitive/fresh data
    } else {
      loginError.value = true
    }
  } catch (e) {
    loginError.value = true
  } finally {
    isChecking.value = false
  }
}

// Logic
const fetchData = async () => {
   try {
     const [pRes, wRes, dRes] = await Promise.all([
       fetch('/api/prizes'),
       fetch('/api/lottery/winners'),
       fetch('/api/data') // Get real candidates
     ])
     const pData = await pRes.json()
     const wData = await wRes.json()
     const dData = await dRes.json()
     
     if(pData.success) prizes.value = pData.data
     if(wData.success) winners.value = wData.data
     if(dData.success) candidates.value = dData.data
   } catch(e) {
     console.error(e)
   }
}

const selectPrize = (prize) => {
  selectedPrizeId.value = prize.id
  // Reset draw count if it exceeds remaining
  if (drawCount.value > prize.remaining) {
    drawCount.value = 1
  }
}

const selectRandomPrize = () => {
  selectedPrizeId.value = null
  drawCount.value = 1
}

const getLevelIcon = (level) => {
  const map = { special:'👑', first:'🥇', second:'🥈', third:'🥉', participation:'🧧' }
  return map[level] || '🎁'
}

// Draw Logic with Deceleration
const startDraw = async () => {
   if (isRolling.value) return
   
   // Pre-validation
   if (selectedPrize.value && selectedPrize.value.remaining < drawCount.value) {
     alert(`该奖品仅剩 ${selectedPrize.value.remaining} 个，无法抽取 ${drawCount.value} 人`)
     drawCount.value = selectedPrize.value.remaining
     return
   }

   // 1. Start Fast Rolling (Phase 1)
   isRolling.value = true
   currentResult.value = null
   
   // Use real candidates or fallback
   const namePool = candidates.value.length > 0 ? candidates.value.map(c => c.name) : ['张三', '李四', '王五']
   
   rollingTimer = setInterval(() => {
      rollingName.value = namePool[Math.floor(Math.random() * namePool.length)]
   }, 50)

   // 2. Call API
   try {
     const res = await fetch('/api/lottery/draw', {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'x-auth-token': verifiedToken.value
       },
       body: JSON.stringify({
         prizeId: selectedPrizeId.value, 
         count: drawCount.value
       })
     })
     
     const result = await res.json()
     
     if (result.success) {
       // Stop the fast interval
       clearInterval(rollingTimer)
       
       // Start Deceleration (Phase 2)
       // We want ~5 seconds of slowing down. 
       // Start at 50ms, multiply by 1.1 each step.
       // 50 * (1.1^n - 1) / 0.1 = 5000 => 1.1^n ≈ 11 => n ≈ 25 steps
       
       const winnerName = result.data[0].winnerName // Land on the first winner
       let step = 0
       const totalSteps = 25
       let currentDelay = 50

       const runDecelerationStep = () => {
         step++
         if (step < totalSteps) {
           // Show random name
           rollingName.value = namePool[Math.floor(Math.random() * namePool.length)]
           // Increase delay
           currentDelay = currentDelay * 1.1
           setTimeout(runDecelerationStep, currentDelay)
         } else {
           // Final Step: Show Winner
           rollingName.value = winnerName
           
           // Slight pause before showing modal
           setTimeout(() => {
             isRolling.value = false
             currentResult.value = result.data
             showResultModal.value = true
             fetchData() 
             fireFireworks() 
           }, 800)
         }
       }

       // Kick off deceleration
       runDecelerationStep()

     } else {
       clearInterval(rollingTimer)
       isRolling.value = false
       alert(result.message)
     }

   } catch (e) {
     clearInterval(rollingTimer)
     isRolling.value = false
     alert('抽奖失败，请检查网络')
   }
}

const closeModal = () => {
  showResultModal.value = false
}

const fireFireworks = () => {
  var duration = 3 * 1000;
  var animationEnd = Date.now() + duration;
  var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  var interval = setInterval(function() {
    var timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    var particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
  }, 250);
}

</script>

<style scoped>
/* 
  CNY POP ART THEME (国潮波普)
  - Base: Chinese Red (#E60012) & Gold (#FFD700)
  - Style: Thick Outlines (3px-4px Black), Hard Shadows, Halftone Texture
*/
:root {
  --cny-red: #E60012;
  --cny-gold: #FFD700;
  --pop-shadow: #000000;
  --pop-cyan: #00F0FF; /* Trendy contrast color */
  --pop-white: #FFFDF0; /* Warm white */
}

/* Base Container with Halftone Background */
.container.full-width {
  position: absolute;
  top: 0; left: 0;
  width: 100vw;
  min-height: 100vh;
  margin: 0; padding: 0;
  background-color: var(--cny-red);
  /* Halftone Dot Pattern Overlay */
  background-image: 
    radial-gradient(rgba(100, 0, 0, 0.3) 15%, transparent 16%),
    radial-gradient(rgba(100, 0, 0, 0.3) 15%, transparent 16%);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
}

/* Layout Grid */
.lottery-layout {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  grid-template-rows: 100%;
  width: 100vw;
  height: 100vh;
  padding: 15px 20px;
  box-sizing: border-box;
  gap: 20px;
  position: relative;
  z-index: 10;
}

.side-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.side-panel.left { order: 1; }
.side-panel.right { order: 3; }

.main-stage {
  order: 2; /* Center in flex/grid */
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  margin: 0 20px; /* Add margin for better separation */
}
.panel-card.center-panel {
  align-items: center;
  justify-content: flex-start;
  padding-top: 15px;
  background: rgba(255, 253, 240, 0.85); /* Slightly transparent to show some texture, or opaque */
}

/* 
  COMPONENT STYLES: Pop Art Boxes
*/
.panel-card {
  flex: 1;
  background: var(--pop-white);
  border: 4px solid var(--pop-shadow);
  box-shadow: 8px 8px 0px var(--pop-shadow); /* Hard Shadow */
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
/* Decorative accent for panels */
.panel-card::after {
  content: '';
  position: absolute;
  top: 4px; left: 4px;
  right: 4px; bottom: 4px;
  border: 2px dashed rgba(0,0,0,0.1);
  border: 2px dashed rgba(0,0,0,0.1);
  border-radius: 8px;
  pointer-events: none;
}

/* Distinct Panel Colors */
.glass-red {
  background: #FFF0F0; /* Light Red tint */
  border-color: var(--cny-red);
}
.glass-gold {
  background: #FFFFF0; /* Light Gold/Yellow tint */
  border-color: #B8860B;
}

h2 {
  text-align: center;
  color: var(--cny-red);
  font-weight: 900;
  font-size: 28px;
  margin-bottom: 20px;
  text-shadow: 1px 1px 0px var(--cny-gold);
  background: var(--cny-gold);
  border: 3px solid black;
  padding: 8px 20px;
  border-radius: 50px;
  display: inline-block;
  align-self: center;
  box-shadow: 3px 3px 0px black;
  box-shadow: 3px 3px 0px black;
}

/* Lanterns (Restored & Pop-ified) - 叠加显示不占空间 */
.decoration {
  position: fixed;
  top: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: swing 3s ease-in-out infinite alternate;
  pointer-events: none;
}
.lantern-left { left: 60px; }
.lantern-right { right: 60px; }
@keyframes swing {
  0% { transform: rotate(5deg); }
  100% { transform: rotate(-5deg); }
}
.lantern-string { width: 4px; height: 60px; background: black; }
.lantern-body {
  width: 90px; height: 80px;
  background: var(--cny-red);
  border-radius: 20px;
  border: 4px solid black; /* Pop Outline */
  box-shadow: 5px 5px 0px rgba(0,0,0,0.3);
  display: flex; justify-content: center; align-items: center;
  position: relative;
}
.lantern-body::before { /* Highlight for volume */
  content: ''; position: absolute; top: 10px; left: 10px; width: 20px; height: 20px;
  background: rgba(255,255,255,0.4); border-radius: 50%;
}
.lantern-text { 
  color: var(--cny-gold); font-size: 36px; font-weight: 900; 
  text-shadow: 2px 2px 0px black; font-family: 'Ma Shan Zheng', cursive, serif;
}
.lantern-tassel { width: 8px; height: 50px; background: var(--cny-gold); border: 2px solid black; margin-top: -2px; }

/* Prize Selector */
.prize-select-area {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
}
.prize-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 15px;
  background: white;
  border: 3px solid black;
  box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s;
}
.prize-option:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px var(--pop-cyan);
  border-color: var(--cny-red);
}
.prize-option.active {
  background: var(--cny-red);
  color: white;
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px black;
}
.prize-option.active .name { color: var(--cny-gold); }
.prize-option.active .count-badge { color: white; }

.option-row { display: flex; align-items: center; gap: 8px; }
.badge {
  font-size: 12px; padding: 2px 6px; border: 2px solid black; border-radius: 4px; color: black; font-weight: bold; background: white;
}
.badge.special { background: #FFD700; }

.name { color: black; font-weight: 900; font-size: 16px; }
.count-badge { color: #555; font-weight: bold; font-family: monospace; }

.draw-settings {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 3px dashed black;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: black;
  font-weight: bold;
}
.count-selector button {
  width: 32px; height: 32px; border: 2px solid black; background: var(--cny-gold); 
  font-weight: 900; cursor: pointer; border-radius: 6px; box-shadow: 2px 2px 0px black;
}
.count-selector button:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px black; }
.count-selector input {
  width: 50px; text-align: center; border: 2px solid black; background: white; 
  color: black; padding: 5px; font-weight: 900; border-radius: 6px; margin: 0 5px;
}

/* Main Stage */
.title-area { 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px; 
  position: relative; 
}
.year-tag {
  display: inline-block; background: black; color: var(--cny-gold);
  padding: 4px 16px; border-radius: 50px; font-weight: 900; font-size: 14px; margin-bottom: 6px;
  border: 2px solid var(--cny-gold);
}
.title-area h1 {
  display: inline-block;
  font-size: 60px; 
  color: var(--cny-red); 
  background: var(--cny-gold);
  margin: 0;
  padding: 4px 30px;
  border: 4px solid black;
  border-radius: 60px;
  font-weight: 900;
  text-shadow: none;
  box-shadow: 8px 8px 0px black;
  letter-spacing: 4px;
  font-family: 'Ma Shan Zheng', cursive, serif;
}

.rolling-display {
  width: 100%;
  max-width: 800px;
  height: 450px;
  background: var(--pop-white);
  border: 6px solid black;
  border-radius: 20px;
  box-shadow: 12px 12px 0px var(--cny-red);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.placeholder { 
  color: var(--cny-red); font-size: 32px; font-weight: bold; 
}
.rolling-text { 
  font-size: 90px; font-weight: 900; color: black; 
  text-shadow: 4px 4px 0px var(--pop-cyan); 
}
.result-display { 
  display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 25px; width: 100%; padding: 30px; overflow-y: auto; max-height: 100%; 
}
.winner-card-new {
  background: white; border: 4px solid black; padding: 18px 24px; box-shadow: 6px 6px 0px rgba(0,0,0,0.3);
  border-radius: 12px; display: flex; align-items: center; gap: 15px; min-width: 260px;
}
.winner-avatar {
  background: var(--cny-red); color: white; width: 60px; height: 60px; border: 3px solid black;
  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 26px;
}
.w-name { font-weight: 900; font-size: 24px; color: black; }
.w-id { font-size: 14px; color: #666; font-weight: 600; }

/* Pop Art Button */
.draw-btn {
  background: var(--cny-gold);
  border: 4px solid black;
  box-shadow: 8px 8px 0px black;
  cursor: pointer; transition: all 0.1s;
  padding: 0;
  border-radius: 50px;
  overflow: visible;
}
.btn-inner {
  background: transparent;
  color: var(--cny-red);
  font-size: 40px;
  font-weight: 900;
  padding: 20px 80px;
  text-shadow: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.draw-btn:active:not(:disabled) {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0px black;
}
.draw-btn:disabled {
  background: #ccc; border-color: #666; color: #888; cursor: not-allowed;
}

/* Winners List */
.winners-list {
  flex: 1; overflow-y: auto;
}
.winner-item {
  display: flex; gap: 10px; padding: 10px; 
  border-bottom: 2px dashed rgba(0,0,0,0.1);
  margin-bottom: 5px;
}
.rank-icon { font-size: 20px; }
.r-top { color: black; font-weight: 900; }
.r-bottom { font-size: 12px; color: #555; }
.empty-msg { color: #888; font-style: italic; text-align: center; padding: 20px; }

/* Modal - Pop Art Dialog */
.modal-overlay.show {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
}
.result-modal {
  background: white;
  width: 90%; max-width: 600px;
  border: 6px solid black;
  box-shadow: 20px 20px 0px var(--cny-gold);
  border-radius: 30px;
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); }
}

.result-modal h2 {
  font-size: 56px; color: var(--cny-red); 
  text-shadow: 3px 3px 0px var(--cny-gold);
  background: transparent; border: none; transform: none; width: auto;
  box-shadow: none;
}
.modal-prize-name {
  font-size: 32px; background: var(--cny-gold); border: 4px solid black;
  display: inline-block; padding: 10px 30px;
  box-shadow: 6px 6px 0px black; margin-bottom: 40px; color: var(--cny-red); border-radius: 10px;
}

.modal-winner {
  width: 120px; background: white; border: 3px solid black; padding: 10px;
  box-shadow: 6px 6px 0px rgba(0,0,0,0.1); border-radius: 12px;
}
.mw-avatar {
  background: var(--cny-red); border: 2px solid black; width: 60px; height: 60px; line-height: 56px;
  border-radius: 50%; margin-bottom: 10px; font-weight: bold; color: white;
}
.mw-name { font-weight: 900; color: black; }

.modal-close {
  background: black; color: white; border: none; padding: 15px 50px;
  font-size: 24px; font-weight: 900; cursor: pointer;
  border: 4px solid white; outline: 4px solid black;
  box-shadow: 8px 8px 0px var(--cny-red);
  margin-top: 20px;
  border-radius: 50px;
  transition: transform 0.1s;
}
.modal-close:hover {
  transform: scale(1.05);
}
.modal-close:active {
  transform: translate(2px, 2px);
  box-shadow: 4px 4px 0px var(--cny-red);
}

/* Auth Overlay */
/* Auth Overlay - FIXED: Removed from flow to prevent squeezing */
.auth-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
}

.auth-box {
  background: white; border: 6px solid black; box-shadow: 15px 15px 0px var(--cny-red);
  width: 350px; border-radius: 20px;
  padding: 20px;
  text-align: center;
}
.auth-box h2 {
  background: var(--cny-red); color: white; border: 3px solid black;
  width: 100%; border-radius: 10px; box-shadow: 4px 4px 0px black;
  margin-top: 0;
  box-sizing: border-box;
}
.auth-box input {
  background: #f9f9f9; border: 3px solid black; font-weight: bold; border-radius: 8px;
  width: 100%;
  padding: 10px;
  margin: 15px 0;
  box-sizing: border-box;
  font-size: 18px;
}
.auth-box button {
  background: var(--cny-gold); border: 3px solid black; box-shadow: 4px 4px 0px black; color: black; border-radius: 8px;
  width: 100%;
  padding: 12px;
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
}
.auth-box button:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px black;
}
.error-msg {
  color: red; font-weight: bold; margin-top: 10px;
}

/* Responsive */
@media (max-width: 900px) {
  .lottery-layout {
    display: flex;
    flex-direction: column;
    height: auto;
    overflow-y: auto;
    padding-top: 20px;
  }
  .side-panel { width: 100%; order: 2; margin-bottom: 20px; }
  .main-stage { width: 100%; order: 1; margin: 20px 0; }
  .container.full-width { height: auto; min-height: 100vh; overflow-y: auto; }
}
</style>


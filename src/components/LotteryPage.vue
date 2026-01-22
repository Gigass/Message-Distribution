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
        <div class="title-area">
          <div class="year-tag">2025 Snake Year</div>
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

// Mock names for rolling
const mockNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二']
let rollingInterval = null

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
  // Wait for auth to fetch sensitive data if we wanted to secure read too, 
  // but currently read is public in server.js, so we can fetch prizes/winners immediately if we want.
  // However, let's keep it simple: Fetch data immediately for display, but block Draw.
  // A better UX for "Screen" is to login first.
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
      fetchData() // Fetch after login
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
     const [pRes, wRes] = await Promise.all([
       fetch('/api/prizes'), // Read is public
       fetch('/api/lottery/winners') // Read is public
     ])
     const pData = await pRes.json()
     const wData = await wRes.json()
     
     if(pData.success) prizes.value = pData.data
     if(wData.success) winners.value = wData.data
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

const startDraw = async () => {
   if (isRolling.value) return
   
   // Pre-validation
   if (selectedPrize.value && selectedPrize.value.remaining < drawCount.value) {
     alert(`该奖品仅剩 ${selectedPrize.value.remaining} 个，无法抽取 ${drawCount.value} 人`)
     drawCount.value = selectedPrize.value.remaining
     return
   }

   // 1. Start Rolling Animation
   isRolling.value = true
   currentResult.value = null
   let rollIdx = 0
   rollingInterval = setInterval(() => {
      rollingName.value = mockNames[rollIdx % mockNames.length]
      rollIdx++
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
         prizeId: selectedPrizeId.value, // null for random
         count: drawCount.value
       })
     })
     
     const result = await res.json()
     
     // Artificial delay for tension
     setTimeout(() => {
       clearInterval(rollingInterval)
       isRolling.value = false
       
       if (result.success) {
         currentResult.value = result.data
         showResultModal.value = true
         fetchData() // Refresh data
         fireFireworks() // 🎉 FIREWORKS!
       } else {
         alert(result.message)
       }
     }, 2000)

   } catch (e) {
     clearInterval(rollingInterval)
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
.container.full-width {
  position: absolute; /* Override App.vue flex centering */
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background: var(--cny-dark-red);
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(255, 215, 0, 0.1) 0%, transparent 25%);
  overflow: hidden;
  display: block; /* Disable flex centering from parent inheritance if any */
}

/* Lanterns Reuse */
.decoration {
  position: absolute;
  top: -20px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: swing 3s ease-in-out infinite alternate;
}
.lantern-left { left: 40px; }
.lantern-right { right: 40px; }
@keyframes swing {
  0% { transform: rotate(5deg); }
  100% { transform: rotate(-5deg); }
}
.lantern-string { width: 2px; height: 60px; background: var(--cny-gold); }
.lantern-body {
  width: 80px; height: 70px;
  background: #f00; border-radius: 20px;
  border: 2px solid var(--cny-gold);
  box-shadow: 0 0 20px rgba(255,0,0,0.8);
  display: flex; justify-content: center; align-items: center;
}
.lantern-text { color: var(--cny-gold); font-size: 32px; font-family: var(--title-font); }
.lantern-tassel { width: 6px; height: 40px; background: var(--cny-gold); }

/* Layout */
.lottery-layout {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  grid-template-rows: 100%;
  width: 100vw;
  height: 100vh;
  padding: 20px;
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
  order: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-width: 0;
}

/* Panels */
.panel-card {
  flex: 1;
  border-radius: 20px;
  padding: 20px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.glass-red {
  background: rgba(100, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}
.glass-gold {
  background: rgba(44, 14, 14, 0.6);
  backdrop-filter: blur(10px);
}

h2 {
  text-align: center;
  color: var(--cny-gold);
  font-family: var(--title-font);
  font-size: 24px;
  margin-bottom: 20px;
  text-shadow: 1px 1px 2px black;
}

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
  margin-bottom: 10px;
  background: rgba(0,0,0,0.3);
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.prize-option:hover { background: rgba(255, 215, 0, 0.1); }
.prize-option.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: var(--cny-gold);
  transform: scale(1.02);
}
.option-row { display: flex; align-items: center; gap: 8px; }
.badge {
  font-size: 10px; padding: 2px 4px; border-radius: 4px; color: white;
}
.badge.special { background: #ff0055; }
.badge.first { background: #bf00ff; }
.badge.second { background: #00ffff; color: black; }
.badge.third { background: #ccff00; color: black; }
.badge.participation { background: #555; }
.badge.random-badge { background: linear-gradient(45deg, #f00, #ff0); }

.name { color: white; font-weight: bold; font-family: 'Noto Sans SC'; }
.count-badge { color: #aaa; font-size: 12px; }

.draw-settings {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #ddd;
}
.count-selector { display: flex; align-items: center; gap: 5px; }
.count-selector button {
  width: 30px; height: 30px; border: none; background: var(--cny-gold); font-weight: bold; cursor: pointer; border-radius: 4px;
}
.count-selector input {
  width: 50px; text-align: center; border: none; background: rgba(0,0,0,0.5); color: white; padding: 5px; font-weight: bold;
}

/* Main Stage */
/* Main Stage */
.title-area { text-align: center; margin-bottom: 60px; }
.year-tag {
  display: inline-block; background: var(--cny-gold); color: var(--cny-red);
  padding: 4px 15px; border-radius: 20px; font-weight: 900; font-size: 14px; margin-bottom: 20px;
}
.title-area h1 {
  font-size: 80px; color: var(--cny-gold); margin: 0;
  text-shadow: 0 0 30px rgba(255, 100, 0, 0.8);
  font-weight: 900;
  letter-spacing: 5px;
}

.rolling-display {
  width: 100%;
  max-width: 800px;
  height: 300px;
  background: rgba(0,0,0,0.5);
  border: 4px solid var(--cny-gold);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 50px rgba(255, 215, 0, 0.2);
  margin-bottom: 60px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
}

.placeholder { color: rgba(255,255,255,0.6); font-size: 32px; letter-spacing: 2px; }
.rolling-text { font-size: 80px; font-weight: 900; color: white; font-family: 'JetBrains Mono'; text-shadow: 0 0 20px rgba(255,255,255,0.8); }
.result-display { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; width: 100%; padding: 20px; }

.draw-btn {
  background: transparent; border: none; cursor: pointer; transition: transform 0.1s;
  position: relative; z-index: 20;
}
.btn-inner {
  background: linear-gradient(to bottom, #ffd700, #ff8c00);
  color: #8b0000;
  font-size: 40px;
  font-weight: 900;
  font-family: var(--title-font);
  padding: 25px 80px;
  border-radius: 60px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255, 215, 0, 0.6) inset;
  border: 4px solid white;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
}
.draw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.draw-btn:active:not(:disabled) { transform: scale(0.95); }

/* Winners List */
.winners-list {
  flex: 1; overflow-y: auto;
}
.winner-item {
  display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);
  align-items: center;
}
.rank-icon { font-size: 24px; }
.record-detail { flex: 1; }
.r-top { display: flex; justify-content: space-between; color: var(--cny-gold); font-weight: bold; margin-bottom: 4px; }
.r-bottom { font-size: 12px; color: #aaa; }
.r-name { font-size: 16px; }

/* Modal */
.modal-overlay.show {
  position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100;
  display: flex; justify-content: center; align-items: center;
}
.result-modal {
  background: var(--cny-cream);
  width: 90%; max-width: 600px;
  text-align: center;
  padding: 40px;
  border-radius: 20px;
  border: 8px solid var(--cny-red);
  position: relative;
  overflow: hidden;
  animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.confetti-bg {
  position: absolute; inset: 0; background-image: radial-gradient(#ffd700 20%, transparent 20%);
  background-size: 20px 20px; opacity: 0.1;
}

.result-modal h2 { color: var(--cny-red); font-size: 48px; margin-bottom: 10px; }
.modal-prize-name { font-size: 24px; color: #555; margin-bottom: 30px; font-weight: bold; }

.modal-winners-grid {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-bottom: 40px;
}
.modal-winner {
  width: 120px;
}
.mw-avatar {
  width: 80px; height: 80px; background: var(--cny-red); color: white;
  border-radius: 50%; font-size: 40px; line-height: 80px; margin: 0 auto 10px;
  border: 4px solid var(--cny-gold);
}
.mw-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 5px; }
.mw-seat { font-size: 14px; color: #888; }

.modal-close {
  background: var(--cny-red); color: white; border: none; padding: 15px 40px;
  font-size: 20px; border-radius: 50px; cursor: pointer; font-weight: bold;
}

.admin-link {
  margin-top: 10px; text-align: center;
}
.admin-link a { color: rgba(255,255,255,0.3); text-decoration: none; font-size: 12px; }
.admin-link a:hover { color: white; }

.admin-link a:hover { color: white; }

/* Auth Overlay */
.auth-overlay {
  position: fixed; inset: 0; background: #000; z-index: 9999;
  display: flex; justify-content: center; align-items: center;
}
.auth-box {
  background: var(--cny-red); padding: 40px; border-radius: 20px; border: 4px solid var(--cny-gold);
  text-align: center; width: 300px;
}
.auth-box h2 {
  color: var(--cny-gold); margin-bottom: 20px; font-size: 24px;
}
.auth-box input {
  width: 100%; padding: 10px; margin-bottom: 20px; border: none; font-size: 16px;
  background: rgba(255,255,255,0.9); color: black;
}
.auth-box button {
  width: 100%; padding: 12px; background: var(--cny-gold); color: var(--cny-red);
  border: none; font-weight: bold; font-size: 18px; cursor: pointer;
  transition: transform 0.1s;
}
.auth-box button:active { transform: scale(0.95); }
.error-msg { color: #fff; margin-top: 10px; font-weight: bold; background: rgba(0,0,0,0.2); padding: 5px; }

/* Responsive */
/* Responsive */
@media (max-width: 900px) {
  .lottery-layout {
    display: flex;
    flex-direction: column;
    height: auto;
    overflow-y: auto;
    padding-top: 80px; /* Space for lanterns */
  }
  .side-panel { 
    width: 100%; 
    max-width: 100%; 
    flex: none; 
    height: auto;
    order: 2; 
  }
  .main-stage { 
    width: 100%;
    order: 1; 
    margin: 40px 0; 
    flex: none;
    height: auto;
  }
  .container.full-width { 
    height: auto; 
    min-height: 100vh; 
    overflow-y: auto; 
    position: relative;
  }
}
</style>

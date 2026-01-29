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

    <!-- Background Decoration Removed (Moved to Main Stage) -->

    <!-- 粒子特效容器 -->
    <!-- 粒子特效容器: Removed -->

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
        <div class="title-section">
          <div class="decoration lantern-inline">
             <div class="lantern-string"></div>
             <div class="lantern-body"><div class="lantern-text">春</div></div>
             <div class="lantern-tassel"></div>
          </div>
          <div class="main-title">幸运大抽奖</div>
          <div class="decoration lantern-inline">
             <div class="lantern-string"></div>
             <div class="lantern-body"><div class="lantern-text">福</div></div>
             <div class="lantern-tassel"></div>
          </div>
        </div>
        <div class="slot-machine-wrapper">
          <!-- The Machine Body -->
          <div class="slot-machine-body">
            
            <!-- Machine Header/Logo -->
            <div class="machine-header-plate">
              <div class="jackpot-light left"></div>
              <div class="machine-title">
                 <span class="title-text">LUCKY • SLOT</span>
              </div>
              <div class="jackpot-light right"></div>
            </div>

            <!-- The Main Display Window -->
            <div class="machine-display-frame">
              <div class="glass-reflection"></div>
              <div class="rolling-display">
                <div class="rolling-content" :class="{ 'is-rolling': isRolling }">
                  <div v-if="!currentResult && !isRolling" class="placeholder">
                    <template v-if="selectedPrize">
                      <div class="placeholder-title">
                        {{ selectedPrize.levelLabel || getLevelLabel(selectedPrize.level) }}
                      </div>
                      <div class="placeholder-sub">奖品：{{ selectedPrize.name }}</div>
                    </template>
                    <template v-else>
                      <div class="placeholder-title">准备好了吗？！</div>
                    </template>
                  </div>
                  
                  <!-- Real Scroll Effect -->
                  <div v-else-if="isRolling" class="reel-viewport">
                     <div class="reel-strip" :style="reelStyle">
                        <div v-for="(name, idx) in reelCandidates" :key="idx" class="reel-cell">
                           {{ name }}
                        </div>
                     </div>
                  </div>

                  <div v-else class="result-display">
                    <div class="result-banner">
                      <span class="banner-label">奖品</span>
                      <span class="banner-name">{{ currentResult?.[0]?.prizeName }}</span>
                    </div>
                    <!-- Single Winner View -->
                    <div v-if="currentResult?.length === 1" class="winner-single">
                      <div class="winner-single-name">{{ currentResult[0].winnerName }}</div>
                      <div class="winner-single-seat" v-if="hasSeatInfo">桌号: {{ currentResult[0].winnerSeat }}</div>
                    </div>
                    <!-- Multi Winner View -->
                    <div v-else class="winner-grid">
                      <div v-for="winner in currentResult" :key="winner.id" class="winner-tile">
                        <div class="winner-tile-name">{{ winner.winnerName }}</div>
                        <div class="winner-tile-seat" v-if="hasSeatInfo">桌号: {{ winner.winnerSeat }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Machine Controls Panel -->
            <div class="machine-controls-plate">
               <div class="coin-slot">INSERT COIN</div>
               <button 
                 class="spin-button"
                 :disabled="isRolling || isLeverPulled || activePrizes.length === 0"
                 @click="triggerLeverAction"
               >
                 开始
               </button>
               <div class="status-lights">
                 <div class="light" :class="{ on: !isRolling }">READY</div>
                 <div class="light" :class="{ on: isRolling }">RUN</div>
               </div>
            </div>
          </div>

          <!-- The Interactive Lever -->
          <div class="lever-group">
             <div class="lever-base"></div>
             <div class="lever-shaft" :class="{ 'pulled': isLeverPulled }"></div>
             <div 
               class="lever-handle" 
               :class="{ 'pulled': isLeverPulled }"
               @click="triggerLeverAction"
             >
             </div>
          </div>
        </div>
      </div>

      <!-- 右侧：中奖名单 -->
      <div class="side-panel right">
        <div class="panel-card glass-gold">
          <h2>🏆 幸运榜单 🏆</h2>
          <div class="panel-actions">
            <button class="panel-refresh" @click="refreshData">刷新数据</button>
            <button class="panel-export" @click="exportData" v-if="verifiedToken">导出名单</button>
          </div>
          <div class="winners-list">
             <div v-for="record in recentWinners" :key="record.id" class="winner-item">
               <div class="rank-icon-wrapper">
                  <div class="rank-icon" :class="record.prizeLevel">{{ getLevelIcon(record.prizeLevel) }}</div>
               </div>
               <div class="winner-info-col">
                 <div class="wi-name">{{ record.winnerName }}</div>
                 <div class="wi-meta">
                   {{ record.winnerId }} <span v-if="hasSeatInfo" class="wi-seat"> | {{ record.winnerSeat }}号桌</span>
                 </div>
               </div>
               <div class="winner-prize-col">
                 <div class="prize-pill">{{ record.prizeName }}</div>
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
                <div class="modal-winners-grid" :class="{ 'scrollable': currentResult?.length > 8 }">
            <div v-for="w in currentResult" :key="w.id" class="skeuomorphic-card">
              <div class="card-avatar">{{ w.winnerName[0] }}</div>
              <div class="card-info">
                <div class="card-name">{{ w.winnerName }}</div>
                <div class="card-detail">工号: {{ w.winnerId }}</div>
                <div class="card-detail" v-if="hasSeatInfo">桌号: {{ w.winnerSeat }}</div>
                <div class="card-badge">{{ w.prizeName }}</div>
              </div>
            </div>
         </div>

        <button class="modal-close" @click="closeModal">收入囊中</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import confetti from 'canvas-confetti'
import lotterySound from '../assests/lottery.wav'
import winnerSound from '../assests/winner.wav'

// State
const prizes = ref([])
const winners = ref([])
const candidates = ref([]) // Real data
const isRolling = ref(false)
const reelCandidates = ref([]) // For animation
const reelStyle = ref({}) // For animation transform
const selectedPrizeId = ref(null)
const drawCount = ref(1)
const currentResult = ref(null)
const showResultModal = ref(false)
const isLeverPulled = ref(false) // New state for lever animation

// Auth
const isAuthenticated = ref(false)
const passwordInput = ref('')
const verifiedToken = ref('') // Store token
const isChecking = ref(false)
const loginError = ref(false)

let rollingTimer = null
let rollingAudio = null
let winnerAudio = null

const initAudio = () => {
  if (rollingAudio && winnerAudio) return
  rollingAudio = new Audio(lotterySound)
  rollingAudio.loop = true
  rollingAudio.volume = 0.6
  rollingAudio.preload = 'auto'

  winnerAudio = new Audio(winnerSound)
  winnerAudio.loop = false
  winnerAudio.volume = 0.9
  winnerAudio.preload = 'auto'
}

const playRollingAudio = async () => {
  initAudio()
  if (!rollingAudio) return
  try {
    rollingAudio.currentTime = 0
    await rollingAudio.play()
  } catch (e) {
    // Ignore autoplay restrictions
  }
}

const stopRollingAudio = () => {
  if (!rollingAudio) return
  rollingAudio.pause()
  rollingAudio.currentTime = 0
}

const playWinnerAudio = async () => {
  initAudio()
  if (!winnerAudio) return
  try {
    winnerAudio.currentTime = 0
    await winnerAudio.play()
  } catch (e) {
    // Ignore autoplay restrictions
  }
}

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

const hasSeatInfo = computed(() => {
  if (!candidates.value || candidates.value.length === 0) return false
  return candidates.value.some(c => c.seat && String(c.seat).trim() !== '')
})

// Lifecycle
onMounted(() => {
  // Initial fetch for public data
  initAudio()
  fetchData()
})
onBeforeUnmount(() => {
  stopRollingAudio()
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
     const headers = verifiedToken.value ? { 'x-auth-token': verifiedToken.value } : {}

     if (!verifiedToken.value) {
       const dRes = await fetch('/api/data', { headers })
       const dData = await dRes.json()
       if (dData.success) candidates.value = dData.data
       return
     }

     const [pRes, wRes, dRes] = await Promise.all([
       fetch('/api/prizes', { headers }),
       fetch('/api/lottery/winners', { headers }),
       fetch('/api/data', { headers }) // 口令存在时按口令隔离
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

const refreshData = async () => {
  await fetchData()
}

const exportData = async () => {
  if (!confirm('确定要导出当前显示的所有中奖名单吗？')) return
  try {
     const res = await fetch('/api/lottery/export', {
       headers: { 'x-auth-token': verifiedToken.value }
     })
     if(!res.ok) {
       alert('导出失败')
       return
     }
     const blob = await res.blob()
     const url = window.URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url
     a.download = `中奖名单_${new Date().toISOString().split('T')[0]}.xlsx`
     document.body.appendChild(a)
     a.click()
     window.URL.revokeObjectURL(url)
     document.body.removeChild(a)
  } catch(e) {
    console.error(e)
    alert('导出异常')
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

const getLevelLabel = (level) => {
  const map = {
    special: '特等奖',
    first: '一等奖',
    second: '二等奖',
    third: '三等奖',
    participation: '参与奖'
  }
  return map[level] || level || '幸运奖'
}

// Lever Action
const triggerLeverAction = async () => {
   if (isRolling.value || isLeverPulled.value || activePrizes.value.length === 0) return
   
   // 1. Validate
    if (selectedPrize.value && selectedPrize.value.remaining < drawCount.value) {
     alert(`该奖品仅剩 ${selectedPrize.value.remaining} 个，无法抽取 ${drawCount.value} 人`)
     drawCount.value = selectedPrize.value.remaining
     return
   }

   // 2. Animate Lever
   isLeverPulled.value = true
   playRollingAudio()
   
   // 3. Wait for lever "down" animation to hit bottom then trigger start
   setTimeout(() => {
     startDraw()
     
     // Reset lever after spring back
     setTimeout(() => {
        isLeverPulled.value = false
     }, 500)
   }, 300)
}

// Draw Logic with "Real Scroll"
const startDraw = async () => {
   if (isRolling.value) return

   // 1. Prepare Reel Data (Phase 1: Infinite Spin)
   isRolling.value = true
   currentResult.value = null
   
   // Create a long strip of random names
   const namePool = candidates.value.length > 0 ? candidates.value.map(c => c.name) : ['张三', '李四', '王五']
   
   // Generate ~50 items for the "blur" effect
   const tempReel = []
   for (let i = 0; i < 50; i++) {
     tempReel.push(namePool[Math.floor(Math.random() * namePool.length)])
   }
   reelCandidates.value = tempReel
   
   // Start infinite scroll animation (SLOWER: 5s instead of 2s)
   reelStyle.value = {
     transform: 'translateY(0)',
     transition: 'none'
   }
   
   // Force Reflow
   setTimeout(() => {
       reelStyle.value = {
         transform: `translateY(-${(tempReel.length - 5) * 60}px)`, // Move to bottom (assuming 60px height)
         transition: `transform 10s linear` // 10 seconds
       }
   }, 20)

   // Loop the animation if network is slow (every 5s now)
   const loopTimer = setInterval(() => {
       // Reset to top instantly
       reelStyle.value = { transform: 'translateY(0)', transition: 'none' }
       setTimeout(() => {
           reelStyle.value = {
             transform: `translateY(-${(tempReel.length - 5) * 60}px)`,
             transition: `transform 10s linear` // 10 seconds
           }
       }, 20)
   }, 10000) // Match animation duration (10s)

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
       // Stop the infinite loop
       clearInterval(loopTimer)
       
       // 3. Stop Phase: Land on Winner
       const winnerName = result.data[0].winnerName
       
       // Construct a LONG final strip with random names (allows for longer animation)
       const finalStrip = []
       // Add many names BEFORE the winner (creates the scrolling effect)
       for (let i = 0; i < 80; i++) {
          finalStrip.push(namePool[Math.floor(Math.random() * namePool.length)])
       }
       // Add the WINNER
       const winnerIndex = finalStrip.length
       finalStrip.push(winnerName)
       // Add names AFTER the winner (so it doesn't look empty below)
       for (let i = 0; i < 15; i++) {
          finalStrip.push(namePool[Math.floor(Math.random() * namePool.length)])
       }
       
       reelCandidates.value = finalStrip
       
       // Reset position to top first
       reelStyle.value = { transform: 'translateY(0)', transition: 'none' }
       
       setTimeout(() => {
          // Winner is at winnerIndex. Center it in the 250px viewport.
          // Target: index * 60px - (viewport/2 - cellHeight/2)
          const targetY = winnerIndex * 60 - (250 / 2 - 30)
          
          reelStyle.value = {
             transform: `translateY(-${targetY}px)`,
             transition: 'transform 6s cubic-bezier(0.1, 0.7, 0.1, 1)' // Longer ease out for more names
          }
       }, 50)
       
       // 4. Show Result Modal after animation (6s landing + 0.5s pause)
       setTimeout(() => {
         stopRollingAudio()
         isRolling.value = false
         currentResult.value = result.data
         showResultModal.value = true
         fetchData() 
         fireFireworks() 
         playWinnerAudio()
       }, 6500)

   } else {
     clearInterval(loopTimer)
     stopRollingAudio()
     isRolling.value = false
     alert(result.message)
   }

  } catch (e) {
    stopRollingAudio()
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

/* Lanterns (Restored & Pop-ified) - Inline Version */
.title-section {
  display: flex;
  align-items: center; /* Align vertically center with title */
  justify-content: center;
  gap: 30px;
  width: 100%;
}
.decoration {
  /* Removed fixed positioning */
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: swing 3s ease-in-out infinite alternate;
  margin-top: -30px; /* Adjust vertical alignment if needed */
}

@keyframes swing {
  0% { transform: rotate(5deg); }
  100% { transform: rotate(-5deg); }
}
.lantern-string { width: 4px; height: 40px; background: black; }
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

/* Main Stage & Slot Machine */
.main-stage {
  order: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-width: 0;
  margin: 0 20px;
}

.main-title {
  font-family: 'Ma Shan Zheng', cursive, serif;
  font-size: 100px;
  font-weight: 900;
  color: var(--cny-gold);
  background-color: var(--cny-red);
  padding: 10px 50px;
  border-radius: 100px;
  border: 4px solid black;
  box-shadow: 8px 8px 0px black;
  text-shadow: 4px 4px 0px black;
  margin-bottom: 40px;
  letter-spacing: 8px;
  z-index: 20;
  -webkit-text-stroke: 2px black;
}

.slot-machine-wrapper {
  position: relative;
  display: flex;
  align-items: flex-end; /* Align lever bottom with machine */
}

/* Machine Body - Metallic & 3D */
.slot-machine-body {
  width: 600px;
  background: linear-gradient(to right, #444 0%, #888 20%, #bbb 50%, #888 80%, #444 100%);
  border-radius: 40px 40px 10px 10px;
  padding: 30px;
  box-shadow: 
    inset 0 0 20px rgba(0,0,0,0.8),
    10px 20px 30px rgba(0,0,0,0.5);
  border: 4px solid #333;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}
/* Side Panels/Lighting Effect */
.slot-machine-body::before {
  content: ''; position: absolute; top: 10px; left: 10px; bottom: 10px; right: 10px;
  border: 2px solid rgba(255,255,255,0.2); border-radius: 30px 30px 5px 5px; pointer-events: none;
}

/* Header Plate */
.machine-header-plate {
  background: #222;
  border-radius: 50px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 2px solid #666;
  box-shadow: inset 0 5px 10px black;
}
.machine-title {
  color: gold; 
  font-family: 'Times New Roman', serif;
  font-weight: 900;
  font-size: 32px;
  letter-spacing: 5px;
  text-shadow: 0 0 10px orange, 2px 2px 0px black;
  background: linear-gradient(180deg, #ffd700, #ff8c00);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.jackpot-light {
  width: 20px; height: 20px; background: red;
  border-radius: 50%;
  box-shadow: 0 0 10px red;
  animation: blink 1s infinite alternate;
}
@keyframes blink { from { opacity: 0.3; } to { opacity: 1; }}

/* Display Window */
.machine-display-frame {
  background: #000;
  padding: 15px;
  border-radius: 10px;
  border: 5px solid #666;
  box-shadow: inset 0 0 20px black;
  position: relative;
  overflow: hidden;
}
.glass-reflection {
  position: absolute; top: 0; left: 0; width: 100%; height: 40%;
  background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%);
  z-index: 5; pointer-events: none;
}
.rolling-display {
  width: 100%;
  min-height: 250px;
  max-height: 350px; /* Allow more height for multi-winner */
  background: white;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center; /* Center placeholder vertically */
  position: relative;
  overflow: hidden;
  /* Slot reel effect */
  background: 
    linear-gradient(to bottom, #dcdcdc 0%, #fff 50%, #dcdcdc 100%);
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
}

/* Real Scroll Reel Styles */
.reel-viewport {
  width: 100%;
  height: 250px; /* Match rolling-display height */
  overflow: hidden;
  position: relative;
  /* fade edges */
  mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
}
.reel-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.reel-cell {
  height: 60px; /* Fixed height for calculation */
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 36px;
  font-weight: 900;
  color: #333;
  width: 100%;
}
/* Blur effect during fast spin */
.reel-strip[style*="2s linear"] .reel-cell {
  filter: blur(1px);
  transform: scaleY(1.1);
}
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  color: #333;
  font-weight: 900;
  letter-spacing: 1px;
  padding: 0 20px;
}
.placeholder-title {
  font-size: clamp(28px, 5vw, 52px);
  line-height: 1.1;
}
.placeholder-sub {
  font-size: clamp(18px, 3vw, 32px);
  color: #555;
  font-weight: 700;
}
.result-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}
.result-banner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffe3a0 0%, #ffd24a 100%);
  color: #7a2a00;
  font-weight: 900;
  letter-spacing: 1px;
  font-size: clamp(14px, 2.5vw, 22px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.2);
  flex-shrink: 0; /* Prevent shrinking */
  z-index: 10;
}
.result-banner .banner-label {
  font-size: 0.8em;
  opacity: 0.8;
}
.winner-grid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  overflow-y: auto;
  padding: 4px;
  max-height: 220px; /* Limit height to allow scrolling */
}
.winner-tile {
  flex: 0 1 calc(50% - 10px);
  min-width: 160px;
  background: #ffffff;
  border: 2px solid #111;
  border-radius: 12px;
  padding: 12px 14px;
  text-align: center;
  box-shadow: 4px 4px 0px rgba(0,0,0,0.15);
}
.winner-tile-name {
  font-size: clamp(20px, 3.5vw, 34px);
  font-weight: 900;
  color: #111;
}
.winner-tile-seat {
  font-size: clamp(12px, 2vw, 18px);
  font-weight: 800;
  color: #b03a00;
}
.winner-single {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}
.winner-single-name {
  font-size: clamp(36px, 7vw, 72px);
  font-weight: 900;
  color: #222;
  text-shadow: 2px 2px 0 #fff, 0 2px 8px rgba(0,0,0,0.2);
}
.winner-single-seat {
  font-size: clamp(16px, 2.5vw, 28px);
  font-weight: 800;
  color: #b03a00;
}


/* Control Plate */
.machine-controls-plate {
  background: #333;
  padding: 15px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid #555;
  box-shadow: inset 0 5px 10px rgba(0,0,0,0.8);
}
.coin-slot {
  background: #111; color: #888; padding: 5px 10px; border: 2px solid #555;
  font-size: 12px; border-radius: 50%; width: 50px; height: 50px;
  display: flex; justify-content: center; align-items: center; text-align: center;
}
.spin-button {
  background: red;
  color: white;
  border: none;
  width: 100px; height: 100px;
  border-radius: 50%;
  font-weight: 900;
  font-size: 20px;
  box-shadow: 
    0 5px 0 #8b0000,
    0 10px 10px rgba(0,0,0,0.5);
  cursor: pointer;
  transition: all 0.1s;
}
.spin-button:active:not(:disabled) {
  transform: translateY(5px);
  box-shadow: 0 0 0 #8b0000, inset 0 5px 10px rgba(0,0,0,0.5);
}
.spin-button:disabled { filter: grayscale(100%); cursor: not-allowed; }

.status-lights { display: flex; gap: 5px; }
.light {
  width: 40px; text-align: center; font-size: 10px; color: #444; background: #222;
  padding: 2px; border-radius: 2px;
}
.light.on {
  background: #0f0; color: black; box-shadow: 0 0 5px #0f0;
  text-shadow: 0 0 2px #fff;
}

/* Lever */
.lever-group {
  position: absolute;
  right: -50px;
  bottom: 50px;
  width: 60px;
  height: 300px;
  z-index: 5;
}
.lever-base {
  position: absolute; bottom: 0; left: 0;
  width: 40px; height: 80px;
  background: #555;
  border-radius: 0 10px 10px 0;
  box-shadow: inset 5px 0 10px rgba(0,0,0,0.5);
  border: 2px solid #333;
}
.lever-shaft {
   height: 250px; width: 15px;
   background: linear-gradient(to right, #999, #eee, #999);
   position: absolute; bottom: 40px; left: 10px;
   transform-origin: bottom center;
   border-radius: 5px;
   transition: transform 0.5s cubic-bezier(0.5, 0, 0.5, 1);
}
.lever-shaft::after {
   /* The Knob */
   content: '';
   position: absolute; top: -20px; left: -12.5px;
   width: 40px; height: 40px;
   border-radius: 50%;
   background: radial-gradient(circle at 30% 30%, #ff0000, #550000);
   box-shadow: 0 5px 10px rgba(0,0,0,0.5);
   cursor: pointer;
}
.lever-shaft.pulled {
   transform: rotateX(150deg); /* Pull down effect */
   animation: pull-action 0.5s ease-in-out;
}

@keyframes pull-action {
  0% { transform: rotateX(0deg); }
  50% { transform: rotateX(60deg) scaleY(0.9); } 
  100% { transform: rotateX(0deg); }
}

/* Winners List */
.panel-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}
.panel-refresh {
  background: #fff5d6;
  border: 3px solid #000;
  color: #000;
  font-weight: 900;
  padding: 6px 18px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 3px 3px 0px #000;
  transition: transform 0.1s;
}
.panel-refresh:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #000;
}
.panel-export {
  background: #d6ffff;
  border: 3px solid #000;
  color: #000;
  font-weight: 900;
  padding: 6px 18px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 3px 3px 0px #000;
  transition: transform 0.1s;
  margin-left: 10px;
}
.panel-export:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #000;
}
.winners-list {
  flex: 1; overflow-y: auto;
}
.winner-item {
  display: flex; 
  align-items: center;
  gap: 15px; 
  padding: 15px 12px; 
  border-bottom: 2px dashed #333;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 8px;
  border: 2px solid #111;
  box-shadow: 4px 4px 0px rgba(0,0,0,0.1);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.winner-item::after {
  /* Decorative Ticket Stub Lines */
  content: ''; position: absolute; left: 45px; top: 0; bottom: 0;
  border-right: 2px dashed #ccc;
}
.winner-item:hover {
  transform: translateX(-2px);
  box-shadow: 6px 6px 0px var(--cny-gold);
}
.winner-item:hover {
  background: white;
}
.rank-icon-wrapper {
  width: 40px; display: flex; justify-content: center;
}
.rank-icon { font-size: 24px; filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.1)); }

.winner-info-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.wi-name {
  font-size: 20px; font-weight: 900; color: #111;
  line-height: 1.1; margin-bottom: 4px;
}
.wi-meta {
  font-size: 13px; color: #555; font-weight: 600;
  font-family: monospace;
}
.wi-seat { color: #b03a00; font-weight: 800; background: #ffeebb; padding: 0 4px; border-radius: 2px; }

.winner-prize-col {
  display: flex; justify-content: flex-end; align-items: center;
  padding-left: 10px;
}
.prize-pill {
  background: var(--cny-gold);
  color: #111;
  font-size: 13px;
  font-weight: 900;
  padding: 6px 12px;
  border-radius: 4px;
  box-shadow: 2px 2px 0px black;
  border: 2px solid black;
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: rotate(-2deg); /* Stamp effect */
}
.empty-msg { color: #888; font-style: italic; text-align: center; padding: 20px; }

/* Modal - Pop Art Dialog */
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 2000; /* High z-index to cover everything */
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none; /* Default none, enable when active if needed, or just handle via v-if */
  opacity: 0;
  transition: opacity 0.3s;
}
.modal-overlay.show {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  opacity: 1;
  pointer-events: auto;
}
.result-modal {
  background: white;
  width: 95%; max-width: 1000px; /* Increased width for more cards */
  border: 6px solid black;
  /* box-shadow removed as requested */
  box-shadow: 0 10px 30px rgba(0,0,0,0.3); 
  border-radius: 30px;
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  max-height: 90vh; /* Prevent overflow on vertical */
}

/* Updated Grid for Cards */
.modal-winners-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  width: 100%;
  padding: 10px;
  overflow-y: auto; /* Allow internal scrolling if needed */
  max-height: 60vh;
}
.modal-winners-grid.scrollable {
  /* Specific styling for scrollable state if needed */
  padding-right: 5px;
}

/* Skeuomorphic Card Design */
.skeuomorphic-card {
  width: 180px;
  background: #fff;
  border: 3px solid #111;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 5px 5px 0px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s;
  position: relative;
}
.skeuomorphic-card:hover {
  transform: translateY(-5px);
  box-shadow: 5px 10px 10px rgba(0,0,0,0.1);
}
/* Card Hole Punch Effect */
.skeuomorphic-card::before {
  content: ''; position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  width: 12px; height: 12px; background: #333; border-radius: 50%;
  box-shadow: inset 1px 1px 2px rgba(0,0,0,0.5);
  display: none; /* Optional: Looks like a tag */
}

.card-avatar {
  width: 50px; height: 50px;
  background: var(--cny-red);
  color: white;
  border: 2px solid black;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 900;
  margin-bottom: 10px;
  box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
}

.card-info {
  width: 100%;
}

.card-name {
  font-size: 18px; font-weight: 900; color: #111; margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.card-detail {
  font-size: 12px; color: #666; font-weight: 600;
  margin-bottom: 2px;
}
.card-badge {
  margin-top: 8px;
  background: var(--cny-gold);
  color: #111;
  font-weight: 800;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid black;
  display: inline-block;
}

/* Old styles kept for compatibility if referenced elsewhere, but new ones override */
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

<template>
  <div class="container">
    <div class="graffiti-decoration circle-top"></div>
    <div class="graffiti-decoration x-shape"></div>
    
    <div class="card neo-brutalism">
      <div class="card-header">
        <div class="logo-tag">SEAT.SYS</div>
        <h1>座位查询</h1>
      </div>
      
      <p class="subtitle">输入姓名或工号 /// 快速定位</p>
      
      <div class="input-wrapper">
        <input 
          v-model="searchQuery" 
          @keypress.enter="searchSeat"
          type="text" 
          placeholder="在此输入姓名或工号..." 
          autocomplete="off"
        >
        <div class="input-shadow"></div>
      </div>
      
      <button class="search-btn" @click="searchSeat">
        <span>查询座位</span>
        <div class="btn-shadow"></div>
      </button>
      
      <div class="hint-tag">
        <span>例如: 李总 / DT001 / 张工</span>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <div v-if="showModal" class="modal-overlay show" @click.self="closeModal">
      <div class="modal neo-modal" :class="modalType">
        <div class="modal-header-bar">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        
        <h2 class="result-title">
          <span v-if="modalType === 'success'">查询成功</span>
          <span v-else>查询失败</span>
        </h2>
        
        <div class="result-content" v-html="modalContent"></div>
        
        <button class="modal-close" @click="closeModal">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const searchQuery = ref('')
const employeeData = ref([])
const showModal = ref(false)
const modalTitle = ref('')
const modalContent = ref('')
const modalType = ref('success')

onMounted(async () => {
  try {
    const response = await fetch('/api/data')
    const result = await response.json()
    if (result.success) {
      employeeData.value = result.data
    }
  } catch (error) {
    console.error('Failed to load data', error)
  }
})

const searchSeat = () => {
  const input = searchQuery.value.trim()
  if (!input) {
    showResult(false, '请输入查询内容', '这里是空的！<br>请输入姓名或工号')
    return
  }

  let results = employeeData.value.filter(emp => emp.id.toLowerCase() === input.toLowerCase())
  
  if (results.length === 0) {
    results = employeeData.value.filter(emp => emp.name === input)
  }

  if (results.length === 0) {
    results = employeeData.value.filter(emp => emp.name.includes(input) || input.includes(emp.name))
  }

  if (results.length === 1) {
    const emp = results[0]
    showResult(true, '查询成功', `
      <div class="ticket-info">
        <div class="info-row"><label>工号</label><span>${emp.id}</span></div>
        <div class="info-row"><label>姓名</label><span>${emp.name}</span></div>
      </div>
      <div class="seat-badge">${emp.seat}</div>
    `)
  } else if (results.length > 1) {
    let html = '<div class="multi-result-list">'
    results.forEach(emp => {
      html += `<div class="multi-item"><span>${emp.name}</span> <span class="arrow">→</span> <span class="seat">${emp.seat}</span></div>`
    })
    html += '</div>'
    showResult(true, '查询结果', html)
  } else {
    showResult(false, '未找到', `没找到 "${input}" <br>是不是打错字了？`)
  }
}

const showResult = (success, title, content) => {
  modalType.value = success ? 'success' : 'error'
  modalTitle.value = title
  modalContent.value = content
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  max-width: 500px;
  padding: 20px;
}

/* 涂鸦装饰 */
.graffiti-decoration {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.circle-top {
  top: -40px;
  right: -30px;
  width: 80px;
  height: 80px;
  border: 4px solid var(--neon-pink);
  border-radius: 50%;
  transform: rotate(-15deg);
  box-shadow: 0 0 15px var(--neon-pink);
}

.x-shape {
  bottom: -20px;
  left: -20px;
  width: 40px;
  height: 40px;
}
.x-shape::before, .x-shape::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 5px;
  background: var(--neon-cyan);
  top: 50%;
  left: 0;
  box-shadow: 0 0 10px var(--neon-cyan);
}
.x-shape::before { transform: rotate(45deg); }
.x-shape::after { transform: rotate(-45deg); }

/*Neo-Brutalism 卡片 */
.card {
  position: relative;
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  padding: 40px 30px;
  z-index: 10;
  box-shadow: 10px 10px 0px var(--neon-purple); /* 硬阴影 */
  transition: transform 0.2s;
}

.logo-tag {
  display: inline-block;
  background: var(--neon-green);
  color: black;
  font-weight: 800;
  padding: 4px 8px;
  font-size: 14px;
  margin-bottom: 15px;
  transform: rotate(-2deg);
}

h1 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 900;
  text-transform: uppercase;
  color: white;
  text-shadow: 2px 2px 0 #000;
  margin-bottom: 5px;
}

.subtitle {
  color: #aaa;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 14px;
  letter-spacing: 1px;
  margin-bottom: 40px;
  border-bottom: 1px dashed #444;
  padding-bottom: 15px;
}

/* 输入框 */
.input-wrapper {
  position: relative;
  margin-bottom: 30px;
}

input {
  width: 100%;
  padding: 20px;
  background: white;
  border: 3px solid black;
  font-size: 18px;
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: bold;
  color: black;
  outline: none;
  position: relative;
  z-index: 2;
  transition: transform 0.1s;
}

input:focus {
  transform: translate(-2px, -2px);
}

.input-shadow {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 100%;
  height: 100%;
  background: var(--neon-green);
  z-index: 1;
}

/* 按钮 */
.search-btn {
  position: relative;
  width: 100%;
  height: 60px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.search-btn span {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--neon-pink);
  color: white;
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 900;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  z-index: 2;
  transition: transform 0.1s;
}

.btn-shadow {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 100%;
  height: 100%;
  border: 3px solid var(--neon-cyan);
  background: transparent;
  z-index: 1;
}

.search-btn:active span {
  transform: translate(6px, 6px);
}

.search-btn:hover span {
  background: var(--neon-purple);
}

.hint-tag {
  margin-top: 30px;
  text-align: center;
  font-size: 12px;
  color: #888;
}
.hint-tag span {
  background: #222;
  padding: 4px 10px;
  border-radius: 4px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.neo-modal {
  background: white;
  color: black;
  padding: 0;
  width: 90%;
  max-width: 400px;
  border: 4px solid black;
  box-shadow: 15px 15px 0 var(--neon-green);
  text-align: center;
}

.modal-header-bar {
  display: flex;
  gap: 8px;
  padding: 10px 15px;
  border-bottom: 4px solid black;
  background: #eee;
}

.dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid black; }
.red { background: #ff5f56; }
.yellow { background: #ffbd2e; }
.green { background: #27c93f; }

.modal.error {
  box-shadow: 15px 15px 0 var(--neon-pink);
}

.result-title {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 900;
  font-size: 32px;
  margin: 30px 0 10px;
  text-transform: uppercase;
}
.modal.error .result-title { color: #ff0055; transform: rotate(-2deg); }
.modal.success .result-title { color: #000; }

:deep(.result-content) {
  padding: 0 30px 30px;
}

:deep(.ticket-info) {
  text-align: left;
  background: #f0f0f0;
  padding: 15px;
  border: 2px solid black;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace;
}
:deep(.info-row) {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}
:deep(.info-row label) { color: #888; }
:deep(.info-row span) { font-weight: bold; }

:deep(.seat-badge) {
  font-size: 56px;
  font-weight: 900;
  color: black;
  text-shadow: 2px 2px 0 var(--neon-green);
  line-height: 1;
}

:deep(.multi-item) {
  border-bottom: 1px dashed black;
  padding: 10px;
  text-align: left;
  font-family: 'JetBrains Mono', monospace;
}
:deep(.multi-item .seat) {
  float: right;
  font-weight: bold;
  background: var(--neon-green);
  padding: 0 5px;
}

.modal-close {
  display: block;
  width: 100%;
  padding: 20px;
  background: black;
  color: white;
  border: none;
  font-family: 'JetBrains Mono', monospace;
  font-weight: bold;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s;
}
.modal-close:hover {
  background: #333;
}



/* Animations */
@keyframes float {
  0% { transform: translateY(0px) rotate(-15deg); }
  50% { transform: translateY(-15px) rotate(-10deg); }
  100% { transform: translateY(0px) rotate(-15deg); }
}

@keyframes float-reverse {
  0% { transform: translateY(0px); }
  50% { transform: translateY(10px); }
  100% { transform: translateY(0px); }
}

@keyframes glitch-anim {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.8) translateY(50px); }
  60% { transform: scale(1.05) translateY(-10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0 rgba(204, 255, 0, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(204, 255, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(204, 255, 0, 0); }
}

.graffiti-decoration.circle-top {
  animation: float 6s ease-in-out infinite;
}

.graffiti-decoration.x-shape {
  animation: float-reverse 7s ease-in-out infinite;
}

.card {
  animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

h1:hover {
  animation: glitch-anim 0.3s cubic-bezier(.25, .46, .45, .94) both infinite;
  color: var(--neon-pink);
}

.input-wrapper:focus-within .input-shadow {
  animation: pulse-border 2s infinite;
}

.neo-modal {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

/* Mobile Responsive */
@media (max-width: 600px) {
  .container {
    padding: 10px;
  }
  
  .card {
    padding: 30px 20px;
    box-shadow: 6px 6px 0px var(--neon-purple);
  }
  
  h1 {
    font-size: 26px;
  }
  
  .seat-badge {
    font-size: 42px;
  }
  
  :deep(.seat-badge) {
    font-size: 42px;
  }
  
  .subtitle {
    font-size: 12px;
    margin-bottom: 30px;
  }
  
  .circle-top {
    width: 50px;
    height: 50px;
    top: -20px;
    right: -10px;
  }
  
  .x-shape {
    width: 30px;
    height: 30px;
    bottom: -10px;
    left: -10px;
  }
  
  .search-btn {
    height: 50px;
  }
  
  .search-btn span {
    font-size: 16px;
  }
  
  input {
    padding: 15px;
    font-size: 16px;
  }

  .neo-modal {
    width: 95%;
    padding: 0;
  }

  .result-title {
    font-size: 24px;
  }
}
</style>

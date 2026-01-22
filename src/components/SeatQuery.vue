<template>
  <div class="container">
    <!-- 装饰：灯笼 -->
    <div class="decoration lantern-left">
      <div class="lantern-string"></div>
      <div class="lantern-body">
        <div class="lantern-text">春</div>
      </div>
      <div class="lantern-tassel"></div>
    </div>
    <div class="decoration lantern-right">
      <div class="lantern-string"></div>
      <div class="lantern-body">
        <div class="lantern-text">福</div>
      </div>
      <div class="lantern-tassel"></div>
    </div>
    
    <!-- 访问码遮罩 -->
    <div v-if="accessGateVisible" class="access-overlay">
      <div class="access-box">
        <h2>请输入访问码</h2>
        <input
          v-model="accessCodeInput"
          type="text"
          placeholder="访问码"
          @keypress.enter="submitAccessCode"
        >
        <button class="access-btn" @click="submitAccessCode">进入查询</button>
        <div v-if="accessError" class="access-error">{{ accessError }}</div>
      </div>
    </div>

    <!-- 主卡片：红包/卷轴风格 -->
    <div class="card red-packet">
      <div class="card-header">
        <div class="logo-seal">TABLE</div>
        <h1>桌号查询</h1>
      </div>
      
      <p class="subtitle">新春大吉 · 恭喜发财 · 诸事顺遂</p>
      
      <div class="input-wrapper">
        <div class="input-inner">
          <input 
            v-model="searchQuery" 
            @keypress.enter="searchSeat"
            type="text" 
            placeholder="在此输入姓名或工号..." 
            autocomplete="off"
          >
        </div>
      </div>
      
      <button class="search-btn" @click="searchSeat">
        <div class="btn-content">查询桌号</div>
      </button>
      
      <div class="hint-tag">
        <span>例如: 李总 / DT001 / 张工</span>
      </div>

      <div v-if="accessCode" class="token-tag">
        <span>已绑定访问码</span>
        <button class="token-clear" @click="clearCode">清除</button>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <div v-if="showModal" class="modal-overlay show" @click.self="closeModal">
      <div class="modal cny-modal" :class="modalType">
        <div class="modal-border-decoration"></div>
        <div class="modal-knot"></div>
        
        <h2 class="result-title">
          <span v-if="modalType === 'success'">查询成功</span>
          <span v-else>查询提示</span>
        </h2>
        
        <div class="result-content" v-html="modalContent"></div>
        
        <button class="modal-close" @click="closeModal">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const searchQuery = ref('')
const employeeData = ref([])
const showModal = ref(false)
const modalTitle = ref('')
const modalContent = ref('')
const modalType = ref('success')
const accessCode = ref('')
const dataError = ref('')
const accessCodeInput = ref('')
const accessGateVisible = ref(false)
const accessError = ref('')

const CODE_STORAGE_KEY = 'seat_query_code'
const LEGACY_TOKEN_STORAGE_KEY = 'seat_query_token'
const route = useRoute()

const resolveCodeFromRoute = () => {
  const codeParam = route.query.code || route.query.token
  if (typeof codeParam === 'string' && codeParam.trim()) {
    return codeParam.trim()
  }
  return ''
}

const syncAccessCode = () => {
  const codeFromRoute = resolveCodeFromRoute()
  if (codeFromRoute) {
    accessCode.value = codeFromRoute
    localStorage.setItem(CODE_STORAGE_KEY, codeFromRoute)
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
    accessCodeInput.value = codeFromRoute
    return
  }

  const stored = localStorage.getItem(CODE_STORAGE_KEY)
  accessCode.value = stored || ''
  accessCodeInput.value = accessCode.value
}

const loadData = async () => {
  dataError.value = ''
  try {
    if (!accessCode.value) {
      accessGateVisible.value = true
      employeeData.value = []
      return false
    }

    const headers = accessCode.value ? { 'x-share-code': accessCode.value } : {}
    const response = await fetch('/api/data', { headers })
    const result = await response.json()
    if (!response.ok || !result.success) {
      dataError.value = result.message || '数据加载失败'
      employeeData.value = []
      accessGateVisible.value = true
      accessError.value = result.message || '访问码无效'
      return
    }
    employeeData.value = result.data
    accessGateVisible.value = false
    accessError.value = ''
    return true
  } catch (error) {
    dataError.value = '数据加载失败'
    console.error('Failed to load data', error)
    accessGateVisible.value = true
    accessError.value = '数据加载失败'
    return false
  }
}

const clearCode = async () => {
  accessCode.value = ''
  localStorage.removeItem(CODE_STORAGE_KEY)
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
  accessCodeInput.value = ''
  await loadData()
}

const submitAccessCode = async () => {
  const input = accessCodeInput.value.trim()
  if (!input) {
    accessError.value = '请输入访问码'
    accessGateVisible.value = true
    return
  }

  accessCode.value = input
  localStorage.setItem(CODE_STORAGE_KEY, input)
  accessError.value = ''
  await loadData()
}

onMounted(async () => {
  syncAccessCode()
  await loadData()
})

watch(
  () => route.fullPath,
  async () => {
    syncAccessCode()
    await loadData()
  }
)

const searchSeat = () => {
  if (dataError.value) {
    showResult(false, '加载失败', `<div class="msg-text">${dataError.value}</div>`)
    return
  }
  if (accessGateVisible.value) {
    showResult(false, '需要访问码', '<div class="msg-text">请先输入访问码</div>')
    return
  }
  const input = searchQuery.value.trim()
  if (!input) {
    showResult(false, '请输入查询内容', '<div class="msg-text">这里是空的！<br>请输入姓名或工号</div>')
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
      <div class="seat-badge-container">
        <div class="seat-label">桌号</div>
        <div class="seat-badge">${emp.seat}</div>
      </div>
    `)
  } else if (results.length > 1) {
    let html = '<div class="multi-result-list">'
    results.forEach(emp => {
      html += `<div class="multi-item"><span>${emp.name}</span> <span class="arrow">→</span> <span class="seat">${emp.seat}</span></div>`
    })
    html += '</div>'
    showResult(true, '查询结果', html)
  } else {
    showResult(false, '未找到', `<div class="msg-text">没找到 "${input}" <br>是不是打错字了？</div>`)
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

/* 装饰：灯笼 */
.decoration {
  position: absolute;
  top: -50px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: swing 3s ease-in-out infinite alternate;
}
.lantern-left { left: -10px; animation-delay: 0.5s; }
.lantern-right { right: -10px; animation-delay: 0s; }

.lantern-string {
  width: 2px;
  height: 40px;
  background: var(--cny-gold);
}

.lantern-body {
  width: 60px;
  height: 50px;
  background: #f00;
  border-radius: 20px;
  border: 2px solid var(--cny-gold);
  box-shadow: 0 0 15px rgba(255, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.lantern-body::before, .lantern-body::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 20px;
  border: 1px solid rgba(255, 215, 0, 0.3);
} 
.lantern-text {
  color: var(--cny-gold);
  font-family: var(--title-font);
  font-size: 24px;
  font-weight: bold;
}
.lantern-tassel {
  width: 4px;
  height: 30px;
  background: var(--cny-gold);
  margin-top: -2px;
  position: relative;
}
.lantern-tassel::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -5px;
  width: 14px;
  height: 20px;
  background: radial-gradient(circle, var(--cny-red), transparent);
  border-radius: 50%;
  filter: blur(2px);
}

/* 卡片风格 */
.red-packet {
  position: relative;
  background: var(--cny-red);
  border: 4px solid var(--cny-gold);
  border-radius: 20px;
  padding: 50px 30px 40px;
  z-index: 10;
  box-shadow: 
    0 10px 25px rgba(0,0,0,0.5),
    inset 0 0 30px rgba(0,0,0,0.2);
  text-align: center;
}

/* 顶部封口样式 */
.red-packet::before {
  content: '';
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 40px;
  background: var(--cny-red);
  border: 4px solid var(--cny-gold);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  z-index: -1;
}

.logo-seal {
  display: inline-block;
  width: 50px;
  height: 50px;
  line-height: 50px;
  background: var(--cny-gold);
  color: var(--cny-red);
  font-weight: 900;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 10px;
  border: 2px dashed var(--cny-red);
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}

h1 {
  font-family: var(--title-font);
  font-size: 48px;
  color: var(--cny-gold);
  text-shadow: 2px 2px 0 var(--cny-black);
  margin-bottom: 5px;
  font-weight: normal;
}

.subtitle {
  color: var(--cny-light-gold);
  font-size: 14px;
  letter-spacing: 2px;
  margin-bottom: 40px;
  opacity: 0.9;
}

/* 输入框 */
.input-wrapper {
  margin-bottom: 30px;
  position: relative;
  padding: 4px;
  background: var(--cny-gold);
  border-radius: 12px;
}

.input-inner {
  background: var(--cny-cream);
  border-radius: 8px;
  padding: 2px;
}

input {
  width: 100%;
  padding: 15px;
  background: transparent;
  border: none;
  font-size: 18px;
  font-family: var(--primary-font);
  font-weight: bold;
  color: var(--cny-black);
  text-align: center;
  outline: none;
}
input::placeholder {
  color: #cbb;
  font-weight: normal;
}

/* 按钮 */
.search-btn {
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s;
}

.btn-content {
  background: linear-gradient(to bottom, #ffeb3b, #fbc02d);
  color: #d50000;
  font-family: var(--title-font);
  font-size: 24px;
  padding: 15px;
  border-radius: 50px;
  box-shadow: 0 5px 0 #f57f17, 0 10px 10px rgba(0,0,0,0.3);
  border: 2px solid #fff;
}

.search-btn:active {
  transform: translateY(4px);
}
.search-btn:active .btn-content {
  box-shadow: 0 1px 0 #f57f17, 0 2px 5px rgba(0,0,0,0.3);
}

.hint-tag {
  margin-top: 30px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.access-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 5, 5, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  backdrop-filter: blur(4px);
}
.access-box {
  background: var(--cny-cream);
  border: 6px solid var(--cny-red);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
}
.access-box h2 {
  margin-bottom: 12px;
  color: var(--cny-red);
}
.access-box input {
  width: 100%;
  padding: 12px 14px;
  border: 3px solid black;
  border-radius: 10px;
  font-size: 16px;
  margin-bottom: 12px;
}
.access-btn {
  background: var(--cny-gold);
  color: black;
  font-weight: 900;
  border: 3px solid black;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  width: 100%;
}
.access-btn:active {
  transform: translateY(2px);
}
.access-error {
  margin-top: 10px;
  color: #b00020;
  font-weight: 700;
}
.token-tag {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid var(--cny-gold);
  color: var(--cny-gold);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.token-clear {
  background: var(--cny-gold);
  border: 1px solid black;
  color: black;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
}
.token-clear:active {
  transform: translateY(1px);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(44, 14, 14, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.cny-modal {
  position: relative;
  background: var(--cny-cream);
  width: 85%;
  max-width: 400px;
  padding: 30px;
  border: 8px solid var(--cny-red);
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.2);
}

/* 弹窗边角花纹 */
.modal-border-decoration {
  position: absolute;
  top: 5px; left: 5px; right: 5px; bottom: 5px;
  border: 2px solid var(--cny-gold);
  pointer-events: none;
}

.result-title {
  font-family: var(--title-font);
  font-size: 32px;
  color: var(--cny-red);
  margin-bottom: 20px;
}

:deep(.result-content) {
  padding: 10px 0 20px;
}

:deep(.ticket-info) {
  background: #fff;
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 20px;
  text-align: left;
}
:deep(.info-row) {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--cny-black);
}
:deep(.info-row label) { color: #888; }

:deep(.seat-badge-container) {
  background: var(--cny-red);
  color: var(--cny-gold);
  padding: 15px;
  border-radius: 8px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
}
:deep(.seat-label) {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 5px;
}
:deep(.seat-badge) {
  font-size: 42px;
  font-weight: 900;
  font-family: 'Arial Black', sans-serif;
}

:deep(.msg-text) {
  color: var(--cny-black);
  font-size: 16px;
  line-height: 1.6;
}

:deep(.multi-item) {
  padding: 10px;
  border-bottom: 1px dashed #ccc;
  color: var(--cny-black);
  display: flex;
  justify-content: space-between;
}
:deep(.seat) {
  color: var(--cny-red);
  font-weight: bold;
}

.modal-close {
  background: var(--cny-red);
  color: var(--cny-gold);
  border: none;
  padding: 12px 30px;
  font-size: 16px;
  border-radius: 50px;
  cursor: pointer;
  font-family: var(--primary-font);
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(196, 30, 58, 0.4);
}

@keyframes swing {
  0% { transform: rotate(5deg); }
  100% { transform: rotate(-5deg); }
}

@media (max-width: 600px) {
  .lantern-body { width: 50px; height: 40px; }
  .lantern-text { font-size: 20px; }
  h1 { font-size: 36px; }
  .red-packet { padding: 40px 20px 30px; }
}
</style>

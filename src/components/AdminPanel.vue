<template>
  <div class="container">
    <!-- 装饰元素 -->
    <div class="graffiti-decoration triangle-decoration"></div>
    <div class="graffiti-decoration lines-decoration"></div>

    <!-- 登录界面 -->
    <div v-if="!isAuthenticated" class="card neo-brutalism login-card">
      <div class="card-header">
        <div class="logo-tag">管理员入口</div>
        <h1>后台管理</h1>
      </div>
      
      <div class="input-wrapper">
        <input 
          v-model="passwordInput" 
          @keypress.enter="handleLogin"
          type="password" 
          placeholder="请输入口令 ///" 
          class="glitch-input"
        >
        <div class="input-shadow"></div>
      </div>

      <div v-if="loginError" class="error-msg">
        > 访问拒绝：口令错误
      </div>

      <button class="action-btn" @click="handleLogin" :disabled="isChecking">
        <span>{{ isChecking ? '验证中...' : '解锁系统' }}</span>
        <div class="btn-shadow"></div>
      </button>

      <div class="back-link">
        <router-link to="/">← 返回前台</router-link>
      </div>
    </div>

    <!-- 管理界面 (已解锁) -->
    <div v-else class="card neo-brutalism admin-card">
      <div class="top-bar">
        <span class="status-badge">系统已解锁</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button 
          class="tab-btn" 
          :class="{ active: currentTab === 'data' }" 
          @click="currentTab = 'data'"
        >数据上传</button>
        <button 
          class="tab-btn" 
          :class="{ active: currentTab === 'prize' }" 
          @click="currentTab = 'prize'"
        >奖品管理</button>
        <button 
          class="tab-btn" 
          :class="{ active: currentTab === 'winners' }" 
          @click="currentTab = 'winners'"
        >中奖记录</button>
      </div>

      <!-- Tab 1: 数据上传 -->
      <div v-if="currentTab === 'data'">
        <h1>数据上传</h1>
        <p class="subtitle">上传区域 /// 仅限 EXCEL 文件</p>

        <div class="upload-zone" :class="{ 'has-file': selectedFile }" @click="triggerFileInput">
          <input 
            ref="fileInputRef"
            type="file" 
            accept=".xlsx, .xls"
            class="hidden-input"
            @change="handleFileSelect"
          >
          
          <div class="zone-content">
            <div v-if="!selectedFile">
              <div class="icon-box">+</div>
              <p>点击此处上传</p>
              <span class="file-type-tag">.XLSX / .XLS</span>
            </div>
            <div v-else>
              <div class="file-icon">📄</div>
              <p class="filename">{{ selectedFile.name }}</p>
              <p class="warning">警告：将覆盖现有数据</p>
            </div>
          </div>
        </div>

        <div v-if="parseProgress" class="progress-box">
          {{ parseProgress }}
        </div>

        <div v-if="statusMessage" class="status-box" :class="statusType">
          {{ statusMessage }}
        </div>

        <div class="action-row">
          <button 
            class="action-btn primary" 
            :disabled="!selectedFile || isUploading"
            @click="uploadFile"
          >
            <span>{{ isUploading ? '正在上传...' : '执行更新' }}</span>
            <div class="btn-shadow"></div>
          </button>
          
          <button class="action-btn secondary" @click="generateQrCode">
            <span>获取 APP 二维码</span>
            <div class="btn-shadow"></div>
          </button>
        </div>
      </div>

      <!-- Tab 2: 奖品管理 -->
      <div v-if="currentTab === 'prize'">
        <h1>奖品管理</h1>
        <p class="subtitle">奖品库配置 /// 抽奖设置</p>

        <!-- 添加奖品表单 -->
        <div class="prize-form">
          <div class="form-row">
            <input v-model="newPrize.name" placeholder="奖品名称 (如: iPhone 16)" class="glitch-input small">
          </div>
          <div class="form-row flex">
            <input v-model="newPrize.count" type="number" placeholder="数量" class="glitch-input small">
             <select v-model="newPrize.level" class="glitch-select">
              <option value="special">特等奖</option>
              <option value="first">一等奖</option>
              <option value="second">二等奖</option>
              <option value="third">三等奖</option>
              <option value="participation">参与奖</option>
            </select>
          </div>
          <button class="action-btn secondary small" @click="addPrize">
            <span>➕ 添加奖品</span>
            <div class="btn-shadow"></div>
          </button>
        </div>

        <!-- 奖品列表 -->
        <div class="prize-list">
          <div v-for="prize in prizes" :key="prize.id" class="prize-item">
            <div class="prize-info">
              <span class="level-tag" :class="prize.level">{{ getLevelLabel(prize.level) }}</span>
              <span class="prize-name">{{ prize.name }}</span>
              <span class="prize-count">x{{ prize.count }} (余:{{ prize.remaining }})</span>
            </div>
            <button class="delete-btn" @click="deletePrize(prize.id)">×</button>
          </div>
          <div v-if="prizes.length === 0" class="empty-hint">暂无奖品数据</div>
        </div>

        <div class="divider"></div>

        <button class="action-btn danger" @click="resetLottery">
          <span>⚠️ 重置抽奖数据</span>
          <div class="btn-shadow"></div>
        </button>
        <p class="subtitle center">包含：中奖记录、去重名单 (库存将恢复)</p>
      </div>

      <!-- Tab 3: 中奖记录管理 (补抽) -->
      <div v-if="currentTab === 'winners'">
        <h1>中奖记录</h1>
        <p class="subtitle">人员管理 /// 作废/补抽</p>
        
        <div class="prize-list"> <!-- Reuse prize-list style -->
           <div v-for="w in winnerList" :key="w.id" class="prize-item">
             <div class="prize-info">
               <span class="level-tag" :class="w.prizeLevel">{{ w.prizeLevelLabel }}</span>
               <span class="prize-name" style="margin-left:5px">{{ w.prizeName }}</span>
               <span style="font-size:12px; margin-left:10px">➡️ {{ w.winnerName }} ({{ w.winnerId }})</span>
             </div>
             <button class="delete-btn" @click="invalidateWinner(w.id)" title="作废重抽">×</button>
           </div>
           <div v-if="winnerList.length === 0" class="empty-hint">暂无中奖记录</div>
        </div>
      </div>

    </div>

    <!-- QR Code Modal -->
    <div v-if="showQrModal" class="modal-overlay show" @click.self="closeQrModal">
      <div class="modal neo-modal qr-modal">
        <div class="modal-header-bar">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        
        <h2>扫码访问 APP</h2>
        <div class="qr-container">
          <img :src="qrCodeUrl" alt="App QR Code" />
        </div>
        <p class="qr-hint">请使用手机相机扫码预览</p>
        
        <button class="modal-close" @click="closeQrModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'

// 状态管理
const isAuthenticated = ref(false)
const passwordInput = ref('')
const verifiedToken = ref('') // 存储通过验证的 Token
const isChecking = ref(false)
const loginError = ref(false)
const isChecking = ref(false)
const loginError = ref(false)
const currentTab = ref('data') // 'data' | 'prize' | 'winners'

// 上传相关
const selectedFile = ref(null)

// 上传相关
const selectedFile = ref(null)
const statusMessage = ref('')
const statusType = ref('')
const isUploading = ref(false)
const fileInputRef = ref(null)
const parseProgress = ref('') // 解析进度提示

// 奖品管理相关
const prizes = ref([])
const newPrize = ref({ name: '', count: '', level: 'participation' })

const getLevelLabel = (level) => {
  const map = {
    special: '特等奖',
    first: '一等奖',
    second: '二等奖',
    third: '三等奖',
    participation: '参与奖'
  }
  return map[level] || level
}

const fetchPrizes = async () => {
    try {
        const res = await fetch('/api/prizes')
        const json = await res.json()
        if (json.success) prizes.value = json.data
    } catch (e) {
        console.error(e)
    }
}

const addPrize = async () => {
    if(!newPrize.value.name || !newPrize.value.count) return
    try {
        const res = await fetch('/api/prizes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': verifiedToken.value 
            },
            body: JSON.stringify({
                ...newPrize.value,
                levelLabel: getLevelLabel(newPrize.value.level)
            })
        })
        const json = await res.json()
        if (json.success) {
            newPrize.value = { name: '', count: '', level: 'participation' }
            fetchPrizes()
        } else {
            alert(json.message)
        }
    } catch (e) {
        alert('添加失败')
    }
}

const deletePrize = async (id) => {
    if (!confirm('确定删除该奖品吗？')) return
    try {
        await fetch(`/api/prizes/${id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': verifiedToken.value }
        })
        fetchPrizes()
    } catch (e) {
        alert('删除失败')
    }
}

const resetLottery = async () => {
    if (!confirm('严重警告：这将清空所有中奖记录和去重名单！\n确定要重置吗？')) return
    try {
        const res = await fetch('/api/lottery/reset', {
            method: 'POST',
            headers: { 'x-auth-token': verifiedToken.value }
        })
        const json = await res.json()
        alert(json.message)
        fetchPrizes()
    } catch (e) {
        alert('重置失败')
    }
}

// 中奖记录管理
const winnerList = ref([])

const fetchWinners = async () => {
  try {
    const res = await fetch('/api/lottery/winners')
    const json = await res.json()
    if (json.success) winnerList.value = json.data
  } catch(e) { console.error(e) }
}

const invalidateWinner = async (recordId) => {
    if(!confirm('确定作废该条记录吗？\n该员工将可以重新参与抽奖，奖品库存会+1。')) return
    try {
        const res = await fetch('/api/lottery/invalidate', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-auth-token': verifiedToken.value 
            },
            body: JSON.stringify({ id: recordId })
        })
        const json = await res.json()
        if(json.success) {
            alert(json.message)
            fetchWinners() // Refresh
            fetchPrizes()  // Refresh stock
        } else {
            alert(json.message)
        }
    } catch(e) {
        alert('操作失败')
    }
}

// 登录逻辑
const handleLogin = async () => {
  if (!passwordInput.value) return
  isChecking.value = true
  loginError.value = false

  try {
    const response = await fetch('/api/check-auth', {
      method: 'POST',
      headers: { 'x-auth-token': passwordInput.value }
    })
    const result = await response.json()
    
    if (result.success) {
      isAuthenticated.value = true
      verifiedToken.value = passwordInput.value
      fetchPrizes() // 登录成功后获取奖品
      fetchWinners()
    } else {
      loginError.value = true
      passwordInput.value = ''
    }
  } catch (e) {
    loginError.value = true
  } finally {
    isChecking.value = false
  }
}

const logout = () => {
  isAuthenticated.value = false
  passwordInput.value = ''
  verifiedToken.value = ''
  selectedFile.value = null
  statusMessage.value = ''
}

// 文件选择逻辑
const triggerFileInput = () => {
  fileInputRef.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return
  selectedFile.value = file
  statusMessage.value = ''
  parseProgress.value = ''
}

/**
 * 在前端解析 Excel 文件 (适配 Cloudflare Pages)
 * @param {File} file - Excel 文件
 * @returns {Promise<Array>} 解析后的数据数组
 */
const parseExcelInBrowser = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawData = XLSX.utils.sheet_to_json(worksheet)
        
        // 格式化数据：自动识别列名
        const formattedData = rawData.map(row => {
          const idKey = Object.keys(row).find(k => k.includes('号') && (k.includes('工') || k.includes('编')))
          const nameKey = Object.keys(row).find(k => k.includes('名'))
          // 优先识别"桌号"或"桌",其次识别"座位"或"座"
          const seatKey = Object.keys(row).find(k => k.includes('桌')) || Object.keys(row).find(k => k.includes('座'))
          
          return {
            id: String(row[idKey || '员工编号'] || ''),
            name: String(row[nameKey || '姓名'] || ''),
            seat: String(row[seatKey || '桌号'] || '')
          }
        }).filter(item => item.id && item.name)
        
        resolve(formattedData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 上传逻辑 (前端解析 Excel，发送 JSON)
const uploadFile = async () => {
  if (!selectedFile.value) return

  isUploading.value = true
  statusMessage.value = ''
  parseProgress.value = '正在解析 Excel 文件...'

  try {
    // 1. 在前端解析 Excel
    const parsedData = await parseExcelInBrowser(selectedFile.value)
    
    if (parsedData.length === 0) {
      throw new Error('文件为空或格式不正确,请检查是否包含员工编号、姓名、桌号列')
    }
    
    parseProgress.value = `已解析 ${parsedData.length} 条记录，正在上传...`

    // 2. 发送 JSON 数据到后端
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': verifiedToken.value 
      },
      body: JSON.stringify({ data: parsedData })
    })

    const result = await response.json()

    if (result.success) {
      statusType.value = 'success'
      statusMessage.value = `> 成功：已更新 ${parsedData.length} 条记录`
      parseProgress.value = ''
      setTimeout(() => {
        selectedFile.value = null
        if (fileInputRef.value) fileInputRef.value.value = ''
        statusMessage.value = ''
      }, 3000)
    } else {
      statusType.value = 'error'
      statusMessage.value = '> 错误：' + result.message
      parseProgress.value = ''
    }
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = '> 错误：' + error.message
    parseProgress.value = ''
  } finally {
    isUploading.value = false
  }
}

// QR Code Logic
const showQrModal = ref(false)
const qrCodeUrl = ref('')

const generateQrCode = async () => {
  try {
    const url = window.location.origin
    qrCodeUrl.value = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
    showQrModal.value = true
  } catch (err) {
    console.error(err)
    statusType.value = 'error'
    statusMessage.value = '> 错误：二维码生成失败'
  }
}

const closeQrModal = () => {
  showQrModal.value = false
}
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  max-width: 500px;
  padding: 20px;
}

/* 装饰 */
.graffiti-decoration {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}
.triangle-decoration {
  top: -30px; left: -20px;
  width: 0; height: 0;
  border-left: 30px solid transparent;
  border-right: 30px solid transparent;
  border-bottom: 50px solid var(--neon-purple);
  transform: rotate(-15deg);
}
.lines-decoration {
  bottom: -40px; right: -40px;
  width: 100px; height: 20px;
  background: repeating-linear-gradient(
    45deg,
    var(--neon-green),
    var(--neon-green) 10px,
    transparent 10px,
    transparent 20px
  );
}

/* Neo-Brutalism Card (Shared) */
.card {
  position: relative;
  background: var(--card-bg);
  border: 4px solid var(--border-color);
  padding: 40px 30px;
  z-index: 10;
  box-shadow: 15px 15px 0px var(--border-color);
}

.card-header { margin-bottom: 40px; }

.logo-tag {
  display: inline-block;
  background: var(--neon-purple);
  color: white;
  font-weight: 800;
  padding: 4px 8px;
  font-size: 14px;
  margin-bottom: 10px;
}

h1 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 900;
  text-transform: uppercase;
  color: white;
  margin: 0;
  line-height: 0.9;
}

/* Login Styles */
.input-wrapper {
  position: relative;
  margin-bottom: 30px;
}

input {
  width: 100%;
  padding: 20px;
  background: black;
  border: 2px solid white;
  color: var(--neon-green);
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  position: relative;
  z-index: 2;
  outline: none;
}
input:focus { border-color: var(--neon-green); }

.input-shadow {
  position: absolute;
  top: 5px; left: 5px;
  width: 100%; height: 100%;
  background: var(--neon-purple);
  z-index: 1;
}

.error-msg {
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-weight: bold;
  margin-bottom: 20px;
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Button */
.action-btn {
  position: relative;
  width: 100%;
  height: 60px;
  background: transparent;
  border: none;
  cursor: pointer;
  margin-bottom: 20px;
}
.action-btn.secondary {
  margin-top: 10px;
}

.action-btn span {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: white;
  color: black;
  font-family: 'JetBrains Mono', sans-serif;
  font-weight: 900;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid black;
  z-index: 2;
  transition: transform 0.1s;
}

.action-btn.secondary span {
  background: black;
  color: white;
  border-color: white;
  font-size: 16px;
}

.action-btn:disabled span {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

.btn-shadow {
  position: absolute;
  top: 6px; left: 6px;
  width: 100%; height: 100%;
  background: var(--neon-green);
  z-index: 1;
}
.action-btn.secondary .btn-shadow {
  background: var(--neon-purple);
  border: 2px solid white;
}

.action-btn:active:not(:disabled) span { transform: translate(6px, 6px); }
.action-btn:hover:not(:disabled) span { background: var(--neon-cyan); }
.action-btn.secondary:hover:not(:disabled) span { background: #333; color: var(--neon-green); }

.back-link {
  text-align: center;
  margin-top: 20px;
}
.back-link a {
  color: #666;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.back-link a:hover { color: white; text-decoration: underline; }


/* Admin Interface Styles */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #333;
  padding-bottom: 15px;
}

.status-badge {
  background: var(--neon-green);
  color: black;
  font-weight: 900;
  padding: 2px 6px;
  font-size: 12px;
}

.logout-btn {
  background: transparent;
  border: 1px solid #555;
  color: #555;
  padding: 5px 10px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
}
.logout-btn:hover { color: red; border-color: red; }

.subtitle {
  color: #888;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  margin-bottom: 30px;
}

.upload-zone {
  border: 4px dashed #444;
  padding: 40px;
  text-align: center;
  margin-bottom: 30px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255,255,255,0.02);
}

.upload-zone:hover {
  border-color: var(--neon-cyan);
  background: rgba(0, 255, 255, 0.05);
}

.upload-zone.has-file {
  border-style: solid;
  border-color: var(--neon-green);
}

.icon-box {
  font-size: 40px;
  color: #444;
  margin-bottom: 10px;
}
.file-type-tag {
  background: #222;
  padding: 2px 6px;
  font-size: 10px;
  color: #666;
  margin-top: 10px;
  display: inline-block;
}

.file-icon { font-size: 30px; margin-bottom: 10px; }
.filename { font-weight: bold; margin-bottom: 5px; word-break: break-all; }
.warning { color: #ff0055; font-size: 10px; font-weight: bold; }

.hidden-input { display: none; }

.status-box {
  padding: 15px;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: bold;
  border: 2px solid;
}
.status-box.success {
  background: rgba(204, 255, 0, 0.1);
  border-color: var(--neon-green);
  color: var(--neon-green);
}
.status-box.error {
  background: rgba(255, 0, 85, 0.1);
  border-color: #ff0055;
  color: #ff0055;
}

.progress-box {
  padding: 15px;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: bold;
  border: 2px dashed var(--neon-cyan);
  background: rgba(0, 255, 255, 0.05);
  color: var(--neon-cyan);
  text-align: center;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Modal Overlay & QR Styles */
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
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.8) translateY(50px); }
  60% { transform: scale(1.05) translateY(-10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
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

/* Prize Management Styles */
.tab-nav {
  display: flex;
  margin-bottom: 30px;
  border-bottom: 2px solid #444;
}
.tab-btn {
  background: transparent;
  color: #666;
  border: none;
  padding: 10px 20px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: bold;
  cursor: pointer;
  border-bottom: 4px solid transparent;
  transition: all 0.3s;
}
.tab-btn:hover { color: white; }
.tab-btn.active {
  color: var(--neon-cyan);
  border-bottom-color: var(--neon-cyan);
}

.prize-form {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border: 1px solid #444;
  margin-bottom: 20px;
}
.form-row { margin-bottom: 15px; }
.form-row.flex { display: flex; gap: 10px; }

.glitch-input.small {
  padding: 10px;
  font-size: 14px;
  height: 40px;
}
.glitch-select {
  background: black;
  color: white;
  border: 2px solid white;
  padding: 0 10px;
  height: 40px;
  font-family: 'JetBrains Mono';
  flex: 1;
}

.action-btn.small { height: 40px; margin-bottom: 0; }
.action-btn.small span { font-size: 14px; }
.action-btn.danger .btn-shadow { background: #ff0055; }
.action-btn.danger:hover span { color: #ff0055; background: #222; }

.prize-list {
  margin-bottom: 30px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #333;
}
.prize-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #333;
  background: #000;
}
.prize-info { display: flex; align-items: center; gap: 10px; color: white; }
.level-tag {
  font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold;
}
.level-tag.special { background: #ff0055; color: white; }
.level-tag.first { background: #bf00ff; color: white; }
.level-tag.second { background: #00ffff; color: black; }
.level-tag.third { background: #ccff00; color: black; }
.level-tag.participation { background: #555; color: white; }

.prize-name { font-weight: bold; font-family: 'Noto Sans SC', sans-serif; }
.prize-count { color: #888; font-size: 12px; }

.delete-btn {
  background: transparent;
  border: 1px solid #444;
  color: #666;
  width: 24px; height: 24px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.delete-btn:hover { color: red; border-color: red; }

.empty-hint {
  padding: 20px; text-align: center; color: #666; font-size: 12px;
}
.divider {
  height: 1px; background: #333; margin: 30px 0;
}
.subtitle.center { text-align: center; margin-top: 10px; }

.qr-modal h2 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 900;
  margin: 20px 0;
  color: black;
}

.qr-container {
  padding: 10px;
  background: white;
  display: inline-block;
  border: 2px solid black;
  margin-bottom: 10px;
}
.qr-container img {
  display: block;
  width: 200px; /* Force size */
  height: 200px;
}

.qr-hint {
  font-family: 'JetBrains Mono', monospace;
  color: #666;
  font-size: 12px;
  margin-bottom: 20px;
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

/* Mobile Responsive */
@media (max-width: 600px) {
  .container {
    padding: 10px;
  }
  
  .card {
    padding: 30px 20px;
    border-width: 3px;
    box-shadow: 8px 8px 0px var(--border-color);
  }
  
  h1 {
    font-size: 28px;
  }
  
  .logo-tag {
    font-size: 12px;
  }
  
  .upload-zone {
    padding: 20px;
  }
  
  .icon-box {
    font-size: 32px;
  }
  
  .subtitle {
    font-size: 10px;
  }
  
  .triangle-decoration {
    border-left-width: 20px;
    border-right-width: 20px;
    border-bottom-width: 35px;
    top: -20px;
    left: -10px;
  }
  
  .lines-decoration {
    width: 60px;
    height: 15px;
    bottom: -25px;
    right: -20px;
  }

  .action-btn {
    height: 50px;
  }

  .action-btn span {
    font-size: 16px;
  }
}
</style>

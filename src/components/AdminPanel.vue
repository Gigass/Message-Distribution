<template>
  <div class="container">
    <!-- 装饰元素 -->
    <div class="graffiti-decoration triangle-decoration"></div>
    <div class="graffiti-decoration lines-decoration"></div>

    <!-- 登录界面 -->
    <div v-if="!isAuthenticated" class="card neo-brutalism login-card">
      <div class="card-header">
        <div class="logo-tag">ADMIN_ACCESS</div>
        <h1>后台管理</h1>
      </div>
      
      <div class="input-wrapper">
        <input 
          v-model="passwordInput" 
          @keypress.enter="handleLogin"
          type="password" 
          placeholder="PASSWORD ///" 
          class="glitch-input"
        >
        <div class="input-shadow"></div>
      </div>

      <div v-if="loginError" class="error-msg">
        > ACCESS_DENIED: WRONG_PASSWORD
      </div>

      <button class="action-btn" @click="handleLogin" :disabled="isChecking">
        <span>{{ isChecking ? 'CHECKING...' : 'UNLOCK SYSTEM' }}</span>
        <div class="btn-shadow"></div>
      </button>

      <div class="back-link">
        <router-link to="/">← BACK_TO_FRONTEND</router-link>
      </div>
    </div>

    <!-- 管理界面 (已解锁) -->
    <div v-else class="card neo-brutalism admin-card">
      <div class="top-bar">
        <span class="status-badge">SYSTEM_UNLOCKED</span>
        <button class="logout-btn" @click="logout">EXIT</button>
      </div>

      <h1>数据上传</h1>
      <p class="subtitle">UPLOAD_ZONE /// EXCEL_FILES_ONLY</p>

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
            <p>CLICK_TO_UPLOAD</p>
            <span class="file-type-tag">.XLSX / .XLS</span>
          </div>
          <div v-else>
            <div class="file-icon">📄</div>
            <p class="filename">{{ selectedFile.name }}</p>
            <p class="warning">WARNING: WILL_OVERWRITE_DATA</p>
          </div>
        </div>
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
          <span>{{ isUploading ? 'UPLOADING...' : 'EXECUTE UPDATE' }}</span>
          <div class="btn-shadow"></div>
        </button>
        
        <button class="action-btn secondary" @click="generateQrCode">
          <span>GET_APP_QR_CODE</span>
          <div class="btn-shadow"></div>
        </button>
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
        
        <h2>SCAN TO ACCESS</h2>
        <div class="qr-container">
          <img :src="qrCodeUrl" alt="App QR Code" />
        </div>
        <p class="qr-hint">Use your phone camera to scan</p>
        
        <button class="modal-close" @click="closeQrModal">CLOSE</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import QRCode from 'qrcode'

// 状态管理
const isAuthenticated = ref(false)
const passwordInput = ref('')
const verifiedToken = ref('') // 存储通过验证的 Token
const isChecking = ref(false)
const loginError = ref(false)

// 上传相关
const selectedFile = ref(null)
const statusMessage = ref('')
const statusType = ref('')
const isUploading = ref(false)
const fileInputRef = ref(null)

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
}

// 上传逻辑
const uploadFile = async () => {
  if (!selectedFile.value) return

  isUploading.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'x-auth-token': verifiedToken.value 
      },
      body: formData
    })

    const result = await response.json()

    if (result.success) {
      statusType.value = 'success'
      statusMessage.value = '> SUCCESS: DATA_UPDATED'
      setTimeout(() => {
        selectedFile.value = null
        if (fileInputRef.value) fileInputRef.value.value = ''
        statusMessage.value = ''
      }, 2000)
    } else {
      statusType.value = 'error'
      statusMessage.value = '> ERROR: ' + result.message
    }
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = '> SYSTEM_FAILURE: NETWORK_ERROR'
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
    statusMessage.value = '> ERROR: QR_GEN_FAILED'
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

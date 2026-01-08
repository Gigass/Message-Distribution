# 桌号查询系统 (Table Inquiry System)

这是一个基于 **Vue 3** (前端) 和 **Node.js/Express** (后端) 的企业桌号查询系统。

## ✨ 功能特性

- 🔍 **快速查询**：支持通过姓名或工号模糊/精确查询桌号。
- 📱 **现代界面**：响应式设计，适配移动端和桌面端，拥有精美的动态粒子背景。
- ⚙️ **后台管理**：提供独立的安全后台，可直接上传 Excel 文件更新数据。
- 🛡️ **安全验证**：后台上传需校验口令。
- 🔄 **自动同步**：上传 Excel 后系统自动解析，无需重启，前台即刻生效。

## 🛠️ 技术栈

- **前端**：Vue 3, Vite, Vue Router
- **后端**：Node.js, Express, Multer (文件上传)
- **数据处理**：SheetJS (xlsx)
- **样式**：CSS3 (Glassmorphism 风格)

## 🚀 快速开始

### 1. 安装依赖

确保本地已安装 Node.js (推荐 v14+)。

```bash
npm install
```

### 2. 开发模式

开发模式下，你需要同时启动后端服务（API）和前端开发服务。

**终端 1 (后端服务)**：

```bash
node server.js
```

_API 服务运行在 `http://localhost:3000`_

**终端 2 (前端热更新)**：

```bash
npm run dev
```

_前端页面运行在 `http://localhost:5173` (Vite 会自动代理 API 请求到 3000 端口)_

### 3. 生产环境构建与预览

如果想查看打包后的效果：

```bash
npm run build
# 构建完成后，静态文件会生成在 dist/ 目录
```

此时直接运行后端服务即可（它会自动托管 `dist` 目录）：

```bash
node server.js
```

访问 `http://localhost:3000` 即可看到完整的生产环境应用。

---

## 📦 打包与部署

本系统设计为**单体部署**，即前端打包为静态资源后，由 Node.js 后端统一提供服务。

### 部署步骤

1.  **构建前端**：
    在本地或构建服务器上运行：

    ```bash
    npm run build
    ```

    这将生成 `dist/` 文件夹。

2.  **准备文件**：
    将以下文件/目录复制到服务器：

    - `dist/` (刚才生成的构建产物)
    - `server.js` (后端入口)
    - `package.json` (依赖定义)
    - `package-lock.json`
    - `info.xlsx` (可选，初始数据文件，没有也会自动处理)

3.  **安装生产依赖**：
    在服务器上运行：

    ```bash
    npm install --production
    ```

4.  **启动服务**：

    ```bash
    # 前台运行
    node server.js

    # 或者使用 pm2 后台运行 (推荐)
    npm install -g pm2
    pm2 start server.js --name "seat-system"
    ```

5.  **访问**：
    打开浏览器访问 `http://服务器IP:3000`。
    - 前台：`/`
    - 后台：`/admin`

## ⚙️ 配置说明

### 修改管理员口令

打开 `server.js`，找到以下代码行进行修改：

```javascript
const ADMIN_PASSWORD = "admin"; // 修改为你想要的口令
```

建议在生产环境中使用环境变量来管理敏感信息。

### Excel 格式要求

系统支持 `.xlsx` 和 `.xls` 格式，建议包含以下列（系统会自动模糊匹配）：

- **工号** / 员工编号
- **姓名**
- **桌号**

---

## 📂 项目结构

```
├── dist/               # 前端构建产物 (由 npm run build 生成)
├── src/                # Vue 前端源码
│   ├── components/     # 组件 (SeatQuery.vue, AdminPanel.vue)
│   ├── App.vue         # 根组件
│   ├── main.js         # 入口文件
│   └── router.js       # 路由配置
├── server.js           # Node.js 后端服务器
├── vite.config.js      # Vite 配置文件
├── info.xlsx           # 存放桌号数据的 Excel 文件
└── package.json        # 项目配置
```

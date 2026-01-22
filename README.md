# 桌号查询系统 (Table Inquiry System)

这是一个基于 **Vue 3** (前端) 和 **Node.js/Express** (后端) 的企业桌号查询 + 抽奖系统。

## ✨ 功能特性

- 🔍 **快速查询**：支持通过姓名或工号模糊/精确查询桌号。
- 🎰 **抽奖大屏**：奖品配置、滚动抽奖、中奖结果展示与弹窗庆祝。
- ⚙️ **后台管理**：数据上传、奖品管理、中奖记录、作废/补抽。
- 📥 **模板下载**：模板文件独立固定版本（`public/info.xlsx`），上传数据不会覆盖模板。
- 🧾 **人员列表**：后台可查看当前系统内人员数据。
- 🛡️ **口令验证**：多口令配置，奖品/中奖数据按口令隔离。
- 🔄 **刷新数据**：前台/后台提供刷新按钮，无需重新输入口令。

## 🛠️ 技术栈

- **前端**：Vue 3, Vite, Vue Router
- **后端**：Node.js, Express, Multer (文件上传)
- **数据处理**：SheetJS (xlsx)
- **样式**：CSS3 (抽奖 Pop 风格 / 后台 Neo-Brutalism)

## 🚀 快速开始

### 1. 安装依赖

确保本地已安装 Node.js (推荐 v18+)。

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

**访问入口**：

- 前台查询：`http://localhost:5173/#/`
- 抽奖大屏：`http://localhost:5173/#/lottery`
- 后台管理：`http://localhost:5173/#/admin`

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

**访问入口**：

- 前台查询：`http://localhost:3000/#/`
- 抽奖大屏：`http://localhost:3000/#/lottery`
- 后台管理：`http://localhost:3000/#/admin`

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
    - `public/info.xlsx` (模板文件，固定版本；构建时会复制到 dist/)

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
    - 前台：`/#/`
    - 抽奖：`/#/lottery`
    - 后台：`/#/admin`

## ⚙️ 配置说明

### 口令配置 (多口令)

口令从根目录的 `tokens.json` 读取，支持多个口令并隔离奖品/中奖数据：

```json
{
  "tokens": [
    { "id": "default", "password": "MEILIN1!", "label": "默认" },
    { "id": "xincai", "password": "jolywoodxc", "label": "新材" }
  ]
}
```

如果 `tokens.json` 不存在，会使用默认口令 `MEILIN1!`。

### Excel 格式要求

系统支持 `.xlsx` 和 `.xls` 格式，建议包含以下列（系统会自动模糊匹配）：

- **工号** / 员工编号
- **姓名**
- **桌号**

### 模板下载

后台页面提供 “下载 Excel 模板” 按钮，实际下载的是 `public/info.xlsx`（构建后会存在于 `dist/info.xlsx`）。
模板文件为固定版本，上传数据不会覆盖模板。
若下载异常，请确认后端已启动且模板文件存在。

### 数据存储

- Cloudflare Pages 部署：数据存储在 KV（数据库）中。
- Node 本地开发：数据仅保存在内存中（不写入文件）。

---

## 📂 项目结构

```
├── dist/               # 前端构建产物 (由 npm run build 生成)
├── src/                # Vue 前端源码
│   ├── components/     # 组件 (SeatQuery.vue, LotteryPage.vue, AdminPanel.vue)
│   ├── App.vue         # 根组件
│   ├── main.js         # 入口文件
│   └── router.js       # 路由配置
├── server.js           # Node.js 后端服务器
├── tokens.json         # 多口令配置
├── vite.config.js      # Vite 配置文件
├── public/
│   └── info.xlsx       # Excel 模板 (构建时复制到 dist/)
└── package.json        # 项目配置
```

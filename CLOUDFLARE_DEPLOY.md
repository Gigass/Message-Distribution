# Cloudflare Pages 部署指南

本项目已针对 Cloudflare Pages 进行优化，使用**前端解析 Excel + KV 存储**的架构。

## 🚀 快速部署

### 步骤 1: 构建项目

```bash
npm run build
```

### 步骤 2: 在 Cloudflare Pages 上部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** 页面
3. 点击 **Create a project** > **Connect to Git**
4. 选择你的 GitHub 仓库 `Message-Distribution`
5. 配置构建设置：
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. 点击 **Save and Deploy**

### 步骤 3: 配置 KV 存储（必须）

为了让数据能够持久化保存，你需要配置 Cloudflare KV：

1. 在 Cloudflare Dashboard 中，进入 **Workers & Pages** > **KV**
2. 点击 **Create a namespace**
3. 命名为 `SEAT_DATA`（或其他名称）
4. 创建完成后，返回你的 Pages 项目
5. 进入 **Settings** > **Functions** > **KV namespace bindings**
6. 添加绑定：
   - **Variable name**: `SEAT_DATA`
   - **KV namespace**: 选择你刚创建的命名空间
7. 点击 **Save**
8. 重新部署项目（或等待下次部署自动生效）

### 步骤 4: 配置环境变量（可选）

如需修改管理员密码：

1. 进入项目 **Settings** > **Environment variables**
2. 添加变量：
   - **Variable name**: `ADMIN_PASSWORD`
   - **Value**: 你的密码
3. 点击 **Save**

## 📁 项目结构

```
Message-Distribution/
├── dist/                  # 构建输出（前端静态文件）
├── functions/             # Cloudflare Pages Functions
│   └── api/
│       ├── check-auth.js  # POST /api/check-auth - 验证管理员口令
│       ├── data.js        # GET /api/data - 获取桌号数据
│       └── upload.js      # POST /api/upload - 上传数据（接收 JSON）
└── src/                   # Vue 源码
```

## 🔧 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Pages                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐      ┌─────────────────┐      ┌─────────────┐ │
│  │   Frontend  │ ───> │ Pages Functions │ ───> │  KV Storage │ │
│  │   (Vue 3)   │      │  (Workers API)  │      │ (持久化存储) │ │
│  └─────────────┘      └─────────────────┘      └─────────────┘ │
│        │                                                        │
│        │ Excel 文件                                             │
│        ↓                                                        │
│  ┌─────────────┐                                                │
│  │ SheetJS 库  │  在浏览器中解析 Excel → 发送 JSON 到后端        │
│  │ (前端解析)  │                                                │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 为什么使用前端解析？

Cloudflare Workers/Functions 运行时不支持 Node.js 的完整生态，包括 `xlsx` 库。因此我们在浏览器中使用 SheetJS 解析 Excel 文件，然后发送解析后的 JSON 数据到后端。

## ✅ 功能支持

| 功能       | 状态        | 说明                        |
| ---------- | ----------- | --------------------------- |
| 桌号查询   | ✅ 完全支持 | 从 KV 读取数据              |
| 管理员登录 | ✅ 完全支持 | -                           |
| 上传 Excel | ✅ 完全支持 | 前端解析 Excel，后端存 JSON |
| 生成二维码 | ✅ 完全支持 | 在前端生成                  |
| 数据持久化 | ✅ 完全支持 | 使用 Cloudflare KV          |

## 🔍 故障排查

### 错误：`Unexpected token '<'`

**原因**：API 请求返回了 HTML 而不是 JSON

**解决方案**：

1. 确保 `functions/` 目录在仓库中
2. 检查 Cloudflare 部署日志，确认 Functions 已被识别
3. 确认 API 路径正确（`/api/data`, `/api/check-auth`, `/api/upload`）

### 错误：`未配置 KV 存储`

**原因**：没有配置 Cloudflare KV 命名空间绑定

**解决方案**：按照上述「步骤 3」配置 KV 存储

### 错误：`405 Method Not Allowed`

**原因**：Functions 文件没有正确导出请求处理函数

**解决方案**：确保 Functions 文件导出了正确的函数名：

- `onRequestGet` 处理 GET 请求
- `onRequestPost` 处理 POST 请求
- `onRequestOptions` 处理 CORS 预检请求

### 上传后数据没有更新

**原因**：可能是 KV 的缓存延迟

**解决方案**：

1. 刷新页面重试
2. KV 存储有 ~60 秒的 eventual consistency 延迟

## 🔗 相关链接

- [Cloudflare Pages Functions 文档](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)
- [SheetJS 文档](https://docs.sheetjs.com/)

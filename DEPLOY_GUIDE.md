# Deno Deploy 部署指南

## 问题说明

你的项目原本使用 **Node.js + Express**，但 Deno Deploy 只支持 **Deno 运行时**。

当前已实现 **两种解决方案**：

---

## ✅ 方案 1：使用 Hash 路由（已实施，推荐快速部署）

### 修改内容

- 将 Vue Router 从 `createWebHistory` 改为 `createWebHashHistory`
- URL 格式变化：
  - 首页：`https://message-distribution.gigass.deno.net/`
  - 管理页：`https://message-distribution.gigass.deno.net/#/admin` ⚠️ 注意 `#` 符号

### 优点

- ✅ 无需服务器端路由支持
- ✅ 可以直接部署 `dist` 目录到任何静态托管服务
- ✅ Deno Deploy、Vercel、Netlify、GitHub Pages 都支持

### 缺点

- ❌ URL 中会有 `#` 符号（不够美观）
- ❌ SEO 不友好（但对于内部系统影响不大）

### 部署步骤

1. **构建项目**：

   ```bash
   npm run build
   ```

2. **部署到 Deno Deploy**：

   - 方式 A：通过 GitHub 集成

     - 将代码推送到 GitHub
     - 在 Deno Deploy 控制台选择 "Deploy from GitHub"
     - 选择仓库和分支
     - **构建命令**：`npm run build`
     - **输出目录**：`dist`
     - **入口文件**：留空（静态托管）

   - 方式 B：手动上传
     - 在 Deno Deploy 控制台创建新项目
     - 上传 `dist` 目录中的所有文件

3. **访问**：
   - 首页：`https://your-project.deno.dev/`
   - 管理页：`https://your-project.deno.dev/#/admin`

---

## 🚀 方案 2：使用 Deno 原生服务器（需要额外配置）

### 文件说明

已创建 `main.ts` 作为 Deno Deploy 的入口文件。

### 当前限制

- ⚠️ Excel 解析功能需要使用 Deno 兼容的库（Node.js 的 `xlsx` 包不兼容）
- ⚠️ 需要找到或实现 Deno 版本的 Excel 解析库

### 如果要使用此方案

1. **安装 Deno 兼容的 Excel 库**（需要研究）：
   可能的选项：

   - https://deno.land/x/sheetjs
   - 或者使用 npm: 模块（Deno 支持部分 npm 包）

2. **修改 `main.ts`** 中的 `parseExcelBuffer` 函数

3. **部署配置**：

   - **入口文件**：`main.ts`
   - **构建命令**：`npm run build`（先构建前端）
   - **环境变量**：
     - `ADMIN_PASSWORD=你的密码`

4. **优点**：
   - ✅ 保持 History 路由（URL 更美观）
   - ✅ 完整的后端功能

---

## 📊 两种方案对比

| 特性       | Hash 路由（方案 1） | Deno 服务器（方案 2） |
| ---------- | ------------------- | --------------------- |
| 部署难度   | ⭐ 简单             | ⭐⭐⭐ 复杂           |
| URL 美观度 | ❌ 有 # 符号        | ✅ 干净的 URL         |
| Excel 上传 | ✅ 需要后端 API     | ✅ 完整支持           |
| 维护成本   | ⭐ 低               | ⭐⭐⭐ 高             |
| 当前状态   | ✅ 已实施           | ⚠️ 需要额外开发       |

---

## 🎯 推荐方案

### 对于当前项目：**使用方案 1（Hash 路由）**

理由：

1. 这是一个内部系统，URL 美观度不是关键
2. 部署简单，维护成本低
3. 立即可用，无需额外开发

### 访问方式变化

**之前（本地）**：

- 管理页：`http://localhost:3000/admin`

**现在（Deno Deploy）**：

- 管理页：`https://message-distribution.gigass.deno.net/#/admin`

只需要在 URL 中加入 `#` 符号即可！

---

## 🔄 如何切换回 History 路由

如果将来迁移到支持 Node.js 的平台（如 Heroku、Railway、Render），只需：

1. 修改 `src/router.js`：

   ```javascript
   // 改回
   import { createRouter, createWebHistory } from "vue-router";

   const router = createRouter({
     history: createWebHistory(), // 改回这里
     routes,
   });
   ```

2. 重新构建：

   ```bash
   npm run build
   ```

3. 部署时使用 `node server.js` 启动

---

## 📝 当前部署状态

- ✅ 已修改为 Hash 路由模式
- ✅ 已重新构建 `dist` 目录
- ✅ 可以直接部署到 Deno Deploy

**下一步**：将最新的 `dist` 目录部署到 Deno Deploy 即可解决 `/admin` 访问问题！

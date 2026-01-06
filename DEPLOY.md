# Vercel 部署指南

## 部署步骤

### 1. 准备工作

确保代码已提交到 GitHub：

```bash
git add .
git commit -m "feat: add Vercel deployment config"
git push
```

### 2. 在 Vercel 上部署

#### 方式一：通过 Vercel Dashboard（推荐）

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 选择您的 `Message-Distribution` 仓库
5. 配置项目：
   - **Framework Preset**: 选择 "Other"
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. 点击 "Deploy"

#### 方式二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

### 3. 环境变量（可选）

如果需要修改管理员密码，在 Vercel Dashboard 中：

1. 进入项目设置 (Settings)
2. 选择 "Environment Variables"
3. 添加：
   - Key: `ADMIN_PASSWORD`
   - Value: 您的密码

### 4. 访问应用

部署成功后，Vercel 会提供一个 URL，例如：

- 前台：`https://your-project.vercel.app/`
- 后台：`https://your-project.vercel.app/admin`

## 注意事项

1. **数据持久化**：由于 Vercel 是 Serverless 环境，每次部署或实例重启后，内存中的数据会丢失。如需持久化，建议：

   - 将 `info.xlsx` 提交到 Git 仓库
   - 或使用外部存储服务（如 Vercel Blob Storage）

2. **冷启动**：首次访问可能需要几秒钟启动时间

3. **自定义域名**：可在 Vercel Dashboard 中配置自定义域名

## 故障排查

如果部署失败，检查：

1. Vercel 构建日志
2. 确保 `dist` 目录已生成（本地运行 `npm run build`）
3. 确保所有依赖都在 `package.json` 中

## 本地测试

部署前可以本地测试：

```bash
npm run build
npm start
# 访问 http://localhost:3000
```

# Fuderation Reader

聊天记录阅读器 - 用于查看导出的聊天记录

## 部署到 GitHub Pages

1. 新建 GitHub 仓库（如 `chat-reader`）

2. 将此目录内容推送到仓库：
```bash
cd reader
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

3. 在仓库设置中启用 GitHub Pages：
   - 进入 Settings → Pages
   - Source 选择 `gh-pages` 分支
   - 点击 Save

4. 访问 `https://<用户名>.github.io/<仓库名>/`

## 本地开发

```bash
npm install
npm run build   # 构建
npm run serve   # 本地预览 http://localhost:3000
```

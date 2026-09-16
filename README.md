# 🐳 WhaleTool · 工具合辑

一个纯前端的在线小工具合辑 —— 免安装、免登录、数据不出本地。打开网页就能用。

- 🌐 **在线访问**：<https://imalasong.github.io/whaletool/>
- 📦 **仓库地址**：<https://github.com/imalasong/whaletool>

---

## 目录结构

```
whaletool/
├── index.html              # 合辑首页（卡片网格 + 搜索 + 分类筛选）
├── assets/
│   ├── style.css           # 全站共享样式
│   ├── tools.js            # ⭐ 工具注册表（加工具只改这里）
│   └── app.js              # 首页渲染与搜索逻辑
├── tools/
│   └── image-tool.html     # 批量图片展示工具
├── .nojekyll               # 让 GitHub Pages 跳过 Jekyll 处理
└── README.md
```

## 已上线工具

| 工具 | 说明 | 目录 |
| --- | --- | --- |
| 批量图片展示 | 粘贴一堆图片 URL，一键生成画廊，支持灯箱 / 键盘翻页 | `tools/image-tool.html` |

---

## 怎么添加新工具

1. **放文件**：把工具页面丢进 `tools/` 目录。
   推荐写成**单个自包含的 HTML**（CSS/JS 内联），这样零依赖、不会踩路径坑。
   如果工具确实需要多文件，就建子目录，例如 `tools/my-tool/index.html`。

2. **加一条记录**：编辑 `assets/tools.js`，往 `TOOLS` 数组里追加一个对象。

```js
{
  id: "json-format",              // 唯一标识，英文，别重复
  name: "JSON 格式化",             // 工具名
  desc: "粘贴 JSON 一键美化 / 压缩 / 校验。",  // 一句话描述
  icon: "🧩",                      // 卡片图标 emoji
  href: "tools/json-format.html", // 相对首页的路径
  tags: ["JSON", "格式化", "开发"],// 搜索用的标签
  category: "dev",                // 分类 key：image | text | dev | other
  badge: "NEW",                   // 可选：角标
  date: "2026-09-16"              // 可选：上线日期
}
```

3. **刷新**即可。卡片、分类计数、搜索索引都会自动更新，不需要改 HTML。

### 想加新分类？

编辑 `assets/tools.js` 顶部的 `CATEGORIES` 数组，加一行：

```js
{ key: "calc", label: "计算", icon: "🧮" }
```

再把对应工具的 `category` 设成 `calc` 就行。

---

## 本地预览

因为用了 `assets/tools.js` 而不是 `fetch` 拉 JSON，**直接双击 `index.html` 也能跑**（`file://` 协议下正常）。

想更接近线上环境的话，起个静态服务器：

```bash
# 在 whaletool 目录下
python -m http.server 8080
# 然后打开 http://localhost:8080
```

---

## 部署到 GitHub Pages

已经部署好了，日常更新只需要三步：

```bash
git add .
git commit -m "feat: 新增 xxx 工具"
git push
```

GitHub Pages 会在 1～2 分钟内自动重新构建，访问地址不变：
<https://imalasong.github.io/whaletool/>

<details>
<summary>首次部署是怎么做的（备查）</summary>

```bash
git init
git add .
git commit -m "init: WhaleTool 工具合辑"
git branch -M main
git remote add origin https://github.com/imalasong/whaletool.git
git push -u origin main
```

然后仓库 **Settings → Pages**：Source 选 `Deploy from a branch`，Branch 选 `main` + `/ (root)`，保存。

</details>

---

## 设计说明

- **浅色现代风**：柔和渐变底 + 白色卡片 + 品牌青绿渐变（`#0f766e → #0891b2`）。
- **零依赖**：没有引入任何 CDN 库，纯原生 HTML/CSS/JS，加载快、离线可用。
- **响应式**：桌面多列网格，窄屏自动收成单列。
- **可搜索**：支持按名称、描述、标签模糊搜索；`/` 聚焦搜索框，`Esc` 清空。
- **无障碍**：卡片整块可点，键盘可聚焦，遵循 `prefers-reduced-motion`。

## License

MIT

# 🐳 WhaleTool · 工具合辑

一个纯前端的在线小工具合辑 —— 免安装、免登录、数据不出本地。打开网页就能用。

- 🌐 **在线访问**：<https://imalasong.github.io/whaletool/>
- 📦 **仓库地址**：<https://github.com/imalasong/whaletool>

---

## 目录结构

```
whaletool/
├── index.html              # 合辑首页（卡片网格 + 搜索 + 分类筛选 + 排序）
├── assets/
│   ├── style.css           # 全站共享样式（含子工具页公用组件）
│   ├── tools.js            # ⭐ 工具注册表（加工具只改这里）
│   └── app.js              # 首页渲染、搜索与排序逻辑
├── tools/                  # 28 个自包含工具页
├── .nojekyll               # 让 GitHub Pages 跳过 Jekyll 处理
└── README.md
```

## 已上线工具（28 个）

### 🖼️ 图片（4）

| 工具 | 说明 | 目录 |
| --- | --- | --- |
| 批量图片展示 | 粘贴一堆图片 URL，一键生成画廊，支持灯箱 / 键盘翻页 | `tools/image-tool.html` |
| 图片压缩 | JPEG/WebP 可调质量；PNG 自带优化编码器（逐行最优滤波 + 调色板量化），压完更大时自动保留原文件 | `tools/image-compress.html` |
| 图片转 Base64 | 生成 Data URL，附 CSS / HTML / JS / Markdown 四种用法 | `tools/img2base64.html` |
| 图片取色器 | 吸取任意像素的 HEX / RGB / HSL，自动提主色与配色方案 | `tools/color-picker.html` |

### ✍️ 文本（6）

| 工具 | 说明 | 目录 |
| --- | --- | --- |
| Markdown 预览 | 手写解析器，支持标题 / 表格 / 代码围栏 / 任务清单，可导出 HTML | `tools/md-preview.html` |
| 文本比对 | LCS 行级 diff + 字符级行内高亮，改动一目了然 | `tools/text-diff.html` |
| 正则测试 | 实时高亮匹配、捕获组表格，内置 10 个常用模板 | `tools/regex-test.html` |
| 字数统计 | 中英数字分开计，附微信 / 微博 / 小红书等平台口径对照 | `tools/word-count.html` |
| 中英排版助手 | 中英文自动补空格、全角标点纠正，7 项规则可单独开关 | `tools/pangu.html` |
| 二维码生成 | 调参生成二维码，PNG / SVG 双格式下载 | `tools/qr-gen.html` |

### 🧰 开发（9）

| 工具 | 说明 | 目录 |
| --- | --- | --- |
| JSON 格式化 | 美化 / 压缩 / 校验，报错定位到具体行列，附结构概览 | `tools/json-format.html` |
| 时间戳转换 | 多时区对照 + 相对时间，一键复制截图三件套 | `tools/timestamp.html` |
| Cron 表达式解析 | 翻译成人话，并列出未来 10 次执行时间 | `tools/cron-parser.html` |
| URL 编解码 | 编解码 + URL 结构拆解 + 查询参数表格化 | `tools/url-codec.html` |
| 哈希计算 | 纯 JS MD5 + SHA-1/256/512，支持文件拖入 | `tools/hash.html` |
| SQL 格式化 | 关键字大写、子句换行，长 SQL 一眼看清层级 | `tools/sql-format.html` |
| Base64 编解码 | 支持 URL-safe 与 Data URL，附编解码前后体积对照 | `tools/base64.html` |
| UUID / 密码生成 | 5 种类型（UUIDv4 / NanoID / 随机密码等）+ 熵值估算 | `tools/uuid.html` |
| 单位换算 | 8 大类单位，一次列出全部等价结果 | `tools/unit-convert.html` |

### 📈 金融（5）

| 工具 | 说明 | 目录 |
| --- | --- | --- |
| 收益率计算器 | 内置 A股 / 港股 / 美股 / 基金费率规则，算保本价、反推目标价 | `tools/profit-calc.html` |
| 仓位管理 | 单笔仓位 / 分批建仓 / 分批止盈 / 组合风险，四个 tab | `tools/position-calc.html` |
| 汇率换算 | 金额与股数双模式，附手续费对成本的影响表 | `tools/fx-convert.html` |
| 定投回测 | CSV / 季节模拟 / 随机三源，输出 IRR、最大回撤与 SVG 曲线 | `tools/dcar.html` |
| 规则化选股器 | 自定义字段与规则筛选候选池，自动生成伪代码 / Python / SQL 留痕 | `tools/stock-screener.html` |

### 🧮 其他（4）

| 工具 | 说明 | 目录 |
| --- | --- | --- |
| 随机抽签 | 支持无放回模式与滚动动画，适合决策 / 抽奖 | `tools/random-pick.html` |
| 周报生成器 | 分类列表 + 状态标签 + 下周计划，贴合日常汇报格式 | `tools/weekly-report.html` |
| 全屏时钟 | 全屏显示 + 倒计时 + 番茄钟，附 8 时区对照 | `tools/clock.html` |
| 演出日历 | 直连 Fantopia 拉取待开售演出，**以场次为单位**按 `sellStartTime` 铺进月历（会员购 / 公开发售分开标注），带开售倒计时与一键跳转购票页；默认合并全部地区（`area`）的活动池，可切单地区；日历格用**场次点阵**（一场一点，超 4 场 `+N`）表达密度，并标注**中国法定节假日 / 调休上班日 / 周末**；点日期看当天开售详情，**同一活动同一天多场只出一张卡**（当天各场次以开售日程块列出） | `tools/event-calendar.html` |

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
  category: "dev",                // 分类 key：image | text | dev | finance | other
  badge: "NEW",                   // 可选：角标
  pop: 0,                         // 可选：常用度权重，用于「最常用」排序
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
- **零依赖**：除二维码工具用到 qrcode-generator 外，全部为原生 HTML/CSS/JS，加载快、离线可用。
- **数据不出本地**：所有计算都在浏览器内完成，不请求任何后端。
- **可搜索可排序**：按名称 / 描述 / 标签模糊搜索；支持默认、最常用、最新上线、按名称四种排序；`/` 聚焦搜索框，`Esc` 清空。
- **响应式**：桌面多列网格，窄屏自动收成单列。
- **无障碍**：卡片整块可点，键盘可聚焦，遵循 `prefers-reduced-motion`。

## License

MIT

/* ============================================================
 * 工具注册表 —— 以后加新工具，只需要在这里 push 一条记录
 * ------------------------------------------------------------
 * 字段说明：
 *   id       唯一标识（英文，勿重复）
 *   name     工具名称
 *   desc     一句话描述
 *   icon     卡片图标（emoji）
 *   href     工具页面路径（相对 index.html）
 *   tags     标签数组，用于搜索 + 展示
 *   category 分类 key，需与 CATEGORIES 中的 key 对应
 *   badge    可选，右上角角标（"NEW" / "HOT"）
 *   date     可选，上线日期 YYYY-MM-DD
 *   pop      可选，数字，热门权重（排序用，越大越靠前）
 * ============================================================ */

const CATEGORIES = [
  { key: "all",     label: "全部",     icon: "✦" },
  { key: "image",   label: "图片",     icon: "🖼" },
  { key: "text",    label: "文本",     icon: "✎" },
  { key: "dev",     label: "开发",     icon: "⌘" },
  { key: "finance", label: "金融",     icon: "📈" },
  { key: "other",   label: "日常",     icon: "◈" }
];

const TOOLS = [
  /* ---------------- 图片 ---------------- */
  {
    id: "image-tool",
    name: "批量图片展示",
    desc: "把一堆图片 URL 粘进来，逗号 / 换行 / 空格混着用也行，一键生成画廊并支持灯箱预览。",
    icon: "🖼",
    href: "tools/image-tool.html",
    tags: ["图片", "画廊", "URL", "灯箱", "批量"],
    category: "image",
    date: "2026-08-17"
  },
  {
    id: "image-compress",
    name: "图片压缩",
    desc: "纯本地压缩，可调质量与最大边长，实时对比压缩前后体积，支持批量与下载。",
    icon: "🗜",
    href: "tools/image-compress.html",
    tags: ["图片", "压缩", "JPG", "WebP", "体积"],
    category: "image",
    badge: "NEW",
    date: "2026-09-20",
    pop: 9
  },
  {
    id: "img2base64",
    name: "图片转 Base64",
    desc: "图片拖进来直接出 Base64 / Data URL，适合内联小图、CSS 背景、接口调试。",
    icon: "🔡",
    href: "tools/img2base64.html",
    tags: ["图片", "Base64", "DataURL", "内联", "编码"],
    category: "image",
    badge: "NEW",
    date: "2026-09-20",
    pop: 7
  },
  {
    id: "color-picker",
    name: "图片取色器",
    desc: "点哪取哪，给出 HEX / RGB / HSL，自动生成 5 个配色方案，可一键复制。",
    icon: "🎨",
    href: "tools/color-picker.html",
    tags: ["颜色", "取色", "HEX", "RGB", "配色"],
    category: "image",
    badge: "NEW",
    date: "2026-09-20",
    pop: 6
  },

  /* ---------------- 文本 ---------------- */
  {
    id: "md-preview",
    name: "Markdown 预览",
    desc: "左边写右边看，支持表格、代码块、任务列表；可导出 HTML，也能直接粘贴 HTML 渲染。",
    icon: "📝",
    href: "tools/md-preview.html",
    tags: ["Markdown", "预览", "导出", "HTML", "文档"],
    category: "text",
    badge: "NEW",
    date: "2026-09-20",
    pop: 10
  },
  {
    id: "qr-gen",
    name: "二维码生成",
    desc: "文本 / 网址 / 名片都能转，可调尺寸与容错级别，支持 PNG 下载和 SVG 矢量导出。",
    icon: "🔳",
    href: "tools/qr-gen.html",
    tags: ["二维码", "QR", "生成", "下载", "SVG"],
    category: "text",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "text-diff",
    name: "文本比对",
    desc: "逐行对比两段文本，新增 / 删除 / 修改高亮标出，行内小改动也能看出来。",
    icon: "🔀",
    href: "tools/text-diff.html",
    tags: ["比对", "Diff", "差异", "文本", "行内"],
    category: "text",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "regex-test",
    name: "正则测试",
    desc: "实时匹配高亮，列出全部捕获组与命名组，内置手机、邮箱、URL、IPv4 等常用模板。",
    icon: "🎯",
    href: "tools/regex-test.html",
    tags: ["正则", "Regex", "匹配", "捕获组", "测试"],
    category: "text",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "word-count",
    name: "字数统计",
    desc: "中文字数、英文词数、字符数、行数、段落数一次算清，附阅读与朗读时长预估。",
    icon: "🔢",
    href: "tools/word-count.html",
    tags: ["字数", "统计", "字符", "行数", "阅读时长"],
    category: "text",
    date: "2026-09-20",
    pop: 6
  },
  {
    id: "pangu",
    name: "中英排版助手",
    desc: "自动在中英文、数字之间补空格，顺手修正全角标点和多余空行，写文档前跑一遍。",
    icon: "🈳",
    href: "tools/pangu.html",
    tags: ["排版", "空格", "中英文", "全角标点", "文案"],
    category: "text",
    badge: "NEW",
    date: "2026-09-20",
    pop: 7
  },

  /* ---------------- 开发 ---------------- */
  {
    id: "json-format",
    name: "JSON 格式化",
    desc: "格式化 / 压缩 / 语法校验三合一，出错的键路径会标出来，支持按 key 排序和树形折叠。",
    icon: "🧩",
    href: "tools/json-format.html",
    tags: ["JSON", "格式化", "压缩", "校验", "排序"],
    category: "dev",
    badge: "HOT",
    date: "2026-09-20",
    pop: 10
  },
  {
    id: "timestamp",
    name: "时间戳转换",
    desc: "秒 / 毫秒自动识别，本地时间与时区互转，附「3 天前」这类相对时间。",
    icon: "⏱",
    href: "tools/timestamp.html",
    tags: ["时间戳", "Unix", "时区", "ISO8601", "日期"],
    category: "dev",
    badge: "NEW",
    date: "2026-09-20",
    pop: 9
  },
  {
    id: "cron-parser",
    name: "Cron 表达式解析",
    desc: "5 / 6 位 cron 都能解，给出人话翻译 + 未来 10 次执行时间，支持各字段取值提示。",
    icon: "⏰",
    href: "tools/cron-parser.html",
    tags: ["Cron", "定时任务", "表达式", "调度", "执行时间"],
    category: "dev",
    badge: "HOT",
    date: "2026-09-20",
    pop: 9
  },
  {
    id: "url-codec",
    name: "URL 编解码",
    desc: "encodeURIComponent / encodeURI 两种模式，查询串自动拆成参数表，一眼看清结构。",
    icon: "🔗",
    href: "tools/url-codec.html",
    tags: ["URL", "编码", "解码", "查询参数", "转义"],
    category: "dev",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "hash",
    name: "哈希计算",
    desc: "MD5 / SHA-1 / SHA-256 / SHA-512 一次全出，支持输入文本或拖入文件。",
    icon: "🔐",
    href: "tools/hash.html",
    tags: ["哈希", "MD5", "SHA256", "摘要", "文件校验"],
    category: "dev",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "sql-format",
    name: "SQL 格式化",
    desc: "关键字大写、子句换行缩进，支持 joins / where / group by 等常用语句，可压缩成一行。",
    icon: "🗄",
    href: "tools/sql-format.html",
    tags: ["SQL", "格式化", "美化", "MySQL", "缩进"],
    category: "dev",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "base64",
    name: "Base64 编解码",
    desc: "文本与 Base64 互转，兼容中文 UTF-8，可切 URL-safe 变体并输出 Data URL。",
    icon: "🧬",
    href: "tools/base64.html",
    tags: ["Base64", "编码", "解码", "UTF-8", "DataURL"],
    category: "dev",
    date: "2026-09-20",
    pop: 7
  },
  {
    id: "uuid",
    name: "UUID / 密码生成",
    desc: "批量生成 UUID v4、随机密码、随机 ID，密码强度可选，一键复制或导出。",
    icon: "🎲",
    href: "tools/uuid.html",
    tags: ["UUID", "密码", "随机", "v4", "批量"],
    category: "dev",
    date: "2026-09-20",
    pop: 7
  },
  {
    id: "unit-convert",
    name: "单位换算",
    desc: "长度 / 面积 / 重量 / 温度 / 数据存储单位互转，输入即出全部等价结果。",
    icon: "📏",
    href: "tools/unit-convert.html",
    tags: ["单位", "换算", "长度", "温度", "存储"],
    category: "dev",
    date: "2026-09-20",
    pop: 5
  },
  {
    id: "random-pick",
    name: "随机抽签",
    desc: "一行一个候选项，随机抽 N 个，支持排除已抽中的连续抽签，适合排序和分工。",
    icon: "🎯",
    href: "tools/random-pick.html",
    tags: ["抽签", "随机", "抽奖", "排序", "分组"],
    category: "other",
    date: "2026-09-20",
    pop: 5
  },

  /* ---------------- 金融 ---------------- */
  {
    id: "profit-calc",
    name: "收益率计算器",
    desc: "按买入/卖出价和股数算盈亏、收益率与手续费，红涨绿跌，还能反推目标价。",
    icon: "📊",
    href: "tools/profit-calc.html",
    tags: ["收益", "盈亏", "成本", "目标价", "手续费"],
    category: "finance",
    badge: "NEW",
    date: "2026-09-20",
    pop: 10
  },
  {
    id: "position-calc",
    name: "仓位管理",
    desc: "给定总资金、风险比例与止损幅度，算出该买多少股；也可做金字塔分批补仓计划。",
    icon: "⚖️",
    href: "tools/position-calc.html",
    tags: ["仓位", "止损", "风险", "补仓", "分批"],
    category: "finance",
    badge: "NEW",
    date: "2026-09-20",
    pop: 9
  },
  {
    id: "fx-convert",
    name: "汇率换算",
    desc: "手填汇率在线换算，支持联动反向计算和双侧手续费，港股美股算钱很方便。",
    icon: "💱",
    href: "tools/fx-convert.html",
    tags: ["汇率", "换算", "港币", "美元", "手续费"],
    category: "finance",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "dcar",
    name: "定投回测",
    desc: "按周期与金额模拟定投，算总投入、最终市值、年化收益与最大回撤。",
    icon: "📈",
    href: "tools/dcar.html",
    tags: ["定投", "回测", "年化", "回撤", "净值"],
    category: "finance",
    badge: "NEW",
    date: "2026-09-20",
    pop: 8
  },
  {
    id: "stock-screener",
    name: "规则化选股器",
    desc: "用你自己写的 if-else 条件描述选股逻辑，逻辑留痕可复现，不依赖平台的固定因子。",
    icon: "🔎",
    href: "tools/stock-screener.html",
    tags: ["选股", "规则", "条件", "策略", "if-else"],
    category: "finance",
    badge: "NEW",
    date: "2026-09-20",
    pop: 7
  },

  /* ---------------- 日常 ---------------- */
  {
    id: "weekly-report",
    name: "周报生成器",
    desc: "按项目分组粘贴 commits 或记录，套用「分类 + 状态标签 + 下周计划」模板一键成稿。",
    icon: "📋",
    href: "tools/weekly-report.html",
    tags: ["周报", "模板", "分类", "状态", "总结"],
    category: "other",
    badge: "NEW",
    date: "2026-09-20",
    pop: 9
  },
  {
    id: "clock",
    name: "全屏时钟",
    desc: "大字号时钟带倒计时 / 番茄钟，适合桌面摆着看，也可当演讲计时器。",
    icon: "🕐",
    href: "tools/clock.html",
    tags: ["时钟", "倒计时", "番茄钟", "计时", "全屏"],
    category: "other",
    date: "2026-09-20",
    pop: 4
  },
  {
    id: "event-calendar",
    name: "演出日历",
    desc: "直连 Fantopia 拉取待开售演出，按开售时间铺进月历，带开售倒计时和列表视图。",
    icon: "🎫",
    href: "tools/event-calendar.html",
    tags: ["演出", "日历", "开售", "抢票", "倒计时", "Fantopia", "演唱会"],
    category: "other",
    badge: "NEW",
    date: "2026-09-23",
    pop: 8
  }
];

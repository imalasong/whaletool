/* ============================================================
 * 工具注册表 —— 以后加新工具，只需要在这里 push 一条记录
 * ------------------------------------------------------------
 * 字段说明：
 *   id      唯一标识（英文，勿重复）
 *   name    工具名称
 *   desc    一句话描述
 *   icon    卡片图标（emoji）
 *   href    工具页面路径（相对 index.html）
 *   tags    标签数组，用于搜索 + 展示
 *   category 分类 key，需与 CATEGORIES 中的 key 对应
 *   badge   可选，右上角角标（如 "NEW" / "HOT"）
 *   date    可选，上线日期 YYYY-MM-DD
 * ============================================================ */

const CATEGORIES = [
  { key: "all",   label: "全部",     icon: "✦" },
  { key: "image", label: "图片",     icon: "🖼" },
  { key: "text",  label: "文本",     icon: "✎" },
  { key: "dev",   label: "开发",     icon: "⌘" },
  { key: "other", label: "其他",     icon: "◈" }
];

const TOOLS = [
  {
    id: "image-tool",
    name: "批量图片展示",
    desc: "把一堆图片 URL 粘进来，逗号 / 换行 / 空格混着用也行，一键生成画廊并支持灯箱预览。",
    icon: "🖼",
    href: "tools/image-tool.html",
    tags: ["图片", "画廊", "URL", "灯箱", "批量"],
    category: "image",
    badge: "NEW",
    date: "2026-08-17"
  }
];

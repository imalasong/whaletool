/* ============================================================
 * WhaleTool · 工具合辑 —— 首页逻辑
 * 依赖 assets/tools.js 中的 CATEGORIES / TOOLS
 * ============================================================ */

(function () {
  "use strict";

  // 仓库地址：填上之后导航栏的 GitHub 链接才可点
  // 例如 "https://github.com/xiaochangbai/whaletool"
  const REPO_URL = "";

  const $grid    = document.getElementById("grid");
  const $filters = document.getElementById("filters");
  const $search  = document.getElementById("search");
  const $count   = document.getElementById("resultCount");
  const $hint    = document.getElementById("resultHint");
  const $repo    = document.getElementById("repoLink");

  if (REPO_URL) $repo.href = REPO_URL;

  let activeCat = "all";
  let keyword   = "";

  /* ---------- 分类计数 ---------- */
  function countOf(key) {
    return key === "all" ? TOOLS.length : TOOLS.filter(t => t.category === key).length;
  }

  /* ---------- 渲染分类 chips ---------- */
  function renderFilters() {
    $filters.innerHTML = "";
    CATEGORIES.forEach(c => {
      const n = countOf(c.key);
      const btn = document.createElement("button");
      btn.className = "chip" + (c.key === activeCat ? " on" : "");
      btn.type = "button";
      btn.dataset.cat = c.key;
      btn.innerHTML = `${c.icon} ${c.label}<span class="n">${n}</span>`;
      btn.addEventListener("click", () => {
        activeCat = c.key;
        renderFilters();
        renderGrid();
      });
      $filters.appendChild(btn);
    });
  }

  /* ---------- 匹配逻辑 ---------- */
  function matches(t) {
    if (activeCat !== "all" && t.category !== activeCat) return false;
    if (!keyword) return true;
    const hay = [t.name, t.desc, (t.tags || []).join(" "), t.id].join(" ").toLowerCase();
    return hay.includes(keyword);
  }

  /* ---------- 渲染卡片 ---------- */
  function renderGrid() {
    const list = TOOLS.filter(matches);
    $grid.innerHTML = "";

    $count.textContent = list.length + " 个工具";
    $hint.textContent = keyword
      ? `匹配「${keyword}」`
      : (activeCat === "all" ? "全部已上线" : "已筛选");

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = `
        <div class="eico">🫧</div>
        <h3>没找到匹配的工具</h3>
        <p>换个关键词，或者切到「全部」看看</p>`;
      $grid.appendChild(empty);
      return;
    }

    list.forEach((t, i) => {
      const card = document.createElement("article");
      card.className = "card";
      card.style.animationDelay = Math.min(i * 45, 400) + "ms";

      const tags = (t.tags || [])
        .slice(0, 5)
        .map(x => `<span class="tag">${esc(x)}</span>`)
        .join("");

      card.innerHTML = `
        ${t.badge ? `<span class="card-badge">${esc(t.badge)}</span>` : ""}
        <a class="card-hit" href="${esc(t.href)}" aria-label="${esc(t.name)}"></a>
        <div class="card-head">
          <div class="card-ico">${t.icon || "🧩"}</div>
          <div>
            <div class="card-title">${esc(t.name)}</div>
            <div class="card-desc">${esc(t.desc || "")}</div>
          </div>
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="card-foot">
          <span class="card-date">${esc(t.date || "")}</span>
          <span class="card-open">打开工具 <span class="arw">→</span></span>
        </div>`;

      $grid.appendChild(card);
    });
  }

  /* ---------- 简单转义 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------- 搜索 ---------- */
  let timer = null;
  $search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      keyword = $search.value.trim().toLowerCase();
      renderGrid();
    }, 110);
  });

  /* ---------- 快捷键：/ 聚焦搜索，Esc 清空 ---------- */
  document.addEventListener("keydown", e => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea";
    if (e.key === "/" && !typing) {
      e.preventDefault();
      $search.focus();
    }
    if (e.key === "Escape" && typing) {
      $search.value = "";
      keyword = "";
      renderGrid();
      $search.blur();
    }
  });

  /* ---------- 启动 ---------- */
  renderFilters();
  renderGrid();
})();

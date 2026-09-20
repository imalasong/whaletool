/* ============================================================
 * WhaleTool · 工具合辑 —— 首页逻辑
 * 依赖 assets/tools.js 中的 CATEGORIES / TOOLS
 * ============================================================ */

(function () {
  "use strict";

  const REPO_URL = "https://github.com/imalasong/whaletool";

  const $grid    = document.getElementById("grid");
  const $filters = document.getElementById("filters");
  const $search  = document.getElementById("search");
  const $sort    = document.getElementById("sort");
  const $count   = document.getElementById("resultCount");
  const $hint    = document.getElementById("resultHint");
  const $repo    = document.getElementById("repoLink");

  if ($repo && REPO_URL) $repo.href = REPO_URL;

  let activeCat = "all";
  let keyword   = "";
  let sortBy    = "default";

  function countOf(key) {
    return key === "all" ? TOOLS.length : TOOLS.filter(t => t.category === key).length;
  }

  function renderFilters() {
    $filters.innerHTML = "";
    CATEGORIES.forEach(c => {
      const n = countOf(c.key);
      const btn = document.createElement("button");
      btn.className = "chip" + (c.key === activeCat ? " on" : "");
      btn.type = "button";
      btn.innerHTML = `${c.icon} ${c.label}<span class="n">${n}</span>`;
      btn.addEventListener("click", () => {
        activeCat = c.key;
        renderFilters();
        renderGrid();
      });
      $filters.appendChild(btn);
    });
  }

  function matches(t) {
    if (activeCat !== "all" && t.category !== activeCat) return false;
    if (!keyword) return true;
    const hay = [t.name, t.desc, (t.tags || []).join(" "), t.id].join(" ").toLowerCase();
    return hay.includes(keyword);
  }

  function num(d) {
    return d ? parseInt(String(d).replace(/-/g, ""), 10) : 0;
  }

  function sortList(list) {
    const arr = list.slice();
    if (sortBy === "pop")  return arr.sort((a, b) => (b.pop || 0) - (a.pop || 0));
    if (sortBy === "new")  return arr.sort((a, b) => num(b.date) - num(a.date));
    if (sortBy === "name") return arr.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    return arr;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderGrid() {
    const list = sortList(TOOLS.filter(matches));
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
      card.style.animationDelay = Math.min(i * 32, 420) + "ms";

      const tags = (t.tags || [])
        .slice(0, 5)
        .map(x => `<span class="tag">${esc(x)}</span>`)
        .join("");

      const badgeCls = t.badge === "HOT" ? "card-badge hot" : "card-badge";

      card.innerHTML = `
        ${t.badge ? `<span class="${badgeCls}">${esc(t.badge)}</span>` : ""}
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

  let timer = null;
  $search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      keyword = $search.value.trim().toLowerCase();
      renderGrid();
    }, 110);
  });

  if ($sort) {
    $sort.addEventListener("change", () => {
      sortBy = $sort.value;
      renderGrid();
    });
  }

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

  renderFilters();
  renderGrid();
})();

/* 界面文案、设置和菜单。 */
"use strict";
function setMode(m) {
  if (m !== "play") cancelAI();
  mode = m;
  if (m === "inspect") {
    $("ribbon").classList.remove("show");
    $("toast").classList.remove("show");
  }
  document.body.dataset.mode = m;
  $("menu").hidden = m !== "menu";
  $("inspectPanel").hidden = m !== "inspect";
  $("exitInspect").hidden = m !== "inspect";
  resize();
}

function toast(text, ms = 2100) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), ms);
}

function ribbon(text) {
  $("ribbon").textContent = text;
  $("ribbon").classList.add("show");
  clearTimeout(ribbonTimer);
  ribbonTimer = setTimeout(() => $("ribbon").classList.remove("show"), 1400);
}

function caption(text, sub = "", ms = 650) {
  $("battleCaption").querySelector("strong").textContent = text;
  $("battleCaption").querySelector("small").textContent = sub;
  $("battleCaption").classList.add("show");
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => $("battleCaption").classList.remove("show"), ms);
}

function modal(html, bind) {
  cancelAI();
  $("modal").innerHTML = html;
  $("modalWrap").hidden = false;
  if (bind) bind();
  setTimeout(() => $("modal").querySelector("button,input,select")?.focus(), 0);
}

function closeModal() {
  $("modalWrap").hidden = true;
  scheduleAI();
}

function confirmBox(title, text, onYes, yes = "同意") {
  modal(
    `<div class="eyebrow">FIELD COUNCIL</div><h2>${title}</h2><p>${text}</p><div class="modal-buttons"><button class="minor" id="cancelModal">取消</button><button class="primary" id="acceptModal">${yes}</button></div>`,
    () => {
      $("cancelModal").onclick = closeModal;
      $("acceptModal").onclick = () => {
        closeModal();
        onYes();
      };
    },
  );
}

function updateRoster() {
  for (let s of ["r", "b"]) {
    const box = $(s === "r" ? "rosterR" : "rosterB");
    box.innerHTML = "";
    HEROES.forEach((h) => {
      let b = document.createElement("button");
      b.className = "hero-card" + (heroes[s] === h.id ? " selected" : "");
      b.title = h.name + " · " + (s === "r" ? "红方" : "黑方") + "统帅";
      b.innerHTML = `<img src="${h.image}" alt="${h.name}"><span>${h.name}</span>`;
      b.onclick = () => {
        heroes[s] = h.id;
        updateRoster();
        if (mode === "menu" && !gameStarted) {
          makeAll();
          updateUI();
        }
        audio.fx("select", 0.5);
      };
      box.appendChild(b);
    });
  }
}

function updateUI() {
  if (!$("topTurn")) return;
  for (let s of ["r", "b"]) {
    let S = s.toUpperCase(),
      h = hero(heroes[s]);
    $("portrait" + S).src = h.image;
    $("name" + S).textContent = h.name;
    $("count" + S).textContent = board.filter((p) => p?.s === s).length;
    $("player" + S).classList.toggle("active", turn === s && !result);
  }
  let who = turn === "r" ? "红" : "黑",
    check = Rules.checked(board, turn);
  $("topTurn").textContent = result ? "棋局已结束" : `${who}方${check ? "应将" : "行棋"}`;
  $("turnTitle").textContent = result ? "胜负已定" : `${who}方${check ? "应将" : "行棋"}`;
  $("turnDescription").textContent = result
    ? result.reason
    : check
      ? "将帅正在受攻击，请先化解将军。"
      : gameMode === "ai"
        ? thinking
          ? aiPurpose === "hint"
            ? "正在推演建议…"
            : "电脑正在思考…"
          : "你执" + (humanSide === "r" ? "红" : "黑") + "，点击军阵发出军令。"
        : "落子之后，视角交接给另一位统帅。";
  $("turnDot").style.background = turn === "r" ? "#ce7d69" : "#8bbac0";
  $("roundNo").textContent = String(Math.floor(ply / 2) + 1).padStart(2, "0");
  $("plyCount").textContent = ply + " 步";
  $("autoFlip").classList.toggle("on", cfg.flip);
  $("autoFlip").textContent = gameMode === "ai" ? "己方视角" : cfg.flip ? "自动换边" : "固定视角";
  $("autoFlip").disabled = gameMode === "ai";
  $("modeTag").textContent =
    gameMode === "ai"
      ? "人机 · " + { easy: "新兵", normal: "将校", hard: "统帅" }[aiLevel]
      : "同机双人";
  $("drawBtn").textContent = gameMode === "ai" ? "提示一步" : "申请和棋";
  $("undoBtn").textContent = gameMode === "ai" ? "撤回一回合" : "申请悔棋";
  $("thinkBox").hidden = !thinking;
  $("thinkText").textContent = aiStats
    ? `搜索 ${aiStats.depth} 层 · ${(aiStats.nodes / 1000).toFixed(1)} 千节点`
    : "独立线程推演中";
  $("humanR").textContent = gameMode === "ai" ? (humanSide === "r" ? "你" : "电脑") : "玩家一";
  $("humanB").textContent = gameMode === "ai" ? (humanSide === "b" ? "你" : "电脑") : "玩家二";
  $("labelsBtn").classList.toggle("on", cfg.labels);
  $("undoBtn").disabled = !records.length || busy();
  $("drawBtn").disabled =
    !!result || busy() || thinking || (gameMode === "ai" && turn !== humanSide);
  $("resignBtn").disabled = !!result || busy();
  $("menuBtn").disabled = busy();
  $("detailBtn").disabled = busy();
  $("inspectBtn").disabled = busy();
  $("homeView").disabled = !!flipTween;
  $("topView").disabled = !!flipTween;
  if (selected) {
    $("selectedGlyph").textContent = Rules.LABEL[selected.s][selected.t];
    $("selectedName").textContent = Rules.NAME[selected.t];
    $("selectedDesc").textContent = DESCRIPTIONS[selected.t];
  } else {
    $("selectedGlyph").textContent = "阵";
    $("selectedName").textContent = "选择一支军阵";
    $("selectedDesc").textContent = "点击己方部队，金色落点即为合法走法。吃子会触发兵种交锋。";
  }
  $("recordList").innerHTML = records.length
    ? records
        .slice(-80)
        .reverse()
        .map(
          (m, i) =>
            `<div class="record"><span><small>${String(records.length - i).padStart(2, "0")}　</small>${m.s === "r" ? "红" : "黑"}　${m.notation}</span><span>${m.captured ? "破 " + Rules.LABEL[m.captured.s][m.captured.t] : m.check ? "将军" : ""}</span></div>`,
        )
        .join("")
    : '<div class="subline">两军已列阵，等待第一道军令。</div>';
}

function openSettings() {
  cancelAI();
  modal(
    `<div class="eyebrow">FIELD PREFERENCES</div><h2>战场设置</h2><div class="option"><span>自动换边<small>落子结束，平滑交接到另一方</small></span><input type="checkbox" id="optFlip" ${cfg.flip ? "checked" : ""}></div><div class="option"><span>画面品质<small>性能档不减少军阵人数</small></span><select id="optQuality"><option value="auto">自适应</option><option value="high">清晰</option><option value="balanced">均衡</option><option value="fast">性能优先</option></select></div><div class="option"><span>动态阴影</span><input id="optShadow" type="checkbox" ${cfg.shadows ? "checked" : ""}></div><div class="option"><span>交锋特写<small>吃子时靠近军阵，结束后回到原视角</small></span><input id="optCinema" type="checkbox" ${cfg.cinematic !== false ? "checked" : ""}></div><div class="option"><span>行军节奏</span><select id="optSpeed"><option value="1">标准</option><option value="1.35">轻快</option><option value="0.8">细看动作</option></select></div><div class="option"><span>战场音乐</span><input id="optMusic" type="checkbox" ${cfg.music ? "checked" : ""}></div><div class="option"><span>动作与交锋音效</span><input id="optEffects" type="checkbox" ${cfg.effects ? "checked" : ""}></div><div class="option"><span>总音量</span><input type="range" id="optVolume" min="0" max="1" step=".05" value="${cfg.volume}"></div><div class="modal-buttons"><button class="minor" id="exportDiag">导出流畅度记录</button><button class="primary" id="doneSettings">完成</button></div>`,
    () => {
      $("optQuality").value = cfg.quality;
      $("optSpeed").value = String(cfg.speed);
      const apply = () => {
        cfg.flip = $("optFlip").checked;
        cfg.quality = $("optQuality").value;
        cfg.shadows = $("optShadow").checked;
        cfg.cinematic = $("optCinema").checked;
        cfg.speed = Number($("optSpeed").value);
        cfg.music = $("optMusic").checked;
        cfg.effects = $("optEffects").checked;
        cfg.volume = Number($("optVolume").value);
        applySettings();
      };
      [
        "optFlip",
        "optQuality",
        "optShadow",
        "optSpeed",
        "optCinema",
        "optMusic",
        "optEffects",
        "optVolume",
      ].forEach((id) => ($(id).oninput = apply));
      $("doneSettings").onclick = () => {
        closeModal();
        scheduleAI();
      };
      $("exportDiag").onclick = exportDiagnostics;
    },
  );
}

function applySettings() {
  audio.music = cfg.music;
  audio.effects = cfg.effects;
  audio.volume = cfg.volume;
  audio.set();
  renderer.enableShadows = cfg.shadows;
  renderer.shadowDirty = true;
  ratio =
    cfg.quality === "high"
      ? Math.min(1.6, Math.max(1.35, window.devicePixelRatio || 1))
      : cfg.quality === "fast"
        ? 0.72
        : 1;
  resize();
  $("audioBtn").textContent = cfg.music || cfg.effects ? "声音 开" : "声音 关";
  updateUI();
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(cfg));
  } catch (e) {}
}

function exportDiagnostics() {
  const data = {
    game: "楚河·军阵",
    version: "2.0",
    timestamp: new Date().toISOString(),
    viewport: {
      width: renderer.width,
      height: renderer.height,
      renderWidth: renderer.canvas.width,
      renderHeight: renderer.canvas.height,
    },
    config: cfg,
    scene: {
      parts: renderer.partCount,
      drawCalls: renderer.drawCalls,
      triangles: renderer.triangles,
      armyCount: armies.size,
    },
    samples: diagnostics.slice(-900),
  };
  download("楚河军阵_流畅度记录.json", JSON.stringify(data, null, 2), "application/json");
  toast("已导出最近的帧间隔记录。");
}

function download(name, data, type) {
  let url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function help() {
  modal(
    `<div class="eyebrow">RULES OF ENGAGEMENT</div><h2>方寸之上，调兵遣将</h2><div class="guide-grid"><div class="guide-item"><b>选择与落子</b><p>点击己方军阵，金色点是合法位置；带红框的目标可以吃。再点落位即可下棋。</p></div><div class="guide-item"><b>环绕与缩放</b><p>在空处拖动可旋转。滚轮或双指缩放，右键 / Shift 拖动可平移。空格回到己方。</p></div><div class="guide-item"><b>电脑对手与同机双人</b><p>默认人机对弈，可选择新兵、将校、统帅三档；支持执红或执黑。也可切换同机双人对弈。</p></div><div class="guide-item"><b>真正的三维军阵</b><p>每枚棋子是一整队兵。检阅模式可看正面、背面和底部，也可独立试演七类攻击。</p></div></div><p>规则仍是象棋：蹩马腿、塞象眼、炮架、九宫、过河与将帅照面均有检查。将死、困毙和本版可识别的连续长将自动判负。三次重复会提示协商，复杂长捉棋例暂不作竞赛级裁决。</p><p>没有随机伤害、血条或角色技能。交锋是吃子的可视化，结果完全服从合法棋步。本版电脑对手完全离线运行。未加入限时、超时代下或联网对弈。</p><div class="modal-buttons"><button class="primary" id="doneHelp">进入战场</button></div>`,
    () => {
      $("doneHelp").onclick = closeModal;
    },
  );
}

function updateMatchControls() {
  document
    .querySelectorAll("[data-match-mode]")
    .forEach((b) => b.classList.toggle("active", b.dataset.matchMode === gameMode));
  $("aiOptions").hidden = gameMode !== "ai";
  $("levelSelect").value = aiLevel;
  $("sideSelect").value = humanSide;
  $("startBtn").textContent = gameMode === "ai" ? "迎 战 电 脑　→" : "两 军 列 阵　→";
}

function bindMatchControls() {
  document.querySelectorAll("[data-match-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        gameMode = b.dataset.matchMode;
        updateMatchControls();
        updateUI();
      }),
  );
  $("levelSelect").onchange = (e) => {
    aiLevel = e.target.value;
    updateUI();
  };
  $("sideSelect").onchange = (e) => {
    humanSide = e.target.value;
    updateUI();
  };
  updateMatchControls();
}

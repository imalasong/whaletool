/* 离线电脑对手。 */
"use strict";
function cancelAI() {
  aiToken++;
  clearTimeout(aiTimer);
  aiTimer = null;
  if (aiWorker) {
    aiWorker.terminate();
    aiWorker = null;
  }
  thinking = false;
  aiPurpose = null;
  aiStats = null;
  if ($("thinkBox")) $("thinkBox").hidden = true;
}

function scheduleAI() {
  clearTimeout(aiTimer);
  if (
    gameMode !== "ai" ||
    mode !== "play" ||
    turn === humanSide ||
    result ||
    busy() ||
    thinking ||
    document.hidden ||
    !$("modalWrap").hidden
  )
    return;
  aiTimer = setTimeout(() => requestEngine("move"), 180);
}

function requestHint() {
  if (gameMode !== "ai" || turn !== humanSide || thinking || busy() || result) return;
  requestEngine("hint");
}

function requestEngine(purpose) {
  if (mode !== "play" || busy() || result || thinking || document.hidden) return;
  if (purpose === "move" && (gameMode !== "ai" || turn === humanSide)) return;
  cancelAI();
  const token = aiToken,
    key = Rules.key(board, turn);
  thinking = true;
  aiPurpose = purpose;
  aiStats = null;
  updateUI();
  try {
    aiWorker = new Worker("army-formation/ai.js");
    aiWorker.onmessage = (e) => {
      const d = e.data;
      if (
        d.token !== aiToken ||
        token !== aiToken ||
        mode !== "play" ||
        Rules.key(board, turn) !== key
      )
        return;
      if (d.kind === "progress") {
        aiStats = d.progress;
        updateUI();
        return;
      }
      if (d.kind === "error") {
        cancelAI();
        updateUI();
        toast("电脑推演失败，请重开本局或切换双人。", 4500);
        return;
      }
      if (d.kind === "result") {
        const stats = d.result;
        aiWorker.terminate();
        aiWorker = null;
        thinking = false;
        aiPurpose = null;
        aiStats = stats;
        const m = stats.move;
        updateUI();
        if (!m) return;
        const p = board[m.from],
          r = Math.floor(m.to / 9),
          c = m.to % 9;
        if (!p || !Rules.legal(board, p).some((v) => v.r === r && v.c === c)) {
          toast("引擎返回的棋步未通过规则检查，未执行。", 4000);
          return;
        }
        if (purpose === "hint") {
          selectPiece(p);
          toast(
            "建议：" + notation(p, { r: p.r, c: p.c }, { r, c }) + "。由你决定是否执行。",
            5000,
          );
        } else beginMove(p, r, c, true);
      }
    };
    aiWorker.onerror = (e) => {
      e.preventDefault();
      cancelAI();
      updateUI();
      toast("浏览器未能启动电脑线程，请允许本地 Worker 或改用 Chrome / Edge。", 5500);
    };
    aiWorker.postMessage({
      token,
      board: Rules.clone(board),
      side: turn,
      options: {
        level: purpose === "hint" ? "normal" : aiLevel,
        recent: records
          .slice(-8)
          .filter((x) => x.s === turn)
          .map((x) => (x.from.r * 9 + x.from.c) * 90 + x.to.r * 9 + x.to.c),
      },
    });
  } catch (e) {
    cancelAI();
    updateUI();
    toast("无法启动离线电脑对手：" + e.message, 5000);
  }
}

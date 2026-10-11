/* 启动三维战场。 */
"use strict";
function boot() {
  try {
    renderer = new ChuRenderer($("scene"));
    world = buildWorld(renderer);
    world.inspect.dynamic = true;
    initBoard();
    bindUI();
    applySettings();
    resize();
    audio.music = cfg.music;
    audio.effects = cfg.effects;
    audio.volume = cfg.volume;
    $("loader").hidden = true;
    requestAnimationFrame(loop);
    window.CHUHE = {
      version: "2.0",
      Rules,
      renderer,
      get audioState() {
        return {
          state: audio.ctx?.state || "locked",
          loaded: !!audio.score,
          seconds: audio.score?.buffer?.duration || 0,
          music: audio.music,
          effects: audio.effects,
        };
      },
      get state() {
        return {
          mode,
          turn,
          ply,
          board: Rules.clone(board),
          grave: grave.map((p) => ({ ...p })),
          result,
          selected: selected?.id || null,
          busy: busy(),
          active: active?.p.t || null,
          hero: { ...heroes },
          fps,
          ratio,
          gameMode,
          humanSide,
          aiLevel,
          thinking,
          aiStats,
          drawCalls: renderer.drawCalls,
          parts: renderer.partCount,
          soldierCount: renderer.soldierCount,
          records: records.map((r) => ({
            s: r.s,
            notation: r.notation,
            captured: r.captured?.t || null,
          })),
          camera: {
            theta: cam.theta,
            phi: cam.phi,
            dist: cam.dist,
            eye: cam.eye.slice(),
            target: cam.target.slice(),
          },
          diagnostics: diagnostics.slice(-900),
        };
      },
      start: () => startGame(true),
      select: (id) => {
        const p = board.find((p) => p?.id === id);
        if (p?.s === turn && !thinking && (gameMode !== "ai" || p.s === humanSide))
          selectPiece(p);
      },
      move: (id, r, c) => {
        let p = board.find((p) => p?.id === id);
        return p ? beginMove(p, r, c) : false;
      },
      project: (r, c) => renderer.project(worldPos(r, c)),
      inspect: enterInspect,
      leaveInspect,
      demoAttack,
      restore: (s) => {
        gameStarted = true;
        let ok = restore(s);
        setMode("play");
        fitView(gameMode === "ai" ? humanSide : turn, true);
        scheduleAI();
        return ok;
      },
      serialize,
      exportDiagnostics,
      configureMatch: (opts) => {
        cancelAI();
        gameMode = opts.mode || gameMode;
        humanSide = opts.side || humanSide;
        aiLevel = opts.level || aiLevel;
        updateMatchControls();
        updateUI();
      },
      cancelAI,
      undo,
      requestHint,
      get settings() {
        return cfg;
      },
      setSettings: (x) => {
        Object.assign(cfg, x);
        applySettings();
      },
      setCamera: (x) => {
        Object.assign(goal, x);
      },
      get inspectState() {
        return inspect
          ? { type: inspectType, bottom: inspect.bottom, hero: inspectHero, busy: !!active }
          : null;
      },
    };
  } catch (e) {
    console.error(e);
    $("loader").innerHTML =
      `<div class="error"><h2>未能建立三维战场</h2><p>${String(e.message).replace(/</g, "&lt;")}</p><p>请使用支持 WebGL 2 的 Chrome / Edge / Safari，并开启硬件加速。此文件不依赖网络。</p></div>`;
  }
}
setTimeout(boot, 60);

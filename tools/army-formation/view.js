/* 镜头、指针输入和主循环。 */
"use strict";
function fitDistance() {
  let r = $("stage").getBoundingClientRect(),
    ar = r.width / r.height;
  return Math.max(42.5, 38.7 / Math.max(0.4, ar) + 9.2);
}

function inspectionDistance(base = 5.6) {
  const r = $("stage").getBoundingClientRect();
  return base * Math.max(1, 0.8 / Math.max(0.35, r.width / r.height));
}

function fitView(side = turn, immediate = false) {
  const v = views[side],
    targetTheta = (side === "r" ? 0 : Math.PI) + (v?.offset || 0);
  goal = {
    theta: targetTheta,
    phi: v?.phi || 0.93,
    dist: v?.dist || fitDistance(),
    target: v?.target?.slice() || [0, 0.2, 0],
  };
  if (immediate) {
    cam.theta = goal.theta;
    cam.phi = goal.phi;
    cam.dist = goal.dist;
    cam.target = goal.target.slice();
  }
  if (mode === "play") $("viewSide").textContent = (side === "r" ? "红" : "黑") + "方帅位";
}

function rememberView() {
  if (mode !== "play") return;
  let offset = (goal.theta - (turn === "r" ? 0 : Math.PI)) % (Math.PI * 2);
  views[turn] = { offset, phi: goal.phi, dist: goal.dist, target: goal.target.slice() };
}

function flipTo(side) {
  if (gameMode === "ai") {
    ribbon(
      side === humanSide
        ? "轮到你了 · " + hero(heroes[side]).name
        : "电脑行棋 · " + hero(heroes[side]).name,
    );
    scheduleAI();
    return;
  }
  if (!cfg.flip) {
    ribbon(`${side === "r" ? "红" : "黑"}方行棋 · ${hero(heroes[side]).name}`);
    return;
  }
  const v = views[side],
    a = (side === "r" ? 0 : Math.PI) + (v?.offset || 0);
  let d = ((a - cam.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (Math.abs(d + Math.PI) < 0.03) d = Math.PI;
  flipTween = {
    time: 0,
    duration: 0.82,
    from: { theta: cam.theta, phi: cam.phi, dist: cam.dist, target: cam.target.slice() },
    to: {
      theta: cam.theta + d,
      phi: v?.phi || 0.93,
      dist: v?.dist || fitDistance(),
      target: v?.target?.slice() || [0, 0.2, 0],
    },
    side,
  };
  updateUI();
}

function bindUI() {
  updateRoster();
  bindMatchControls();
  $("startBtn").onclick = () => {
    if (gameStarted && ply > 0)
      confirmBox(
        "重新列阵",
        "新棋局会替换当前自动存档。确定重新开始吗？",
        () => startGame(true),
        "开始新局",
      );
    else startGame(true);
  };
  $("continueBtn").onclick = () => startGame(false);
  $("continueBtn").hidden = !validSave(saveData);
  $("menuInspect").onclick = () => enterInspect("P");
  $("inspectBtn").onclick = () => enterInspect();
  $("detailBtn").onclick = () => enterInspect();
  $("exitInspect").onclick = leaveInspect;
  $("demoAttack").onclick = demoAttack;
  $("inspectBottom").onclick = toggleBottom;
  $("inspectHero").onclick = () => {
    if (active) return;
    inspectHero = HEROES[(HEROES.findIndex((h) => h.id === inspectHero) + 1) % 3].id;
    buildInspection("K");
  };
  $("homeView").onclick = () => fitView(gameMode === "ai" ? humanSide : turn);
  $("topView").onclick = () => {
    goal.phi = 1.49;
    goal.target = [0, 0, 0];
    goal.dist = fitDistance() * 0.9;
  };
  $("autoFlip").onclick = () => {
    if (busy()) return;
    cfg.flip = !cfg.flip;
    applySettings();
    toast(cfg.flip ? "已开启落子后自动换边" : "已固定观察方向，双方仍轮流落子");
  };
  $("labelsBtn").onclick = () => {
    cfg.labels = !cfg.labels;
    updateUI();
    try {
      localStorage.setItem(SETTINGS, JSON.stringify(cfg));
    } catch (e) {}
  };
  $("undoBtn").onclick = undo;
  $("drawBtn").onclick = () => {
    if (result || busy()) return;
    if (gameMode === "ai") {
      requestHint();
      return;
    }
    confirmBox("申请和棋", "请另一位玩家确认：是否同意以和棋结束本局？", () => {
      result = { winner: null, reason: "双方同意和棋" };
      save();
      updateUI();
      showResult();
    });
  };
  $("resignBtn").onclick = () => {
    if (result || busy()) return;
    confirmBox(
      "确认认输",
      `认输后，本局由对方获胜。`,
      () => {
        cancelAI();
        result = {
          winner: Rules.opposite(gameMode === "ai" ? humanSide : turn),
          reason: "对方认输",
        };
        save();
        updateUI();
        audio.fx("win");
        showResult();
      },
      "确认认输",
    );
  };
  $("menuBtn").onclick = quit;
  $("settingsBtn").onclick = openSettings;
  $("helpBtn").onclick = help;
  $("audioBtn").onclick = () => {
    const on = cfg.music || cfg.effects;
    cfg.music = !on;
    cfg.effects = !on;
    audio.unlock();
    applySettings();
  };
  $("fullscreenBtn").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else
      document.documentElement
        .requestFullscreen()
        .catch(() => toast("浏览器未允许全屏，可使用 F11。"));
  };
  document.addEventListener("keydown", (e) => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === "Escape") {
      if (!$("modalWrap").hidden) closeModal();
      else if (mode === "inspect" && !active) leaveInspect();
      else {
        selected = null;
        legalMoves = [];
        updateUI();
      }
    }
    if (e.code === "Space" && mode === "play" && !flipTween) {
      e.preventDefault();
      fitView(gameMode === "ai" ? humanSide : turn);
    }
    if (e.code === "KeyH" && !busy()) {
      document.body.dataset.clean = document.body.dataset.clean === "true" ? "false" : "true";
      resize();
    }
    if (e.code === "KeyM") {
      cfg.music = !cfg.music;
      applySettings();
    }
  });
  const c = $("scene");
  c.addEventListener("contextmenu", (e) => e.preventDefault());
  c.addEventListener("pointerdown", (e) => {
    if (!$("modalWrap").hidden) return;
    interaction = clock;
    c.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1)
      gesture = {
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: 0,
        button: e.button,
        shift: e.shiftKey,
        multi: false,
      };
    else {
      gesture.multi = true;
      let a = [...pointers.values()];
      gesture.pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      gesture.mx = (a[0].x + a[1].x) / 2;
      gesture.my = (a[0].y + a[1].y) / 2;
    }
  });
  c.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    interaction = clock;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (flipTween) return;
    if (pointers.size >= 2) {
      let a = [...pointers.values()],
        d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y),
        mx = (a[0].x + a[1].x) / 2,
        my = (a[0].y + a[1].y) / 2;
      if (gesture.pinch) goal.dist *= gesture.pinch / Math.max(8, d);
      pan(mx - (gesture.mx || mx), my - (gesture.my || my));
      gesture.pinch = d;
      gesture.mx = mx;
      gesture.my = my;
      gesture.multi = true;
      gesture.moved = 100;
    } else {
      let dx = e.clientX - gesture.lastX,
        dy = e.clientY - gesture.lastY;
      gesture.moved = Math.max(
        gesture.moved,
        Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y),
      );
      if (gesture.button === 2 || gesture.shift) pan(dx, dy);
      else {
        goal.theta -= dx * 0.005;
        goal.phi += dy * 0.0045;
      }
      gesture.lastX = e.clientX;
      gesture.lastY = e.clientY;
    }
    clampCamera();
  });
  function up(e, cancel = false) {
    if (!pointers.has(e.pointerId)) return;
    const single = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (
      !cancel &&
      single &&
      gesture &&
      !gesture.multi &&
      gesture.moved < 7 &&
      gesture.button === 0
    ) {
      const r = c.getBoundingClientRect();
      chooseAt(e.clientX - r.left, e.clientY - r.top);
    }
    if (pointers.size === 0) gesture = null;
    else if (gesture) {
      gesture.multi = true;
      const a = [...pointers.values()][0];
      gesture.lastX = a.x;
      gesture.lastY = a.y;
    }
  }
  c.addEventListener("pointerup", (e) => up(e));
  c.addEventListener("pointercancel", (e) => up(e, true));
  c.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (flipTween) return;
      interaction = clock;
      goal.dist *= Math.exp(clamp(e.deltaY, -120, 120) * 0.0012);
      clampCamera();
    },
    { passive: false },
  );
  window.addEventListener("resize", () => {
    resize();
    if (mode === "play") {
      goal.dist = fitDistance();
      goal.target = [0, 0.2, 0];
    } else if (mode === "inspect") {
      goal.dist = inspectionDistance(active ? 10 : 5.6);
    }
  });
  document.addEventListener("visibilitychange", () => {
    lastTime = performance.now();
    if (document.hidden) {
      cancelAI();
      audio.ctx?.suspend();
    } else {
      if (audio.running) audio.ctx?.resume().catch(() => {});
      scheduleAI();
    }
  });
}

function pan(dx, dy) {
  const f = goal.dist * 0.0013;
  goal.target[0] -= (Math.cos(goal.theta) * dx + Math.sin(goal.theta) * dy) * f;
  goal.target[2] -= (-Math.sin(goal.theta) * dx + Math.cos(goal.theta) * dy) * f;
  goal.target[0] = clamp(goal.target[0], -16, 16);
  goal.target[2] = clamp(goal.target[2], -16, 16);
}

function clampCamera() {
  goal.dist = clamp(goal.dist, mode === "inspect" ? 3.0 : 6.0, mode === "inspect" ? 30 : 110);
  goal.phi = clamp(goal.phi, mode === "inspect" ? -1.42 : 0.25, 1.52);
}

function resize() {
  if (!renderer) return;
  const r = $("stage").getBoundingClientRect();
  renderer.resize(Math.max(1, r.width), Math.max(1, r.height), ratio);
  const ov = $("overlay"),
    dpr = Math.min(2, window.devicePixelRatio || 1);
  ov.width = Math.round(r.width * dpr);
  ov.height = Math.round(r.height * dpr);
  ov.style.width = r.width + "px";
  ov.style.height = r.height + "px";
}

function drawOverlay() {
  const c = $("overlay").getContext("2d"),
    w = renderer.width,
    h = renderer.height,
    dpr = $("overlay").width / w;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  if (mode !== "play" || document.body.dataset.clean === "true") return;
  function pathDiamond(pos, size, col, width = 1) {
    let pts = [
      [pos[0] - size, 0.075, pos[2]],
      [pos[0], 0.075, pos[2] - size],
      [pos[0] + size, 0.075, pos[2]],
      [pos[0], 0.075, pos[2] + size],
    ].map((p) => renderer.project(p));
    c.strokeStyle = col;
    c.lineWidth = width;
    c.beginPath();
    pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
    c.closePath();
    c.stroke();
  }
  if (records.length && !active) {
    const last = records[records.length - 1];
    for (let rc of [last.from, last.to])
      pathDiamond(worldPos(rc.r, rc.c), 0.27, "#f3df9eaa", 1.5);
  }
  if (selected) {
    const a = armies.get(selected.id);
    pathDiamond(a.root.p, 1.05, "#f6dd97", 2);
    for (let m of legalMoves) {
      let pos = worldPos(m.r, m.c),
        q = renderer.project(pos);
      if (q.w < 0) continue;
      if (m.capture) {
        pathDiamond(pos, 1.13, "#ffb1a1", 2);
        c.fillStyle = "#f7c0a4";
        c.font = "10px sans-serif";
        c.textAlign = "center";
        c.fillText("可破", q.x, q.y - 5);
      } else {
        c.beginPath();
        c.ellipse(q.x, q.y, 5, 3.5, 0, 0, Math.PI * 2);
        c.fillStyle = "#f5d99b";
        c.shadowBlur = 7;
        c.shadowColor = "#f7cb69";
        c.fill();
        c.shadowBlur = 0;
      }
    }
  }
  if (!cfg.labels) return;
  let items = [...board.filter(Boolean), ...grave];
  for (let p of items) {
    let a = armies.get(p.id);
    if (!a) continue;
    const captured = grave.some((g) => g.id === p.id),
      q = renderer.project([
        a.root.p[0],
        0.12,
        a.root.p[2] + (captured ? 0.54 : p.s === "r" ? 0.96 : -0.96),
      ]);
    if (q.w < 0 || q.x < 0 || q.y < 0 || q.x > w || q.y > h) continue;
    let rad = captured ? 7.0 : clamp(350 / q.w, 9.5, 16);
    c.save();
    c.translate(q.x, q.y);
    c.beginPath();
    c.arc(0, 0, rad, 0, Math.PI * 2);
    c.fillStyle = captured ? "#343b32df" : p.s === "r" ? "#793930f2" : "#24434af2";
    c.fill();
    c.lineWidth = selected?.id === p.id ? 2 : 1;
    c.strokeStyle = selected?.id === p.id ? "#ffdea3" : captured ? "#ab9b7288" : "#ddc498b8";
    c.stroke();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `${captured ? 11 : Math.round(rad * 1.47)}px "Noto Serif CJK SC",SimSun,serif`;
    c.fillStyle = captured ? "#b8b29e" : "#f5e5c4";
    c.fillText(Rules.LABEL[p.s][p.t], 0, 0.8);
    c.restore();
  }
  if (Rules.checked(board, turn) && !active && !result) {
    let king = board.find((p) => p?.s === turn && p.t === "K");
    if (king) pathDiamond(worldPos(king.r, king.c), 1.17, "#f4a088", 2);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.life += dt;
    if (p.life >= p.max) {
      particles.splice(i, 1);
      particlePool.push(p);
      continue;
    }
    const f = p.life / p.max;
    p.p[0] += p.v[0] * dt;
    p.p[1] += p.v[1] * dt;
    p.p[2] += p.v[2] * dt;
    if (p.kind !== "smoke") p.v[1] -= dt * 3.8;
    p.v[0] *= Math.exp(-dt * 1.2);
    p.v[2] *= Math.exp(-dt * 1.2);
    p.size = p.baseSize * (p.kind === "smoke" ? 1 + f * 1.8 : 1 + f * 0.8);
    p.color[3] = p.baseAlpha * (1 - f);
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.t += dt;
    let u = clamp(p.t / p.duration, 0, 1),
      pos = p.from.map((v, j) => mix(v, p.to[j], u));
    pos[1] += Math.sin(u * Math.PI) * 1.5;
    if (p.t > p.duration) {
      projectiles.splice(i, 1);
      continue;
    }
    let dot = particlePool.pop() || {};
    Object.assign(dot, {
      p: pos,
      v: [0, 0, 0],
      life: 0,
      max: 0.07,
      baseSize: 0.065,
      baseAlpha: 1,
      color: [0.97, 0.74, 0.31, 1],
      size: 0.065,
      kind: "spark",
    });
    particles.push(dot);
  }
}

function loop(now) {
  const raw = lastTime ? (now - lastTime) / 1000 : 1 / 60;
  lastTime = now;
  if (document.hidden || !$("modalWrap").hidden) {
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.1, raw);
  clock += dt;
  frameCount++;
  fpsAccum += raw;
  fpsFrames++;
  if (fpsAccum >= 0.6) {
    fps = fpsFrames / fpsAccum;
    fpsAccum = 0;
    fpsFrames = 0;
    $("perf").textContent =
      `${Math.round(fps)} FPS  ·  ${renderer.soldierCount || 0} 位将士  ·  ${renderer.drawCalls} 次绘制`;
  }
  if (active) tickAction(dt);
  if (flipTween) {
    let f = flipTween;
    f.time += dt;
    let t = ease(f.time / f.duration);
    cam.theta = mix(f.from.theta, f.to.theta, t);
    cam.phi = mix(f.from.phi, f.to.phi, t);
    cam.dist = mix(f.from.dist, f.to.dist, t);
    cam.target = f.from.target.map((v, i) => mix(v, f.to.target[i], t));
    goal = { theta: cam.theta, phi: cam.phi, dist: cam.dist, target: cam.target.slice() };
    if (f.time >= f.duration) {
      let side = f.side;
      flipTween = null;
      $("viewSide").textContent = (side === "r" ? "红" : "黑") + "方帅位";
      updateUI();
      ribbon(`${side === "r" ? "红" : "黑"}方行棋 · ${hero(heroes[side]).name}`);
    }
  } else {
    if (mode === "menu" && clock - interaction > 4) {
      goal.theta = 0.48 + Math.sin(clock * 0.055) * 0.08;
    }
    const k = 1 - Math.exp(-dt * 15);
    cam.theta = mix(cam.theta, goal.theta, k);
    cam.phi = mix(cam.phi, goal.phi, k);
    cam.dist = mix(cam.dist, goal.dist, k);
    cam.target = cam.target.map((v, i) => mix(v, goal.target[i], k));
  }
  if (!active && mode === "inspect" && inspect && frameCount % 3 === 0) {
    poseArmy(inspect.a, 0, 0, 0, 0, clock);
    const dirty = renderer.shadowDirty;
    renderer.update(inspect.a.root);
    renderer.shadowDirty = dirty;
  }
  shake *= Math.exp(-dt * 16);
  cam.eye = [
    cam.target[0] +
      Math.sin(cam.theta) * Math.cos(cam.phi) * cam.dist +
      Math.sin(clock * 68) * shake,
    cam.target[1] + Math.sin(cam.phi) * cam.dist,
    cam.target[2] + Math.cos(cam.theta) * Math.cos(cam.phi) * cam.dist,
  ];
  updateParticles(dt);
  renderer.render(cam, clock, particles);
  drawOverlay();
  diagnostics.push({
    frame: frameCount,
    ms: +(raw * 1000).toFixed(2),
    mode,
    active: active?.p.t || null,
    flip: !!flipTween,
    ratio,
    drawCalls: renderer.drawCalls,
    particles: particles.length,
  });
  if (diagnostics.length > 900) diagnostics.shift();
  if (cfg.quality === "auto" && clock > nextAdaptive) {
    if (fps < 46 && !active && !flipTween) {
      lowSince += dt;
      if (lowSince > 1.5 && ratio > 0.65) {
        ratio = Math.max(0.65, ratio - 0.12);
        resize();
        nextAdaptive = clock + 4;
        lowSince = 0;
      }
    } else lowSince = 0;
  }
  requestAnimationFrame(loop);
}

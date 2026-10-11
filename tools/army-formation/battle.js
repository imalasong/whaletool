/* 走子、交锋演出和悔棋。 */
"use strict";
function selectPiece(p) {
  selected = p;
  legalMoves = Rules.legal(board, p);
  audio.fx("select", 0.65);
  updateUI();
}

function chooseAt(x, y) {
  if (
    mode !== "play" ||
    busy() ||
    result ||
    !$("modalWrap").hidden ||
    thinking ||
    (gameMode === "ai" && turn !== humanSide)
  )
    return;
  let screenHit = null,
    min = Infinity;
  for (let p of board) {
    if (!p) continue;
    let a = armies.get(p.id),
      q = renderer.project([a.root.p[0], 0.2, a.root.p[2] + (p.s === "r" ? 0.96 : -0.96)]),
      d = Math.hypot(q.x - x, q.y - y);
    if (q.w > 0 && d < 17 && d < min) {
      screenHit = p;
      min = d;
    }
  }
  let rc = pickBoard(x, y);
  if (screenHit) rc = { r: screenHit.r, c: screenHit.c };
  if (!rc) {
    selected = null;
    legalMoves = [];
    updateUI();
    return;
  }
  let p = Rules.at(board, rc.r, rc.c);
  if (p?.s === turn) {
    selectPiece(p);
    return;
  }
  if (selected) {
    let m = legalMoves.find((m) => m.r === rc.r && m.c === rc.c);
    if (m) beginMove(selected, m.r, m.c);
    else {
      audio.fx("step", 0.3);
      toast(Rules.explain(board, selected, rc.r, rc.c));
    }
  } else if (p) toast("现在轮到" + (turn === "r" ? "红" : "黑") + "方，请选择己方军阵。");
}

function pickBoard(x, y) {
  let w = renderer.width,
    h = renderer.height,
    forward = V.norm(V.sub(cam.target, cam.eye)),
    right = V.norm(V.cross(forward, [0, 1, 0])),
    up = V.cross(right, forward),
    tan = Math.tan(cam.fov / 2);
  let dir = V.norm(
    V.add(
      forward,
      V.add(V.mul(right, (((x / w) * 2 - 1) * tan * w) / h), V.mul(up, (1 - (y / h) * 2) * tan)),
    ),
  );
  if (Math.abs(dir[1]) < 0.001) return null;
  let t = (0.074 - cam.eye[1]) / dir[1];
  if (t <= 0) return null;
  let p = V.add(cam.eye, V.mul(dir, t)),
    c = Math.round(p[0] / 2.5 + 4),
    r = Math.round(p[2] / 2.5 + 4.5);
  if (c < 0 || c > 8 || r < 0 || r > 9) return null;
  return { r, c };
}

function notation(p, fr, to) {
  let cn = "一二三四五六七八九",
    file = (c) => (p.s === "r" ? cn[8 - c] : String(c + 1)),
    label = Rules.LABEL[p.s][p.t];
  if (fr.r === to.r) return label + file(fr.c) + "平" + file(to.c);
  let toward = (to.r - fr.r) * (p.s === "r" ? -1 : 1) > 0;
  let dest = ["H", "E", "A"].includes(p.t)
    ? file(to.c)
    : p.s === "r"
      ? cn[Math.abs(to.r - fr.r) - 1]
      : String(Math.abs(to.r - fr.r));
  return label + file(fr.c) + (toward ? "进" : "退") + dest;
}

function beginMove(p, r, c, byAI = false) {
  if (
    mode !== "play" ||
    busy() ||
    result ||
    p.s !== turn ||
    (gameMode === "ai" && p.s !== humanSide && !byAI) ||
    thinking
  )
    return false;
  let m = Rules.legal(board, p).find((m) => m.r === r && m.c === c);
  if (!m) return false;
  rememberView();
  let a = armies.get(p.id),
    v = m.capture ? armies.get(m.capture.id) : null,
    to = worldPos(r, c),
    from = a.root.p.slice(),
    delta = V.sub(to, from),
    dist = Math.hypot(delta[0], delta[2]),
    dir = V.norm(delta);
  active = {
    a,
    v,
    p,
    from,
    to,
    r,
    c,
    fromCell: { r: p.r, c: p.c },
    duration: v ? (p.t === "C" ? 2.1 : 1.74) : clamp(0.46 + dist * 0.038, 0.63, 1.05),
    t: 0,
    dir,
    dist,
    angle: Math.atan2(-dir[0], -dir[2]),
    startAngle: a.root.r[1],
    wheelStart: a.wheelAngle || 0,
    gait: 0,
    lastTravel: 0,
    snapshot: snapshot(),
    hits: 0,
    fire: 0,
    stepClock: 0,
    graveTo: v ? gravePos(v.piece.s, grave.filter((g) => g.s === v.piece.s).length) : null,
    inspect: false,
  };
  if (v && cfg.cinematic !== false) {
    active.viewReturn = {
      theta: goal.theta,
      phi: goal.phi,
      dist: goal.dist,
      target: goal.target.slice(),
    };
    goal.target = [to[0], 0.4, to[2]];
    goal.phi = 0.46;
    goal.dist = window.innerWidth < 650 ? 15.0 : 13.0;
  }
  a.root.dynamic = true;
  if (v) v.root.dynamic = true;
  renderer.compile(world.root);
  selected = null;
  legalMoves = [];
  audio.unlock();
  updateUI();
  return true;
}

function burst(pos, kind = "dust", count = 18, power = 1) {
  for (let i = 0; i < count; i++) {
    let p = particlePool.pop() || {},
      a = Math.random() * Math.PI * 2,
      vel = (0.2 + Math.random() * 1.9) * power,
      smoke = kind === "smoke",
      spark = kind === "spark";
    p.p = [
      pos[0] + (Math.random() - 0.5) * 0.4,
      pos[1] + Math.random() * 0.3,
      pos[2] + (Math.random() - 0.5) * 0.4,
    ];
    p.v = [
      Math.cos(a) * vel,
      (smoke ? 0.4 : 1.1) + Math.random() * (spark ? 2.4 : 1.2) * power,
      Math.sin(a) * vel,
    ];
    p.life = 0;
    p.max = smoke
      ? 1.2 + Math.random() * 0.65
      : spark
        ? 0.25 + Math.random() * 0.38
        : 0.5 + Math.random() * 0.42;
    p.baseSize = smoke
      ? 0.6 + Math.random() * 0.75
      : spark
        ? 0.034 + Math.random() * 0.034
        : 0.12 + Math.random() * 0.28;
    p.baseAlpha = smoke ? 0.37 : spark ? 0.95 : 0.55;
    p.color = smoke
      ? [0.51, 0.51, 0.45, p.baseAlpha]
      : spark
        ? [1, 0.73, 0.32, p.baseAlpha]
        : [0.65, 0.56, 0.39, p.baseAlpha];
    p.kind = kind;
    p.size = p.baseSize;
    particles.push(p);
  }
}

function hit(a, heavy = false) {
  let pos = V.add(a.to, V.mul(a.dir, -0.22));
  pos[1] = 0.55;
  for (let k = 0; k < 5; k++) {
    let p = V.add(pos, [a.dir[2] * (k - 2) * 0.32, 0, -a.dir[0] * (k - 2) * 0.32]);
    burst(p, "dust", 6, 0.58);
    burst(p, "spark", heavy ? 8 : 4, 1.15);
  }
  audio.fx(heavy ? "impact" : "sword", 0.95);
  shake = heavy ? 0.033 : 0.016;
  audio.duck?.(0.55);
}

function fireCannon(a, index) {
  const guns = a.a.troops.filter((t) => t.type === "cannon"),
    g = guns[[0, 2, 1, 3][index]] || guns[0],
    ang = a.angle,
    xx = g ? g.x : 0,
    zz = g ? g.z - 0.558 * g.scale : -0.49,
    start = [
      a.from[0] + Math.cos(ang) * xx + Math.sin(ang) * zz,
      a.from[1] + (g?.scale || 0.7) * 0.47,
      a.from[2] - Math.sin(ang) * xx + Math.cos(ang) * zz,
    ];
  burst(start, "smoke", 14, 0.45);
  burst(start, "spark", 10, 0.7);
  audio.fx("cannon", 0.7);
  projectiles.push({
    from: start,
    to: [a.to[0] + (Math.random() - 0.5) * 0.35, 0.6, a.to[2]],
    t: 0,
    duration: 0.4,
  });
}

function tickAction(dt) {
  let a = active;
  if (!a) return;
  const speed = cfg.speed;
  a.t += dt * speed;
  const t = a.t,
    cap = !!a.v,
    isC = a.p.t === "C",
    unit = a.a;
  let u,
    attack = 0,
    moving = 0,
    travel = 0;
  unit.root.r[1] = mixAngle(a.startAngle, a.angle, smooth(t / 0.14));
  if (!cap) {
    u = ease(t / a.duration);
    unit.root.p = a.from.map((v, i) => mix(v, a.to[i], u));
    travel = u * a.dist;
    moving = Math.sin(Math.PI * clamp(t / a.duration, 0, 1)) * 0.9;
  } else if (isC) {
    if (t > 0.16 && a.fire === 0) {
      fireCannon(a, 0);
      a.fire++;
    }
    if (t > 0.29 && a.fire === 1) {
      fireCannon(a, 1);
      a.fire++;
    }
    if (t > 0.41 && a.fire === 2) {
      fireCannon(a, 2);
      a.fire++;
    }
    if (t > 0.53 && a.fire === 3) {
      fireCannon(a, 3);
      a.fire++;
    }
    if (t > 0.61 && a.hits === 0) {
      hit(a, true);
      burst([a.to[0], 0.7, a.to[2]], "smoke", 27, 0.8);
      a.hits++;
    }
    if (t > 0.76 && a.hits === 1) {
      hit(a, true);
      a.hits++;
    }
    if (t > 0.9 && a.hits === 2) {
      hit(a, true);
      a.hits++;
    }
    if (t > 0.99 && a.hits === 3) {
      hit(a, true);
      a.hits++;
    }
    attack =
      Math.max(0, 1 - (t - 0.2) / 0.18) * (t > 0.2 && t < 0.38 ? 1 : 0) +
      Math.max(0, 1 - (t - 0.35) / 0.18) * (t > 0.35 && t < 0.53 ? 1 : 0);
    u = ease((t - 1.04) / 0.7);
    unit.root.p = a.from.map((v, i) => mix(v, a.to[i], u));
    if (u > 0 && u < 1) {
      let deviation = Math.sin(u * Math.PI) * 0.95;
      unit.root.p[0] += -a.dir[2] * deviation;
      unit.root.p[2] += a.dir[0] * deviation;
    }
    travel = u * a.dist;
    moving = Math.sin(Math.PI * clamp((t - 1.04) / 0.7, 0, 1)) * 0.8;
  } else {
    let stop = V.add(a.to, V.mul(a.dir, -1.56));
    if (t < 0.6) {
      u = ease(t / 0.6);
      unit.root.p = a.from.map((v, i) => mix(v, stop[i], u));
      travel = u * Math.max(0.1, a.dist - 1.56);
      moving = Math.sin(Math.PI * u) * 0.8 + 0.12;
    } else {
      let q = ease((t - 1.06) / 0.38);
      unit.root.p = stop.map((v, i) => mix(v, a.to[i], q));
      travel = Math.max(0, a.dist - 1.56) + q * 1.56;
      moving = Math.sin(Math.PI * q) * 0.7;
    }
    let p1 = Math.max(0, Math.sin(clamp((t - 0.55) / 0.29, 0, 1) * Math.PI)),
      p2 = Math.max(0, Math.sin(clamp((t - 0.79) / 0.28, 0, 1) * Math.PI));
    attack = Math.max(p1, p2 * 0.8);
    if (t > 0.68 && a.hits === 0) {
      hit(a, a.p.t === "R" || a.p.t === "H");
      a.hits++;
    }
    if (t > 0.91 && a.hits === 1) {
      hit(a, a.p.t === "E");
      a.hits++;
    }
  }
  if (t > a.duration - 0.18)
    unit.root.r[1] = mixAngle(a.angle, unit.restAngle, smooth((t - a.duration + 0.18) / 0.18));
  if (a.p.t === "H" || a.p.t === "R") moving = clamp(moving * 1.2, 0, 1); // Long chess moves compress distance; cap gait cadence to avoid buzzing legs. Wheels still follow actual distance.
  const traveled = Math.abs(travel - (a.lastTravel || 0));
  a.gait =
    (a.gait || 0) +
    Math.min(traveled * 6, dt * speed * (a.p.t === "H" || a.p.t === "R" ? 10.5 : 7.6));
  a.lastTravel = travel;
  unit.wheelAngle = (a.wheelStart || 0) - travel / 0.17;
  poseArmy(unit, moving, isC && cap && t < 1.04 ? -(t + 0.001) : a.gait, attack, 0, clock);
  renderer.update(unit.root);
  if (cap) {
    const v = a.v,
      fall = smooth((t - (isC ? 0.58 : 0.71)) / 0.28),
      escape = smooth((t - (isC ? 1.0 : 1.03)) / 0.5);
    if (escape === 0) {
      v.root.p = a.to.slice();
      v.root.p[0] += a.dir[0] * fall * 0.14;
      v.root.p[2] += a.dir[2] * fall * 0.14;
    } else {
      v.root.p = a.to.map((n, i) => mix(n, a.graveTo[i], escape));
      v.root.p[1] += Math.sin(escape * Math.PI) * 0.12;
      v.root.s = [1 - 0.52 * escape, 1 - 0.52 * escape, 1 - 0.52 * escape];
      v.root.tint = 1 - 0.37 * escape;
      v.root.r[1] = mixAngle(v.restAngle, v.piece.s === "r" ? Math.PI / 2 : -Math.PI / 2, escape);
    }
    poseArmy(v, 0, 0, Math.sin(t * 13) * 0.13 * (1 - fall), fall * (1 - escape), clock);
    renderer.update(v.root);
  }
  if (moving > 0.24) {
    a.stepClock += dt;
    if (a.stepClock > 0.19) {
      a.stepClock = 0;
      audio.fx(a.p.t === "H" ? "horse" : a.p.t === "R" || a.p.t === "C" ? "wheel" : "step", 0.4);
      for (let j = 0; j < 3; j++)
        burst([unit.root.p[0] + (j - 1) * 0.61, 0.1, unit.root.p[2]], "dust", 2, 0.18);
    }
  }
  if (t >= a.duration) finishAction();
}

function mixAngle(a, b, t) {
  let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

function finishAction() {
  const a = active;
  if (!a) return;
  if (a.viewReturn) goal = { ...a.viewReturn, target: a.viewReturn.target.slice() };
  active = null;
  a.a.root.p = a.to.slice();
  a.a.root.r[1] = a.a.restAngle;
  poseArmy(a.a, 0, 0, 0, 0, clock);
  if (a.v) {
    a.v.root.p = a.graveTo.slice();
    a.v.root.s = [0.48, 0.48, 0.48];
    a.v.root.tint = 0.63;
    poseArmy(a.v, 0, 0, 0, 0, clock);
    renderer.update(a.v.root);
  }
  renderer.update(a.a.root);
  if (a.inspect) {
    inspect.platform.s = [1, 1, 1];
    inspect.a.root.p = [0, 0.074, 0];
    inspect.a.root.r[1] = 0;
    inspect.enemy.root.visible = false;
    inspect.enemy.root.s = [1, 1, 1];
    inspect.enemy.root.tint = 1;
    inspect.a.root.visible = true;
    renderer.compile(world.root);
    $("demoAttack").disabled = false;
    $("demoAttack").textContent = "再次观看攻击试演";
    $("inspectBottom").disabled = false;
    $("exitInspect").disabled = false;
    goal.target = [0, 0.5, 0];
    return;
  }
  a.a.root.dynamic = false;
  if (a.v) a.v.root.dynamic = false;
  renderer.compile(world.root);
  const fr = { ...a.fromCell },
    p = a.p,
    notationText = notation(p, fr, { r: a.r, c: a.c }),
    m = Rules.move(board, p.id, a.r, a.c);
  if (m.captured) grave.push({ ...m.captured });
  turn = Rules.opposite(turn);
  ply++;
  let check = Rules.checked(board, turn);
  history.push({ key: Rules.key(board, turn), mover: p.s, check });
  records.push({
    s: p.s,
    notation: notationText,
    from: fr,
    to: { r: a.r, c: a.c },
    pieceId: p.id,
    captured: m.captured ? { ...m.captured } : null,
    check,
    before: a.snapshot,
  });
  result = Rules.result(board, turn);
  const rep = Rules.repetition(history, Rules.key(board, turn));
  if (!result && rep?.winner) result = rep;
  if (rep?.warning) toast(rep.warning, 5200);
  save();
  updateUI();
  if (result) {
    cancelAI();
    audio.fx("win");
    caption("胜负已定", result.reason, 1300);
    setTimeout(showResult, 850);
  } else {
    if (check) {
      audio.fx("check");
      caption("将 军", "KING UNDER ATTACK", 750);
    }
    audio.fx("turn", 0.5);
    flipTo(turn);
  }
}

function showResult() {
  if (!result || mode !== "play") return;
  const title = result.winner ? `${result.winner === "r" ? "红" : "黑"}方获胜` : "握手言和";
  modal(
    `<div class="eyebrow">CAMPAIGN COMPLETE</div><h2>${title}</h2><p>${result.winner ? hero(heroes[result.winner]).name + "率部取胜。" : "两位统帅同意结束本局。"}<br>终局：${result.reason}　·　共 ${ply} 步</p><div class="modal-buttons"><button class="minor" id="viewEnd">检视终局</button><button class="primary" id="againBtn">再下一盘</button></div>`,
    () => {
      $("viewEnd").onclick = closeModal;
      $("againBtn").onclick = () => {
        closeModal();
        startGame(true);
      };
    },
  );
}

function undo() {
  if (busy() || !records.length) return;
  const apply = () => {
    cancelAI();
    let i = records.length - 1;
    if (gameMode === "ai") {
      while (i >= 0 && records[i].s !== humanSide) i--;
      if (i < 0) {
        toast("你还没有落子，无需悔棋。");
        scheduleAI();
        return;
      }
    }
    const snap = records[i].before;
    records = records.slice(0, i);
    board = Rules.clone(snap.board);
    grave = snap.grave.map((p) => ({ ...p }));
    turn = snap.turn;
    history = JSON.parse(JSON.stringify(snap.history));
    ply = snap.ply;
    result = snap.result;
    selected = null;
    legalMoves = [];
    particles.length = 0;
    projectiles.length = 0;
    makeAll();
    updateUI();
    fitView(gameMode === "ai" ? humanSide : turn);
    save();
    ribbon(gameMode === "ai" ? "已撤回你和电脑的这一回合" : "已撤回最后一步");
    scheduleAI();
  };
  if (gameMode === "ai") apply();
  else confirmBox("申请悔棋", "请另一位玩家确认，是否撤回最后一步？", apply);
}

function quit() {
  if (busy()) return;
  cancelAI();
  save();
  setMode("menu");
  updateRoster();
  goal = { theta: 0.48, phi: 0.59, dist: 24, target: [3.5, 0.3, 6] };
  $("continueBtn").hidden = !validSave(saveData);
}

/* 军阵检阅，不改正式棋局。 */
"use strict";
function buildInspection(t = inspectType) {
  inspectType = t;
  world.inspect.children = [];
  let platform = link(world.inspect);
  part(platform, "cylinder", "#242e2d", [0, -0.11, 0], [1.8, 0.25, 1.8], [], { metal: 0.1 });
  part(platform, "cylinder", "#8d7745", [0, 0.015, 0], [1.82, 0.025, 1.82], [], { metal: 0.5 });
  part(platform, "cylinder", "#39413a", [0, 0.032, 0], [1.76, 0.018, 1.76]);
  let p = { id: "inspect-a", s: "r", t, r: 6, c: 4 },
    q = { id: "inspect-b", s: "b", t: "P", r: 3, c: 4 };
  let a = buildArmy(p, inspectHero),
    enemy = buildArmy(q, "liu");
  a.root.p = [0, 0.074, 0];
  enemy.root.p = [0, 0.074, -2.3];
  enemy.root.visible = false;
  world.inspect.add(a.root);
  world.inspect.add(enemy.root);
  poseArmy(a, 0, 0, 0, 0, clock);
  inspect = { a, enemy, platform, bottom: false };
  renderer.compile(world.root);
  $("inspectName").textContent = Rules.NAME[t];
  $("inspectDesc").textContent = DESCRIPTIONS[t];
  $("inspectBottom").textContent = "底部观察";
  $("inspectHero").textContent = "统帅：" + hero(inspectHero).name;
  $("inspectHero").hidden = t !== "K";
  $("demoAttack").textContent = "观看攻击试演";
  $("inspectTypes").innerHTML = "";
  for (let ty of ["P", "H", "R", "C", "E", "A", "K"]) {
    let b = document.createElement("button");
    b.textContent = Rules.LABEL.r[ty];
    b.className = ty === t ? "active" : "";
    b.onclick = () => {
      if (active) return;
      buildInspection(ty);
      goal.dist = inspectionDistance();
      goal.target = [0, 0.6, 0];
      goal.phi = 0.3;
    };
    $("inspectTypes").appendChild(b);
  }
}

function enterInspect(t) {
  if (busy()) return;
  audio.unlock();
  previousMode = mode;
  inspectHero = selected?.t === "K" ? heroes[selected.s] : heroes.r;
  const ty = t || selected?.t || "P";
  rememberView();
  world.env.visible = false;
  world.armies.visible = false;
  world.inspect.visible = true;
  buildInspection(ty);
  setMode("inspect");
  goal = { theta: Math.PI + 0.28, phi: 0.3, dist: inspectionDistance(), target: [0, 0.6, 0] };
  cam.theta = goal.theta;
  cam.phi = goal.phi;
  cam.dist = goal.dist;
  cam.target = goal.target.slice();
}

function leaveInspect() {
  if (active) return;
  world.inspect.visible = false;
  world.env.visible = true;
  world.armies.visible = true;
  renderer.compile(world.root);
  setMode(previousMode);
  if (previousMode === "play") {
    fitView(gameMode === "ai" ? humanSide : turn, true);
    scheduleAI();
  } else {
    goal = { theta: 0.48, phi: 0.59, dist: 24, target: [3.5, 0.3, 6] };
    Object.assign(cam, {
      theta: goal.theta,
      phi: goal.phi,
      dist: goal.dist,
      target: goal.target.slice(),
    });
  }
  particles.length = 0;
  projectiles.length = 0;
}

function demoAttack() {
  if (mode !== "inspect" || active) return;
  inspect.bottom = false;
  inspect.platform.s = [1.62, 1, 1.62];
  inspect.platform.visible = true;
  inspect.a.base.visible = true;
  inspect.enemy.root.visible = true;
  inspect.a.root.p = [0, 0.074, 1.5];
  inspect.enemy.root.p = [0, 0.074, -1.5];
  inspect.enemy.root.r[1] = Math.PI;
  inspect.enemy.root.s = [1, 1, 1];
  inspect.enemy.root.tint = 1;
  poseArmy(inspect.enemy, 0, 0, 0, 0, clock);
  renderer.compile(world.root);
  const a = inspect.a;
  active = {
    a,
    v: inspect.enemy,
    p: a.piece,
    from: [0, 0.074, 1.5],
    to: [0, 0.074, -1.5],
    duration: a.piece.t === "C" ? 2 : 1.62,
    t: 0,
    dir: [0, 0, -1],
    dist: 3,
    angle: 0,
    startAngle: 0,
    wheelStart: a.wheelAngle || 0,
    gait: 0,
    lastTravel: 0,
    hits: 0,
    fire: 0,
    stepClock: 0,
    graveTo: [3.6, 0.16, -2.6],
    inspect: true,
  };
  goal.target = [0, 0.45, -0.25];
  goal.dist = inspectionDistance(10);
  goal.phi = 0.48;
  audio.play();
  $("demoAttack").disabled = true;
  $("inspectBottom").disabled = true;
  $("exitInspect").disabled = true;
}

function toggleBottom() {
  if (active) return;
  inspect.bottom = !inspect.bottom;
  inspect.platform.visible = !inspect.bottom;
  inspect.a.base.visible = !inspect.bottom;
  goal.phi = inspect.bottom ? -0.56 : 0.5;
  goal.dist = inspectionDistance(6.6);
  goal.target = [0, 0.52, 0];
  $("inspectBottom").textContent = inspect.bottom ? "回到正常检阅" : "底部观察";
  renderer.compile(world.root);
}

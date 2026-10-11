/* 对局状态、存档和棋盘装配。 */
"use strict";
const $ = (id) => document.getElementById(id),
  HEROES = [
    { id: "xiao", name: "晓斌", image: "army-formation/portraits/xiaobin.webp" },
    { id: "liu", name: "柳如烟", image: "army-formation/portraits/liuruyan.webp" },
    { id: "fox", name: "小蓝", image: "army-formation/portraits/xiaolan.webp" },
  ],
  DESCRIPTIONS = {
    K: "主帅与三十余名亲卫共同成阵。只能在九宫内直行一步，亲卫护旗随行。",
    A: "三十名精锐禁卫组成纵深阵。九宫之内，斜行一步，拱卫主帅。",
    E: "三十六人重盾与长戟防线。斜行两点，不越楚河，象眼不能被挡住。",
    H: "十六骑协同穿插。走日字，保留蹩马腿；交锋时战马加速、长枪压低。",
    R: "四乘战车配双马与护卫，战轮与马匹联动。沿横线或纵线行进，前路不能有阻挡。",
    C: "四门火炮、十六名炮手与护兵协同。吃子需要一个炮架；开炮后整队移驻目标点。",
    P: "四十九名长枪兵，七行七列。过河前只前进一步，过河后可横行，不能后退。",
  };
const STORE = "chuhe_legions_v2_save",
  SETTINGS = "chuhe_legions_v2_settings";
let renderer,
  world,
  board,
  armies = new Map(),
  grave = [],
  history = [],
  records = [],
  turn = "r",
  selected = null,
  legalMoves = [],
  mode = "menu",
  result = null,
  active = null,
  ply = 0,
  previousMode = "menu",
  inspect = null,
  inspectType = "P",
  inspectHero = "xiao",
  saveData = null,
  gameStarted = false;
let cfg = {
  flip: true,
  labels: true,
  shadows: true,
  cinematic: true,
  music: true,
  effects: true,
  volume: 0.55,
  quality: "auto",
  speed: 1,
};
try {
  Object.assign(cfg, JSON.parse(localStorage.getItem(SETTINGS) || "{}"));
  saveData = JSON.parse(localStorage.getItem(STORE) || "null");
} catch (e) {}
let gameMode = "ai",
  humanSide = "r",
  aiLevel = "normal",
  thinking = false,
  aiWorker = null,
  aiToken = 0,
  aiTimer = null,
  aiStats = null,
  aiPurpose = null;
let heroes = { r: "xiao", b: "liu" },
  cam = { theta: 0.48, phi: 0.59, dist: 24, target: [3.5, 0.3, 6], eye: [0, 0, 40], fov: 0.76 },
  goal = { theta: 0.48, phi: 0.59, dist: 24, target: [3.5, 0.3, 6] },
  flipTween = null,
  views = { r: null, b: null };
let clock = 0,
  lastTime = 0,
  frameCount = 0,
  fps = 60,
  fpsAccum = 0,
  fpsFrames = 0,
  ratio = 1,
  lowSince = 0,
  nextAdaptive = 0,
  interaction = 0,
  shake = 0,
  toastTimer,
  ribbonTimer,
  captionTimer,
  pointers = new Map(),
  gesture = null;
const audio = new BattlefieldAudio(),
  particles = [],
  particlePool = [],
  projectiles = [],
  diagnostics = [];

function busy() {
  return !!active || !!flipTween;
}

function hero(id) {
  return HEROES.find((h) => h.id === id) || HEROES[0];
}

function worldPos(r, c) {
  return [(c - 4) * 2.5, 0.074, (r - 4.5) * 2.5];
}

function gravePos(side, index) {
  return [side === "r" ? -13.72 : 13.72, 0.18, (index - 7.5) * 1.58];
}

function makeAll() {
  world.armies.children = [];
  armies.clear();
  for (const p of [...board.filter(Boolean), ...grave]) {
    let a = buildArmy(p, heroes[p.s], true);
    if (grave.some((g) => g.id === p.id)) {
      let idx = grave.filter((g) => g.s === p.s).findIndex((g) => g.id === p.id);
      a.root.p = gravePos(p.s, idx);
      a.root.s = [0.48, 0.48, 0.48];
      a.root.tint = 0.63;
      a.root.r[1] = p.s === "r" ? Math.PI / 2 : -Math.PI / 2;
      poseArmy(a, 0, 0, 0, 0, clock);
    } else {
      a.root.p = worldPos(p.r, p.c);
      poseArmy(a, 0, 0, 0, 0, clock);
    }
    world.armies.add(a.root);
    armies.set(p.id, a);
  }
  renderer.compile(world.root);
}

function initBoard() {
  board = Rules.initial();
  grave = [];
  turn = "r";
  records = [];
  history = [{ key: Rules.key(board, turn), mover: null, check: false }];
  ply = 0;
  selected = null;
  legalMoves = [];
  result = null;
  views = { r: null, b: null };
  makeAll();
  updateUI();
}

function serialize() {
  return {
    version: 2,
    gameMode,
    humanSide,
    aiLevel,
    board: Rules.clone(board),
    grave: grave.map((p) => ({ ...p })),
    turn,
    records: JSON.parse(JSON.stringify(records)),
    history: JSON.parse(JSON.stringify(history)),
    ply,
    heroes: { ...heroes },
    result: result ? { ...result } : null,
  };
}

function validSave(s) {
  if (
    !s ||
    s.version !== 2 ||
    !Array.isArray(s.board) ||
    s.board.length !== 90 ||
    !["r", "b"].includes(s.turn) ||
    !Array.isArray(s.grave) ||
    !Array.isArray(s.records) ||
    !Array.isArray(s.history) ||
    s.history.length > 30000
  )
    return false;
  let ids = new Set();
  for (let i = 0; i < 90; i++) {
    let p = s.board[i];
    if (!p) continue;
    if (
      !["r", "b"].includes(p.s) ||
      !Rules.NAME[p.t] ||
      p.r !== Math.floor(i / 9) ||
      p.c !== i % 9 ||
      ids.has(p.id)
    )
      return false;
    ids.add(p.id);
  }
  return (
    s.board.filter((p) => p?.t === "K").length === 2 &&
    s.grave.every((p) => p && Rules.NAME[p.t] && ["r", "b"].includes(p.s) && !ids.has(p.id))
  );
}

function save() {
  if (!gameStarted) return;
  try {
    saveData = serialize();
    localStorage.setItem(STORE, JSON.stringify(saveData));
    $("continueBtn").hidden = false;
  } catch (e) {}
}

function restore(s) {
  if (!validSave(s)) {
    toast("存档不完整，请重新列阵。");
    return false;
  }
  cancelAI();
  gameMode = s.gameMode === "pvp" ? "pvp" : "ai";
  humanSide = s.humanSide === "b" ? "b" : "r";
  aiLevel = ["easy", "normal", "hard"].includes(s.aiLevel) ? s.aiLevel : "normal";
  board = Rules.clone(s.board);
  grave = s.grave.map((p) => ({ ...p }));
  turn = s.turn;
  records = JSON.parse(JSON.stringify(s.records));
  history = JSON.parse(JSON.stringify(s.history));
  ply = s.ply;
  heroes = { ...s.heroes };
  result = s.result;
  selected = null;
  legalMoves = [];
  active = null;
  flipTween = null;
  particles.length = 0;
  projectiles.length = 0;
  makeAll();
  updateUI();
  return true;
}

function startGame(fresh = true) {
  cancelAI();
  audio.play();
  if (fresh) {
    initBoard();
    gameStarted = true;
  } else {
    if (!restore(saveData)) return;
    gameStarted = true;
  }
  setMode("play");
  fitView(gameMode === "ai" ? humanSide : turn, true);
  save();
  scheduleAI();
  ribbon(`${turn === "r" ? "红" : "黑"}方行棋 · ${hero(heroes[turn]).name}`);
  if (window.innerWidth < 650 && window.innerHeight > window.innerWidth)
    toast("横屏能看清更多军阵；双指可放大细看。", 3400);
  if (result) showResult();
}

function snapshot() {
  return {
    board: Rules.clone(board),
    grave: grave.map((p) => ({ ...p })),
    turn,
    history: JSON.parse(JSON.stringify(history)),
    ply,
    result: result ? { ...result } : null,
  };
}

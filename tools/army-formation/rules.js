/* Independent Xiangqi rules. Browser + Node. Coordinates: black back rank r=0, red r=9. */
(function (global) {
  "use strict";
  const TYPES = ["R", "H", "E", "A", "K", "A", "E", "H", "R"];
  const LABEL = {
    r: { K: "帅", A: "仕", E: "相", H: "马", R: "车", C: "炮", P: "兵" },
    b: { K: "将", A: "士", E: "象", H: "马", R: "车", C: "炮", P: "卒" },
  };
  const NAME = {
    K: "统帅亲卫",
    A: "禁卫刀盾",
    E: "拱卫重盾",
    H: "玄甲骑兵",
    R: "破阵战车",
    C: "神机火炮",
    P: "长枪步阵",
  };
  const opposite = (s) => (s === "r" ? "b" : "r");
  const at = (b, r, c) => (r >= 0 && r < 10 && c >= 0 && c < 9 ? b[r * 9 + c] : null);
  function initial() {
    let b = Array(90).fill(null),
      n = { r: 0, b: 0 };
    for (const s of ["b", "r"]) {
      const row = s === "b" ? 0 : 9;
      TYPES.forEach((type, c) => (b[row * 9 + c] = { id: s + n[s]++, s, t: type, r: row, c }));
      const cr = s === "b" ? 2 : 7;
      for (const c of [1, 7]) b[cr * 9 + c] = { id: s + n[s]++, s, t: "C", r: cr, c };
      const pr = s === "b" ? 3 : 6;
      for (const c of [0, 2, 4, 6, 8]) b[pr * 9 + c] = { id: s + n[s]++, s, t: "P", r: pr, c };
    }
    return b;
  }
  function clone(b) {
    return b.map((p) => (p ? { ...p } : null));
  }
  function palace(s, r, c) {
    return c >= 3 && c <= 5 && (s === "r" ? r >= 7 && r <= 9 : r >= 0 && r <= 2);
  }
  function raw(b, p) {
    const out = [],
      r = p.r,
      c = p.c,
      s = p.s;
    function add(rr, cc) {
      if (rr < 0 || rr > 9 || cc < 0 || cc > 8) return;
      let t = at(b, rr, cc);
      if (!t || t.s !== s) out.push({ r: rr, c: cc, capture: t || null });
    }
    if (p.t === "R" || p.t === "C") {
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        let screened = false;
        for (let k = 1; k < 10; k++) {
          let rr = r + dr * k,
            cc = c + dc * k;
          if (rr < 0 || rr > 9 || cc < 0 || cc > 8) break;
          let t = at(b, rr, cc);
          if (p.t === "R") {
            if (!t) add(rr, cc);
            else {
              if (t.s !== s) add(rr, cc);
              break;
            }
          } else if (!screened) {
            if (!t) add(rr, cc);
            else screened = true;
          } else if (t) {
            if (t.s !== s) add(rr, cc);
            break;
          }
        }
      }
    } else if (p.t === "H") {
      for (const [dr, dc, lr, lc] of [
        [2, 1, 1, 0],
        [2, -1, 1, 0],
        [-2, 1, -1, 0],
        [-2, -1, -1, 0],
        [1, 2, 0, 1],
        [-1, 2, 0, 1],
        [1, -2, 0, -1],
        [-1, -2, 0, -1],
      ])
        if (!at(b, r + lr, c + lc)) add(r + dr, c + dc);
    } else if (p.t === "E") {
      for (const [dr, dc] of [
        [2, 2],
        [2, -2],
        [-2, 2],
        [-2, -2],
      ]) {
        let rr = r + dr,
          cc = c + dc;
        if ((s === "r" ? rr >= 5 : rr <= 4) && !at(b, r + dr / 2, c + dc / 2)) add(rr, cc);
      }
    } else if (p.t === "A") {
      for (const [dr, dc] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ])
        if (palace(s, r + dr, c + dc)) add(r + dr, c + dc);
    } else if (p.t === "K") {
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (palace(s, r + dr, c + dc)) add(r + dr, c + dc);
      for (const dr of [-1, 1])
        for (let rr = r + dr; rr >= 0 && rr < 10; rr += dr) {
          let t = at(b, rr, c);
          if (t) {
            if (t.t === "K" && t.s !== s) add(rr, c);
            break;
          }
        }
    } else if (p.t === "P") {
      add(r + (s === "r" ? -1 : 1), c);
      if (s === "r" ? r <= 4 : r >= 5) {
        add(r, c - 1);
        add(r, c + 1);
      }
    }
    return out;
  }
  function checked(b, s) {
    const king = b.find((p) => p && p.s === s && p.t === "K");
    if (!king) return true;
    for (const p of b)
      if (p && p.s !== s && raw(b, p).some((m) => m.r === king.r && m.c === king.c)) return true;
    return false;
  }
  function legal(b, p) {
    if (!p) return [];
    return raw(b, p).filter((m) => {
      if (m.capture?.t === "K") return false;
      const from = p.r * 9 + p.c,
        to = m.r * 9 + m.c,
        old = b[to],
        rr = p.r,
        cc = p.c;
      b[from] = null;
      b[to] = p;
      p.r = m.r;
      p.c = m.c;
      const ok = !checked(b, p.s);
      p.r = rr;
      p.c = cc;
      b[from] = p;
      b[to] = old;
      return ok;
    });
  }
  function all(b, s) {
    const out = [];
    for (const p of b)
      if (p && p.s === s)
        for (const m of legal(b, p)) out.push({ id: p.id, from: { r: p.r, c: p.c }, ...m });
    return out;
  }
  function move(b, id, r, c) {
    let p = b.find((p) => p?.id === id);
    if (!p) throw new Error("棋子不存在");
    const m = legal(b, p).find((m) => m.r === r && m.c === c);
    if (!m) throw new Error("不合法的走法");
    const old = { r: p.r, c: p.c };
    b[p.r * 9 + p.c] = null;
    b[r * 9 + c] = p;
    p.r = r;
    p.c = c;
    return { piece: p, from: old, to: { r, c }, captured: m.capture };
  }
  function result(b, s) {
    if (all(b, s).length) return null;
    return { winner: opposite(s), reason: checked(b, s) ? "将死" : "困毙" };
  }
  function key(b, s) {
    return s + ":" + b.map((p) => (p ? p.s + p.t : "_")).join("");
  }
  function repetition(history, currentKey) {
    const matches = [];
    history.forEach((h, i) => {
      if (h.key === currentKey) matches.push(i);
    });
    if (matches.length < 3) return null;
    const start = matches[matches.length - 3],
      end = history.length - 1,
      segment = history.slice(start + 1, end + 1);
    let offenders = [];
    for (const s of ["r", "b"]) {
      const own = segment.filter((h) => h.mover === s);
      if (own.length >= 2 && own.every((h) => h.check)) offenders.push(s);
    }
    if (offenders.length === 1) return { winner: opposite(offenders[0]), reason: "连续长将" };
    return { warning: "局面已三次重复。长捉等复杂棋例由双方协商；可申请和棋。" };
  }
  function explain(b, p, r, c) {
    if (!p) return "请先选择己方军阵";
    let t = at(b, r, c);
    if (t?.s === p.s) return "这里有己方军阵";
    let dr = r - p.r,
      dc = c - p.c;
    if (p.t === "P" && dr * (p.s === "r" ? -1 : 1) < 0) return "兵卒不能后退";
    if (p.t === "E" && (p.s === "r" ? r < 5 : r > 4)) return "相 / 象不能过河";
    if ((p.t === "K" || p.t === "A") && !palace(p.s, r, c)) return "将帅与仕士不能离开九宫";
    if (p.t === "H") {
      let lr = Math.abs(dr) === 2 ? Math.sign(dr) : 0,
        lc = Math.abs(dc) === 2 ? Math.sign(dc) : 0;
      if (at(b, p.r + lr, p.c + lc)) return "马腿被挡住了";
    }
    if (
      p.t === "E" &&
      Math.abs(dr) === 2 &&
      Math.abs(dc) === 2 &&
      at(b, p.r + dr / 2, p.c + dc / 2)
    )
      return "象眼被挡住了";
    if (p.t === "C" && t && p.r !== r && p.c !== c) return "炮只能沿直线行动";
    if (p.t === "C" && t) return "炮吃子需要恰好一个炮架";
    if (raw(b, p).some((m) => m.r === r && m.c === c)) return "这一步会让己方将帅受攻击";
    return "这个位置不符合该兵种的走法";
  }
  const Rules = {
    initial,
    clone,
    at,
    raw,
    legal,
    all,
    checked,
    move,
    result,
    key,
    repetition,
    explain,
    opposite,
    LABEL,
    NAME,
    palace,
  };
  if (typeof module !== "undefined") module.exports = Rules;
  global.Rules = Rules;
})(typeof window === "undefined" ? globalThis : window);

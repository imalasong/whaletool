/* Offline Xiangqi engine. Iterative alpha-beta + capture search, worker-safe.
   Original implementation for ChuHe. No external service or API credentials. */
(function (G) {
  "use strict";
  const MAP = { K: 1, A: 2, E: 3, H: 4, R: 5, C: 6, P: 7 },
    VAL = [0, 20000, 120, 125, 310, 640, 345, 75];
  const D = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    HORSE = [
      [2, 1, 1, 0],
      [2, -1, 1, 0],
      [-2, 1, -1, 0],
      [-2, -1, -1, 0],
      [1, 2, 0, 1],
      [-1, 2, 0, 1],
      [1, -2, 0, -1],
      [-1, -2, 0, -1],
    ];
  const rc = Array.from({ length: 90 }, (_, i) => [Math.floor(i / 9), i % 9]);
  const inside = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
  const palace = (s, r, c) => c >= 3 && c <= 5 && (s === 1 ? r >= 7 : r <= 2);
  let seed = 0x83ea619d;
  function rand() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  }
  const Z = Array.from({ length: 15 }, () => Uint32Array.from({ length: 90 }, rand)),
    ZT = rand();
  class Engine {
    constructor(board, side) {
      this.b = new Int8Array(90);
      for (let i = 0; i < 90; i++) {
        const p = board[i];
        if (p) this.b[i] = (p.s === "r" ? 1 : -1) * MAP[p.t];
      }
      this.side = side === "r" ? 1 : -1;
      this.k = [-1, -1];
      for (let i = 0; i < 90; i++) {
        if (this.b[i] === 1) this.k[0] = i;
        if (this.b[i] === -1) this.k[1] = i;
      }
      this.hash = 0;
      for (let i = 0; i < 90; i++) if (this.b[i]) this.hash ^= Z[this.b[i] + 7][i];
      this.nodes = 0;
      this.stopped = false;
      this.table = new Map();
      this.killers = Array.from({ length: 60 }, () => [0, 0]);
      this.history = new Int32Array(90 * 90);
      this.path = [];
      this.deadline = Infinity;
    }
    attacked(s) {
      const king = this.k[s === 1 ? 0 : 1];
      if (king < 0) return true;
      const [r, c] = rc[king],
        b = this.b;
      for (const [dr, dc] of D) {
        let screen = false;
        for (let rr = r + dr, cc = c + dc; inside(rr, cc); rr += dr, cc += dc) {
          let v = b[rr * 9 + cc];
          if (!v) continue;
          if (!screen) {
            if (v * s < 0 && (Math.abs(v) === 5 || (Math.abs(v) === 1 && dc === 0))) return true;
            screen = true;
          } else {
            if (v * s < 0 && Math.abs(v) === 6) return true;
            break;
          }
        }
      }
      for (const [dr, dc, lr, lc] of HORSE) {
        let rr = r - dr,
          cc = c - dc;
        if (inside(rr, cc) && b[rr * 9 + cc] === -s * 4 && !b[(rr + lr) * 9 + cc + lc]) return true;
      }
      // Enemy pawn stands one step behind its attack square, in its own direction.
      const pr = r - s;
      if (inside(pr, c) && b[pr * 9 + c] === -s * 7) return true;
      for (const dc of [-1, 1])
        if (inside(r, c + dc) && b[r * 9 + c + dc] === -s * 7 && (-s === 1 ? r <= 4 : r >= 5))
          return true;
      // Adjacent kings/advisors and elephants are checked as well for test positions.
      for (const [dr, dc] of D) {
        let rr = r + dr,
          cc = c + dc;
        if (inside(rr, cc) && b[rr * 9 + cc] === -s && palace(-s, r, c)) return true;
      }
      for (const dr of [-1, 1])
        for (const dc of [-1, 1]) {
          let rr = r + dr,
            cc = c + dc;
          if (inside(rr, cc) && b[rr * 9 + cc] === -s * 2 && palace(-s, r, c)) return true;
          rr = r + dr * 2;
          cc = c + dc * 2;
          if (
            inside(rr, cc) &&
            b[rr * 9 + cc] === -s * 3 &&
            !b[(r + dr) * 9 + c + dc] &&
            (-s === 1 ? r >= 5 : r <= 4)
          )
            return true;
        }
      return false;
    }
    pseudo(s, captures = false) {
      const out = [],
        b = this.b;
      function add(f, r, c) {
        if (!inside(r, c)) return;
        let t = r * 9 + c,
          v = b[t];
        if (v * s > 0 || Math.abs(v) === 1 || (captures && !v)) return;
        out.push(f * 90 + t);
      }
      for (let f = 0; f < 90; f++) {
        const p = b[f];
        if (p * s <= 0) continue;
        const [r, c] = rc[f],
          t = Math.abs(p);
        if (t === 5 || t === 6) {
          for (const [dr, dc] of D) {
            let screen = false;
            for (let rr = r + dr, cc = c + dc; inside(rr, cc); rr += dr, cc += dc) {
              let v = b[rr * 9 + cc];
              if (t === 5) {
                if (!v) {
                  if (!captures) add(f, rr, cc);
                } else {
                  if (v * s < 0) add(f, rr, cc);
                  break;
                }
              } else if (!screen) {
                if (!v) {
                  if (!captures) add(f, rr, cc);
                } else screen = true;
              } else if (v) {
                if (v * s < 0) add(f, rr, cc);
                break;
              }
            }
          }
        } else if (t === 4) {
          for (const [dr, dc, lr, lc] of HORSE)
            if (inside(r + lr, c + lc) && !b[(r + lr) * 9 + c + lc]) add(f, r + dr, c + dc);
        } else if (t === 3) {
          for (const dr of [-2, 2])
            for (const dc of [-2, 2])
              if (
                (s === 1 ? r + dr >= 5 : r + dr <= 4) &&
                inside(r + dr, c + dc) &&
                !b[(r + dr / 2) * 9 + c + dc / 2]
              )
                add(f, r + dr, c + dc);
        } else if (t === 2) {
          for (const dr of [-1, 1])
            for (const dc of [-1, 1]) if (palace(s, r + dr, c + dc)) add(f, r + dr, c + dc);
        } else if (t === 1) {
          for (const [dr, dc] of D) if (palace(s, r + dr, c + dc)) add(f, r + dr, c + dc);
        } else {
          add(f, r - s, c);
          if (s === 1 ? r <= 4 : r >= 5) {
            add(f, r, c - 1);
            add(f, r, c + 1);
          }
        }
      }
      return out;
    }
    make(m) {
      let f = Math.floor(m / 90),
        t = m % 90,
        p = this.b[f],
        v = this.b[t];
      this.hash ^= Z[p + 7][f] ^ Z[p + 7][t];
      if (v) this.hash ^= Z[v + 7][t];
      this.b[f] = 0;
      this.b[t] = p;
      if (Math.abs(p) === 1) this.k[p === 1 ? 0 : 1] = t;
      return v;
    }
    unmake(m, v) {
      let f = Math.floor(m / 90),
        t = m % 90,
        p = this.b[t];
      this.hash ^= Z[p + 7][f] ^ Z[p + 7][t];
      if (v) this.hash ^= Z[v + 7][t];
      this.b[f] = p;
      this.b[t] = v;
      if (Math.abs(p) === 1) this.k[p === 1 ? 0 : 1] = f;
    }
    legal(s) {
      const out = [];
      for (const m of this.pseudo(s)) {
        let v = this.make(m);
        if (!this.attacked(s)) out.push(m);
        this.unmake(m, v);
      }
      return out;
    }
    evaluate(s) {
      let score = 0;
      const b = this.b;
      for (let i = 0; i < 90; i++) {
        const p = b[i];
        if (!p) continue;
        let t = Math.abs(p),
          side = p > 0 ? 1 : -1,
          [r, c] = rc[i],
          advance = side === 1 ? 9 - r : r,
          center = 4 - Math.abs(4 - c),
          v = VAL[t];
        if (t === 7) {
          v += advance * 7 + (advance >= 5 ? 45 + center * 7 : 0);
          if (advance === 9) v -= 12;
        } else if (t === 4) {
          v += center * 9 + (4.5 - Math.abs(4.5 - r)) * 6;
          for (const [dr, dc, lr, lc] of HORSE)
            if (inside(r + dr, c + dc) && !b[(r + lr) * 9 + c + lc]) v += 4;
        } else if (t === 5) {
          v += advance * 2 + center * 2;
          for (const [dr, dc] of D)
            for (
              let rr = r + dr, cc = c + dc;
              inside(rr, cc) && !b[rr * 9 + cc];
              rr += dr, cc += dc
            )
              v += 2;
        } else if (t === 6) v += center * 5 + (advance < 7 ? advance * 2 : -5);
        else if (t === 2 || t === 3) v += 10 - Math.abs(c - 4) * 2;
        else if (t === 1) v -= Math.abs(c - 4) * 8;
        score += v * side;
      }
      return score * s + 8;
    }
    order(moves, tt, ply) {
      const b = this.b,
        k = this.killers[Math.min(ply, 59)],
        h = this.history;
      const score = (m) => {
        if (m === tt) return 10000000;
        let f = Math.floor(m / 90),
          t = m % 90;
        return b[t]
          ? 100000 + VAL[Math.abs(b[t])] * 12 - VAL[Math.abs(b[f])]
          : m === k[0]
            ? 90000
            : m === k[1]
              ? 80000
              : h[m];
      };
      return moves
        .map((m) => [m, score(m)])
        .sort((a, b) => b[1] - a[1])
        .map((a) => a[0]);
    }
    checkClock() {
      this.nodes++;
      if ((this.nodes & 255) === 0 && performance.now() >= this.deadline) {
        this.stopped = true;
        return true;
      }
      return false;
    }
    search(s, depth, alpha, beta, ply, qdepth = 0) {
      if (this.checkClock()) return 0;
      if (ply > 36) return this.evaluate(s);
      let inCheck = this.attacked(s),
        hash = (this.hash ^ (s === -1 ? ZT : 0)) >>> 0;
      if (this.path.includes(hash)) return 0;
      // Quiescence searches all evasions while in check, otherwise only captures.
      if (depth <= 0 && !inCheck) {
        let stand = this.evaluate(s);
        if (stand >= beta) return stand;
        if (stand > alpha) alpha = stand;
        if (qdepth >= 5) return alpha;
      }
      let alpha0 = alpha,
        entry = depth > 0 ? this.table.get(hash) : null;
      if (entry && entry.depth >= depth && ply > 0) {
        if (entry.flag === 0) return entry.score;
        if (entry.flag === 1 && entry.score >= beta) return entry.score;
        if (entry.flag === -1 && entry.score <= alpha) return entry.score;
      }
      let moves = this.order(this.pseudo(s, depth <= 0 && !inCheck), entry?.move || 0, ply),
        best = -32000,
        bestMove = 0,
        count = 0;
      this.path.push(hash);
      for (const m of moves) {
        let v = this.make(m);
        if (this.attacked(s)) {
          this.unmake(m, v);
          continue;
        }
        count++;
        let score = -this.search(
          -s,
          depth - 1,
          -beta,
          -alpha,
          ply + 1,
          qdepth + (depth <= 0 ? 1 : 0),
        );
        this.unmake(m, v);
        if (this.stopped) {
          this.path.pop();
          return 0;
        }
        if (score > best) {
          best = score;
          bestMove = m;
        }
        if (score > alpha) alpha = score;
        if (alpha >= beta) {
          if (!v) {
            let k = this.killers[Math.min(ply, 59)];
            if (k[0] !== m) {
              k[1] = k[0];
              k[0] = m;
            }
            this.history[m] = Math.min(60000, this.history[m] + depth * depth + 1);
          }
          break;
        }
      }
      this.path.pop();
      if (!count) {
        if (inCheck || depth > 0) return -30000 + ply;
        return alpha;
      }
      if (depth <= 0) return alpha;
      if (this.table.size > 140000) this.table.clear();
      this.table.set(hash, {
        depth,
        score: best,
        move: bestMove,
        flag: best <= alpha0 ? -1 : best >= beta ? 1 : 0,
      });
      return best;
    }
    run(opts = {}, progress) {
      const limits = {
        easy: { ms: 220, depth: 2 },
        normal: { ms: 900, depth: 5 },
        hard: { ms: 2200, depth: 7 },
      };
      let opt = { ...limits[opts.level || "normal"], ...opts },
        start = performance.now();
      this.deadline = start + opt.ms;
      let roots = this.legal(this.side);
      if (!roots.length) return { move: null, depth: 0, nodes: 0, ms: 0 };
      let chosen = roots[0],
        lastScore = -32000,
        complete = 0;
      this.stopped = false;
      for (let depth = 1; depth <= opt.depth; depth++) {
        let scored = [],
          alpha = -32000;
        roots = this.order(roots, chosen, 0);
        for (const m of roots) {
          let v = this.make(m);
          this.path = [(this.hash ^ (this.side === -1 ? ZT : 0)) >>> 0];
          this.path = [];
          let score = -this.search(-this.side, depth - 1, -32000, -alpha, 1);
          this.unmake(m, v);
          if (this.stopped) break;
          // Avoid immediate two-ply reversals without breaking legality.
          const prev = opts.recent || [];
          if (prev.some((x) => x === m)) score -= 18;
          scored.push([m, score]);
          if (score > alpha) alpha = score;
        }
        if (this.stopped) break;
        scored.sort((a, b) => b[1] - a[1]);
        chosen = scored[0][0];
        lastScore = scored[0][1];
        complete = depth;
        roots = scored.map((x) => x[0]);
        if (progress)
          progress({
            depth,
            nodes: this.nodes,
            score: lastScore,
            ms: Math.round(performance.now() - start),
          });
        if (lastScore > 29000 || performance.now() >= this.deadline) break;
      }
      return {
        move: { from: Math.floor(chosen / 90), to: chosen % 90 },
        depth: complete,
        score: lastScore,
        nodes: this.nodes,
        ms: Math.round(performance.now() - start),
        legalCount: roots.length,
      };
    }
  }
  G.ChuAI = { Engine, MAP };
  if (typeof module !== "undefined") module.exports = G.ChuAI;
})(typeof self === "undefined" ? globalThis : self);

if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
  self.onmessage = function (e) {
    const d = e.data;
    try {
      const engine = new ChuAI.Engine(d.board, d.side);
      const result = engine.run(d.options, (progress) => {
        self.postMessage({ kind: "progress", token: d.token, progress });
      });
      self.postMessage({ kind: "result", token: d.token, result });
    } catch (err) {
      self.postMessage({ kind: "error", token: d.token, error: String(err) });
    }
  };
}

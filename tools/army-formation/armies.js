/* V2: GPU-articulated, instanced miniature armies; original geometry, no billboard people. */
"use strict";
const PALETTE = {
  r: { cloth: "#762c2d", dark: "#25292c", metal: "#576064", trim: "#b89250", wood: "#574137" },
  b: { cloth: "#26404b", dark: "#1d282d", metal: "#556268", trim: "#b4a16b", wood: "#4b3c31" },
};
const link = (p, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) =>
  p.add(new Node3(pos, rot, scale));
let serial = 0;
const TEMPLATES = new Map();
function lathe(points, N = 8) {
  const v = [],
    idx = [];
  for (let y = 0; y < points.length; y++) {
    const [rad, h] = points[y],
      a = points[Math.max(0, y - 1)],
      b = points[Math.min(points.length - 1, y + 1)],
      slope = (a[0] - b[0]) / Math.max(0.001, b[1] - a[1]);
    for (let x = 0; x <= N; x++) {
      const t = (x / N) * Math.PI * 2,
        n = V.norm([Math.cos(t), slope, Math.sin(t)]);
      v.push(rad * Math.cos(t), h, rad * Math.sin(t), ...n, x / N, y / (points.length - 1));
    }
  }
  for (let y = 0; y < points.length - 1; y++)
    for (let x = 0; x < N; x++) {
      let a = y * (N + 1) + x,
        b = a + N + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  return { v, idx };
}
class ModelBuilder {
  constructor() {
    this.v = [];
    this.idx = [];
  }
  add(
    g,
    clr,
    pos = [0, 0, 0],
    scale = [1, 1, 1],
    rot = [0, 0, 0],
    material = 0,
    bone = 0,
    pivot = [0, 0, 0],
  ) {
    if (typeof g === "string") g = this.shape(g);
    rot = [rot[0] || 0, rot[1] || 0, rot[2] || 0];
    const mat = M4.id();
    M4.compose(mat, pos, rot, scale);
    const norm = M4.id();
    M4.compose(norm, [0, 0, 0], rot, [1, 1, 1]);
    const base = this.v.length / 16,
      c = color(clr);
    for (let i = 0; i < g.v.length; i += 8) {
      let x = g.v[i],
        y = g.v[i + 1],
        z = g.v[i + 2],
        nn = V.norm([g.v[i + 3] / scale[0], g.v[i + 4] / scale[1], g.v[i + 5] / scale[2]]);
      this.v.push(
        mat[0] * x + mat[4] * y + mat[8] * z + mat[12],
        mat[1] * x + mat[5] * y + mat[9] * z + mat[13],
        mat[2] * x + mat[6] * y + mat[10] * z + mat[14],
        norm[0] * nn[0] + norm[4] * nn[1] + norm[8] * nn[2],
        norm[1] * nn[0] + norm[5] * nn[1] + norm[9] * nn[2],
        norm[2] * nn[0] + norm[6] * nn[1] + norm[10] * nn[2],
        g.v[i + 6],
        g.v[i + 7],
        c[0],
        c[1],
        c[2],
        material,
        bone,
        ...pivot,
      );
    }
    for (let i = 0; i < g.idx.length; i += 3) {
      const a = g.idx[i],
        b = g.idx[i + 1],
        d = g.idx[i + 2],
        av = g.v.slice(a * 8, a * 8 + 3),
        bv = g.v.slice(b * 8, b * 8 + 3),
        dv = g.v.slice(d * 8, d * 8 + 3);
      const cross = V.cross(V.sub(bv, av), V.sub(dv, av)),
        norm = V.add(
          V.add(g.v.slice(a * 8 + 3, a * 8 + 6), g.v.slice(b * 8 + 3, b * 8 + 6)),
          g.v.slice(d * 8 + 3, d * 8 + 6),
        );
      if (Math.hypot(...cross) > 1e-7) {
        if (V.dot(cross, norm) < 0) this.idx.push(base + a, base + d, base + b);
        else this.idx.push(base + a, base + b, base + d);
      }
    }
    return this;
  }
  shape(g) {
    if (g === "tube") {
      let a = Geometry.box(),
        idx = [];
      for (let j = 0; j < a.idx.length; j += 3) {
        if (Math.abs(a.v[a.idx[j] * 8 + 4]) < 0.9) idx.push(...a.idx.slice(j, j + 3));
      }
      return { v: a.v, idx };
    }
    return g === "box"
      ? Geometry.box()
      : g === "head"
        ? Geometry.sphere(8, 5)
        : g === "ball"
          ? Geometry.sphere(8, 4)
          : g === "dome"
            ? Geometry.dome(8, 3)
            : g === "cyl"
              ? Geometry.cylinder(8)
              : g === "thin"
                ? Geometry.cylinder(4)
                : g === "cone"
                  ? Geometry.cylinder(6, 0)
                  : g === "cloth"
                    ? Geometry.plane(6, 4)
                    : g === "wedge"
                      ? Geometry.wedge()
                      : Geometry.box();
  }
  data() {
    return { v: new Float32Array(this.v), idx: new Uint16Array(this.idx) };
  }
}
// Natural 7.5-head proportions, layered lamellar armour, articulated knees and shoulders.
function soldier(kind = "spear", detail = true) {
  const b = new ModelBuilder(),
    add = (...a) => b.add(...a),
    skin = "#ba987b",
    dark = "#282d2b",
    metal = "#464f50",
    gold = "#af925b",
    cloth = "#ffffff";
  for (const sign of [-1, 1]) {
    const bone = sign < 0 ? 1 : 2,
      pivot = [sign * 0.071, 0.46, 0];
    add("thin", dark, [sign * 0.071, 0.34, 0], [0.06, 0.24, 0.063], [], 0, bone, pivot);
    add("thin", metal, [sign * 0.071, 0.16, 0.012], [0.05, 0.2, 0.053], [], 2, bone + 20, pivot);
    add(
      "box",
      "#222625",
      [sign * 0.071, 0.041, -0.027],
      [0.1, 0.082, 0.17],
      [],
      0,
      bone + 20,
      pivot,
    );
    if (detail)
      add(
        "dome",
        gold,
        [sign * 0.071, 0.258, -0.019],
        [0.062, 0.032, 0.065],
        [Math.PI / 2, 0, 0],
        2,
        bone + 20,
        pivot,
      );
  }
  add(
    lathe(
      [
        [0.14, 0.39],
        [0.148, 0.45],
        [0.106, 0.63],
      ],
      detail ? 8 : 6,
    ),
    cloth,
    [0, 0, 0],
    [1, 1, 0.77],
    [],
    1,
  );
  add(
    lathe(
      [
        [0.102, 0.53],
        [0.11, 0.58],
        [0.153, 0.77],
        [0.104, 0.835],
      ],
      detail ? 8 : 6,
    ),
    metal,
    [0, 0, 0],
    [1, 1, 0.72],
    [],
    2,
  );
  add("box", gold, [0, 0.575, -0.075], [0.217, 0.037, 0.025], [], 2);
  if (detail) {
    for (let j = 0; j < 4; j++)
      add(
        "box",
        "#716f5c",
        [0, 0.617 + j * 0.041, -0.092],
        [0.215 - j * 0.006, 0.013, 0.016],
        [],
        2,
      );
    add("box", dark, [0, 0.71, -0.106], [0.018, 0.22, 0.012]);
    add("box", gold, [0, 0.6, -0.112], [0.044, 0.044, 0.018], [], 2);
  }
  const headGeo = detail ? "head" : Geometry.sphere(6, 3);
  add("thin", skin, [0, 0.859, 0], [0.043, 0.062, 0.043], [], 4);
  add(headGeo, skin, [0, 0.935, -0.004], [0.087, 0.106, 0.086], [], 4);
  add(
    detail ? "dome" : Geometry.dome(6, 2),
    metal,
    [0, 0.969, 0.009],
    [0.104, 0.112, 0.103],
    [],
    2,
  );
  add("box", "#9a824c", [0, 0.982, -0.085], [0.15, 0.016, 0.025], [], 2);
  add("box", metal, [0, 0.9, 0.077], [0.174, 0.125, 0.025], [], 2);
  if (detail) {
    for (const x of [-0.036, 0.036]) {
      add("box", "#221f1b", [x, 0.946, -0.084], [0.021, 0.008, 0.007]);
      add("box", dark, [x, 0.963, -0.08], [0.025, 0.007, 0.007]);
    }
    add("wedge", skin, [0, 0.924, -0.091], [0.026, 0.04, 0.027], [0, Math.PI / 2, 0], 4);
    add("box", "#584636", [0, 0.89, -0.077], [0.04, 0.008, 0.01]);
  }
  add("cone", cloth, [0, 1.115, 0.008], [0.034, 0.19, 0.034], [-0.3, 0, 0], 1);
  for (const sign of [-1, 1]) {
    let bone = sign < 0 ? 3 : 4,
      pivot = [sign * 0.154, 0.779, 0];
    add("dome", metal, [sign * 0.17, 0.789, 0.005], [0.086, 0.044, 0.108], [], 2, bone, pivot);
    add("thin", cloth, [sign * 0.17, 0.674, 0], [0.054, 0.2, 0.051], [], 1, bone, pivot);
    add("thin", metal, [sign * 0.176, 0.524, -0.01], [0.052, 0.147, 0.052], [], 2, bone, pivot);
    add("ball", skin, [sign * 0.176, 0.435, -0.022], [0.042, 0.045, 0.045], [], 4, bone, pivot);
  }
  if (kind !== "crew") {
    const pivot = [0.154, 0.779, 0];
    if (kind === "sword") {
      add(
        "box",
        "#c9c6b2",
        [0.176, 0.62, -0.075],
        [0.05, 0.67, 0.017],
        [0, 0, -0.05],
        2,
        kind === "sword" ? 41 : 40,
        [0.176, 0.435, -0.022],
      );
      add(
        "box",
        gold,
        [0.176, 0.315, -0.075],
        [0.16, 0.035, 0.034],
        [],
        2,
        kind === "sword" ? 41 : 40,
        [0.176, 0.435, -0.022],
      );
    } else {
      add(
        "thin",
        "#5e4931",
        [0.177, 0.78, -0.087],
        [0.012, 1.37, 0.012],
        [],
        0,
        40,
        [0.176, 0.435, -0.022],
      );
      add(
        "wedge",
        "#c7c6ae",
        [0.177, 1.54, -0.087],
        [0.06, 0.205, 0.023],
        [],
        2,
        kind === "sword" ? 41 : 40,
        [0.176, 0.435, -0.022],
      );
      if (detail)
        add(
          "cloth",
          cloth,
          [0.215, 1.43, -0.087],
          [0.1, 0.2, 1],
          [0, 0.25, 0],
          1,
          5,
          [0.17, 1.43, -0.087],
        );
    }
  }
  if (kind === "heavy" || kind === "sword") {
    const pivot = [-0.154, 0.779, 0];
    add("box", metal, [-0.188, 0.55, -0.117], [0.265, 0.49, 0.055], [0.06, 0, 0.07], 2, 3, pivot);
    add("box", cloth, [-0.188, 0.55, -0.15], [0.214, 0.432, 0.018], [0.06, 0, 0.07], 1, 3, pivot);
    add("box", gold, [-0.188, 0.55, -0.168], [0.021, 0.427, 0.017], [], 2, 3, pivot);
    if (detail)
      add(
        "dome",
        gold,
        [-0.188, 0.55, -0.18],
        [0.064, 0.028, 0.063],
        [Math.PI / 2, 0, 0],
        2,
        3,
        pivot,
      );
  }
  return b;
}
function horse(detail = true) {
  const b = new ModelBuilder(),
    add = (...a) => b.add(...a),
    coat = "#5f4636",
    dark = "#282a25";
  add(detail ? "ball" : Geometry.sphere(6, 4), coat, [0, 0.63, 0.02], [0.195, 0.27, 0.44], [], 6);
  add("box", "#ffffff", [0, 0.77, 0.03], [0.4, 0.17, 0.41], [], 1);
  add("box", dark, [0, 0.84, 0.04], [0.3, 0.07, 0.28]);
  add("ball", coat, [0, 0.87, -0.3], [0.125, 0.28, 0.148], [-0.4, 0, 0], 6, 14, [0, 0.75, -0.26]);
  add(
    "ball",
    coat,
    [0, 1.073, -0.448],
    [0.098, 0.159, 0.189],
    [-0.48, 0, 0],
    6,
    14,
    [0, 0.75, -0.26],
  );
  add("ball", "#3a3129", [0, 0.982, -0.59], [0.091, 0.075, 0.09], [], 6, 14, [0, 0.75, -0.26]);
  add(
    "box",
    "#1f2322",
    [0, 0.87, -0.19],
    [0.045, 0.32, 0.048],
    [-0.45, 0, 0],
    0,
    14,
    [0, 0.75, -0.26],
  );
  for (const x of [-0.057, 0.057]) {
    add(
      "cone",
      coat,
      [x, 1.241, -0.367],
      [0.025, 0.17, 0.043],
      [-0.24, 0, 0],
      6,
      14,
      [0, 0.75, -0.26],
    );
    if (detail) {
      add(
        "ball",
        "#101513",
        [x * 1.65, 1.119, -0.469],
        [0.014, 0.016, 0.019],
        [],
        0,
        14,
        [0, 0.75, -0.26],
      );
      add(
        "thin",
        "#c5af77",
        [x * 1.65, 1.038, -0.47],
        [0.012, 0.195, 0.012],
        [-0.38, 0, 0],
        2,
        14,
        [0, 0.75, -0.26],
      );
    }
  }
  let n = 0;
  for (const x of [-0.132, 0.132])
    for (const z of [-0.263, 0.283]) {
      const bone = 10 + n++,
        pivot = [x, 0.52, z];
      add("thin", coat, [x, 0.405, z], [0.06, 0.28, 0.063], [], 6, bone, pivot);
      add("thin", "#725845", [x, 0.19, z - 0.005], [0.036, 0.23, 0.036], [], 6, bone + 20, pivot);
      add("box", "#252823", [x, 0.065, z - 0.021], [0.074, 0.095, 0.112], [], 0, bone + 20, pivot);
    }
  add("ball", dark, [0, 0.453, 0.505], [0.045, 0.25, 0.055], [-0.4, 0, 0], 0, 15, [0, 0.62, 0.423]);
  return b;
}
function cavalry(detail = true) {
  const b = horse(detail),
    rider = soldier("spear", detail).data(),
    base = b.v.length / 16;
  for (let i = 0; i < rider.v.length; i += 16) {
    const a = Array.from(rider.v.slice(i, i + 16));
    a[0] *= 0.7;
    a[1] = a[1] * 0.67 + 0.66;
    a[2] = a[2] * 0.7 + 0.025;
    a[12] = a[12] === 1 || a[12] === 2 || a[12] === 21 || a[12] === 22 ? 0 : a[12];
    a[13] *= 0.7;
    a[14] = a[14] * 0.67 + 0.66;
    a[15] = a[15] * 0.7 + 0.025;
    b.v.push(...a);
  }
  for (const n of rider.idx) b.idx.push(base + n);
  return b;
}
function cannon(detail = true) {
  const b = new ModelBuilder(),
    add = (...a) => b.add(...a),
    wood = "#67472c",
    gold = "#9f7b44",
    dark = "#303535";
  add("box", wood, [0, 0.195, 0.035], [0.48, 0.22, 0.68]);
  add("box", gold, [0, 0.3, 0.02], [0.31, 0.048, 0.59], [], 2);
  for (const x of [-0.29, 0.29]) {
    add(
      detail ? Geometry.torus(12, 4) : Geometry.torus(8, 3),
      "#463e2f",
      [x, 0.22, 0.11],
      [0.22, 0.22, 0.22],
      [0, Math.PI / 2, 0],
      0,
      6,
      [x, 0.22, 0.11],
    );
    add("cyl", gold, [x, 0.22, 0.11], [0.057, 0.092, 0.057], [0, 0, Math.PI / 2], 2, 6, [
      x,
      0.22,
      0.11,
    ]);
    for (let i = 0; i < 4; i++)
      add("box", wood, [x, 0.22, 0.11], [0.035, 0.39, 0.035], [(i * Math.PI) / 4, 0, 0], 0, 6, [
        x,
        0.22,
        0.11,
      ]);
  }
  add(
    lathe(
      [
        [0.073, -0.42],
        [0.08, -0.38],
        [0.068, -0.31],
        [0.111, 0.29],
        [0.09, 0.37],
      ],
      detail ? 12 : 8,
    ),
    "#666050",
    [0, 0.425, -0.14],
    [1, 1, 1],
    [Math.PI / 2 + 0.1, 0, 0],
    2,
    7,
    [0, 0.425, -0.14],
  );
  add(
    "cyl",
    "#111c1e",
    [0, 0.467, -0.558],
    [0.066, 0.015, 0.066],
    [Math.PI / 2 + 0.1, 0, 0],
    0,
    7,
    [0, 0.425, -0.14],
  );
  for (const z of [-0.41, -0.01, 0.17])
    add(
      "cyl",
      gold,
      [0, 0.425 + (z < -0.2 ? 0.028 : 0), z],
      [z < -0.2 ? 0.089 : 0.111, 0.048, z < -0.2 ? 0.089 : 0.111],
      [Math.PI / 2 + 0.1, 0, 0],
      2,
      7,
      [0, 0.425, -0.14],
    );
  return b;
}
function chariot(detail = true) {
  const b = new ModelBuilder(),
    add = (...a) => b.add(...a),
    wood = "#67402b",
    gold = "#aa8951";
  add("box", wood, [0, 0.44, 0.1], [0.7, 0.09, 0.54]);
  add("box", "#ffffff", [0, 0.63, -0.14], [0.66, 0.37, 0.055], [], 1);
  for (const x of [-0.34, 0.34]) {
    add("box", "#ffffff", [x, 0.63, 0.08], [0.042, 0.38, 0.52], [], 1);
    add("box", gold, [x, 0.84, 0.08], [0.059, 0.027, 0.52], [], 2);
    add("box", gold, [x, 0.6, -0.17], [0.052, 0.38, 0.027], [], 2);
  }
  add("box", gold, [0, 0.83, -0.14], [0.68, 0.04, 0.063], [], 2);
  for (const x of [-0.422, 0.422]) {
    add(
      Geometry.torus(detail ? 14 : 8, 4),
      wood,
      [x, 0.33, 0.09],
      [0.32, 0.32, 0.32],
      [0, Math.PI / 2, 0],
      0,
      6,
      [x, 0.33, 0.09],
    );
    for (let i = 0; i < 6; i++)
      add("box", gold, [x, 0.33, 0.09], [0.028, 0.56, 0.028], [(i * Math.PI) / 6, 0, 0], 2, 6, [
        x,
        0.33,
        0.09,
      ]);
    add("cyl", gold, [x, 0.33, 0.09], [0.068, 0.07, 0.068], [0, 0, Math.PI / 2], 2);
  }
  for (const x of [-0.25, 0.25]) add("box", wood, [x, 0.34, -0.63], [0.048, 0.051, 1.1]);
  return b;
}
function flag(detail = true) {
  const b = new ModelBuilder();
  b.add("thin", "#4b3c2a", [0, 1.1, 0], [0.018, 2.2, 0.018]);
  b.add("cone", "#ba9a54", [0, 2.24, 0], [0.049, 0.19, 0.049], [], 2);
  b.add("cloth", "#ffffff", [0.35, 1.72, 0], [0.7, 0.92, 1], [], 1, 9, [0, 0, 0]);
  b.add("thin", "#b48c4b", [0.35, 2.19, 0], [0.014, 0.75, 0.014], [0, 0, Math.PI / 2], 2);
  return b;
}
function commander(type, detail = true) {
  if (type === "fox") return foxModel();
  const b = soldier("sword", true),
    add = (...a) => b.add(...a);
  if (type === "liu") {
    add("head", "#22252a", [0, 1.04, 0.012], [0.104, 0.11, 0.098]);
    for (const x of [-0.109, 0.109]) {
      add("ball", "#202124", [x, 1.055, 0.017], [0.06, 0.063, 0.057]);
      add("ball", "#d8af77", [x, 1.073, -0.038], [0.043, 0.022, 0.021], [], 2);
      add("thin", "#29272a", [x, 0.836, -0.03], [0.018, 0.33, 0.022]);
    }
    add(
      lathe(
        [
          [0.217, 0.17],
          [0.194, 0.28],
          [0.113, 0.56],
        ],
        12,
      ),
      "#d7a5a4",
      [0, 0, 0.027],
      [1, 1, 1],
      [],
      0,
    );
    add("cloth", "#c09495", [0, 0.56, 0.141], [0.32, 0.68, 1], [], 0, 5, [0, 0.85, 0.141]);
  } else {
    add("cloth", "#536876", [0, 0.585, 0.15], [0.39, 0.76, 1], [], 0, 5, [0, 0.87, 0.15]);
    add("box", "#93a7ac", [0, 0.729, -0.116], [0.12, 0.16, 0.018], [], 2);
    add("box", "#a0def0", [0, 0.765, -0.13], [0.066, 0.015, 0.012], [], 3);
    add("box", "#788691", [0, 1.07, 0], [0.13, 0.05, 0.13]);
  }
  return b;
}
function foxModel() {
  const b = new ModelBuilder(),
    add = (...a) => b.add(...a),
    blue = "#4b99b4",
    white = "#cfd8d4";
  add("ball", blue, [0, 0.41, 0], [0.2, 0.29, 0.16], [], 0);
  add("ball", white, [0, 0.43, -0.117], [0.14, 0.21, 0.075]);
  for (const x of [-0.105, 0.105]) {
    add("ball", blue, [x, 0.115, -0.02], [0.084, 0.14, 0.084], [], 0, x < 0 ? 1 : 2, [x, 0.25, 0]);
    add("ball", white, [x, 0.045, -0.068], [0.08, 0.055, 0.092]);
    add("ball", blue, [x * 1.84, 0.44, -0.025], [0.064, 0.19, 0.078], [], 0, x < 0 ? 3 : 4, [
      x * 1.84,
      0.57,
      0,
    ]);
  }
  add("head", blue, [0, 0.853, -0.02], [0.32, 0.27, 0.237]);
  add("head", white, [0, 0.741, -0.183], [0.252, 0.133, 0.13]);
  for (const x of [-0.224, 0.224]) {
    add("cone", blue, [x, 1.113, -0.005], [0.115, 0.37, 0.085], [0, 0, x < 0 ? -0.24 : 0.24]);
    add(
      "wedge",
      "#bb9caa",
      [x, 1.136, -0.075],
      [0.107, 0.234, 0.024],
      [0, 0, x < 0 ? -0.24 : 0.24],
    );
    add("head", "#eff4dc", [x * 0.53, 0.875, -0.211], [0.083, 0.104, 0.04]);
    add("head", "#153c4e", [x * 0.53, 0.875, -0.244], [0.057, 0.075, 0.031]);
    add("head", "#101c25", [x * 0.53, 0.875, -0.268], [0.034, 0.054, 0.017]);
    add("ball", "#ffffff", [x * 0.53 - 0.015, 0.91, -0.279], [0.018, 0.021, 0.011]);
    add("ball", white, [x * 0.6, 0.982, -0.207], [0.033, 0.016, 0.015]);
  }
  add("ball", "#153f53", [0, 0.77, -0.301], [0.04, 0.029, 0.027]);
  add("thin", "#ba9958", [0, 0.583, -0.159], [0.08, 0.019, 0.08], [Math.PI / 2, 0, 0], 2);
  add("thin", "#8fdaed", [0, 0.583, -0.172], [0.049, 0.021, 0.049], [Math.PI / 2, 0, 0], 3);
  add(
    "head",
    blue,
    [0.232, 0.296, 0.271],
    [0.244, 0.15, 0.35],
    [0.28, -0.48, 0],
    0,
    15,
    [0, 0.32, 0.08],
  );
  add(
    "head",
    white,
    [0.38, 0.36, 0.47],
    [0.139, 0.113, 0.155],
    [-0.2, -0.4, 0],
    0,
    15,
    [0, 0.32, 0.08],
  );
  add("cloth", "#264259", [0, 0.485, 0.15], [0.33, 0.42, 1], [], 0, 5, [0, 0.71, 0.15]);
  return b;
}
// Distant LOD retains every soldier, weapon and real articulated 3D silhouette.
function distantSoldier(kind = "spear") {
  const b = new ModelBuilder(),
    skin = "#b8987b",
    metal = "#727875";
  b.add("tube", metal, [0, 0.69, 0], [0.26, 0.28, 0.16], [], 2);
  b.add("tube", "#ffffff", [0, 0.47, 0], [0.26, 0.18, 0.18], [], 1);
  b.add("box", metal, [0, 0.952, 0], [0.175, 0.2, 0.17], [], 2);
  b.add(Geometry.plane(1, 1), skin, [0, 0.928, -0.086], [0.12, 0.13, 1], [0, Math.PI, 0], 4);
  b.add(Geometry.cylinder(3, 0), "#ffffff", [0, 1.14, 0], [0.029, 0.17, 0.029], [], 1);
  for (const sign of [-1, 1]) {
    const piv = [sign * 0.072, 0.43, 0];
    b.add(
      "tube",
      "#262b29",
      [sign * 0.072, 0.23, 0],
      [0.068, 0.4, 0.071],
      [],
      0,
      sign < 0 ? 1 : 2,
      piv,
    );
    const ap = [sign * 0.16, 0.76, 0];
    b.add("tube", metal, [sign * 0.17, 0.61, 0], [0.065, 0.33, 0.064], [], 2, sign < 0 ? 3 : 4, ap);
  }
  if (kind !== "crew") {
    b.add(
      "tube",
      kind === "sword" ? "#c8c6b4" : "#62513a",
      [0.177, 0.91, -0.064],
      [0.016, kind === "sword" ? 0.7 : 1.32, 0.016],
      [],
      2,
      kind === "sword" ? 41 : 40,
      [0.176, 0.435, -0.022],
    );
    if (kind !== "sword")
      b.add(
        Geometry.cylinder(3, 0),
        "#c8c6b4",
        [0.177, 1.62, -0.064],
        [0.042, 0.16, 0.018],
        [],
        2,
        kind === "sword" ? 41 : 40,
        [0.176, 0.435, -0.022],
      );
  }
  if (kind === "sword" || kind === "heavy") {
    b.add(
      "tube",
      "#ffffff",
      [-0.19, 0.55, -0.105],
      [0.25, 0.47, 0.043],
      [],
      1,
      3,
      [-0.16, 0.76, 0],
    );
    b.add(
      Geometry.plane(1, 1),
      "#b0955e",
      [-0.19, 0.55, -0.131],
      [0.025, 0.45, 1],
      [0, Math.PI, 0],
      2,
      3,
      [-0.16, 0.76, 0],
    );
  }
  return b;
}
function distantHorse() {
  const b = new ModelBuilder(),
    c = "#654b3b";
  b.add(Geometry.sphere(5, 3), c, [0, 0.62, 0.01], [0.18, 0.23, 0.4], [], 6);
  b.add("box", "#ffffff", [0, 0.77, 0.03], [0.37, 0.12, 0.37], [], 1);
  b.add("box", c, [0, 0.88, -0.29], [0.18, 0.45, 0.22], [-0.37, 0, 0], 6, 14, [0, 0.75, -0.26]);
  b.add("box", c, [0, 1.075, -0.49], [0.16, 0.17, 0.28], [-0.28, 0, 0], 6, 14, [0, 0.75, -0.26]);
  for (const x of [-0.058, 0.058]) b.add("cone", c, [x, 1.23, -0.38], [0.028, 0.13, 0.031], [], 6);
  let n = 0;
  for (const x of [-0.13, 0.13])
    for (const z of [-0.255, 0.27])
      b.add("box", "#473c31", [x, 0.28, z], [0.06, 0.51, 0.064], [], 6, 10 + n++, [x, 0.53, z]);
  b.add(
    "box",
    "#252622",
    [0, 0.41, 0.43],
    [0.038, 0.37, 0.045],
    [-0.22, 0, 0],
    0,
    15,
    [0, 0.6, 0.4],
  );
  return b;
}
function distantCavalry() {
  const b = distantHorse(),
    r = distantSoldier("spear").data(),
    base = b.v.length / 16;
  for (let i = 0; i < r.v.length; i += 16) {
    const a = Array.from(r.v.slice(i, i + 16));
    a[0] *= 0.7;
    a[1] = a[1] * 0.67 + 0.66;
    a[2] = a[2] * 0.7 + 0.025;
    if (a[12] === 1 || a[12] === 2) a[12] = 0;
    a[13] *= 0.7;
    a[14] = a[14] * 0.67 + 0.66;
    a[15] = a[15] * 0.7 + 0.025;
    b.v.push(...a);
  }
  for (const n of r.idx) b.idx.push(base + n);
  return b;
}
function template(type, lod) {
  const key = type + "-" + lod;
  if (TEMPLATES.has(key)) return TEMPLATES.get(key);
  const detailed = lod === "high";
  if (lod === "far" && ["spear", "sword", "heavy", "crew", "cavalry", "horse"].includes(type)) {
    const b =
        type === "cavalry"
          ? distantCavalry()
          : type === "horse"
            ? distantHorse()
            : distantSoldier(type),
      d = b.data();
    TEMPLATES.set(key, d);
    return d;
  }
  let b =
    type === "horse"
      ? horse(detailed)
      : type === "cavalry"
        ? cavalry(detailed)
        : type === "cannon"
          ? cannon(detailed)
          : type === "chariot"
            ? chariot(detailed)
            : type === "flag"
              ? flag(detailed)
              : ["xiao", "liu", "fox"].includes(type)
                ? commander(type)
                : soldier(type, detailed);
  let data = b.data();
  TEMPLATES.set(key, data);
  return data;
}
function buildArmy(piece, hero = "xiao") {
  const root = new Node3(),
    a = {
      piece,
      root,
      restAngle: piece.s === "r" ? 0 : Math.PI,
      base: new Node3(),
      troops: [],
      anim: [0, 0, 0, 0],
      wheelAngle: 0,
      hero,
    };
  root.r[1] = a.restAngle;
  root.crowd = a;
  root.add(a.base);
  root.dynamic = true;
  a.people = 0;
  const add = (type, x, z, scale = 0.51, y = 0, yaw = 0) => {
    a.troops.push({ type, x, z, scale, y, yaw, seed: (++serial * 2.399963) % 100 });
    if (!["flag", "cannon", "chariot", "horse"].includes(type)) a.people++;
  };
  if (piece.t === "P") {
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 7; col++) add("spear", (col - 3) * 0.263, (row - 3) * 0.269, 0.52);
  }
  if (piece.t === "A") {
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 6; col++) add("sword", (col - 2.5) * 0.28, (row - 2) * 0.31, 0.56);
  }
  if (piece.t === "E") {
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 6; col++)
        add(row < 3 ? "heavy" : "spear", (col - 2.5) * 0.291, (row - 2.5) * 0.277, 0.55);
  }
  if (piece.t === "H") {
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++)
        add("cavalry", (col - 1.5) * 0.46, (row - 1.5) * 0.48, 0.56);
  }
  if (piece.t === "C") {
    for (const x of [-0.49, 0.49])
      for (const z of [-0.45, 0.5]) {
        add("cannon", x, z, 0.73);
        for (const side of [-1, 1])
          for (let j = 0; j < 2; j++) add("crew", x + side * 0.3, z + j * 0.25, 0.47);
      }
    for (let j = 0; j < 7; j++) add("spear", (j - 3) * 0.25, 0.99, 0.48);
  }
  if (piece.t === "R") {
    for (const x of [-0.48, 0.48])
      for (const z of [-0.27, 0.67]) {
        add("chariot", x, z, 0.57);
        add("sword", x, z, 0.42, 0.27);
        add("horse", x - 0.13, z - 0.51, 0.49);
        add("horse", x + 0.13, z - 0.51, 0.49);
      }
    for (let j = 0; j < 6; j++) add("spear", (j - 2.5) * 0.27, 1.06, 0.46);
  }
  if (piece.t === "K") {
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 7; col++) {
        let x = (col - 3) * 0.266,
          z = (row - 2.5) * 0.297;
        if (Math.abs(x) < 0.36 && z < 0.23 && z > -0.62) continue;
        add(row < 2 ? "heavy" : "sword", x, z, 0.49);
      }
    add(hero, 0, -0.28, hero === "fox" ? 0.74 : 0.83);
  }
  add("flag", 0, piece.t === "P" ? 0.74 : 0.78, piece.t === "K" ? 0.84 : 0.63);
  if (piece.t === "P") {
    add("flag", -0.82, 0.82, 0.44);
    add("flag", 0.82, 0.82, 0.44);
  }
  return a;
}
function poseArmy(a, moving, travel, attack, fall, time) {
  a.anim = [moving, travel, attack, fall];
  a.root.crowd = a;
}
function stick(parent, a, b, r, clr, props = {}) {
  let d = V.sub(b, a),
    l = Math.hypot(...d);
  part(
    parent,
    "thin",
    clr,
    V.mul(V.add(a, b), 0.5),
    [r, l, r],
    [Math.acos(clamp(d[1] / l, -1, 1)), Math.atan2(d[0], d[2]), 0],
    props,
  );
}
function makeBoardTextures(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1728;
  const c = canvas.getContext("2d"),
    W = canvas.width,
    H = canvas.height;
  let seed = 821733;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Soil base: multiscale weathering and small stones; engraved lines stay readable.
  c.fillStyle = "#4f5047";
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 23000; i++) {
    let x = rnd() * W,
      y = rnd() * H,
      rad = rnd() * 13 + 0.7;
    c.fillStyle = `rgba(${rnd() < 0.5 ? "24,34,27" : "203,180,125"},${0.012 + rnd() * 0.04})`;
    c.beginPath();
    c.ellipse(x, y, rad * 2, rad, 0, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 62000; i++) {
    c.fillStyle = rnd() < 0.4 ? "#86806b38" : "#302f2b40";
    let x = rnd() * W,
      y = rnd() * H;
    c.fillRect(x, y, rnd() * 2 + 1, rnd() * 2 + 1);
  }
  const px = (x) => ((x + 12) / 24) * W,
    py = (z) => ((z + 13.3) / 26.6) * H;
  // Field cobbles around palaces, not extra chess obstacles.
  for (const side of [-1, 1])
    for (let row = 0; row < 11; row++)
      for (let col = 0; col < 11; col++) {
        let x = -2.75 + col * 0.5,
          z = side * (6.02 + row * 0.5);
        c.fillStyle = `rgba(185,172,139,${0.08 + rnd() * 0.16})`;
        c.fillRect(px(x) + (row % 2) * 7, py(z), 28, 25);
      }
  function line(x, z, x2, z2, w = 1.6, col = "#bdad7d95") {
    c.lineWidth = w;
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(px(x), py(z));
    c.lineTo(px(x2), py(z2));
    c.stroke();
  }
  // Weathered military parade lines, not a bright wooden checkerboard.
  for (let r = 0; r < 10; r++) {
    const z = (r - 4.5) * 2.5;
    line(-10, z, 10, z, 2, "#ddcc977d");
  }
  for (let j = 0; j < 9; j++) {
    const x = (j - 4) * 2.5;
    if (j === 0 || j === 8) line(x, -11.25, x, 11.25, 2.1);
    else {
      line(x, -11.25, x, -1.25);
      line(x, 1.25, x, 11.25);
    }
  }
  for (let s of [-1, 1]) {
    line(-2.5, s * 11.25, 2.5, s * 6.25);
    line(2.5, s * 11.25, -2.5, s * 6.25);
  }
  c.strokeStyle = "#d6bc7e";
  c.lineWidth = 3;
  c.strokeRect(px(-10.22), py(-11.48), px(10.22) - px(-10.22), py(11.48) - py(-11.48));
  for (let rr of [2, 3, 6, 7])
    for (let cc of rr === 2 || rr === 7 ? [1, 7] : [0, 2, 4, 6, 8])
      for (const dx of [-1, 1])
        for (const dz of [-1, 1]) {
          if ((cc === 0 && dx < 0) || (cc === 8 && dx > 0)) continue;
          let x = (cc - 4) * 2.5,
            z = (rr - 4.5) * 2.5;
          line(x + dx * 0.18, z + dz * 0.18, x + dx * 0.35, z + dz * 0.18);
          line(x + dx * 0.18, z + dz * 0.18, x + dx * 0.18, z + dz * 0.35);
        }
  // The actual river is a separate 3D plane; banks are painted into the ground.
  for (let i = 0; i < 1400; i++) {
    let x = -12 + rnd() * 24,
      z = (rnd() < 0.5 ? -1 : 1) * (0.69 + rnd() * 0.29);
    c.fillStyle = rnd() < 0.5 ? "#3b443488" : "#9b967088";
    c.beginPath();
    c.ellipse(px(x), py(z), 4 + rnd() * 16, 1 + rnd() * 5, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#d1bf90";
  c.font = '27px "Noto Serif CJK SC",SimSun,serif';
  c.textAlign = "center";
  for (let j = 0; j < 9; j++) {
    c.fillText("九八七六五四三二一"[j], px((j - 4) * 2.5), py(12.3));
    c.fillText(String(j + 1), px((j - 4) * 2.5), py(-12.1));
  }
  renderer.texture("board", canvas);
  for (let side of ["r", "b"]) {
    let cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 320;
    let g = cv.getContext("2d");
    g.fillStyle = side === "r" ? "#782d2e" : "#233e4a";
    g.fillRect(0, 0, 256, 320);
    g.strokeStyle = "#c9a45e";
    g.lineWidth = 5;
    g.strokeRect(12, 12, 232, 296);
    g.lineWidth = 1;
    g.strokeRect(21, 21, 214, 278);
    g.fillStyle = "#ead19c";
    g.font = 'bold 141px "Noto Serif CJK SC",SimSun,serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(side === "r" ? "楚" : "汉", 128, 165);
    for (let i = 0; i < 7000; i++) {
      g.fillStyle = rnd() < 0.5 ? "#ffffff0a" : "#00000013";
      g.fillRect(rnd() * 256, rnd() * 320, 1, 2);
    }
    renderer.texture("flag-" + side, cv);
  }
  const ground = document.createElement("canvas");
  ground.width = ground.height = 512;
  let g = ground.getContext("2d");
  g.fillStyle = "#484d44";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 23000; i++) {
    g.fillStyle = rnd() < 0.5 ? "#96836022" : "#181e2333";
    g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 11, 1 + rnd() * 4);
  }
  renderer.texture("ground", ground);
  const stone = document.createElement("canvas");
  stone.width = stone.height = 256;
  g = stone.getContext("2d");
  g.fillStyle = "#333a39";
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++)
    for (let x = -1; x < 5; x++) {
      g.fillStyle = `rgb(${78 + rnd() * 18},${80 + rnd() * 14},${71 + rnd() * 13})`;
      g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28);
    }
  renderer.texture("stone", stone);
}
function buildWorld(renderer) {
  makeBoardTextures(renderer);
  const root = new Node3(),
    world = { root, env: link(root), armies: link(root), inspect: link(root) };
  world.inspect.visible = false;
  const env = world.env;
  let seed = 51323;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  part(env, "box", "#484638", [0, -0.76, 0], [150, 1, 150]);
  part(env, "plane", "#ffffff", [0, -0.248, 0], [150, 150, 1], [-Math.PI / 2, 0, 0], {
    texture: "ground",
  });
  // Low earth embankment edged in stone, continuous with the valley rather than a board on a desk.
  part(env, "box", "#4c493c", [0, -0.11, 0], [24.6, 0.3, 27.2]);
  part(env, "plane", "#ffffff", [0, 0.051, 0], [24, 26.6, 1], [-Math.PI / 2, 0, 0], {
    texture: "board",
  });
  for (const x of [-12.2, 12.2]) {
    part(env, "box", "#706a52", [x, 0.04, 0], [0.22, 0.24, 27.1]);
    part(env, "box", "#a18b56", [x, 0.167, 0], [0.05, 0.018, 27.1], [], { metal: 0.25 });
  }
  for (const z of [-13.45, 13.45]) part(env, "box", "#625e4e", [0, 0.04, z], [24.5, 0.25, 0.24]);
  part(env, "plane", "#53746e", [0, 0.063, 0], [24, 0.99, 1], [-Math.PI / 2, 0, 0], {
    metal: 0.6,
    glow: 0.16,
    seed: 7,
  });
  for (let i = 0; i < 60; i++) {
    let x = -11.7 + rnd() * 23.4,
      z = (rnd() < 0.5 ? -1 : 1) * (0.56 + rnd() * 0.11);
    part(
      env,
      "lowSphere",
      "#74705c",
      [x, 0.08, z],
      [0.09 + rnd() * 0.13, 0.06, 0.06 + rnd() * 0.08],
    );
  }
  // Two discreet off-board formation galleries, aligned with captured pieces.
  for (const x of [-13.72, 13.72]) {
    part(env, "box", "#3f4238", [x, -0.005, 0], [2.2, 0.16, 26.2]);
    for (let i = 0; i < 16; i++) {
      let z = (i - 7.5) * 1.58;
      part(env, "box", "#70705d", [x, 0.084, z], [1.54, 0.03, 1.19]);
      part(env, "box", x < 0 ? "#803d31" : "#3d5d63", [x, 0.107, z + 0.6], [1.55, 0.027, 0.028]);
    }
  }
  // Fortified gates and tiled guard towers. Well outside legal intersections.
  for (const s of [-1, 1]) {
    let z = s * 25.6;
    for (const x of [-10.9, 10.9]) {
      part(env, "box", "#50574d", [x, 1.1, z], [14.8, 2.7, 1.55]);
      part(
        env,
        "plane",
        "#c1b49a",
        [x, 1.09, z - s * 0.786],
        [14.8, 2.66, 1],
        [0, s < 0 ? 0 : Math.PI, 0],
        { texture: "stone" },
      );
      for (let i = 0; i < 14; i++) {
        part(env, "box", "#687065", [x + (i - 6.5) * 1.04, 2.61, z], [0.66, 0.55, 1.6]);
      }
    }
    for (const x of [-3.45, 3.45]) {
      part(env, "box", "#625b47", [x, 2.18, z], [1.58, 4.2, 2.1]);
      part(
        env,
        "plane",
        "#d0c8a9",
        [x, 2.18, z - s * 1.06],
        [1.58, 4.2, 1],
        [0, s < 0 ? 0 : Math.PI, 0],
        { texture: "stone" },
      );
      part(env, "box", "#443b31", [x, 4.15, z], [1.84, 0.22, 2.33]);
      part(env, "wedge", "#283c3b", [x, 4.52, z], [2.5, 0.76, 2.8]);
      part(env, "wedge", "#566653", [x, 4.9, z], [0.24, 0.16, 3]);
    }
    part(env, "box", "#51432f", [0, 3.53, z], [5.67, 0.72, 1.7]);
    part(env, "wedge", "#304444", [0, 4.16, z], [6.1, 0.73, 2.8]);
    for (const x of [-2.65, 2.65]) part(env, "box", "#322f25", [x, 1.65, z], [0.38, 3.3, 0.55]);
    for (let j = 0; j < 8; j++) {
      let x = (j - 3.5) * 3.1,
        z2 = s * (16.5 + (j % 2) * 1.2);
      if (Math.abs(x) < 3) continue;
      part(env, "wedge", s > 0 ? "#716b50" : "#586660", [x, 0.47, z2], [2.2, 1.25, 2.6]);
      part(env, "box", "#353c33", [x, 0.02, z2], [2.3, 0.07, 2.7]);
    }
    for (const x of [-12.0, -7.2, 7.2, 12.0]) {
      let flagN = link(env, [x, 0.04, s * 15.0]);
      part(flagN, "thin", "#4a3b2a", [0, 1.55, 0], [0.045, 3.1, 0.045]);
      part(flagN, "flag", "#ffffff", [0.49, 2.4, 0], [0.98, 1.45, 1], [], {
        texture: "flag-" + (s > 0 ? "r" : "b"),
        wave: 1,
        seed: x,
      });
      part(flagN, "cone", "#bd9656", [0, 3.14, 0], [0.095, 0.23, 0.095], [], { metal: 0.6 });
    }
  }
  // Layered mountains: purpose-shaped terrain silhouettes, not scattered identical boulders.
  const verts = [],
    indices = [];
  const N = 120;
  for (let layer = 0; layer < 3; layer++) {
    let rad = 37 + layer * 14;
    for (let j = 0; j <= N; j++) {
      let ang = (j / N) * Math.PI * 2,
        x = Math.cos(ang) * rad,
        z = Math.sin(ang) * rad,
        h = 4 + layer * 3 + Math.sin(ang * 7 + layer) * 2 + Math.sin(ang * 19) * 1.8 + rnd() * 2;
      for (let k = 0; k < 3; k++) {
        let rr = rad + (k - 1) * 8;
        verts.push(Math.cos(ang) * rr, k === 1 ? h : -0.35, Math.sin(ang) * rr);
      }
    }
  }
  // Create a custom terrain grid with smooth averaged normals.
  const vv = [],
    ii = [];
  let count = 0;
  for (let l = 0; l < 3; l++)
    for (let j = 0; j < N; j++)
      for (let k = 0; k < 2; k++) {
        const a = l * (N + 1) * 3 + j * 3 + k,
          b = a + 3;
        ii.push(a, b, a + 1, b, b + 1, a + 1);
      }
  const ns = Array(verts.length).fill(0);
  for (let i = 0; i < ii.length; i += 3) {
    let a = ii[i],
      b = ii[i + 1],
      c = ii[i + 2],
      n = V.cross(
        V.sub(verts.slice(b * 3, b * 3 + 3), verts.slice(a * 3, a * 3 + 3)),
        V.sub(verts.slice(c * 3, c * 3 + 3), verts.slice(a * 3, a * 3 + 3)),
      );
    if (n[1] < 0) n = V.mul(n, -1);
    for (const j of [a, b, c]) for (let k = 0; k < 3; k++) ns[j * 3 + k] += n[k];
  }
  for (let i = 0; i < verts.length; i += 3)
    vv.push(...verts.slice(i, i + 3), ...V.norm(ns.slice(i, i + 3)), 0, 0);
  renderer.geometry("mountains", { v: vv, idx: ii });
  part(env, "mountains", "#626d65");
  // Cypress silhouettes and grass outside the board. Merged once, no per-frame scene-graph churn.
  for (let i = 0; i < 52; i++) {
    let s = i < 26 ? -1 : 1,
      x = s * (18 + rnd() * 11),
      z = (rnd() - 0.5) * 49,
      h = 2.5 + rnd() * 3.5;
    part(env, "thin", "#454338", [x, h * 0.25 - 0.2, z], [0.11, h * 0.5, 0.11]);
    for (let k = 0; k < 3; k++)
      part(
        env,
        "lowSphere",
        k === 2 ? "#3f5148" : "#334c42",
        [x + Math.sin(k * 4 + i) * 0.17, h * (0.35 + k * 0.21), z],
        [h * (0.16 - k * 0.021), h * 0.38, h * (0.16 - k * 0.021)],
      );
  }
  for (let i = 0; i < 200; i++) {
    let x = (rnd() < 0.5 ? -1 : 1) * (15 + rnd() * 6),
      z = (rnd() - 0.5) * 37;
    for (let k = 0; k < 2; k++)
      part(
        env,
        "wedge",
        "#6d7450",
        [x, -0.06, z],
        [0.32, 0.32 + rnd() * 0.35, 0.045],
        [0, rnd() * 6.28, 0],
      );
  }
  return world;
}
window.ChuModels = { buildArmy, poseArmy, buildWorld, PALETTE, template, part, link };

/* ChuHe Render — dependency-free, WebGL 2 instanced renderer. © 2026 ChuHe prototype. */
"use strict";
const M4 = {
  id() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  mul(o, a, b) {
    for (let c = 0; c < 4; c++) {
      const i = c * 4,
        b0 = b[i],
        b1 = b[i + 1],
        b2 = b[i + 2],
        b3 = b[i + 3];
      o[i] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[i + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[i + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[i + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  },
  compose(o, p, r, s) {
    const x = r[0] / 2,
      y = r[1] / 2,
      z = r[2] / 2,
      a = Math.cos(x),
      b = Math.sin(x),
      c = Math.cos(y),
      d = Math.sin(y),
      e = Math.cos(z),
      f = Math.sin(z);
    const qx = b * c * e + a * d * f,
      qy = a * d * e - b * c * f,
      qz = a * c * f + b * d * e,
      qw = a * c * e - b * d * f;
    const xx = qx * qx,
      yy = qy * qy,
      zz = qz * qz,
      xy = qx * qy,
      xz = qx * qz,
      yz = qy * qz,
      wx = qw * qx,
      wy = qw * qy,
      wz = qw * qz;
    o[0] = (1 - 2 * (yy + zz)) * s[0];
    o[1] = 2 * (xy + wz) * s[0];
    o[2] = 2 * (xz - wy) * s[0];
    o[3] = 0;
    o[4] = 2 * (xy - wz) * s[1];
    o[5] = (1 - 2 * (xx + zz)) * s[1];
    o[6] = 2 * (yz + wx) * s[1];
    o[7] = 0;
    o[8] = 2 * (xz + wy) * s[2];
    o[9] = 2 * (yz - wx) * s[2];
    o[10] = (1 - 2 * (xx + yy)) * s[2];
    o[11] = 0;
    o[12] = p[0];
    o[13] = p[1];
    o[14] = p[2];
    o[15] = 1;
    return o;
  },
  perspective(o, f, ar, n, fa) {
    o.fill(0);
    const t = 1 / Math.tan(f / 2);
    o[0] = t / ar;
    o[5] = t;
    o[10] = (fa + n) / (n - fa);
    o[11] = -1;
    o[14] = (2 * fa * n) / (n - fa);
    return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0);
    o[0] = 2 / (r - l);
    o[5] = 2 / (t - b);
    o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l);
    o[13] = -(t + b) / (t - b);
    o[14] = -(f + n) / (f - n);
    o[15] = 1;
    return o;
  },
  look(o, eye, at, up = [0, 1, 0]) {
    let z = V.norm(V.sub(eye, at)),
      x = V.norm(V.cross(up, z)),
      y = V.cross(z, x);
    o.set([
      x[0],
      y[0],
      z[0],
      0,
      x[1],
      y[1],
      z[1],
      0,
      x[2],
      y[2],
      z[2],
      0,
      -V.dot(x, eye),
      -V.dot(y, eye),
      -V.dot(z, eye),
      1,
    ]);
    return o;
  },
  point(m, p) {
    const x = p[0],
      y = p[1],
      z = p[2],
      w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
      w,
    ];
  },
};
const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  norm(a) {
    let l = Math.hypot(...a) || 1;
    return a.map((v) => v / l);
  },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
  mix = (a, b, t) => a + (b - a) * t,
  smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  },
  ease = (t) => {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  };
function color(hex) {
  if (Array.isArray(hex)) return hex;
  hex = hex.replace("#", "");
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
    1,
  ];
}
class Node3 {
  constructor(p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    this.p = [p[0] || 0, p[1] || 0, p[2] || 0];
    this.r = [r[0] || 0, r[1] || 0, r[2] || 0];
    this.s = s;
    this.children = [];
    this.local = M4.id();
    this.world = M4.id();
    this.visible = true;
  }
  add(n) {
    this.children.push(n);
    return n;
  }
}
function part(parent, geo, c, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], props = {}) {
  let n = new Node3(p, r, s);
  n.geo = geo;
  n.color = color(c);
  n.props = [props.metal || 0, props.glow || 0, props.wave || 0, props.seed || 0];
  n.texture = props.texture || null;
  parent.add(n);
  return n;
}
const Geometry = {
  box() {
    const v = [],
      idx = [];
    const faces = [
      [
        [1, 0, 0],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
        [0.5, -0.5, 0.5],
      ],
      [
        [-1, 0, 0],
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, 0.5, -0.5],
        [-0.5, -0.5, -0.5],
      ],
      [
        [0, 1, 0],
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ],
      [
        [0, -1, 0],
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ],
      [
        [0, 0, 1],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ],
      [
        [0, 0, -1],
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, -0.5, -0.5],
      ],
    ];
    faces.forEach((f) => {
      let k = v.length / 8;
      for (let i = 1; i < 5; i++)
        v.push(...f[i], ...f[0], i === 2 || i === 3 ? 1 : 0, i >= 3 ? 1 : 0);
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    });
    return { v, idx };
  },
  dome(N = 12, M = 4) {
    const v = [],
      idx = [];
    for (let y = 0; y <= M; y++)
      for (let x = 0; x <= N; x++) {
        let a = ((y / M) * Math.PI) / 2,
          b = (x / N) * 2 * Math.PI,
          p = [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
        v.push(...p, ...p, x / N, y / M);
      }
    for (let y = 0; y < M; y++)
      for (let x = 0; x < N; x++) {
        let a = y * (N + 1) + x,
          b = a + N + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    return { v, idx };
  },
  sphere(N = 10, M = 7) {
    const v = [],
      idx = [];
    for (let y = 0; y <= M; y++)
      for (let x = 0; x <= N; x++) {
        let a = (y / M) * Math.PI,
          b = (x / N) * 2 * Math.PI,
          p = [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)];
        v.push(...p, ...p, x / N, y / M);
      }
    for (let y = 0; y < M; y++)
      for (let x = 0; x < N; x++) {
        let a = y * (N + 1) + x,
          b = a + N + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    return { v, idx };
  },
  cylinder(N = 10, top = 1) {
    const v = [],
      idx = [];
    for (let y = 0; y < 2; y++)
      for (let i = 0; i <= N; i++) {
        let a = (i / N) * 2 * Math.PI,
          rad = y ? top : 1,
          n = V.norm([Math.cos(a), 1 - top, Math.sin(a)]);
        v.push(Math.cos(a) * rad, y - 0.5, Math.sin(a) * rad, ...n, i / N, y);
      }
    for (let i = 0; i < N; i++) {
      let a = i,
        b = i + N + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    for (let side = 0; side < 2; side++) {
      let start = v.length / 8,
        y = side - 0.5,
        n = [0, side ? 1 : -1, 0];
      v.push(0, y, 0, ...n, 0.5, 0.5);
      for (let i = 0; i <= N; i++) {
        let a = (i / N) * 2 * Math.PI,
          r = side ? top : 1;
        v.push(
          Math.cos(a) * r,
          y,
          Math.sin(a) * r,
          ...n,
          (Math.cos(a) + 1) / 2,
          (Math.sin(a) + 1) / 2,
        );
      }
      for (let i = 0; i < N; i++)
        side
          ? idx.push(start, start + i + 2, start + i + 1)
          : idx.push(start, start + i + 1, start + i + 2);
    }
    return { v, idx };
  },
  torus(N = 14, M = 5, R = 0.78, r = 0.22) {
    const v = [],
      idx = [];
    for (let i = 0; i <= N; i++)
      for (let j = 0; j <= M; j++) {
        let a = (i / N) * 2 * Math.PI,
          b = (j / M) * 2 * Math.PI;
        v.push(
          (R + r * Math.cos(b)) * Math.cos(a),
          (R + r * Math.cos(b)) * Math.sin(a),
          r * Math.sin(b),
          Math.cos(b) * Math.cos(a),
          Math.cos(b) * Math.sin(a),
          Math.sin(b),
          i / N,
          j / M,
        );
      }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < M; j++) {
        let a = i * (M + 1) + j,
          b = a + M + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    return { v, idx };
  },
  plane(N = 1, M = 1) {
    let v = [],
      idx = [];
    for (let y = 0; y <= M; y++)
      for (let x = 0; x <= N; x++) v.push(x / N - 0.5, y / M - 0.5, 0, 0, 0, 1, x / N, 1 - y / M);
    for (let y = 0; y < M; y++)
      for (let x = 0; x < N; x++) {
        let a = y * (N + 1) + x,
          b = a + N + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    return { v, idx };
  },
  wedge() {
    let v = [],
      idx = [],
      pts = [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
        [0, 0.5, -0.5],
        [0, 0.5, 0.5],
      ],
      faces = [
        [0, 1, 4],
        [3, 5, 2],
        [0, 4, 5, 3],
        [1, 2, 5, 4],
        [0, 3, 2, 1],
      ];
    faces.forEach((f) => {
      let n = V.norm(V.cross(V.sub(pts[f[1]], pts[f[0]]), V.sub(pts[f[2]], pts[f[0]]))),
        k = v.length / 8;
      if (V.dot(n, pts[f[0]]) < 0) n = V.mul(n, -1);
      f.forEach((p, i) => v.push(...pts[p], ...n, i % 2, Math.floor(i / 2)));
      for (let i = 1; i < f.length - 1; i++) idx.push(k, k + i, k + i + 1);
    });
    return { v, idx };
  },
};
const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
layout(location=3) in mat4 aModel;layout(location=7) in vec4 aColor;layout(location=8) in vec4 aProps;
uniform mat4 uVP,uLight;uniform float uTime;out vec3 vNormal,vWorld;out vec4 vColor,vShadow;out vec2 vUV;out vec4 vProps;
void main(){vec3 p=aPos; if(aProps.z>0.0){float flex=pow(aUV.x,1.3);p.z+=sin(aUV.x*7.0+uTime*3.4+aProps.w)*.10*flex*aProps.z+cos(aUV.y*5.0+uTime*2.1)*.03*flex;}vec4 world=aModel*vec4(p,1.);vWorld=world.xyz;vec3 inv=vec3(dot(aModel[0].xyz,aModel[0].xyz),dot(aModel[1].xyz,aModel[1].xyz),dot(aModel[2].xyz,aModel[2].xyz));vNormal=normalize(mat3(aModel)*(aNormal/max(inv,vec3(.0001))));vColor=aColor;vUV=aUV;vProps=aProps;vShadow=uLight*world;gl_Position=uVP*world;}`;
const STATIC_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;layout(location=7) in vec4 aColor;layout(location=8) in vec4 aProps;layout(location=9) in vec4 aShadow;
uniform mat4 uVP;out vec3 vNormal,vWorld;out vec4 vColor,vShadow;out vec2 vUV;out vec4 vProps;
void main(){vWorld=aPos;vNormal=aNormal;vUV=aUV;vColor=aColor;vProps=aProps;vShadow=aShadow;gl_Position=uVP*vec4(aPos,1.);}`;
const FRAG = `#version 300 es
precision highp float;in vec3 vNormal,vWorld;in vec4 vColor,vShadow;in vec2 vUV;in vec4 vProps;uniform vec3 uEye,uSun;uniform sampler2D uShadow,uTex;uniform bool uTextured,uShadows;uniform float uShadowSize,uTime,uShadowBias;out vec4 frag;
float shadow(vec3 n){vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(!uShadows||p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;float b=max(uShadowBias,3.*uShadowBias*(1.-dot(n,uSun))),d=1./uShadowSize;float s=0.;for(int i=0;i<2;i++)for(int j=0;j<2;j++)s+=p.z-b>texture(uShadow,p.xy+(vec2(i,j)-.5)*d).r?.27:1.;return s*.25;}
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec4 c=vColor;if(uTextured)c*=texture(uTex,(vProps.z>0.0&&!gl_FrontFacing)?vec2(1.-vUV.x,vUV.y):vUV);if(c.a<.08)discard;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 if(vProps.w==7.){n=normalize(n+vec3(sin(vWorld.x*8.+uTime*1.2)*.043,0.,cos(vWorld.x*3.+vWorld.z*7.-uTime)*.038));c.rgb*=.88+.12*sin(vWorld.x*9.+vWorld.z*6.+uTime*.7);}
 vec3 eye=normalize(uEye-vWorld),halfv=normalize(eye+uSun);float nd=max(0.,dot(n,uSun)),sh=shadow(n),hemi=n.y*.5+.5;
 vec3 base=c.rgb*c.rgb;vec3 ambient=mix(vec3(.08,.095,.08),vec3(.25,.36,.39),hemi),sun=vec3(2.7,2.38,1.94);vec3 lit=base*(ambient+nd*sun*sh);
 float sn=max(0.,dot(n,halfv));float s2=sn*sn,s4=s2*s2,s8=s4*s4,s16=s8*s8,s32=s16*s16,s64=s32*s32;float spec=mix(s16,s64,vProps.x)*mix(.028,.39,vProps.x)*sh;lit+=sun*spec*mix(vec3(1.),base,vProps.x*.68);float fr=1.-max(0.,dot(n,eye));float rim=fr*fr*fr*max(0.,dot(n,vec3(.6804,.2722,-.6804)));lit+=vec3(.14,.22,.25)*rim*(.16+vProps.x*.44);lit+=base*vProps.y;
 float ao=mix(.74,1.,smoothstep(.03,.60,vWorld.y));lit*=ao;float fd=max(0.,length(vWorld.xz)-16.)*.019;float fog=clamp(fd/(1.+fd),0.,.91);lit=mix(lit,vec3(.30,.37,.35),fog);frag=vec4(sqrt(film(lit*1.05)),c.a);}`;
const DEPTH_FRAG = `#version 300 es
precision highp float;out vec4 frag;void main(){frag=vec4(1.);}`;
const PARTICLE_VERT = `#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=1) in vec4 aColor;layout(location=2) in float aSize;uniform mat4 uVP;uniform vec3 uEye;uniform float uHeight;out vec4 vColor;void main(){gl_Position=uVP*vec4(aPos,1.);gl_PointSize=clamp(aSize*uHeight/max(1.,length(uEye-aPos)),1.,170.);vColor=aColor;}`;
const PARTICLE_FRAG = `#version 300 es
precision highp float;in vec4 vColor;out vec4 frag;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float a=pow(1.-d,2.)*vColor.a;frag=vec4(vColor.rgb,a);}`;
class ChuRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = (this.gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    }));
    if (!gl) throw new Error("此浏览器未能开启 WebGL 2，请启用硬件加速后用 Chrome 或 Edge 打开。");
    this.meshes = new Map();
    this.textures = new Map();
    this.batches = new Map();
    this.program = this.shader(VERT, FRAG);
    this.depthProgram = this.shader(VERT, DEPTH_FRAG);
    this.particleProgram = this.shader(PARTICLE_VERT, PARTICLE_FRAG);
    this.staticProgram = this.shader(STATIC_VERT, FRAG);
    this.staticDepth = this.shader(STATIC_VERT, DEPTH_FRAG);
    this.bakedMap = new Map();
    this.vp = M4.id();
    this.light = M4.id();
    this.shadowDirty = true;
    this.shadowSize = 1024;
    this.enableShadows = true;
    this.pixelRatio = 1;
    this.drawCalls = 0;
    this.triangles = 0;
    this.pBuffer = gl.createBuffer();
    this.pVAO = gl.createVertexArray();
    gl.bindVertexArray(this.pVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 6000 * 32, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.bindVertexArray(null);
    this.setupShadow();
    this.geometry("box", Geometry.box());
    this.geometry("sphere", Geometry.sphere());
    this.geometry("dome", Geometry.dome());
    this.geometry("cylinder", Geometry.cylinder());
    this.geometry("cone", Geometry.cylinder(10, 0));
    this.geometry("taper", Geometry.cylinder(10, 0.73));
    this.geometry("thin", Geometry.cylinder(5));
    this.geometry("torus", Geometry.torus());
    this.geometry("plane", Geometry.plane());
    this.geometry("flag", Geometry.plane(10, 4));
    this.geometry("wedge", Geometry.wedge());
    this.geometry("lowSphere", Geometry.sphere(6, 4));
    this.geometry("lowCyl", Geometry.cylinder(6));
    this.geometry("lowCone", Geometry.cylinder(6, 0));
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.21, 0.22, 0.23, 1);
  }
  shader(v, f) {
    const gl = this.gl,
      pr = gl.createProgram();
    for (let [kind, code] of [
      [gl.VERTEX_SHADER, v],
      [gl.FRAGMENT_SHADER, f],
    ]) {
      let s = gl.createShader(kind);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(pr, s);
      gl.deleteShader(s);
    }
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    pr.u = {};
    return pr;
  }
  uni(pr, k) {
    return Object.prototype.hasOwnProperty.call(pr.u, k)
      ? pr.u[k]
      : (pr.u[k] = this.gl.getUniformLocation(pr, k));
  }
  geometry(key, g) {
    const indices = [];
    for (let i = 0; i < g.idx.length; i += 3) {
      let ids = g.idx.slice(i, i + 3),
        a = ids.map((j) => g.v.slice(j * 8, j * 8 + 3)),
        n = ids.map((j) => g.v.slice(j * 8 + 3, j * 8 + 6)),
        nn = V.add(V.add(n[0], n[1]), n[2]),
        cross = V.cross(V.sub(a[1], a[0]), V.sub(a[2], a[0]));
      if (V.dot(cross, cross) < 1e-14) continue;
      if (V.dot(cross, nn) < 0) [ids[1], ids[2]] = [ids[2], ids[1]];
      indices.push(...ids);
    }
    g.idx = indices;
    const gl = this.gl,
      vb = gl.createBuffer(),
      ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.v), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx), gl.STATIC_DRAW);
    this.meshes.set(key, { vb, ib, count: g.idx.length, source: g });
  }
  texture(key, canvas) {
    const gl = this.gl,
      t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.set(key, t);
    return key;
  }
  setupShadow() {
    const gl = this.gl;
    this.shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      this.shadowSize,
      this.shadowSize,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shadowFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      this.enableShadows = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let view = M4.id(),
      proj = M4.id();
    this.sun = V.norm([-18, 26, 12]);
    M4.look(view, [-30, 43, 20], [0, 0, 0]);
    M4.ortho(proj, -25, 25, -27, 27, 1, 120);
    M4.mul(this.light, proj, view);
  }
  makeBatch(key, geo, texture, capacity) {
    const gl = this.gl,
      g = this.meshes.get(geo),
      buffer = gl.createBuffer(),
      vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(
        i,
        i === 2 ? 2 : 3,
        gl.FLOAT,
        false,
        32,
        i === 0 ? 0 : i === 1 ? 12 : 24,
      );
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, capacity * 96, gl.DYNAMIC_DRAW);
    for (let i = 3; i < 9; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 96, (i - 3) * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    let b = {
      key,
      geo,
      texture,
      vao,
      buffer,
      capacity,
      data: new Float32Array(capacity * 24),
      count: 0,
      dirty: false,
    };
    this.batches.set(key, b);
    return b;
  }
  compile(root) {
    this.root = root;
    const lists = new Map(),
      baked = new Map();
    const walk = (n, parent, on, dynamic = false, tint = 1) => {
      n.parent = parent;
      on = on && n.visible;
      dynamic = dynamic || !!n.dynamic;
      tint *= n.tint === undefined ? 1 : n.tint;
      M4.compose(n.local, n.p, n.r, n.s);
      parent ? M4.mul(n.world, parent.world, n.local) : n.world.set(n.local);
      n.batch = null;
      if (n.geo && on) {
        if (dynamic || n.geo === "flag") {
          const key = n.geo + "|" + (n.texture || "");
          if (!lists.has(key)) lists.set(key, []);
          lists.get(key).push(n);
        } else {
          let key = n.texture || "";
          if (!baked.has(key)) baked.set(key, []);
          baked.get(key).push({ n, tint });
        }
      }
      n.children.forEach((c) => walk(c, n, on, dynamic, tint));
    };
    walk(root, null, true);
    for (let b of this.batches.values()) {
      this.gl.deleteBuffer(b.buffer);
      this.gl.deleteVertexArray(b.vao);
    }
    this.batches.clear();
    this.partCount = 0;
    for (let [key, list] of lists) {
      let b = this.makeBatch(key, list[0].geo, list[0].texture, list.length);
      b.count = list.length;
      list.forEach((n, i) => {
        n.batch = b;
        n.slot = i;
      });
      this.partCount += list.length;
    }
    for (let b of this.bakedMap.values()) {
      this.gl.deleteBuffer(b.vb);
      this.gl.deleteBuffer(b.ib);
      this.gl.deleteVertexArray(b.vao);
    }
    this.bakedMap.clear();
    for (let [key, items] of baked) {
      this.bake(key, items);
      this.partCount += items.length;
    }
    this.update(root);
    this.shadowDirty = true;
  }
  bake(texture, items) {
    const gl = this.gl;
    let nv = 0,
      ni = 0;
    for (let { n } of items) {
      let g = this.meshes.get(n.geo).source;
      nv += g.v.length / 8;
      ni += g.idx.length;
    }
    let data = new Float32Array(nv * 20),
      indices = new Uint32Array(ni),
      vi = 0,
      ii = 0,
      L = this.light;
    for (let { n, tint } of items) {
      const g = this.meshes.get(n.geo).source,
        m = n.world,
        col = n.color,
        props = n.props,
        base = vi,
        inv = [
          1 / (m[0] * m[0] + m[1] * m[1] + m[2] * m[2]),
          1 / (m[4] * m[4] + m[5] * m[5] + m[6] * m[6]),
          1 / (m[8] * m[8] + m[9] * m[9] + m[10] * m[10]),
        ];
      for (let j = 0; j < g.v.length; j += 8) {
        let x = g.v[j],
          y = g.v[j + 1],
          z = g.v[j + 2],
          px = m[0] * x + m[4] * y + m[8] * z + m[12],
          py = m[1] * x + m[5] * y + m[9] * z + m[13],
          pz = m[2] * x + m[6] * y + m[10] * z + m[14],
          nx = g.v[j + 3] * inv[0],
          ny = g.v[j + 4] * inv[1],
          nz = g.v[j + 5] * inv[2],
          wx = m[0] * nx + m[4] * ny + m[8] * nz,
          wy = m[1] * nx + m[5] * ny + m[9] * nz,
          wz = m[2] * nx + m[6] * ny + m[10] * nz,
          ln = Math.hypot(wx, wy, wz) || 1,
          k = vi * 20;
        data[k] = px;
        data[k + 1] = py;
        data[k + 2] = pz;
        data[k + 3] = wx / ln;
        data[k + 4] = wy / ln;
        data[k + 5] = wz / ln;
        data[k + 6] = g.v[j + 6];
        data[k + 7] = g.v[j + 7];
        data[k + 8] = col[0] * tint;
        data[k + 9] = col[1] * tint;
        data[k + 10] = col[2] * tint;
        data[k + 11] = col[3];
        data.set(props, k + 12);
        data[k + 16] = L[0] * px + L[4] * py + L[8] * pz + L[12];
        data[k + 17] = L[1] * px + L[5] * py + L[9] * pz + L[13];
        data[k + 18] = L[2] * px + L[6] * py + L[10] * pz + L[14];
        data[k + 19] = 1;
        vi++;
      }
      for (let v of g.idx) indices[ii++] = base + v;
    }
    let vb = gl.createBuffer(),
      ib = gl.createBuffer(),
      vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    for (let [loc, count, off] of [
      [0, 3, 0],
      [1, 3, 12],
      [2, 2, 24],
      [7, 4, 32],
      [8, 4, 48],
      [9, 4, 64],
    ]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, count, gl.FLOAT, false, 80, off);
    }
    gl.bindVertexArray(null);
    this.bakedMap.set(texture, { vb, ib, vao, texture, count: ni });
  }

  update(root, parentWorld = null, parentVisible = true, tint = 1) {
    const walk = (n, pw, vis, ti) => {
      vis = vis && n.visible;
      ti *= n.tint === undefined ? 1 : n.tint;
      M4.compose(n.local, n.p, n.r, n.s);
      pw ? M4.mul(n.world, pw, n.local) : n.world.set(n.local);
      if (n.batch) {
        const b = n.batch,
          j = n.slot * 24;
        if (vis) {
          b.data.set(n.world, j);
        } else {
          b.data.fill(0, j, j + 16);
          b.data[j + 15] = 1;
          b.data[j + 13] = -10000;
        }
        b.data[j + 16] = n.color[0] * ti;
        b.data[j + 17] = n.color[1] * ti;
        b.data[j + 18] = n.color[2] * ti;
        b.data[j + 19] = n.color[3];
        b.data.set(n.props, j + 20);
        b.dirty = true;
      }
      n.children.forEach((c) => walk(c, n.world, vis, ti));
    };
    walk(root, parentWorld || (root.parent ? root.parent.world : null), parentVisible, tint);
    this.shadowDirty = true;
  }
  upload() {
    const gl = this.gl;
    for (let b of this.batches.values())
      if (b.dirty) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.data);
        b.dirty = false;
      }
  }
  resize(w, h, ratio = 1) {
    const cw = Math.round(w * ratio),
      ch = Math.round(h * ratio);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.width = w;
    this.height = h;
  }
  render(cam, time, particles = []) {
    const gl = this.gl;
    this.updateCrowds?.();
    this.upload();
    this.drawCalls = 0;
    this.triangles = 0;
    const proj = M4.id(),
      view = M4.id();
    M4.perspective(proj, cam.fov, this.canvas.width / this.canvas.height, 0.1, 160);
    M4.look(view, cam.eye, cam.target);
    M4.mul(this.vp, proj, view);
    this.updateCrowdView?.(cam);
    if (
      this.shadowDirty &&
      this.enableShadows &&
      (!this._shadowTime || time - this._shadowTime > 0.075)
    ) {
      this._shadowTime = time;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
      gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      this.draw(this.depthProgram, this.light, cam, time, true);
      this.drawCrowds?.(cam, time, true);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.shadowDirty = false;
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawSky?.(cam);
    this.draw(this.program, this.vp, cam, time, false);
    this.drawCrowds?.(cam, time, false);
    if (particles.length) this.drawParticles(cam, particles);
    gl.bindVertexArray(null);
  }
  draw(pr, vp, cam, time, depth) {
    const gl = this.gl;
    let sp = depth ? this.staticDepth : this.staticProgram;
    this.bindProgram(sp, vp, cam, time);
    gl.enable(gl.CULL_FACE);
    for (let b of this.bakedMap.values()) {
      if (depth && (b.texture === "board" || b.texture === "ground")) continue;
      if (b.texture === "board") gl.disable(gl.CULL_FACE);
      else gl.enable(gl.CULL_FACE);
      gl.bindVertexArray(b.vao);
      gl.uniform1i(this.uni(sp, "uTextured"), b.texture ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, b.texture ? this.textures.get(b.texture) : null);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_INT, 0);
      this.drawCalls++;
      this.triangles += b.count / 3;
    }
    this.bindProgram(pr, vp, cam, time);
    for (let b of this.batches.values()) {
      if (depth && (b.texture === "board" || b.texture === "ground")) continue;
      let double = b.geo === "flag" || b.geo === "plane";
      double ? gl.disable(gl.CULL_FACE) : gl.enable(gl.CULL_FACE);
      gl.bindVertexArray(b.vao);
      gl.uniform1i(this.uni(pr, "uTextured"), b.texture ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, b.texture ? this.textures.get(b.texture) : null);
      let g = this.meshes.get(b.geo);
      gl.drawElementsInstanced(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, 0, b.count);
      this.drawCalls++;
      this.triangles += (g.count / 3) * b.count;
    }
  }
  bindProgram(pr, vp, cam, time) {
    const gl = this.gl;
    gl.useProgram(pr);
    gl.uniformMatrix4fv(this.uni(pr, "uVP"), false, vp);
    gl.uniformMatrix4fv(this.uni(pr, "uLight"), false, this.light);
    gl.uniform1f(this.uni(pr, "uTime"), time);
    gl.uniform3fv(this.uni(pr, "uEye"), cam.eye);
    gl.uniform3fv(this.uni(pr, "uSun"), this.sun);
    gl.uniform1i(this.uni(pr, "uShadows"), this.enableShadows ? 1 : 0);
    gl.uniform1f(this.uni(pr, "uShadowSize"), this.shadowSize);
    gl.uniform1f(this.uni(pr, "uShadowBias"), this._lightFocus ? 0.00018 : 0.0006);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.uniform1i(this.uni(pr, "uShadow"), 1);
    gl.uniform1i(this.uni(pr, "uTex"), 0);
  }
  drawParticles(cam, pts) {
    const gl = this.gl,
      pr = this.particleProgram;
    let data = new Float32Array(Math.min(6000, pts.length) * 8);
    for (let i = 0; i < data.length / 8; i++) {
      const p = pts[i];
      data.set([...p.p, ...p.color, p.size], i * 8);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.useProgram(pr);
    gl.uniformMatrix4fv(this.uni(pr, "uVP"), false, this.vp);
    gl.uniform3fv(this.uni(pr, "uEye"), cam.eye);
    gl.uniform1f(this.uni(pr, "uHeight"), this.canvas.height);
    gl.bindVertexArray(this.pVAO);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.drawArrays(gl.POINTS, 0, data.length / 8);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    this.drawCalls++;
  }
  project(p) {
    let q = M4.point(this.vp, p);
    return {
      x: (q[0] * 0.5 + 0.5) * this.width,
      y: (1 - (q[1] * 0.5 + 0.5)) * this.height,
      z: q[2],
      w: q[3],
    };
  }
}
window.ChuRender = { M4, V, Node3, part, ChuRenderer, Geometry, color, clamp, mix, smooth, ease };

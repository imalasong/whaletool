/* Shared uniforms describe 32 armies. Walking, attack, cloth and recoil deform in the GPU.
   Thousands of troops do not allocate or update thousands of JS bone objects each frame. */
"use strict";
const CROWD_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
layout(location=3) in vec4 aTint;layout(location=4) in vec4 aBone;layout(location=5) in vec4 aInstance;layout(location=6) in vec4 aData;
uniform mat4 uVP,uLight;uniform float uTime;layout(location=7) in vec4 aArmy;layout(location=8) in vec4 aAnim;layout(location=9) in vec4 aMeta;
out vec3 vNormal,vWorld;out vec4 vColor,vShadow;out vec2 vUV;out vec4 vProps;
vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}vec3 rz(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
void main(){vec4 army=aArmy,an=aAnim,meta=aMeta;vec3 p=aPos,n=aNormal;float seed=aData.y,phase=an.y*1.9+seed*.14,walk=an.x,bone=aBone.x;vec3 pivot=aBone.yzw;
 if(bone==21.||bone==22.){float flip=bone==21.?1.:-1.,a=max(0.,-sin(phase)*flip)*walk*.73;vec3 knee=vec3(pivot.x,.255,pivot.z);p=rx(p-knee,a)+knee;n=rx(n,a);bone-=20.;}
 if(bone==1.||bone==2.){float a=sin(phase)*(bone==1.?1.:-1.)*walk*.61;p=rx(p-pivot,a)+pivot;n=rx(n,a);}
 if(bone==3.||bone==4.){float a=sin(phase)*(bone==3.?-1.:1.)*walk*.39;float hit=an.z*(.78+.22*sin(seed))*(1.-smoothstep(.0,.95,aInstance.z)*.52);a+=bone==4.?hit*1.62:-hit*.49;p=rx(p-pivot,a)+pivot;n=rx(n,a);}
 if(bone==40.||bone==41.){float hit=an.z*(1.-smoothstep(.0,.95,aInstance.z)*.52),angle=-hit*(bone==40.?1.43:1.91);p=rx(p-pivot,angle)+pivot;n=rx(n,angle);vec3 off=vec3(0.,-.344,-.022);float arm=hit*1.62+sin(phase)*walk*.39;p+=rx(off,arm)-off;}
 if(bone>=30.&&bone<=33.){float ph=phase*1.1+(bone==30.||bone==33.?0.:3.1416),a=max(0.,-sin(ph))*walk*.85;vec3 knee=vec3(pivot.x,.29,pivot.z);p=rx(p-knee,a)+knee;n=rx(n,a);bone-=20.;}
 if(bone>=10.&&bone<=13.){float ph=phase*1.1+(bone==10.||bone==13.?0.:3.1416),a=sin(ph)*walk*.66;p=rx(p-pivot,a)+pivot;n=rx(n,a);}
 if(bone==14.){float a=sin(phase*2.)*walk*.07-an.z*.11;p=rx(p-pivot,a)+pivot;n=rx(n,a);}
 if(bone==15.){float a=sin(uTime*2.1+seed)*.10+sin(phase)*walk*.15;p=ry(p-pivot,a)+pivot;n=ry(n,a);}
 if(bone==6.){p=rx(p-pivot,army.w)+pivot;n=rx(n,army.w);}
 if(bone==7.){float slot=step(0.,aInstance.x)+2.*step(0.,aInstance.z),fireT=slot<2.?.16+slot*.13:.41+(slot-2.)*.12,t=-an.y;float recoil=an.y<0.?step(fireT,t)*exp(-max(0.,t-fireT)*16.):0.;p.z+=recoil*.20;}
 if(bone==5.){float f=clamp((pivot.y-p.y)*2.,0.,1.);p.z+=sin(uTime*3.4+seed+p.y*8.)*.035*f+walk*.1*f;}
 if(bone==9.){float f=pow(aUV.x,1.2);p.z+=sin(aUV.x*7.-uTime*3.0+seed)*.12*f+sin(aUV.y*6.+uTime*1.8)*.035*f;}
 if(bone!=6.&&bone!=7.&&bone!=9.)p.y+=abs(sin(phase*2.))*walk*.015;
 float fall=smoothstep(fract(seed*.313)*.22,1.,an.w);if(fall>0.){p=rz(p-vec3(0.,.08,0.),fall*1.38)+vec3(0.,.08,0.);n=rz(n,fall*1.38);p.x+=sin(seed*2.7)*fall*.26;}
 p=vec3(aData.x*p.x+aData.z*p.z,p.y,-aData.z*p.x+aData.x*p.z);n=vec3(aData.x*n.x+aData.z*n.z,n.y,-aData.z*n.x+aData.x*n.z);p=(p*aInstance.w+aInstance.xyz)*meta.x;p=vec3(meta.z*p.x+meta.w*p.z,p.y,-meta.w*p.x+meta.z*p.z)+army.xyz;n=vec3(meta.z*n.x+meta.w*n.z,n.y,-meta.w*n.x+meta.z*n.z);vWorld=p;vNormal=n;vUV=aUV;
 vec3 col=aTint.rgb;float mat=aTint.w;
 if(mat==1.&&bone!=9.)col*=mix(vec3(.52,.15,.14),vec3(.16,.31,.36),aData.w);
 if(mat==2.)col*=.91+.09*sin(seed*13.);if(mat==4.)col*=.91+.09*sin(seed*1.7);
 if(mat==6.)col*=mix(vec3(.71,.78,.84),vec3(1.28,1.13,.9),fract(seed*.97));
 vColor=vec4(col*meta.y,1.);vProps=vec4(mat==2.?.74:mat==6.?.07:.03,mat==3.?.55:0.,bone==9.?1.:0.,mat==2.?3.:0.);vShadow=uLight*vec4(p,1.);gl_Position=uVP*vec4(p,1.);
}`;
const IDLE_CROWD_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
layout(location=3) in vec4 aTint;layout(location=4) in vec4 aBone;layout(location=5) in vec4 aInstance;layout(location=6) in vec4 aData;
uniform mat4 uVP,uLight;uniform float uTime;layout(location=7) in vec4 aArmy;layout(location=8) in vec4 aAnim;layout(location=9) in vec4 aMeta;
out vec3 vNormal,vWorld;out vec4 vColor,vShadow;out vec2 vUV;out vec4 vProps;
vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}vec3 rz(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
void main(){vec4 army=aArmy,an=aAnim,meta=aMeta;vec3 p=aPos,n=aNormal;float seed=aData.y,phase=an.y*1.9+seed*.14,walk=an.x,bone=aBone.x;vec3 pivot=aBone.yzw;
 if(bone==6.){p=rx(p-pivot,army.w)+pivot;n=rx(n,army.w);}
 p=vec3(aData.x*p.x+aData.z*p.z,p.y,-aData.z*p.x+aData.x*p.z);n=vec3(aData.x*n.x+aData.z*n.z,n.y,-aData.z*n.x+aData.x*n.z);p=(p*aInstance.w+aInstance.xyz)*meta.x;p=vec3(meta.z*p.x+meta.w*p.z,p.y,-meta.w*p.x+meta.z*p.z)+army.xyz;n=vec3(meta.z*n.x+meta.w*n.z,n.y,-meta.w*n.x+meta.z*n.z);vWorld=p;vNormal=n;vUV=aUV;
 vec3 col=aTint.rgb;float mat=aTint.w;
 if(mat==1.&&bone!=9.)col*=mix(vec3(.52,.15,.14),vec3(.16,.31,.36),aData.w);
 if(mat==2.)col*=.91+.09*sin(seed*13.);if(mat==4.)col*=.91+.09*sin(seed*1.7);
 if(mat==6.)col*=mix(vec3(.71,.78,.84),vec3(1.28,1.13,.9),fract(seed*.97));
 vColor=vec4(col*meta.y,1.);vProps=vec4(mat==2.?.74:mat==6.?.07:.03,mat==3.?.55:0.,bone==9.?1.:0.,mat==2.?3.:0.);vShadow=uLight*vec4(p,1.);gl_Position=uVP*vec4(p,1.);
}`;
const SKY_VERT = `#version 300 es
precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,.9999,1.);}`;
const SKY_FRAG = `#version 300 es
precision highp float;in vec2 vUV;uniform float uTheta;out vec4 frag;
void main(){vec2 uv=vUV;vec3 c=mix(vec3(.48,.52,.50),vec3(.12,.20,.23),pow(clamp(uv.y,0.,1.),.9));float sun=exp(-length((uv-vec2(.78+sin(uTheta)*.35,.52))*vec2(1.4,1.))*3.4);c+=vec3(.27,.19,.07)*sun;float cloud=sin(uv.x*12.+sin(uv.y*24.)*.42)*sin(uv.y*19.);c+=max(0.,cloud)*.013;frag=vec4(c,1.);}`;
const BASE_COMPILE = ChuRenderer.prototype.compile;
ChuRenderer.prototype.compile = function (root) {
  // Focus the same shadow atlas on the inspection stage, rather than stretching it across the full battlefield.
  const focus = root.children[0]?.visible === false;
  if (this._lightFocus !== focus) {
    this._lightFocus = focus;
    const v = M4.id(),
      p = M4.id();
    if (focus) {
      M4.look(v, [-15, 21.5, 10], [0, 0, 0]);
      M4.ortho(p, -5, 5, -5.5, 5.5, 1, 60);
    } else {
      M4.look(v, [-30, 43, 20], [0, 0, 0]);
      M4.ortho(p, -25, 25, -27, 27, 1, 120);
    }
    M4.mul(this.light, p, v);
    this.shadowDirty = true;
  }

  // Only rebuild static environment when switching between the battlefield and inspection.
  let key = root.children[0]?.visible === false ? root.children[2]?.children[0] : root.children[0];
  if (this._staticKey !== key) {
    BASE_COMPILE.call(this, root);
    this._staticKey = key;
    this._baseParts = this.partCount;
  } else {
    this.root = root;
    this.update(root);
    this.shadowDirty = true;
  }
  if (!this.crowdProgram) {
    this.crowdProgram = this.shader(CROWD_VERT, FRAG);
    this.crowdDepth = this.shader(CROWD_VERT, DEPTH_FRAG);
    this.idleCrowd = this.shader(IDLE_CROWD_VERT, FRAG);
    this.idleCrowdDepth = this.shader(IDLE_CROWD_VERT, DEPTH_FRAG);
    this.skyProgram = this.shader(SKY_VERT, SKY_FRAG);
    this.skyVAO = this.gl.createVertexArray();
    this.crowdMeshes = new Map();
    this.gpuTemplates = new Map();
    this.armyPose = new Float32Array(160);
    this.armyAnim = new Float32Array(160);
    this.armyMeta = new Float32Array(160);
  }
  let armies = [];
  const scan = (n, visible) => {
    visible = visible && n.visible;
    if (n.crowd && visible) armies.push(n.crowd);
    for (const ch of n.children) scan(ch, visible);
  };
  scan(root, true);
  this.crowdArmies = armies.slice(0, 40);
  for (const b of this.crowdMeshes.values()) {
    this.gl.deleteBuffer(b.ibuf);
    if (b.viewBuffer) this.gl.deleteBuffer(b.viewBuffer);
    if (b.viewVaos) for (const vao of b.viewVaos.values()) this.gl.deleteVertexArray(vao.vao);
    for (const vao of b.vaos.values()) this.gl.deleteVertexArray(vao.vao);
  }
  this.crowdMeshes.clear();
  const groups = new Map();
  this.soldierCount = 0;
  this.unitCount = 0;
  armies.forEach((a, g) => {
    this.soldierCount += a.people;
    for (const t of a.troops) {
      const key = t.type === "flag" ? "flag-" + a.piece.s : t.type;
      if (!groups.has(key)) groups.set(key, []);
      groups
        .get(key)
        .push(
          t.x,
          t.y,
          t.z,
          t.scale,
          g,
          t.seed,
          t.yaw,
          a.piece.s === "r" ? 0 : 1,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          1,
          0,
          0,
        );
      this.unitCount++;
    }
  });
  for (const [key, arr] of groups) {
    let b = {
      key,
      type: key.startsWith("flag") ? "flag" : key,
      data: new Float32Array(arr),
      count: arr.length / 20,
      vaos: new Map(),
      ibuf: this.gl.createBuffer(),
    };
    b.groups = Array.from({ length: b.count }, (_, i) => b.data[i * 20 + 4] | 0);
    for (let i = 0; i < b.count; i++) {
      const k = i * 20,
        yaw = b.data[k + 6];
      b.data[k + 4] = Math.cos(yaw);
      b.data[k + 6] = Math.sin(yaw);
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b.ibuf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, b.data, this.gl.DYNAMIC_DRAW);
    this.crowdMeshes.set(key, b);
  }
  this.partCount = this._baseParts + this.unitCount;
  this.shadowDirty = true;
};
ChuRenderer.prototype.crowdVAO = function (batch, lod) {
  const gl = this.gl;
  gl.bindVertexArray(null);
  if (batch.vaos.has(lod)) return batch.vaos.get(lod);
  const key = batch.type + "-" + lod;
  let g = this.gpuTemplates.get(key);
  if (!g) {
    let data = template(batch.type, lod);
    g = { vb: gl.createBuffer(), ib: gl.createBuffer(), count: data.idx.length };
    gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
    gl.bufferData(gl.ARRAY_BUFFER, data.v, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.idx, gl.STATIC_DRAW);
    this.gpuTemplates.set(key, g);
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
  for (const [loc, n, off] of [
    [0, 3, 0],
    [1, 3, 12],
    [2, 2, 24],
    [3, 4, 32],
    [4, 4, 48],
  ]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 64, off);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, batch.ibuf);
  for (let loc = 5; loc < 10; loc++) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 80, (loc - 5) * 16);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
  const out = { vao, g };
  batch.vaos.set(lod, out);
  return out;
};
ChuRenderer.prototype.updateCrowds = function () {
  if (!this.crowdArmies) return;
  const poses = this.crowdArmies.map((a) => {
    const r = a.root;
    return [
      r.p[0],
      r.p[1],
      r.p[2],
      a.wheelAngle || 0,
      ...a.anim,
      r.s[0],
      r.tint === undefined ? 1 : r.tint,
      Math.cos(r.r[1]),
      Math.sin(r.r[1]),
    ];
  });
  for (const b of this.crowdMeshes.values()) {
    let changed = false;
    b.active = b.type === "flag";
    for (let i = 0; i < b.count; i++) {
      const k = i * 20,
        p = poses[b.groups[i]];
      if (!p) continue;
      if (Math.abs(p[4]) + Math.abs(p[6]) + Math.abs(p[7]) > 0.001 || p[5] < 0) b.active = true;
      for (let j = 0; j < 12; j++)
        if (Math.abs(b.data[k + 8 + j] - p[j]) > 1e-6) {
          b.data[k + 8 + j] = p[j];
          changed = true;
        }
    }
    if (changed) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b.ibuf);
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, b.data);
    }
  }
};
ChuRenderer.prototype.drawCrowds = function (cam, time, depth) {
  if (!this.crowdMeshes) return;
  const gl = this.gl,
    lod = cam.dist < 13 ? "high" : cam.dist < 19 ? "low" : "far";
  let previous = null;
  for (const b of this.crowdMeshes.values()) {
    let pr = b.active
      ? depth
        ? this.crowdDepth
        : this.crowdProgram
      : depth
        ? this.idleCrowdDepth
        : this.idleCrowd;
    if (pr !== previous) {
      this.bindProgram(pr, depth ? this.light : this.vp, cam, time);
      previous = pr;
    }
    let flag = b.type === "flag";
    flag ? gl.disable(gl.CULL_FACE) : gl.enable(gl.CULL_FACE);
    const item = this.crowdVAO(b, lod);
    gl.bindVertexArray(item.vao);
    gl.uniform1i(this.uni(pr, "uTextured"), flag ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flag ? this.textures.get(b.key) : null);
    gl.drawElementsInstanced(gl.TRIANGLES, item.g.count, gl.UNSIGNED_SHORT, 0, b.count);
    this.drawCalls++;
    this.triangles += (item.g.count / 3) * b.count;
  }
};
ChuRenderer.prototype.drawSky = function (cam) {
  if (!this.skyProgram) return;
  const gl = this.gl;
  gl.useProgram(this.skyProgram);
  gl.uniform1f(this.uni(this.skyProgram, "uTheta"), cam.theta || 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(this.skyVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.DEPTH_TEST);
  this.drawCalls++;
};
// Close-up culling and per-formation detail. Zooming onto one army must not turn
// all 1,018 people on the far side of the board into high-detail meshes.
ChuRenderer.prototype.updateCrowdView = function (cam) {
  this._closeCrowd = cam.dist < 19;
  if (!this._closeCrowd || !this.crowdArmies) return;
  const gl = this.gl,
    aspect = this.canvas.width / this.canvas.height,
    f = 1 / Math.tan(cam.fov / 2),
    levels = ["high", "low", "far"];
  const info = this.crowdArmies.map((a) => {
    const p = a.root.p,
      s = a.root.s[0],
      q = M4.point(this.vp, [p[0], p[1] + 0.45 * s, p[2]]),
      d = Math.hypot(p[0] - cam.eye[0], p[1] + 0.5 * s - cam.eye[1], p[2] - cam.eye[2]);
    const radius = 2.2 * s,
      w = Math.max(0.1, q[3]),
      mx = (radius * f) / aspect / w,
      my = (radius * f) / w;
    return {
      visible: q[3] > -radius && q[0] > -1 - mx && q[0] < 1 + mx && q[1] > -1 - my && q[1] < 1 + my,
      lod: d < 12 * s ? 0 : d < 20 * s ? 1 : 2,
    };
  });
  for (const b of this.crowdMeshes.values()) {
    if (!b.viewBuffer) {
      b.viewBuffer = gl.createBuffer();
      b.viewData = new Float32Array(b.count * 20 * 3);
      b.viewVaos = new Map();
      gl.bindBuffer(gl.ARRAY_BUFFER, b.viewBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, b.viewData.byteLength, gl.DYNAMIC_DRAW);
    }
    b.viewCounts = [0, 0, 0];
    for (let i = 0; i < b.count; i++) {
      const a = info[b.groups[i]];
      if (!a?.visible) continue;
      const k = (a.lod * b.count + b.viewCounts[a.lod]++) * 20;
      b.viewData.set(b.data.subarray(i * 20, i * 20 + 20), k);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, b.viewBuffer);
    for (let l = 0; l < 3; l++)
      if (b.viewCounts[l]) {
        const k = l * b.count * 20;
        gl.bufferSubData(gl.ARRAY_BUFFER, k * 4, b.viewData.subarray(k, k + b.viewCounts[l] * 20));
      }
  }
};
ChuRenderer.prototype.crowdViewVAO = function (b, lod, l) {
  if (b.viewVaos.has(lod)) return b.viewVaos.get(lod);
  const gl = this.gl,
    g = this.crowdVAO(b, lod).g,
    vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
  for (const [loc, n, off] of [
    [0, 3, 0],
    [1, 3, 12],
    [2, 2, 24],
    [3, 4, 32],
    [4, 4, 48],
  ]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 64, off);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, b.viewBuffer);
  for (let loc = 5; loc < 10; loc++) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 80, l * b.count * 80 + (loc - 5) * 16);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
  const out = { vao, g };
  b.viewVaos.set(lod, out);
  return out;
};
const DRAW_ALL_CROWDS = ChuRenderer.prototype.drawCrowds;
ChuRenderer.prototype.drawCrowds = function (cam, time, depth) {
  if (!this._closeCrowd) return DRAW_ALL_CROWDS.call(this, cam, time, depth);
  if (!this.crowdMeshes) return;
  const gl = this.gl,
    levels = ["high", "low", "far"];
  let previous = null;
  for (const b of this.crowdMeshes.values()) {
    if (!b.viewCounts?.some(Boolean)) continue;
    const pr = b.active
      ? depth
        ? this.crowdDepth
        : this.crowdProgram
      : depth
        ? this.idleCrowdDepth
        : this.idleCrowd;
    if (pr !== previous) {
      this.bindProgram(pr, depth ? this.light : this.vp, cam, time);
      previous = pr;
    }
    const flag = b.type === "flag";
    flag ? gl.disable(gl.CULL_FACE) : gl.enable(gl.CULL_FACE);
    gl.uniform1i(this.uni(pr, "uTextured"), flag ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flag ? this.textures.get(b.key) : null);
    for (let l = 0; l < 3; l++) {
      const n = b.viewCounts[l];
      if (!n) continue;
      const item = this.crowdViewVAO(b, levels[l], l);
      gl.bindVertexArray(item.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, item.g.count, gl.UNSIGNED_SHORT, 0, n);
      this.drawCalls++;
      this.triangles += (item.g.count / 3) * n;
    }
  }
};

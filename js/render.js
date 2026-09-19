/* ============================================================
   render.js — a small hand-written 3D renderer on a 2D canvas
   Perspective (or orthographic) projection + painter's depth sort.
   No external libraries: this file IS the graphics engine.
   ============================================================ */

const THEME = {
  bg: '#0b1017',
  ice: '#e9f3fb',
  iceEdge: '#c2d8e8',
  board: '#1d2836',
  mark: '#b9d2e4',
  markRed: '#e8b4bd',
  axis: '#9dbdd6',
  trace: '#2b6ea8',
  grid: 'rgba(0,0,0,0.05)',
};

const BONE_STYLE = {
  torso: { c: '#f2f6fb', w: 7 },
  head: { c: '#f2f6fb', w: 6 },
  armL: { c: '#63d2ff', w: 4.5 },
  armR: { c: '#4aa8e0', w: 4.5 },
  legL: { c: '#ffd166', w: 6 },
  legR: { c: '#f78c6b', w: 6 },
  bootL: { c: '#ffffff', w: 4 },
  bootR: { c: '#ffffff', w: 4 },
  bladeL: { c: '#8fe3ff', w: 2.5 },
  bladeR: { c: '#8fe3ff', w: 2.5 },
};

/* ------------------------------------------------------------
   Camera
   ------------------------------------------------------------ */
function makeCamera() {
  return {
    mode: 'overhead',
    fov: 50 * DEG,
    orbit: { az: -2.3, el: 0.55, dist: 34, target: [0, 0, 1] },
    followDist: 8, followHeight: 3.2,
    zoom: 1,
  };
}

function cameraFor(cam, skater, aspectH, aspectW) {
  const s = skater;
  switch (cam.mode) {
    case 'overhead': {
      // fit the whole sheet of ice, not just its width or its height
      const fit = Math.min((aspectW || aspectH) / (RINK.L + 4), aspectH / (RINK.W + 4));
      return { pos: [0, 0, 40], target: [0, 0, 0], up: [0, 1, 0], ortho: true, scale: fit * cam.zoom };
    }
    case 'judge': {
      // a judge sits at the boards and follows you with their eyes
      const tx = s ? s.x : 0, ty = s ? s.y : 0;
      return { pos: [tx * 0.45, -23, 6.5], target: [tx, ty * 0.5, 1.2], up: [0, 0, 1], ortho: false, fov: cam.fov / cam.zoom };
    }
    case 'front': {
      const tx = s ? s.x : 0, ty = s ? s.y : 0;
      return { pos: [-44, ty * 0.35, 7.5], target: [tx * 0.35, ty * 0.6, 1.2], up: [0, 0, 1], ortho: false, fov: cam.fov / cam.zoom };
    }
    case 'follow': {
      if (!s) return cameraFor(Object.assign({}, cam, { mode: 'judge' }), s, aspectH, aspectW);
      const bh = s.bodyH;
      const px = s.x - Math.cos(bh) * cam.followDist;
      const py = s.y - Math.sin(bh) * cam.followDist;
      return { pos: [px, py, cam.followHeight], target: [s.x, s.y, 1.0], up: [0, 0, 1], ortho: false, fov: cam.fov / cam.zoom };
    }
    case 'close': {
      if (!s) return cameraFor(Object.assign({}, cam, { mode: 'judge' }), s, aspectH, aspectW);
      const a = s.bodyH + Math.PI * 0.62;
      return {
        pos: [s.x + Math.cos(a) * 5.6, s.y + Math.sin(a) * 5.6, 1.85],
        target: [s.x, s.y, 1.05], up: [0, 0, 1], ortho: false, fov: (46 * DEG) / cam.zoom,
      };
    }
    case 'orbit':
    default: {
      const o = cam.orbit;
      const tg = o.follow && s ? [s.x, s.y, 1.0] : o.target;
      const d = o.dist / cam.zoom;
      return {
        pos: [tg[0] + Math.cos(o.az) * Math.cos(o.el) * d,
              tg[1] + Math.sin(o.az) * Math.cos(o.el) * d,
              tg[2] + Math.sin(o.el) * d],
        target: tg, up: [0, 0, 1], ortho: false, fov: cam.fov,
      };
    }
  }
}

/** build a projector function for a camera setup */
function makeProjector(c, w, h) {
  const fwd = V.norm(V.sub(c.target, c.pos));
  let upHint = c.up || [0, 0, 1];
  if (Math.abs(V.dot(fwd, V.norm(upHint))) > 0.999) upHint = [1, 0, 0];
  const right = V.norm(V.cross(fwd, upHint));
  const up = V.cross(right, fwd);
  const cx = w / 2, cy = h / 2;
  const f = c.ortho ? c.scale : (h / 2) / Math.tan((c.fov || 50 * DEG) / 2);

  const project = (p) => {
    const d = V.sub(p, c.pos);
    const vx = V.dot(d, right), vy = V.dot(d, up), vz = V.dot(d, fwd);
    if (c.ortho) return { x: cx + vx * f, y: cy - vy * f, z: vz, ok: true };
    if (vz < 0.05) return { x: 0, y: 0, z: vz, ok: false };
    return { x: cx + (vx * f) / vz, y: cy - (vy * f) / vz, z: vz, ok: true };
  };
  // Raw projection with no near-plane gate — for geometry that has already
  // been clipped. The gated `project` returns (0,0) for points behind the
  // near plane, which would drag clipped vertices to the canvas origin and
  // paint a wrong wedge across the screen.
  project.raw = (p) => {
    const d = V.sub(p, c.pos);
    const vx = V.dot(d, right), vy = V.dot(d, up), vz = V.dot(d, fwd);
    if (c.ortho) return { x: cx + vx * f, y: cy - vy * f, z: vz };
    const z = Math.max(vz, 1e-4);
    return {
      x: clamp(cx + (vx * f) / z, -1e6, 1e6),
      y: clamp(cy - (vy * f) / z, -1e6, 1e6),
      z: vz,
    };
  };
  project.cam = c;
  project.near = 0.05;
  return project;
}

/** clip a 3D segment against the near plane, then project both ends */
function projSeg(proj, a, b) {
  const c = proj.cam;
  if (c.ortho) return [proj(a), proj(b)];
  const fwd = V.norm(V.sub(c.target, c.pos));
  let da = V.dot(V.sub(a, c.pos), fwd) - proj.near;
  let db = V.dot(V.sub(b, c.pos), fwd) - proj.near;
  if (da < 0 && db < 0) return null;
  let A = a, B = b;
  if (da < 0) { const t = da / (da - db); A = V.lerp(a, b, t); }
  else if (db < 0) { const t = db / (db - da); B = V.lerp(b, a, t); }
  return [proj(A), proj(B)];
}

/**
 * Sutherland-Hodgman clip of a closed polygon against the camera's near plane.
 * Without this, vertices behind the camera are simply dropped and the polygon
 * collapses — which is what made the ice flash black in the low cameras.
 */
function clipPolyNear(proj, pts) {
  const c = proj.cam;
  if (c.ortho) return pts;
  const fwd = V.norm(V.sub(c.target, c.pos));
  const dist = (p) => V.dot(V.sub(p, c.pos), fwd) - proj.near;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const da = dist(a), db = dist(b);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) out.push(V.lerp(a, b, da / (da - db)));
  }
  return out;
}

/** fill a closed 3D polygon, clipped so it never collapses */
function fillPoly3(ctx, proj, pts, style) {
  const cl = clipPolyNear(proj, pts);
  if (cl.length < 3) return false;
  ctx.beginPath();
  for (let i = 0; i < cl.length; i++) {
    const p = proj.raw(cl[i]);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  if (style) { ctx.fillStyle = style; ctx.fill(); }
  return true;
}

/** stroke a closed 3D outline segment-by-segment (no spurious clip edge) */
function strokeOutline3(ctx, proj, pts) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const seg = projSeg(proj, pts[i], pts[(i + 1) % pts.length]);
    if (!seg || !seg[0].ok || !seg[1].ok) continue;
    ctx.moveTo(seg[0].x, seg[0].y); ctx.lineTo(seg[1].x, seg[1].y);
  }
  ctx.stroke();
}

function strokePath3(ctx, proj, pts, close) {
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    const p = proj(pts[i]);
    if (!p.ok) { started = false; continue; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  if (close && started) ctx.closePath();
}

/* ------------------------------------------------------------
   Rink
   ------------------------------------------------------------ */
let _rinkPts = null;
function rinkPts3() {
  if (!_rinkPts) _rinkPts = rinkOutline(14).map((p) => [p[0], p[1], 0]);
  return _rinkPts;
}

function circlePts(cx, cy, r, n = 40, z = 0.002) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return out;
}

function drawRink(ctx, proj, opts = {}) {
  const pts = rinkPts3();

  // ice surface — clipped so it can never collapse to background
  fillPoly3(ctx, proj, pts, THEME.ice);

  // reference lines choreographers actually use: long axis + short axis
  if (opts.axes !== false) {
    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = THEME.axis; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.75;
    strokePath3(ctx, proj, [[-RINK.L / 2, 0, 0.001], [RINK.L / 2, 0, 0.001]]); ctx.stroke();
    strokePath3(ctx, proj, [[0, -RINK.W / 2, 0.001], [0, RINK.W / 2, 0.001]]); ctx.stroke();
    ctx.restore();
  }

  // faint hockey markings (most rinks have them; useful landmarks)
  if (opts.markings !== false) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = THEME.markRed; ctx.lineWidth = 1.6;
    strokePath3(ctx, proj, circlePts(0, 0, 4.5)); ctx.stroke();
    ctx.strokeStyle = THEME.mark; ctx.lineWidth = 1.2;
    for (const sx of [-1, 1]) {
      strokePath3(ctx, proj, [[sx * 6.5, -RINK.W / 2 + 0.2, 0.001], [sx * 6.5, RINK.W / 2 - 0.2, 0.001]]); ctx.stroke();
      for (const sy of [-1, 1]) {
        strokePath3(ctx, proj, circlePts(sx * 20, sy * 6.7, 4.5)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // boards
  ctx.strokeStyle = THEME.board; ctx.lineWidth = 3;
  strokeOutline3(ctx, proj, pts);

  // low wall so the rink reads as 3D from ground-level cameras
  if (!proj.cam.ortho && opts.walls !== false) {
    ctx.save(); ctx.globalAlpha = 0.28; ctx.strokeStyle = '#7e93a8'; ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i += 2) {
      const s = projSeg(proj, pts[i], [pts[i][0], pts[i][1], 1.1]);
      if (!s) continue;
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke();
    }
    strokePath3(ctx, proj, pts.map((p) => [p[0], p[1], 1.1]), true);
    ctx.strokeStyle = '#5d738a'; ctx.globalAlpha = 0.5; ctx.stroke();
    ctx.restore();
  }
}

function drawHeatmap(ctx, proj, coverage) {
  if (!coverage) return;
  const { grid, nx, ny, cell } = coverage;
  let max = 0;
  for (let i = 0; i < grid.length; i++) max = Math.max(max, grid[i]);
  if (!max) return;
  ctx.save();
  for (let gx = 0; gx < nx; gx++) {
    for (let gy = 0; gy < ny; gy++) {
      const v = grid[gx * ny + gy];
      if (!v) continue;
      const x0 = -RINK.L / 2 + gx * cell, y0 = -RINK.W / 2 + gy * cell;
      const a = clamp(Math.sqrt(v / max), 0, 1);
      ctx.globalAlpha = a * 0.5;
      fillPoly3(ctx, proj, [
        [x0, y0, 0.003], [x0 + cell, y0, 0.003], [x0 + cell, y0 + cell, 0.003], [x0, y0 + cell, 0.003],
      ], `hsl(${210 - a * 170}, 85%, 55%)`);
    }
  }
  ctx.restore();
}

const CAT_COLOR = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.color]));

function drawTrace(ctx, proj, program, path, opts = {}) {
  const s = path.samples;
  if (!s.length) return;
  const upto = opts.upto !== undefined ? opts.upto : Infinity;
  const only = opts.only;   // when set, draw only this element index
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  const TRACE_BUDGET = 1400;
  const stride = Math.max(1, Math.floor(s.length / TRACE_BUDGET));

  // The step sequence has to cover half the ice, and the skater wants that to
  // be obvious: shade its footprint (its x-span, the full width) on the ice,
  // brighter while it is being skated, with the half-ice verdict written in.
  if (!opts.thin && !opts.noFootprint) {
    const seqSegs = path.segs.filter((sg) => sg.inst && sg.inst.chst);
    if (seqSegs.length) {
      const t0 = seqSegs[0].t0, t1 = seqSegs[seqSegs.length - 1].t1;
      let minX = 1e9, maxX = -1e9;
      for (const q of s) { if (q.t < t0 || q.t > t1) continue; if (q.x < minX) minX = q.x; if (q.x > maxX) maxX = q.x; }
      if (maxX > minX) {
        const live = upto >= t0 && upto <= t1;
        const hy = RINK.W / 2, pts = [[minX, -hy, 0.003], [maxX, -hy, 0.003], [maxX, hy, 0.003], [minX, hy, 0.003]];
        ctx.save(); ctx.globalAlpha = live ? 0.16 : 0.07;
        fillPoly3(ctx, proj, pts, CAT_COLOR.steps); ctx.restore();
        ctx.save(); ctx.globalAlpha = live ? 0.7 : 0.35; ctx.strokeStyle = CAT_COLOR.steps; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        strokePath3(ctx, proj, pts, true); ctx.setLineDash([]); ctx.restore();
        const frac = (maxX - minX) / RINK.L;
        const lp = proj([(minX + maxX) / 2, hy - 0.8, 0.01]);
        if (lp.ok) {
          ctx.save(); ctx.globalAlpha = live ? 0.95 : 0.55; ctx.fillStyle = CAT_COLOR.steps;
          ctx.font = `bold ${proj.cam.ortho ? Math.max(10, proj.cam.scale * 0.9) : 12}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(`STEP SEQUENCE \u00b7 ${Math.round(frac * 100)}% OF THE LENGTH ${frac >= 0.5 ? '\u2713 HALF ICE' : '\u2717 UNDER HALF'}`, lp.x, lp.y);
          ctx.restore();
        }
      }
    }
  }

  // draw each element's tracing in its category colour
  let i = 0;
  while (i < s.length) {
    const ei = s[i].ei;
    let j = i;
    while (j < s.length && s[j].ei === ei) j++;
    if (only !== undefined && only !== null && ei !== only) { i = j; continue; }
    const inst = ei >= 0 ? program.elements[ei] : null;
    const lib = inst ? LIB_BY_ID[inst.libId] : null;
    // a marked step sequence is drawn in the step-sequence colour with a wide
    // translucent halo underneath, so where it starts and ends is unmistakable
    const inSeq = !!(inst && inst.chst);
    const col = inSeq ? CAT_COLOR.steps : (lib ? (CAT_COLOR[lib.cat] || THEME.trace) : '#8aa');
    const done = s[i].t <= upto;
    if (inSeq && !opts.thin) {
      ctx.save();
      ctx.strokeStyle = CAT_COLOR.steps; ctx.globalAlpha = 0.18; ctx.lineWidth = 11;
      ctx.beginPath(); let st = false;
      for (let k = i; k < j; k += stride) { const p = proj([s[k].x, s[k].y, 0.004]); if (!p.ok) { st = false; continue; }
        if (!st) { ctx.moveTo(p.x, p.y); st = true; } else ctx.lineTo(p.x, p.y); }
      ctx.stroke(); ctx.restore();
    }
    ctx.strokeStyle = col;
    ctx.globalAlpha = opts.dim ? 0.28 : (done ? 0.95 : 0.45);
    ctx.lineWidth = (opts.thin ? 1.6 : 2.6) * (ei === opts.highlight ? 2.1 : 1);
    ctx.beginPath();
    let started = false;
    // The path is sampled at 50 Hz; at rink scale that is far below a pixel per
    // step, so project a decimated subset. Always keep the run's last sample and
    // break wherever any skipped sample was airborne.
    for (let k = i; k < j; k += stride) {
      const end = Math.min(j - 1, k + stride - 1);
      let air = false;
      for (let m = k; m <= end; m++) if (s[m].air) { air = true; break; }
      if (air) { started = false; continue; }
      const p = proj([s[k].x, s[k].y, 0.006]);
      if (!p.ok) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    if (started && !s[j - 1].air) {
      const pEnd = proj([s[j - 1].x, s[j - 1].y, 0.006]);
      if (pEnd.ok) ctx.lineTo(pEnd.x, pEnd.y);
    }
    ctx.stroke();

    // airborne portions as a dashed hop
    ctx.setLineDash([4, 4]); ctx.globalAlpha *= 0.7;
    ctx.beginPath(); started = false;
    for (let k = i; k < j; k++) {
      if (!s[k].air) { started = false; continue; }
      const p = proj([s[k].x, s[k].y, 0.006]);
      if (!p.ok) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    i = j;
  }

  // turn cusps — the classic pattern-sheet notation
  if (opts.cusps === false) { ctx.restore(); return; }
  ctx.globalAlpha = opts.dim ? 0.3 : 0.85;
  ctx.fillStyle = '#20364a';
  for (const c of path.cusps) {
    if (only !== undefined && only !== null && c.ei !== only) continue;
    const p = proj([c.x, c.y, 0.008]);
    if (!p.ok) continue;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** the comparison program's tracing, flat grey so it never competes */
function drawRefTrace(ctx, proj, path) {
  const s = path.samples;
  if (!s.length) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#7f93a8'; ctx.globalAlpha = 0.42; ctx.lineWidth = 1.8;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  let started = false;
  for (let k = 0; k < s.length; k++) {
    if (s[k].air) { started = false; continue; }
    const p = proj([s[k].x, s[k].y, 0.005]);
    if (!p.ok) { started = false; continue; }
    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------
   The skater
   ------------------------------------------------------------ */
function drawSkater(ctx, proj, world, opts = {}) {
  if (!world) return;
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const scale = opts.scale === undefined ? 1 : opts.scale;

  // shadow on the ice
  if (alpha > 0.5) {
    const c = world.pelvis;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * TAU;
      pts.push([c[0] + Math.cos(a) * 0.42, c[1] + Math.sin(a) * 0.30, 0.004]);
    }
    ctx.save(); ctx.globalAlpha = 0.16 * alpha;
    fillPoly3(ctx, proj, pts, '#08131c'); ctx.restore();
  }

  // depth-sorted bones
  const items = [];
  for (const [a, b, g] of BONES) {
    const pa = world[a], pb = world[b];
    const seg = projSeg(proj, pa, pb);
    if (!seg) continue;
    if (!seg[0].ok || !seg[1].ok) continue;
    items.push({ seg, g, z: (seg[0].z + seg[1].z) / 2 });
  }
  items.sort((p, q) => q.z - p.z);

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const refZ = items.length ? items[Math.floor(items.length / 2)].z : 20;
  for (const it of items) {
    const st = BONE_STYLE[it.g] || BONE_STYLE.torso;
    const col = opts.mono || st.c;
    const persp = proj.cam.ortho ? 1 : clamp(14 / Math.max(2, it.z), 0.35, 2.4);
    ctx.globalAlpha = alpha;
    // outline for readability against the ice
    ctx.strokeStyle = 'rgba(10,20,30,0.55)';
    ctx.lineWidth = (st.w + 2.6) * persp * scale;
    ctx.beginPath(); ctx.moveTo(it.seg[0].x, it.seg[0].y); ctx.lineTo(it.seg[1].x, it.seg[1].y); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = st.w * persp * scale;
    ctx.beginPath(); ctx.moveTo(it.seg[0].x, it.seg[0].y); ctx.lineTo(it.seg[1].x, it.seg[1].y); ctx.stroke();
  }

  // hands: jazz hands, fists and flat palms are drawn as small glyphs on the
  // hand joint, in screen space along the forearm so they read from any camera
  if (world._hand && alpha > 0.5) {
    for (const side of ['L', 'R']) {
      const shape = world._hand[side];
      if (!shape || shape === 'soft') continue;
      const seg = projSeg(proj, world['el' + side], world['ha' + side]);
      if (!seg || !seg[0].ok || !seg[1].ok) continue;
      const dx = seg[1].x - seg[0].x, dy = seg[1].y - seg[0].y, len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const pxm = len / 0.28;                       // pixels per metre at this hand
      const ux = dx / len, uy = dy / len;
      const st = BONE_STYLE[side === 'L' ? 'armL' : 'armR'] || BONE_STYLE.torso;
      const persp = proj.cam.ortho ? 1 : clamp(14 / Math.max(2, seg[1].z), 0.35, 2.4);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = opts.mono || st.c; ctx.fillStyle = opts.mono || st.c;
      ctx.lineWidth = Math.max(1, st.w * 0.45 * persp * scale);
      const hx = seg[1].x, hy = seg[1].y;
      if (shape === 'spread') {
        const fl = 0.09 * pxm;
        for (let f = -2; f <= 2; f++) {
          const a = Math.atan2(uy, ux) + f * 0.32;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * fl, hy + Math.sin(a) * fl); ctx.stroke();
        }
      } else if (shape === 'fist') {
        ctx.beginPath(); ctx.arc(hx, hy, Math.max(2, 0.05 * pxm), 0, TAU); ctx.fill();
      } else if (shape === 'flat') {
        const fl = 0.09 * pxm;
        ctx.lineWidth = Math.max(1.5, st.w * 0.7 * persp * scale);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + ux * fl, hy + uy * fl); ctx.stroke();
      }
    }
  }

  // head
  const hp = proj(world.head);
  if (hp.ok) {
    const persp = proj.cam.ortho ? proj.cam.scale * 0.115 : clamp((14 / Math.max(2, hp.z)) * 8.5, 3, 42);
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(hp.x, hp.y, persp, 0, TAU);
    ctx.fillStyle = opts.mono || '#f7fbff'; ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,30,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------
   Full frame
   ------------------------------------------------------------ */
/* The skater's heading reverses at every three-turn, mohawk and choctaw. A
   chase camera pinned straight to it whips 180 degrees in a single frame.
   Smoothing the resulting camera POSITION does not fix that - the camera then
   flies through the skater. Smooth the heading angle itself (shortest way
   round), let the shot be derived from the smoothed heading, and damp the
   position only to take the last of the edge off. */
const CAM_HEAD_TAU = 0.34;   // lazy: the camera swings round over ~a third of a second
const CAM_POS_TAU = 0.10;
const CHASE_MODES = { follow: 1, close: 1 };

function dampAngle(cur, target, dt, tau) {
  const d = ((target - cur + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return cur + d * (1 - Math.exp(-dt / tau));
}

/** a stand-in skater whose heading lags the real one, for the chase cameras */
function smoothedSkater(cam, s, dt) {
  if (!s || !CHASE_MODES[cam.mode]) { cam._bh = null; return s; }
  if (cam._bh === null || cam._bh === undefined || !(dt > 0)) { cam._bh = s.bodyH; return s; }
  cam._bh = dampAngle(cam._bh, s.bodyH, dt, CAM_HEAD_TAU);
  return Object.assign({}, s, { bodyH: cam._bh });
}

function smoothCamera(cam, csetup, dt) {
  const sm = cam._sm;
  // snap on a genuine change of shot, glide within one
  if (!sm || sm.mode !== cam.mode || !(dt > 0)) {
    cam._sm = { mode: cam.mode, pos: csetup.pos.slice(), target: csetup.target.slice() };
    return csetup;
  }
  const k = 1 - Math.exp(-dt / CAM_POS_TAU);
  for (let i = 0; i < 3; i++) {
    sm.pos[i] += (csetup.pos[i] - sm.pos[i]) * k;
    sm.target[i] += (csetup.target[i] - sm.target[i]) * k;
  }
  csetup.pos = sm.pos.slice();
  csetup.target = sm.target.slice();
  return csetup;
}

function renderFrame(ctx, W, H, state) {
  const { program, path, cam, time, opts } = state;
  const s = path.samples.length ? sampleAt(path, time) : null;
  const dt = state.dt || 0;
  const csetup = smoothCamera(cam, cameraFor(cam, smoothedSkater(cam, s, dt), H, W), dt);
  const proj = makeProjector(csetup, W, H);

  ctx.save();
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);

  drawRink(ctx, proj, { markings: opts.markings, axes: opts.axes, walls: opts.walls });
  if (opts.heatmap && state.analysis) drawHeatmap(ctx, proj, state.analysis.coverage);

  // comparison program, drawn underneath in grey
  if (state.refPath && state.refProgram && opts.reference) {
    drawRefTrace(ctx, proj, state.refPath);
    if (opts.refSkater) {
      const rw = poseAt(state.refProgram, state.refPath, time);
      drawSkater(ctx, proj, rw, { alpha: 0.3, mono: '#8fa4b8' });
    }
  }

  if (opts.trace !== 'none' && opts.trace !== false) {
    drawTrace(ctx, proj, program, path, {
      upto: time, highlight: opts.highlight, cusps: opts.cusps,
      only: opts.trace === 'current' ? (opts.highlight >= 0 ? opts.highlight : (s ? s.ei : -1)) : undefined,
    });
  }

  // motion ghosts
  if (opts.ghosts && path.totalTime) {
    for (let k = 6; k >= 1; k--) {
      const gt = time - k * 0.07;
      if (gt < 0) continue;
      const g = poseAt(program, path, gt);
      drawSkater(ctx, proj, g, { alpha: 0.055 * (7 - k) / 6 });
    }
  }

  const world = path.totalTime ? poseAt(program, path, time) : null;
  drawSkater(ctx, proj, world);

  // start/end markers
  if (path.segs.length) {
    const mark = (x, y, label, col) => {
      const p = proj([x, y, 0.01]);
      if (!p.ok) return;
      ctx.save();
      ctx.fillStyle = col; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0b1017'; ctx.font = 'bold 9px ui-sans-serif, system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, p.x, p.y + 0.5);
      ctx.restore();
    };
    const f = path.segs[0], l = path.segs[path.segs.length - 1];
    mark(f.x0, f.y0, 'S', '#7ef0a4');
    mark(l.x1, l.y1, 'E', '#f07e9e');
  }

  ctx.restore();
  return { proj, sample: s, world };
}

/* ------------------------------------------------------------
   Flat pattern diagram (for the mini-map and the PNG export)
   ------------------------------------------------------------ */
function drawPatternDiagram(ctx, W, H, program, path, opts = {}) {
  const pad = opts.pad === undefined ? 16 : opts.pad;
  const sc = Math.min((W - pad * 2) / RINK.L, (H - pad * 2) / RINK.W);
  const cx = W / 2, cy = H / 2;
  const P = (x, y) => ({ x: cx + x * sc, y: cy - y * sc });

  ctx.save();
  ctx.fillStyle = opts.bg || '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const out = rinkOutline(14).map((p) => P(p[0], p[1]));
  ctx.beginPath();
  out.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = opts.ice || '#f2f8fd'; ctx.fill();
  ctx.strokeStyle = '#31465c'; ctx.lineWidth = 2; ctx.stroke();

  ctx.save();
  ctx.setLineDash([5, 6]); ctx.strokeStyle = '#a9c2d6'; ctx.lineWidth = 1;
  ctx.beginPath();
  const a1 = P(-RINK.L / 2, 0), a2 = P(RINK.L / 2, 0);
  ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y);
  const b1 = P(0, -RINK.W / 2), b2 = P(0, RINK.W / 2);
  ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y);
  ctx.stroke(); ctx.restore();

  // tracing
  const s = path.samples;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  let i = 0;
  while (i < s.length) {
    const ei = s[i].ei;
    let j = i; while (j < s.length && s[j].ei === ei) j++;
    const inst = ei >= 0 ? program.elements[ei] : null;
    const lib = inst ? LIB_BY_ID[inst.libId] : null;
    ctx.strokeStyle = lib ? (CAT_COLOR[lib.cat] || '#36c') : '#9ab';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); let st = false;
    for (let k = i; k < j; k++) {
      if (s[k].air) { st = false; continue; }
      const p = P(s[k].x, s[k].y);
      if (!st) { ctx.moveTo(p.x, p.y); st = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    i = j;
  }

  // numbered element markers
  ctx.font = 'bold 10px ui-sans-serif, system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  path.segs.forEach((seg, n) => {
    const p = P(seg.x0, seg.y0);
    const inSeq = !!(seg.inst && seg.inst.chst);
    ctx.beginPath(); ctx.arc(p.x, p.y, 8.5, 0, TAU);
    ctx.fillStyle = inSeq ? CAT_COLOR.steps : (CAT_COLOR[seg.lib.cat] || '#36c'); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#10202c'; ctx.fillText(String(n + 1), p.x, p.y + 0.5);
  });

  // label the step sequence on the diagram: a bracket over its extent
  const seq = path.segs.filter((sg) => sg.inst && sg.inst.chst);
  if (seq.length) {
    const t0 = seq[0].t0, t1 = seq[seq.length - 1].t1;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const q of path.samples) { if (q.t < t0 || q.t > t1) continue;
      minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
    const a = P(minX, maxY), b = P(maxX, minY);
    ctx.save();
    ctx.strokeStyle = CAT_COLOR.steps; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
    ctx.strokeRect(Math.min(a.x, b.x) - 10, Math.min(a.y, b.y) - 10, Math.abs(b.x - a.x) + 20, Math.abs(b.y - a.y) + 20);
    ctx.setLineDash([]);
    ctx.fillStyle = CAT_COLOR.steps; ctx.font = 'bold 11px ui-sans-serif, system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(`STEP SEQUENCE  ${fmtTime(t0)}\u2013${fmtTime(t1)}  \u00b7  ${Math.round(((maxX - minX) / RINK.L) * 100)}% of the length`, Math.min(a.x, b.x) - 10, Math.min(a.y, b.y) - 14);
    ctx.restore();
  }

  if (opts.title) {
    ctx.fillStyle = '#1b2a38';
    ctx.font = 'bold 15px ui-sans-serif, system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(opts.title, pad, 6);
  }
  ctx.restore();
}

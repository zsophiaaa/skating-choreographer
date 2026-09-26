/* ============================================================
   engine.js — turns a list of elements into an actual skating path
   ------------------------------------------------------------
   The one rule that makes the whole thing work:

     leanSide  = (L+O) or (R+I)  ->  +1 (lean to body-LEFT)
                 (L+I) or (R+O)  ->  -1 (lean to body-RIGHT)
     curveSign = leanSide * (dir === 'F' ? +1 : -1)

   From that, three-turns and brackets stay on the same lobe,
   rockers/counters/choctaws change lobe, and mohawks stay —
   exactly as they do on real ice.
   ============================================================ */

const RINK = { L: 60, W: 30, R: 8.5 };   // metres: length, width, corner radius
const G = 9.81;

/** which side of the body the lean is on: +1 = body-left */
function leanSideOf(code) {
  const c = parseCode(code);
  if (c.foot === 'L') return c.edge === 'O' ? 1 : c.edge === 'I' ? -1 : 0;
  if (c.foot === 'R') return c.edge === 'I' ? 1 : c.edge === 'O' ? -1 : 0;
  return 0;
}

/** turn direction relative to travel: +1 = curving left (CCW in world) */
function curveSignOf(code) {
  const c = parseCode(code);
  return leanSideOf(code) * (c.dir === 'B' ? -1 : 1);
}

/* ------------------------------------------------------------
   Program model
   ------------------------------------------------------------ */
function newProgram(name = 'Untitled Program') {
  return {
    name,
    bpm: 100,
    offset: 0,             // seconds before beat 1 of the music
    level: 'prepre',
    start: { x: -20, y: 0, heading: 0 },
    autoSteer: true,       // curve away from the boards like a real skater does
    elements: [],
    hits: [],              // manually tapped musical accents, in seconds
    musicName: null,
    musicDuration: 0,
  };
}

function addElement(program, libId, opts = {}) {
  const lib = LIB_BY_ID[libId];
  if (!lib) return null;
  const inst = Object.assign({
    uid: uid(), libId,
    mirror: false,
    beats: lib.beats,
    radiusScale: 1,
    aim: 0,          // degrees of steering applied at the start of the element
    gapBefore: 0,    // beats of glide inserted before it
    note: '',
  }, opts);
  program.elements.push(inst);
  return inst;
}

/** resolved view of an instance: codes already mirrored */
function resolve(inst) {
  const lib = LIB_BY_ID[inst.libId];
  const m = inst.mirror;
  return {
    inst, lib,
    entry: m ? mirrorCode(lib.entry) : lib.entry,
    exit: m ? mirrorCode(lib.exit) : lib.exit,
    phases: lib.phases.map((p) => Object.assign({}, p, { code: m ? mirrorCode(p.code) : p.code })),
  };
}

/* ------------------------------------------------------------
   Path building
   ------------------------------------------------------------ */
const DT = 0.02; // 50 Hz path sampling

/** shortest signed angle difference */
function wrapPi(a) { return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; }

/**
 * Auto-steer: a real skater bends the lobe away from the boards rather
 * than skating into them. This applies a gentle heading correction
 * (max ~1.6 rad/s) whenever the look-ahead point would leave the ice.
 * Turn it off in the program settings to see the raw, unsteered lobes.
 */
function steerCorrection(x, y, h, v, dt) {
  const look = clamp(v * 1.1, 2.5, 7);
  const fx = x + Math.cos(h) * look, fy = y + Math.sin(h) * look;
  if (insideRink(fx, fy, 2.0)) return 0;
  const des = Math.atan2(-y, -x);
  const d = wrapPi(des - h);
  const maxTurn = 1.6 * dt;
  return clamp(d, -maxTurn, maxTurn);
}

/** revolutions a spin phase makes: the level's rate times the seconds spent spinning */
function spinRevs(program, ph, phaseSeconds) {
  const rate = (program && program.spinRate) || PLACE.spinRate;
  return Math.max(0.5, rate * phaseSeconds);
}

function buildPath(program) {
  const spb = 60 / (program.bpm || 100);          // seconds per beat
  // How fast this skater actually is, as a fraction of the library's nominal
  // travel. Beats are fixed by the music, so speed can only come out of
  // distance: a slower skater covers less ice and skates smaller lobes. Radii
  // scale with it so every turn keeps its shape rather than going flat.
  const ss = program.speedScale || 1;
  const samples = [];
  const segs = [];
  const cusps = [];
  let x = program.start.x, y = program.start.y, h = program.start.heading * DEG;
  let t = 0, beat = 0;

  const push = (s) => samples.push(s);

  for (let ei = 0; ei < program.elements.length; ei++) {
    const inst = program.elements[ei];
    const R = resolve(inst);
    if (!R.lib) continue;

    // optional gap: keep gliding straight on the previous exit edge
    if (inst.gapBefore > 0) {
      const gd = inst.gapBefore * spb;
      const gsteps = Math.max(1, Math.round(gd / DT));
      for (let i = 0; i < gsteps; i++) {
        x += Math.cos(h) * 4.0 * ss * DT; y += Math.sin(h) * 4.0 * ss * DT;
        push({ t: t + i * DT, beat: beat + (i * DT) / spb, x, y, z: 0, h, bodyH: h, lean: 0, spin: 0, ei: -1, u: 0, speed: 4 * ss, code: R.entry, both: false, air: false, corr: 0 });
      }
      t += gd; beat += inst.gapBefore;
    }

    h += (inst.aim || 0) * DEG;

    const dur = Math.max(0.05, inst.beats * spb);
    // distScale stretches or shrinks the element's travel (save format); clamped
    // so a typo cannot make a 2 m or a 60 m crossover run
    let dist = R.lib.dist * clamp(inst.distScale || 1, 0.5, 1.5) * ss;
    // A jump travels at the speed it was approached at (a little more for the
    // push-off), not at the library's elite distance: a learner's single flip
    // off a 3.5 m/s three-turn covers ~4 m, not 6. Skating into a jump slowly
    // therefore makes a small jump — which is true on the ice as well.
    if (R.lib.cat === 'jumps' && samples.length) {
      const approach = samples[samples.length - 1].speed * PLACE.jumpSpeedRatioMax * dur;
      dist = Math.min(dist, Math.max(dist * 0.4, approach));
    }
    const speed = dist / dur;
    const segStart = { t, beat, x, y, h };
    let phaseT = 0;
    let spinAcc = 0;
    let travelled = 0;
    // a stop decelerates: its line phase ramps from the speed it was entered at
    // down to near-still, so the last samples of a T-stop or hockey stop barely
    // move and the element after it starts from (almost) nothing
    const entrySpeed = samples.length ? samples[samples.length - 1].speed : speed;

    for (const ph of R.phases) {
      const pDur = dur * ph.f;
      const stopping = ph.k === 'line' && R.lib.cat === 'stops';
      const pDist = (ph.k === 'spin' ? (ph.travel || 1) : ph.k === 'hold' ? 0 : stopping ? Math.min(dist * ph.f, entrySpeed * pDur * 0.525) : dist * ph.f);
      const steps = Math.max(1, Math.round(pDur / DT));
      const sign = curveSignOf(ph.code);
      const lside = leanSideOf(ph.code);
      const r = (ph.r || 10) * (inst.radiusScale || 1) * ss;
      const v = pDist / Math.max(0.05, pDur);
      const cp = parseCode(ph.code);
      const startH = h;
      // decelerating profile: speed(f) = v0 (1 - 0.95 f), which covers pDist
      // over the phase when v0 = pDist / (0.525 pDur)
      const v0 = stopping ? pDist / (0.525 * Math.max(0.05, pDur)) : v;

      for (let i = 0; i < steps; i++) {
        const f = i / steps;
        const vi = stopping ? v0 * (1 - 0.95 * f) : v;
        const ds = stopping ? vi * (pDur / steps) : pDist / steps;
        let z = 0, extraSpin = 0, air = false, corr = 0;

        if (ph.k === 'arc') {
          h += (ds / r) * sign;
          if (program.autoSteer !== false) { corr = steerCorrection(x, y, h, v, pDur / steps); h += corr; }
          x += Math.cos(h) * ds; y += Math.sin(h) * ds;
        } else if (ph.k === 'line') {
          if (program.autoSteer !== false) { corr = steerCorrection(x, y, h, vi, pDur / steps); h += corr; }
          x += Math.cos(h) * ds; y += Math.sin(h) * ds;
        } else if (ph.k === 'spin') {
          x += Math.cos(h) * ds; y += Math.sin(h) * ds;
          // revolutions follow the time spent spinning at the level's rate, not
          // the library's elite count: 6 beats of scratch spin is ~5 revs here
          extraSpin = spinRevs(program, ph, pDur) * TAU * f * (sign || 1);
        } else if (ph.k === 'air') {
          x += Math.cos(h) * ds; y += Math.sin(h) * ds;
          const hgt = ph.height || 0.4;
          z = 4 * hgt * f * (1 - f);
          extraSpin = (ph.rev || 0) * TAU * f * (sign || 1);
          air = true;
        } // 'hold' = nothing moves

        // real edge lean from speed and lobe radius, capped at a plausible max
        const lean = (ph.k === 'arc')
          ? -clamp(Math.atan((v * v) / (G * r)), 0, 0.62) * lside
          : (ph.k === 'spin' ? -0.05 * lside : 0);

        const bodyH = h + (cp.dir === 'B' ? Math.PI : 0) + spinAcc + extraSpin;
        const tt = t + phaseT + f * pDur;
        travelled += ds;
        push({
          t: tt, beat: beat + (phaseT + f * pDur) / spb,
          x, y, z, h, bodyH, lean, spin: spinAcc + extraSpin,
          ei, u: (phaseT + f * pDur) / dur,
          speed: vi, code: ph.code, both: !!ph.both, air,
          foot: cp.foot, dir: cp.dir, edge: cp.edge,
          corr: corr / DEG,   // emergency steering applied in this sample, degrees
        });
      }

      if (ph.k === 'spin') spinAcc += spinRevs(program, ph, pDur) * TAU * (sign || 1);
      else if (ph.k === 'air') spinAcc += (ph.rev || 0) * TAU * (sign || 1);
      phaseT += pDur;

      // mark a cusp wherever the direction of travel flips (a turn happened)
      const nextIdx = R.phases.indexOf(ph) + 1;
      if (nextIdx < R.phases.length) {
        const nc = parseCode(R.phases[nextIdx].code);
        if (nc.dir !== cp.dir) cusps.push({ x, y, h: startH, ei, kind: R.lib.cat, name: R.lib.name });
      }
    }

    t += dur; beat += inst.beats;
    // a stop's real travel is set by its entry speed, not the library distance
    const segDist = R.lib.cat === 'stops' ? travelled : dist;
    segs.push({
      ei, inst, lib: R.lib, entry: R.entry, exit: R.exit,
      t0: segStart.t, t1: t, beat0: segStart.beat, beat1: beat,
      x0: segStart.x, y0: segStart.y, x1: x, y1: y,
      dist: segDist, speed: segDist / dur, dur,
    });
  }

  return { samples, segs, cusps, totalTime: t, totalBeats: beat, spb };
}

/** interpolate a path sample at time t (seconds) */
function sampleAt(path, t) {
  const s = path.samples;
  if (!s.length) return null;
  if (t <= s[0].t) return s[0];
  if (t >= s[s.length - 1].t) return s[s.length - 1];
  // samples are uniform-ish in time; binary search is safest
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = s[lo], b = s[hi];
  const f = clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
  // never interpolate heading across a wrap
  const dh = ((b.h - a.h + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const dbh = ((b.bodyH - a.bodyH + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return {
    t, beat: lerp(a.beat, b.beat, f),
    x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f),
    h: a.h + dh * f, bodyH: a.bodyH + dbh * f,
    lean: lerp(a.lean, b.lean, f), spin: lerp(a.spin, b.spin, f),
    // u is the progress THROUGH element a. Across an element boundary b.u
    // belongs to the next element and restarts near 0, so lerping drags u
    // backwards while ei still says a — leave it on a's own progress.
    ei: a.ei, u: a.ei === b.ei ? lerp(a.u, b.u, f) : a.u, speed: lerp(a.speed, b.speed, f),
    code: a.code, both: a.both, air: a.air, foot: a.foot, dir: a.dir, edge: a.edge,
  };
}

/** the full body pose (world space) at time t */
/** how long to blend one element's pose track into the next, in seconds */
const POSE_FADE = 0.18;
const ARM_FADE = 0.45;   // arms cross-fade longer than the body at a seam: a move, not a snap
/** how long a step from one foot to the other takes to read, in seconds */
const FOOT_FADE = 0.16;

/**
 * Poses are authored for the left foot and mirrored when skating on the right,
 * so the instant the skating foot changes the whole body mirrors in one frame.
 * That is a ~2 m teleport, and it happens at every mohawk, choctaw, step-over
 * and spin entry. Cache when the foot actually changes so the step can be
 * blended through instead of snapped.
 */
function footChanges(path) {
  if (path._footChanges) return path._footChanges;
  const out = [];
  const sm = path.samples;
  for (let i = 1; i < sm.length; i++) if (sm[i].foot !== sm[i - 1].foot) out.push(sm[i].t);
  path._footChanges = out;
  return out;
}

/** signed seconds to the nearest foot change, or null if none is close */
function nearestFootChange(path, t, window) {
  const fc = footChanges(path);
  if (!fc.length) return null;
  let lo = 0, hi = fc.length - 1, best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const d = fc[mid] - t;
    if (best === null || Math.abs(d) < Math.abs(best)) best = d;
    if (d < 0) lo = mid + 1; else hi = mid - 1;
  }
  return best !== null && Math.abs(best) < window ? best : null;
}

function poseAt(program, path, t) {
  const s = sampleAt(path, t);
  if (!s) return null;
  const inst = s.ei >= 0 ? program.elements[s.ei] : null;
  const lib = inst ? LIB_BY_ID[inst.libId] : null;
  const mirrored = inst ? !!inst.mirror : false;

  // poses are authored with the LEFT foot skating; mirror when on the right
  const skateFootRight = s.foot === 'R';
  const mir = mirrored ? !skateFootRight : skateFootRight;

  // Compose the complete local pose for one element — body track plus whatever
  // the arms are doing. Arms MUST be folded in here rather than at the end:
  // an arm track restarts at u=0 like any other, so applying it after the
  // blends below would snap the hands at every seam and every change of foot.
  const compose = (li, ins, u, m) => {
    let q = li ? samplePoseTrack(li.poses, u, m) : getPose('glide', m);
    const track = (ins && ins.arms) || (li && li.arms) || null;
    // the element's real duration paces the arm track (no snaps, no fast phrases)
    const dur = ins ? (ins.beats || (li && li.beats) || 4) * 60 / (program.bpm || 120) : 2;
    if (track) return applyArms(q, sampleArmTrack(track, u, m, dur, li && li.cat === 'jumps'));
    return armBreath(q, s.beat, li ? (ARM_BREATH[li.cat] || 0) : 0);
  };

  // A change of skating foot mirrors the pose. The body eases through it over
  // FOOT_FADE; the arms — which swap sides, so an asymmetric shape would jump
  // a metre — get a longer cross-fade (ARM_FADE), computed from the unblended
  // pose so the mix is exactly half-and-half at the change (continuous). A
  // change that falls ON a seam is left to the seam cross-fade below.
  const armFootW = (tq, sg) => {
    let d = nearestFootChange(path, tq, ARM_FADE);
    if (d === null) return 0;
    if (sg) { const tc = tq + d; if (Math.abs(tc - sg.t0) < 0.03 || Math.abs(tc - sg.t1) < 0.03) return 0; }   // d = change − now
    return 0.5 * (1 - Math.abs(d) / ARM_FADE);
  };
  // compose an element at (u, tq) with its arm foot-fade folded in, so a
  // neighbour composed at the shared boundary is the same thing on both sides
  const composeAt = (li, ins, u, m, tq, sg) => {
    const raw = compose(li, ins, u, m);
    const w = armFootW(tq, sg);
    if (!w) return raw;
    const other = compose(li, ins, u, !m), out = Object.assign({}, raw);
    for (const j of ARM_JOINTS) out[j] = V.lerp(raw[j], other[j], w);
    return out;
  };

  const segNow = s.ei >= 0 ? path.segs[s.ei] : null;
  const rawLocal = composeAt(lib, inst, s.u, mir, t, segNow);
  let local = rawLocal;

  // ease the change of foot rather than mirroring the body in a single frame
  const dFoot = nearestFootChange(path, t, FOOT_FADE);
  if (dFoot !== null) {
    local = poseBlend(local, compose(lib, inst, s.u, !mir), 0.5 * (1 - Math.abs(dFoot) / FOOT_FADE));
    for (const j of ARM_JOINTS) local[j] = rawLocal[j].slice();   // arms already handled above
  }

  const seg = s.ei >= 0 ? path.segs[s.ei] : null;
  const glideOf = (m) => armBreath(getPose('glide', m), s.beat, ARM_BREATH.edges);
  if (seg && lib) {
    // A glide gap in front of an element is its own (unposed) neighbour: blend
    // toward the glide, not toward the element on the far side of the gap —
    // otherwise the hands snap at the gap's end.
    const neighbour = (ei, u) => {
      const ni = program.elements[ei];
      const nl = ni ? LIB_BY_ID[ni.libId] : null;
      if (!nl) return null;
      // the neighbour on ITS foot at the shared boundary (a chassé can end on
      // the other foot from the element after it)
      const ns = path.segs[ei], tq = u >= 1 ? ns.t1 - 0.005 : ns.t0 + 0.005, probe = sampleAt(path, tq);
      const nRight = probe ? probe.foot === 'R' : skateFootRight;
      return composeAt(nl, ni, u, ni.mirror ? !nRight : nRight, tq, ns);
    };
    const inFade = t - seg.t0, outFade = seg.t1 - t;
    // the arms get a longer cross-fade than the body at every seam, so a
    // change of shape between two elements is a move, not a snap
    const armSeam = (other, w) => { for (const j of ARM_JOINTS) local[j] = V.lerp(rawLocal[j], other[j], w); };
    if (inFade < ARM_FADE && s.ei > 0) {
      const prev = (inst.gapBefore || 0) > 0 ? glideOf(mir) : neighbour(s.ei - 1, 1);
      if (prev) { if (inFade < POSE_FADE) local = poseBlend(local, prev, 0.5 * (1 - inFade / POSE_FADE)); armSeam(prev, 0.5 * (1 - inFade / ARM_FADE)); }
    } else if (outFade < ARM_FADE && s.ei + 1 < program.elements.length) {
      const ni = program.elements[s.ei + 1];
      const next = (ni.gapBefore || 0) > 0 ? glideOf(mir) : neighbour(s.ei + 1, 0);
      if (next) { if (outFade < POSE_FADE) local = poseBlend(local, next, 0.5 * (1 - outFade / POSE_FADE)); armSeam(next, 0.5 * (1 - outFade / ARM_FADE)); }
    }
  } else if (!seg) {
    // in a glide gap: ease out of the element before it and into the one after
    let prev = null, next = null;
    for (const sg of path.segs) { if (sg.t1 <= t + 1e-9) prev = sg; else if (sg.t0 >= t - 1e-9 && !next) next = sg; }
    const edge = (sg, u) => compose(sg.lib, sg.inst, u, sg.inst.mirror ? !skateFootRight : skateFootRight);
    if (prev && t - prev.t1 < POSE_FADE) local = poseBlend(local, edge(prev, 1), 0.5 * (1 - (t - prev.t1) / POSE_FADE));
    else if (next && next.t0 - t < POSE_FADE) local = poseBlend(local, edge(next, 0), 0.5 * (1 - (next.t0 - t) / POSE_FADE));
  }

  const world = {};
  for (const j of JOINTS) {
    let p = local[j];
    p = roll(p, s.lean);
    p = yaw(p, s.bodyH);
    world[j] = [p[0] + s.x, p[1] + s.y, p[2] + s.z];
  }
  world._meta = local._meta;
  world._hand = local._hand || null;
  world._local = local;
  world._sample = s;
  return world;
}

/* ------------------------------------------------------------
   Rink geometry
   ------------------------------------------------------------ */
function rinkOutline(steps = 16) {
  const { L, W, R } = RINK;
  const hx = L / 2, hy = W / 2;
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }
  };
  pts.push([-hx + R, -hy]);
  pts.push([hx - R, -hy]);
  corner(hx - R, -hy + R, -Math.PI / 2);
  pts.push([hx, hy - R]);
  corner(hx - R, hy - R, 0);
  pts.push([-hx + R, hy]);
  corner(-hx + R, hy - R, Math.PI / 2);
  pts.push([-hx, -hy + R]);
  corner(-hx + R, -hy + R, Math.PI);
  return pts;
}

function insideRink(x, y, margin = 0) {
  const { L, W, R } = RINK;
  const hx = L / 2 - margin, hy = W / 2 - margin;
  if (Math.abs(x) > hx || Math.abs(y) > hy) return false;
  const cx = hx - R, cy = hy - R;
  if (Math.abs(x) > cx && Math.abs(y) > cy) {
    return Math.hypot(Math.abs(x) - cx, Math.abs(y) - cy) <= R;
  }
  return true;
}

/* ------------------------------------------------------------
   ANALYSIS  — the "is this actually skatable / good?" pass
   ------------------------------------------------------------ */

/**
 * A jump combination is consecutive jump elements with nothing between them —
 * not even a glide. A jump with `gapBefore` after another jump is a second
 * jump element, judged (and counted) on its own. True when segs[i] continues
 * the combination started by segs[i-1].
 */
function comboContinues(segs, i) {
  const s = segs[i], p = i > 0 ? segs[i - 1] : null;
  return !!(s && p && s.lib.cat === 'jumps' && p.lib.cat === 'jumps' && !((s.inst && s.inst.gapBefore) > 0));
}
/** the first jump of a jump element (a solo jump, or the first of a combination) */
function isJumpStart(segs, i) { return segs[i].lib.cat === 'jumps' && !comboContinues(segs, i); }

/** distance from the boards (metres, positive inside), rounded corners included */
function boardsDistance(x, y) {
  const { L, W, R } = RINK;
  const hx = L / 2, hy = W / 2, ax = Math.abs(x), ay = Math.abs(y);
  const cx = hx - R, cy = hy - R;
  if (ax > cx && ay > cy) return R - Math.hypot(ax - cx, ay - cy);
  return Math.min(hx - ax, hy - ay);
}

/** Suggest a connecting step between two codes that don't match. */
function suggestConnector(fromCode, toCode) {
  const a = parseCode(fromCode), b = parseCode(toCode);
  if (a.foot === b.foot && a.dir === b.dir && a.edge !== b.edge) return 'change of edge';
  if (a.foot !== b.foot && a.dir === b.dir) return 'a step-over onto the other foot';
  if (a.foot === b.foot && a.dir !== b.dir) return a.edge === b.edge ? 'a rocker or counter' : 'a three turn or bracket';
  if (a.foot !== b.foot && a.dir !== b.dir) return a.edge === b.edge ? 'a mohawk' : 'a choctaw';
  return 'a connecting step';
}

function analyze(program, path) {
  const out = { continuity: [], coverage: null, rotation: null, effort: [], speed: [], bounds: [], summary: {} };

  // --- edge continuity between consecutive elements ---
  // Declared codes first; then the edge the element actually SKATES last
  // (its final one-footed phase, mirrored like the instance) must also be the
  // next entry — a library element whose phases end on the wrong edge would
  // otherwise pass the seam and send a Lutz off an inside edge.
  const skatedExit = (seg) => {
    const ph = (seg.lib.phases || []).filter((q) => q.code && !q.both);
    if (!ph.length) return seg.exit;
    const code = ph[ph.length - 1].code;
    return seg.inst && seg.inst.mirror ? mirrorCode(code) : code;
  };
  for (let i = 0; i < path.segs.length - 1; i++) {
    const a = path.segs[i], b = path.segs[i + 1];
    const skated = skatedExit(a);
    if (a.exit !== b.entry || skated !== b.entry) {
      out.continuity.push({
        index: i,
        from: a.lib.name, fromCode: a.exit !== b.entry ? a.exit : skated + ' (skated)',
        to: b.lib.name, toCode: b.entry,
        fix: suggestConnector(a.exit !== b.entry ? a.exit : skated, b.entry),
      });
    }
  }

  // --- ice coverage on a 2 m grid ---
  const CELL = 2;
  const nx = Math.ceil(RINK.L / CELL), ny = Math.ceil(RINK.W / CELL);
  const grid = new Float32Array(nx * ny);
  let used = 0, valid = 0;
  for (let gx = 0; gx < nx; gx++) {
    for (let gy = 0; gy < ny; gy++) {
      const cx = -RINK.L / 2 + (gx + 0.5) * CELL, cy = -RINK.W / 2 + (gy + 0.5) * CELL;
      if (insideRink(cx, cy, 0.5)) valid++;
    }
  }
  for (const s of path.samples) {
    const gx = clamp(Math.floor((s.x + RINK.L / 2) / CELL), 0, nx - 1);
    const gy = clamp(Math.floor((s.y + RINK.W / 2) / CELL), 0, ny - 1);
    if (grid[gx * ny + gy] === 0) used++;
    grid[gx * ny + gy] += 1;
  }
  out.coverage = { grid, nx, ny, cell: CELL, pct: valid ? (used / valid) * 100 : 0 };

  // --- rotation balance (CCW vs CW) ---
  let ccw = 0, cw = 0;
  for (let i = 1; i < path.samples.length; i++) {
    let d = path.samples[i].h - path.samples[i - 1].h;
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    if (d > 0) ccw += d; else cw += -d;
  }
  const tot = ccw + cw || 1;
  out.rotation = { ccw: (ccw / tot) * 100, cw: (cw / tot) * 100 };

  // --- effort / stamina curve + speed sanity + out-of-bounds ---
  for (const seg of path.segs) {
    out.effort.push({ t0: seg.t0, t1: seg.t1, cost: seg.lib.cost, name: seg.lib.name });
    if (seg.dist > 0 && seg.speed > 11) {
      out.speed.push({ name: seg.lib.name, speed: seg.speed, index: seg.ei,
        msg: `needs ${seg.speed.toFixed(1)} m/s — give it more beats or less distance` });
    }
    if (seg.dist > 0 && seg.speed < 1.2 && seg.lib.cat !== 'spins' && seg.lib.cat !== 'stops') {
      out.speed.push({ name: seg.lib.name, speed: seg.speed, index: seg.ei,
        msg: `only ${seg.speed.toFixed(1)} m/s — you will lose flow here` });
    }
  }
  for (const s of path.samples) {
    if (!insideRink(s.x, s.y, 0.6)) { out.bounds.push({ t: s.t, x: s.x, y: s.y, ei: s.ei }); }
  }

  // --- rolling fatigue estimate ---
  const fatigue = [];
  let acc = 0;
  for (const seg of path.segs) {
    acc += seg.lib.cost * (seg.dur / 4);
    acc *= 0.97;
    fatigue.push({ t: seg.t1, v: acc });
  }
  out.fatigue = fatigue;

  // --- element counts for the rules check ---
  const counts = {};
  for (const seg of path.segs) counts[seg.lib.cat] = (counts[seg.lib.cat] || 0) + 1;

  // a jump combination is consecutive jumps with nothing in between — one jump ELEMENT
  let jumpElements = 0;
  for (let i = 0; i < path.segs.length; i++) if (isJumpStart(path.segs, i)) jumpElements++;
  out.summary = {
    elements: path.segs.length,
    time: path.totalTime,
    counts,
    jumps: jumpElements,
    jumpPasses: path.segs.filter((s) => s.lib.cat === 'jumps').length,
    spins: path.segs.filter((s) => s.lib.cat === 'spins').length,
    steps: path.segs.filter((s) => s.lib.cat === 'steps').length,
    maxDiff: path.segs.reduce((m, s) => Math.max(m, s.lib.diff), 0),
  };
  return out;
}

/* ------------------------------------------------------------
   Level rules (EDITABLE — verify against the current USFS rulebook)
   ------------------------------------------------------------ */
const LEVELS = {
  prepre: {
    name: 'Pre-Preliminary',
    time: [95, 110],
    maxJumpElements: 4, maxSpins: 2, maxStepSeq: 1,
    maxJumpDiff: 4,
    rules: { chstDifficultMin: 0, chstFamiliesMin: 0, source: 'general Pre-Preliminary conventions — encode the current sheet before relying on this (level-rules)' },
    note: 'Singles only; no jump repeated more than twice; combos count as one jump element. The step sequence is not levelled: threes, mohawks and edges are fine.',
  },
  prelim: {
    name: 'Preliminary',
    time: [100, 120], maxJumpElements: 5, maxSpins: 2, maxStepSeq: 1, maxJumpDiff: 4,
    note: 'Singles including Axel; one jump combination allowed.',
  },
  prejuv: {
    name: 'Pre-Juvenile',
    time: [110, 130], maxJumpElements: 5, maxSpins: 2, maxStepSeq: 1, maxJumpDiff: 5,
    note: 'Doubles permitted; combination spin expected.',
  },
  aspire4: {
    name: 'Aspire 4 Free Skate',
    time: [0, 100],
    maxJumpElements: 5, maxSpins: 2, maxStepSeq: 1,
    maxJumpDiff: 4,
    // Level-specific rules, every field optional — see the level-rules skill.
    // Encoded from the rubric named in `source`; re-read the rubric, do not
    // trust memory, when a level matters.
    rules: {
      source: 'USFS Aspire Program Requirements 2025 (PDF), read 2026-09',
      chstDifficultMin: 5, chstFamiliesMin: 2,   // a quality floor for the ChSt (it carries no level); see level-rules
      maxSameJump: 2,
      maxCombos: 2,
      maxJumpsPerCombo: 2,
      comboMayHaveThree: 1,
      noFlyingSpins: true,
      spinMinRev: 3,
      requiredSpin: 'spin-camel-sit',
      requiredSpinName: 'forward camel to forward sit spin combination',
      secondSpinOnePosition: true,
      permittedJumps: ['waltz', 'half-flip', 'half-lutz', 'salchow', 'toe-loop',
                       'half-loop', 'loop-jump', 'flip', 'lutz'],
      stepSeqIsChSt: true,
    },
    note: '1:40 max. Max 5 jump elements, max 2 of any same jump, max 2 combinations (two jumps each; one may have three). Max 2 spins — one must be the camel→sit combination, the other a single-position spin. No flying entries, min 3 revolutions. Max 1 choreographic step sequence over half the ice.',
  },
  open: {
    name: 'Open / No limits',
    time: [0, 100000], maxJumpElements: 99, maxSpins: 99, maxStepSeq: 99, maxJumpDiff: 5,
    note: 'No checking — build whatever you like.',
  },
};

function checkRules(program, path, analysis) {
  const L = LEVELS[program.level] || LEVELS.open;
  const issues = [];
  const t = path.totalTime;
  if (t < L.time[0]) issues.push({ lvl: 'warn', msg: `Program is ${fmtTime(t)} — ${L.name} wants ${L.time[0]}–${L.time[1]}s.` });
  if (t > L.time[1]) issues.push({ lvl: 'err', msg: `Program is ${fmtTime(t)} — over the ${L.time[1]}s limit for ${L.name}.` });
  if (analysis.summary.jumps > L.maxJumpElements) issues.push({ lvl: 'err', msg: `${analysis.summary.jumps} jump elements — max is ${L.maxJumpElements}.` });
  if (analysis.summary.spins > L.maxSpins) issues.push({ lvl: 'err', msg: `${analysis.summary.spins} spins — max is ${L.maxSpins}.` });
  if (analysis.summary.steps > L.maxStepSeq) issues.push({ lvl: 'warn', msg: `${analysis.summary.steps} step sequences — usually only ${L.maxStepSeq} is counted.` });
  const tooHard = path.segs.filter((s) => s.lib.cat === 'jumps' && s.lib.diff > L.maxJumpDiff);
  if (tooHard.length) issues.push({ lvl: 'warn', msg: `Above level: ${[...new Set(tooHard.map((s) => s.lib.name))].join(', ')}.` });
  if (!path.segs.some((s) => s.lib.id === 'pose-open')) issues.push({ lvl: 'info', msg: 'No opening pose — the first four counts are free impression points.' });
  if (!path.segs.some((s) => s.lib.id === 'pose-final')) issues.push({ lvl: 'info', msg: 'No final pose — land the last note.' });
  if (L.rules || L.aspire) checkLevelRules(L, path, issues);
  checkPlacement(program, path, issues, analysis);
  return { level: L, issues };
}

/**
 * The ISU counts only six turn families as "difficult turns". Three turns and
 * mohawks are good connecting material but count for nothing, which is the most
 * useful single fact when building a sequence. See docs/CHOREOGRAPHY.md.
 */
const DIFFICULT_TURNS = ['twizzle', 'bracket', 'loop-turn', 'counter', 'rocker', 'choctaw'];

function turnFamily(libId) {
  return DIFFICULT_TURNS.find((f) => libId === f || libId.startsWith(f + '-')) || null;
}

/** notional level from a count of difficult turns (a ChSt carries no level) */
function stepSequenceLevel(n) {
  return n >= 11 ? 4 : n >= 9 ? 3 : n >= 7 ? 2 : n >= 5 ? 1 : 0;
}

/**
 * Audit the marked step sequence: how many difficult turns, from how many
 * families, on how many feet, and whether both rotational directions appear.
 * Returns null when nothing is marked.
 */
/**
 * An arm track counts as AUTHORED when it actually moves: two or more
 * keyframes, or a phrase. A single held shape is a pose, not arm choreography.
 * `distinctArmShapes` counts only names that exist in ARM_POSES — a typo in a
 * pose name falls back to second position and must not count as a shape.
 */
function armsAuthored(track) {
  if (!track || !track.length) return false;
  return track.length >= 2 || track.some((k) => k.phrase && ARM_PHRASES[k.phrase]);
}
function distinctArmShapes(program) {
  const shapes = new Set();
  for (const e of program.elements) {
    const lib = LIB_BY_ID[e.libId];
    for (const k of (e.arms || (lib && lib.arms) || [])) if (k.pose && ARM_POSES[k.pose]) shapes.add(k.pose);
  }
  return shapes;
}

function analyzeStepSequence(program, path) {
  const segs = path.segs.filter((s) => s.inst && s.inst.chst);
  if (!segs.length) return null;
  const fams = {}, feet = {}, armed = [];
  let difficult = 0, withArms = 0, total = 0, armTime = 0, seqTime = 0;
  const sm = path.samples;
  for (const s of segs) {
    const fam = turnFamily(s.lib.id);
    total++;
    seqTime += s.dur;
    if (fam) { difficult++; fams[fam] = (fams[fam] || 0) + 1; }
    // the feet the element is actually skated on, from its samples (a mohawk
    // or a chassé uses both; `mirror` alone says nothing about the foot)
    const used = new Set();
    for (const q of sm) { if (q.ei === s.ei && q.foot && !q.both) used.add(q.foot); }
    for (const f of used) feet[f] = (feet[f] || 0) + 1;
    if (armsAuthored(s.inst.arms) || armsAuthored(s.lib.arms)) { withArms++; armTime += s.dur; armed.push(s.lib.name); }
  }
  // turn load: turns per second over the sequence, and the longest run on one
  // foot (samples' foot; a two-footed sample breaks the run)
  const t0 = segs[0].t0, t1 = segs[segs.length - 1].t1;
  const turns = segs.filter((s) => s.lib.cat === 'turns').length;
  let longestOneFoot = 0, run = 0, foot = null;
  for (const q of sm) {
    if (q.t < t0 || q.t > t1) continue;
    if (q.both || !q.foot) { run = 0; foot = null; continue; }
    if (q.foot === foot) run += DT; else { foot = q.foot; run = DT; }
    if (run > longestOneFoot) longestOneFoot = run;
  }
  // a cluster is 3+ difficult turns back to back
  const clusters = [];
  let cl = 0;
  for (const s of segs) {
    if (turnFamily(s.lib.id)) cl++;
    else { if (cl >= 3) clusters.push(cl); cl = 0; }
  }
  if (cl >= 3) clusters.push(cl);
  return {
    elements: total, difficult, families: Object.keys(fams).length, famBreakdown: fams,
    level: stepSequenceLevel(difficult), clusters: clusters.length,
    bothFeet: Object.keys(feet).length > 1, feet,
    withArms, armFraction: seqTime ? armTime / seqTime : 0,
    seconds: seqTime,
    turns, turnsPerSecond: seqTime ? turns / seqTime : 0, longestOneFootSeconds: longestOneFoot,
    first: segs[0], last: segs[segs.length - 1],
  };
}

/* ------------------------------------------------------------
   Placement and memorability — this skater's own rules
   ------------------------------------------------------------
   Stated by the skater, so they outrank general convention:
     - the whole routine stays on the ice (hard)
     - spins close to centre ice
     - jumps either near centre or in one of the four corners, where the
       crossovers before them build speed
     - crossovers forward/backward as the connecting material, not strings of
       edges and three-turns
     - a comfortable, classic edge into every jump, nothing awkward right before
     - easy to remember: few distinct pieces, the same recipe reused
   ------------------------------------------------------------ */
const PLACE = {
  spinMaxFromCentre: 7,     // metres
  jumpZoneRadius: 9,        // metres, from centre or from a corner anchor
  corners: [[-19, -6.5], [-19, 6.5], [19, -6.5], [19, 6.5]],
  speedBuilders: ['xover-f', 'xover-b', 'stroke-f', 'stroke-b', 'power-pull-f', 'power-pull-b',
                  'progressive-f', 'swing-roll-f', 'swing-roll-b', 'crossroll-f', 'crossroll-b', 'run-of-three'],
  memorableDistinct: 24,    // distinct element ids before a program starts to feel like a list
  // realistic travel speed for this level, m/s. Elite skaters cruise 6-8 and
  // peak ~10; an Aspire skater's footwork sits around 4-5. Jumps are explosive
  // and get a little more. Speed is lib.dist / element duration.
  // realistic for Aspire 4 (pre-bronze): average around 3.5 m/s, footwork
  // peaks near 5, a single-jump takeoff around 6. Elite is roughly double.
  maxSpeed: { turns: 5.2, edges: 5.3, field: 5.0, choreo: 5.0, steps: 5.2, stops: 4.5, jumps: 7.0, spins: 99 },
  targetAvgSpeed: 3.6,      // m/s over the whole program
  speedBuilderShare: 0.35,  // fraction of connecting beats that should be building speed
  endShare: 0.18,           // each end third of the rink should hold this share of the skating
  rotationBand: [42, 58],   // % CCW that reads as balanced — the same band in the steer, the score and the panel
  chstLengthShare: 0.5,     // the step sequence should span at least half the rink's length
  // "full ice coverage": both sides of the rink used, every corner circle
  // visited, and the crossover runs skated as real lobes (on an edge)
  sideShare: 0.18,          // each side third of the width should hold this share of the skating
  cornerSeconds: 0.8,       // seconds inside each of the four corner circles
  coverageTarget: 46,       // % of the rink's 2 m cells
  cornerRadius: 4.5,        // metres: the corner circle counted around each corner anchor
  lobe: { minTurn: 70, maxTurn: 200, minRadius: 4, maxRadius: 9 },   // what a crossover run on an edge looks like
  startFromCentre: 7,       // metres: the opening pose sits near centre ice
  finishFromCentre: 7,      // metres: so does the final pose
  maxGlideSeconds: 1.5,     // the longest anchor glide (gapBefore) before the pattern reads as waiting
  offIceTolerance: 0.05,    // seconds off the ice that still count as "on" (one or two samples on the line)
  // jump safety (a coach's review): room at the boards at takeoff and landing,
  // a runway along the landing edge, and a real edge held before takeoff
  jumpBoardsMin: 6,         // metres from the boards at the first and last air sample
  jumpRunwayMin: 10,        // metres along the landing heading before the boards
  jumpEdgeSecondsMin: 0.8,  // seconds on the takeoff edge before the first air sample
  jumpSpeedRatioMax: 1.3,   // a jump travels at most this times its approach speed (buildPath)
  jumpSpeedRatioCheck: 1.4, // the check: jump speed over the mean of the two connectors before it
  steerInsideMax: 15,       // degrees of emergency steering summed inside one jump, spin or field move
  speedStepMax: 1.5,        // m/s change allowed at a seam between two skating elements
  // spins: revolutions per position come from the level's spinMinRev; the
  // rate is a plausibility band; the entry speed is what a skater can centre
  spinRevPerSec: [1.2, 3.0],
  spinRate: 1.8,            // rev/s a spin is animated and counted at for this level (elite ~3+); revs = rate x seconds spinning
  spinEntrySpeedMax: 3.5,   // m/s on the element before the spin
  // stops and held shapes
  afterStopSpeedMax: 2.5,   // m/s the element after a stop may start at unless it is a stroke, crossover or chassé
  // ordering and fatigue
  lateJumpShare: 0.2,       // the last fifth of the program
  fatigueMax: 0.85,         // fraction of peak fatigue at which the hardest jump should not sit that late
  chstToJumpBeats: 2,       // beats between the last turn of the sequence and a takeoff
  // the sequence itself
  chstDifficultMin: 5, chstFamiliesMin: 2,
  chstTurnsPerSecMax: 0.6, chstOneFootMax: 6.5,   // turns per second; the longest run on one foot, seconds (four 3-beat turns and a change)
  chstArmFractionMin: 0.34,
  // ROOM TO SKATE. The elements are the program; the skater has to arrive at
  // each one with speed and leave it with room. A jump wants plain skating in
  // front of it (not a corridor of turns), somewhere to put the landing, and
  // air between it and the next jump; a spin wants a quiet edge to set up on,
  // not a held shape that has to be abandoned; a held shape wants long enough
  // to read. Every one of these is a LEVEL/profile override away from being
  // stricter (`LEVELS[level].rules`): a beginner needs more room, not less.
  jumpRunInSecondsMin: 1.6,      // seconds of plain skating before the takeoff turn
  jumpRecoverySecondsMin: 1.0,   // seconds of plain skating after the landing, before the next turn or shape
  jumpGapSecondsMin: 5,          // seconds between one jump element's landing and the next takeoff
  spinSetupSecondsMin: 1.5,      // seconds of quiet skating into the spin's entry edge
  heldSecondsMin: 2.5,           // a spiral, Bauer, eagle or lunge held shorter than this does not read
  connectorDiffMax: 4,           // library difficulty allowed outside the step sequence
};

/** a PLACE threshold, overridable per level (and so per profile) */
function placeFor(program, key) {
  const lv = LEVELS[program && program.level] || {}, r = lv.rules || lv.aspire || {};
  return r[key] != null ? r[key] : PLACE[key];
}

function analyzePlacement(program, path) {
  const segs = path.segs;
  const mid = (seg) => sampleAt(path, (seg.t0 + seg.t1) / 2);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const sm = path.samples, n = sm.length || 1;
  const spb = path.spb || 60 / (program.bpm || 100);
  const rules = (LEVELS[program.level] || LEVELS.open).rules || {};
  // where an element is, for the warnings: "#12 flip 5&2"
  const tag = (s) => ({ idx: s.ei, libId: s.lib.id, count: fmtCount(s.beat0), name: s.lib.name, t: s.t0 });
  // the element's samples, in order (segs are contiguous in the sample list)
  const firstIdx = new Map(); sm.forEach((q, k) => { if (q.ei >= 0 && !firstIdx.has(q.ei)) firstIdx.set(q.ei, k); });
  const samplesOf = (s) => { const out = []; for (let k = firstIdx.get(s.ei) || 0; k < sm.length && sm[k].ei === s.ei; k++) out.push(sm[k]); return out; };
  // emergency steering (steerCorrection) applied inside an element, degrees
  const steerInside = (s) => samplesOf(s).reduce((t, q) => t + Math.abs(q.corr || 0), 0);
  const heldShape = (s) => (s.lib.cat === 'field' || s.lib.id === 'choreo-knee-slide') && (s.lib.phases || []).some((p) => p.both);
  // anything the skater rides out slowly and has to push out of: a held shape,
  // a knee slide, a stop. The element after one is allowed to accelerate.
  const decelerates = (s) => !!s && (heldShape(s) || s.lib.id === 'choreo-knee-slide' || s.lib.cat === 'stops');
  // "plain skating": edges, strokes, crossovers, rolls, pulls — the material a
  // skater gathers speed on. Not turns, not held shapes, not stops.
  const plain = (q) => !!q && q.lib.cat === 'edges' && q.dist > 0;
  // seconds of plain skating leading into element i (one turn — the takeoff
  // turn or the spin entry — may sit between the run and the element)
  const runInto = (i, allowTurn) => { let j = i - 1, t = 0;
    if (allowTurn && segs[j] && (segs[j].lib.cat === 'turns' || segs[j].lib.id.startsWith('step-'))) j--;
    while (plain(segs[j])) { t += segs[j].dur; j--; }
    return t; };
  // seconds of plain skating out of element i (through the rest of a combination)
  const runOutOf = (i) => { let j = i + 1, t = 0;
    while (segs[j] && comboContinues(segs, j)) j++;
    while (plain(segs[j])) { t += segs[j].dur; j++; }
    return t; };
  // the fatigue curve from analyze(): value at the START of each element, as a fraction of the peak
  const fat = []; { let acc = 0; for (const s of segs) { fat.push(acc); acc += s.lib.cost * (s.dur / 4); acc *= 0.97; } }
  const fatMax = Math.max(1e-6, ...fat, fat.length ? fat[fat.length - 1] : 0);

  const spins = segs.map((s, i) => ({ s, i })).filter(({ s }) => s.lib.cat === 'spins').map(({ s, i }) => {
    const m = mid(s); const d = Math.hypot(m.x, m.y);
    // revolutions per position: the spin phases' rev spread over their span
    // of u, integrated over each HELD pose span (two consecutive keyframes of
    // the same spin_ position; a single keyframe is passed through, not held)
    const phases = []; let u0 = 0;
    for (const ph of s.lib.phases) { const u1 = u0 + ph.f; if (ph.k === 'spin') phases.push({ u0, u1, rev: spinRevs(program, ph, ph.f * s.dur) }); u0 = u1; }
    const revIn = (a, b) => phases.reduce((t, ph) => t + Math.max(0, Math.min(b, ph.u1) - Math.max(a, ph.u0)) / (ph.u1 - ph.u0) * ph.rev, 0);
    const poses = s.lib.poses || [], revs = {};
    for (let k = 0; k + 1 < poses.length; k++) {
      const p = poses[k].pose;
      if (/^spin_/.test(p) && poses[k + 1].pose === p) revs[p.replace(/^spin_/, '')] = (revs[p.replace(/^spin_/, '')] || 0) + revIn(poses[k].t, poses[k + 1].t);
    }
    const spinSeconds = phases.reduce((t, ph) => t + (ph.u1 - ph.u0), 0) * s.dur;
    const totalRev = phases.reduce((t, ph) => t + ph.rev, 0);
    const revPerSec = spinSeconds ? totalRev / spinSeconds : 0;
    const prev = segs[i - 1];
    const entrySpeed = prev ? prev.speed : 0;
    // setup: the plain skating into the spin PLUS the spin's own entry arc
    const arcF = (s.lib.phases || []).filter((ph) => ph.k === 'arc').reduce((t, ph) => t + ph.f, 0);
    const setup = runInto(i, true) + arcF * s.dur;
    const minRev = rules.spinMinRev || 0;
    const under = Object.entries(revs).filter(([, r]) => r < minRev).map(([p, r]) => `${p} ${r.toFixed(1)}`);
    return Object.assign(tag(s), { fromCentre: d, ok: d <= PLACE.spinMaxFromCentre, seconds: s.dur,
      revs, revPerSec, totalRev, minRev, underRev: under, revPerSecOk: revPerSec >= PLACE.spinRevPerSec[0] && revPerSec <= PLACE.spinRevPerSec[1],
      entrySpeed, entry: prev ? prev.lib.id : '—', heldBefore: !!(prev && heldShape(prev)), setup, steerInside: steerInside(s) });
  });

  // a combination is one jump element; judge it by its first jump. A jump
  // after a glide is its own element (comboContinues).
  const jumps = [];
  const chstTurns = segs.filter((s) => s.inst && s.inst.chst && (s.lib.cat === 'turns' || turnFamily(s.lib.id)));
  const lastTurn = chstTurns.length ? chstTurns[chstTurns.length - 1] : null;
  const maxDiff = Math.max(0, ...segs.filter((s) => s.lib.cat === 'jumps').map((s) => s.lib.diff));
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!isJumpStart(segs, i)) continue;
    const m = sampleAt(path, s.t0);
    const dCentre = Math.hypot(m.x, m.y);
    const dCorner = Math.min(...PLACE.corners.map((c) => dist([m.x, m.y], c)));
    const where = dCentre <= PLACE.jumpZoneRadius ? 'centre' : dCorner <= PLACE.jumpZoneRadius ? 'corner' : 'mid-ice';
    // entry: the element right before, and whether speed was built in the two before that
    const prev = segs[i - 1], prev2 = segs[i - 2];
    const awkward = prev && prev.lib.diff >= 5;
    // a jump straight out of the step sequence is entered from the sequence
    // itself — that IS the run-in, and a rewarded one (docs/CHOREOGRAPHY.md §3)
    const outOfSequence = prev && prev.inst && prev.inst.chst;
    // speed into the jump: a builder in the three elements before it, or a
    // long enough plain run-in (a travelling edge builds speed too)
    const prev3 = segs[i - 3];
    const runIn = runInto(i, true);
    const builtSpeed = outOfSequence || runIn >= placeFor(program, 'jumpRunInSecondsMin')
      || [prev, prev2, prev3].some((q) => q && PLACE.speedBuilders.includes(q.lib.id));
    // the takeoff edge: seconds on the same code before the first air sample,
    // counting back through the element before (and its glide) while the
    // code holds, but never through another jump's air
    const own = samplesOf(s), k0 = firstIdx.get(s.ei) || 0;
    const airK = own.findIndex((q) => q.air);
    let edgeSeconds = 0, boardsAtTakeoff = null, boardsAtLanding = null, runway = null;
    if (airK >= 0) {
      const takeoff = own[airK], code = takeoff.code;
      for (let k = k0 + airK - 1; k >= 0 && sm[k].code === code && !sm[k].air; k--) edgeSeconds += DT;
      boardsAtTakeoff = boardsDistance(takeoff.x, takeoff.y);
      let last = airK; while (last + 1 < own.length && own[last + 1].air) last++;
      const land = own[last];
      boardsAtLanding = boardsDistance(land.x, land.y);
      // runway: metres straight along the landing heading before the boards
      runway = 0; for (let d = 0; d <= RINK.L; d += 0.25) { if (!insideRink(land.x + Math.cos(land.h) * d, land.y + Math.sin(land.h) * d)) break; runway = d; }
    }
    // speed into the jump against the two connectors before it
    const conn = []; for (let k = i - 1; k >= 0 && conn.length < 2; k--) { const c = segs[k]; if (!['jumps', 'spins', 'stops'].includes(c.lib.cat) && c.dist > 0) conn.push(c.speed); }
    const connSpeed = conn.length ? conn.reduce((a, b) => a + b, 0) / conn.length : null;
    const speedRatio = connSpeed ? s.speed / connSpeed : null;
    // ordering: fatigue at takeoff, late placement of the hardest jump, and
    // beats between the last turn of the sequence and this takeoff
    const fatigue = fat[i] / fatMax;
    const late = s.t0 >= path.totalTime * (1 - PLACE.lateJumpShare);
    const beatsAfterTurn = lastTurn && lastTurn.t1 <= s.t0 ? (s.t0 + (airK >= 0 ? airK * DT : 0) - lastTurn.t1) / spb : null;
    // the whole element — a combination's second jump is steered inside it too
    let steered = steerInside(s); for (let k = i + 1; k < segs.length && comboContinues(segs, k); k++) steered += steerInside(segs[k]);
    jumps.push(Object.assign(tag(s), { where, ok: where !== 'mid-ice', zoneDist: Math.min(dCentre, dCorner),
      entry: prev ? prev.lib.name : '—', entryId: prev ? prev.lib.id : null, awkward, builtSpeed,
      edgeSeconds, boardsAtTakeoff, boardsAtLanding, runway, speed: s.speed, connSpeed, speedRatio,
      fatigue, late, hardest: s.lib.diff === maxDiff, beatsAfterTurn, heldBefore: !!(prev && heldShape(prev)), steerInside: steered,
      runIn, recovery: runOutOf(i), sinceJump: (() => { for (let k = i - 1; k >= 0; k--) if (segs[k].lib.cat === 'jumps') return comboContinues(segs, k + 1) && k + 1 === i ? null : s.t0 - segs[k].t1; return null; })() }));
  }
  // held shapes: long enough to read, and what they run into
  const heldShapes = segs.map((s, i) => ({ s, i })).filter(({ s }) => s.lib.cat === 'field' && s.dist > 0)
    .map(({ s, i }) => Object.assign(tag(s), { seconds: s.dur, ok: s.dur >= placeFor(program, 'heldSecondsMin') }));
  // connecting material harder than the skater is comfortable with: the step
  // sequence is where difficulty belongs, everywhere else it is a risk for
  // nothing (the profile's level sets the ceiling)
  const connDiffMax = placeFor(program, 'connectorDiffMax');
  const hardConnectors = segs.map((s, i) => ({ s, i }))
    .filter(({ s }) => !(s.inst && s.inst.chst) && !['jumps', 'spins'].includes(s.lib.cat) && s.lib.diff > connDiffMax)
    .map(({ s, i }) => Object.assign(tag(s), { diff: s.lib.diff }));
  // emergency steering inside a jump, spin or field move: the path was bent
  // to stay on the ice while the skater was committed to a shape
  const steeredInsideElements = segs.filter((s) => ['jumps', 'spins', 'field'].includes(s.lib.cat))
    .map((s) => Object.assign(tag(s), { degrees: steerInside(s) })).filter((x) => x.degrees > PLACE.steerInsideMax);
  // a speed step at a seam between two skating elements (stops decelerate by
  // design, spins and poses do not travel)
  const speedStep = [];
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1], b = segs[i];
    const skip = (s) => ['stops', 'spins'].includes(s.lib.cat) || s.dist === 0;
    if (skip(a) || skip(b)) continue;
    const d = b.speed - a.speed;
    // slowing into a held shape, a slide or a landing is what happens on the
    // ice; speeding UP needs a push — a builder (stroke, crossovers, pulls,
    // chassé) or a jump's own take-off. Anything else that jumps in speed is
    // a seam the skater cannot skate.
    // rising out of a held shape (lunge, spiral, Bauer, slide) IS a push, and
    // the shape itself is deliberately slow — do not read that as a seam step
    const pushes = PLACE.speedBuilders.includes(b.lib.id) || /^chasse/.test(b.lib.id) || b.lib.cat === 'jumps' || decelerates(a)
      // a turn's travel is set by its arc, not by a push: its nominal speed is
      // not the skater accelerating, so it is not a seam the skater can feel
      || b.lib.cat === 'turns';
    if (d > PLACE.speedStepMax && !pushes) speedStep.push(Object.assign(tag(b), { from: a.speed, to: b.speed, delta: d }));
  }
  // after a stop: the next element starts from nothing unless it pushes
  const afterStop = [];
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1], b = segs[i];
    if (a.lib.cat !== 'stops' || /^pose-/.test(a.lib.id)) continue;
    // a push, or a light hop straight out of the stop, is how a stop is left
    if (/^(stroke|xover|chasse|progressive|bunny-hop|choreo-hop|choreo-presentation|choreo-reach)/.test(b.lib.id)) continue;
    if (b.speed > PLACE.afterStopSpeedMax) afterStop.push(Object.assign(tag(b), { speed: b.speed, after: a.lib.id }));
  }
  // a held two-footed shape straight into a jump or spin: no edge to take off from
  const heldBefore = segs.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && ['jumps', 'spins'].includes(s.lib.cat) && heldShape(segs[i - 1]))
    .map(({ s, i }) => Object.assign(tag(s), { held: segs[i - 1].lib.id }));

  const connective = segs.filter((s) => ['edges', 'turns'].includes(s.lib.cat) && !(s.inst && s.inst.chst));
  const crossoverBeats = connective.filter((s) => /^xover/.test(s.lib.id)).reduce((t, s) => t + s.inst.beats, 0);
  const builderBeats = connective.filter((s) => PLACE.speedBuilders.includes(s.lib.id)).reduce((t, s) => t + s.inst.beats, 0);
  const connectiveBeats = connective.reduce((t, s) => t + s.inst.beats, 0);
  // realistic speeds: anything over the cap for its category
  const tooFast = segs.filter((s) => s.speed > (PLACE.maxSpeed[s.lib.cat] || 6))
    .map((s) => Object.assign(tag(s), { speed: s.speed, cap: PLACE.maxSpeed[s.lib.cat] || 6, beats: s.inst.beats }));
  // the step sequence has to cover half the ice: measure its footprint on the
  // turns, steps, edges and choreo it is made of (a jump or spin flagged chst
  // is a rule error, not part of the footprint)
  const chst = segs.filter((s) => s.inst && s.inst.chst && ['turns', 'steps', 'edges', 'choreo'].includes(s.lib.cat));
  let chstSpan = null;
  if (chst.length) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    const ids = new Set(chst.map((s) => s.ei));
    for (const q of path.samples) { if (!ids.has(q.ei)) continue;
      minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
    chstSpan = { length: maxX - minX, width: maxY - minY, lengthFrac: (maxX - minX) / RINK.L, areaFrac: ((maxX - minX) * (maxY - minY)) / (RINK.L * RINK.W) };
  }

  // full ice: ends and sides of the rink, the four corner circles, and the
  // cells covered (same 2 m grid as analyze().coverage)
  let le = 0, re = 0, ts = 0, bs = 0; const cornerHits = [0, 0, 0, 0], cells = new Set();
  const CELL = 2, ny = Math.ceil(RINK.W / CELL);
  for (const q of sm) {
    if (q.x < -RINK.L / 6) le++; else if (q.x > RINK.L / 6) re++;
    if (q.y > RINK.W / 6) ts++; else if (q.y < -RINK.W / 6) bs++;
    PLACE.corners.forEach((c, i) => { if (Math.hypot(q.x - c[0], q.y - c[1]) <= PLACE.cornerRadius) cornerHits[i]++; });
    if (insideRink(q.x, q.y)) cells.add(((q.x + RINK.L / 2) / CELL | 0) * ny + ((q.y + RINK.W / 2) / CELL | 0));
  }
  const totalCells = Math.round((RINK.L / CELL) * (RINK.W / CELL) * 0.96);
  const ends = { left: le / n, right: re / n, ok: Math.min(le, re) / n >= PLACE.endShare };
  const sides = { top: ts / n, bottom: bs / n, ok: Math.min(ts, bs) / n >= PLACE.sideShare };
  const cornerSeconds = cornerHits.map((h) => h * DT);
  const cornersOk = cornerSeconds.every((v) => v >= PLACE.cornerSeconds);
  const coveragePct = (cells.size / totalCells) * 100;
  // crossovers on an edge: each run should be a real lobe, not a straight
  // line along the boards and not a corkscrew
  const lobes = segs.filter((sg) => /^xover|^progressive/.test(sg.lib.id)).map((sg) => {
    const pts = sm.filter((q) => q.t >= sg.t0 && q.t <= sg.t1);
    let turn = 0, arc = 0;
    for (let i = 1; i < pts.length; i++) { let d = pts[i].h - pts[i - 1].h; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; turn += d; arc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); }
    const deg = Math.abs(turn) / DEG, radius = deg > 3 ? arc / Math.abs(turn) : 99;
    const L = PLACE.lobe;
    return Object.assign(tag(sg), { turn: Math.round(turn / DEG), radius, ok: deg >= L.minTurn && deg <= L.maxTurn && radius >= L.minRadius && radius <= L.maxRadius });
  });

  const ids = program.elements.map((e) => e.libId);
  const distinct = new Set(ids).size;
  const counts = {}; ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
  const oneOffs = Object.values(counts).filter((n) => n === 1).length;

  // the longest anchor glide, and the first / last sample's distance from centre
  const glide = segs.reduce((m, s) => ((s.inst.gapBefore || 0) * spb > m.seconds ? { seconds: (s.inst.gapBefore || 0) * spb, before: tag(s) } : m), { seconds: 0, before: null });
  const s0 = sm[0], s1 = sm[sm.length - 1];

  return {
    spins, jumps,
    crossoverShare: connectiveBeats ? crossoverBeats / connectiveBeats : 0,
    builderShare: connectiveBeats ? builderBeats / connectiveBeats : 0,
    tooFast, chstSpan,
    ends, sides, cornerSeconds, cornersOk, coveragePct, lobes,
    distinct, oneOffs, memorable: distinct <= PLACE.memorableDistinct,
    offIce: sm.filter((q) => !insideRink(q.x, q.y)).length * DT,
    startFromCentre: s0 ? Math.hypot(s0.x, s0.y) : 0, finishFromCentre: s1 ? Math.hypot(s1.x, s1.y) : 0,
    glide, steeredInsideElements, speedStep, afterStop, heldBefore, heldShapes, hardConnectors,
    fatigueAtJumps: jumps.map((j) => j.fatigue),
  };
}

/**
 * Steer the pattern by choosing an `aim` for each element. Greedy coordinate
 * descent; changes direction only, never timing. The cost encodes the skater's
 * own placement rules on top of the general ones:
 *   stay on the ice (hard) · spins near centre · jumps near centre or in a
 *   corner · use the sheet · touch the circles · balance rotation · finish
 *   near centre.
 * Mutates inst.aim in place. Returns the final analysis.
 */
function steerProgram(program, opts = {}) {
  const passes = opts.passes || 2;
  const grid = opts.grid || [-40, -30, -22, -14, -8, 0, 8, 14, 22, 30, 40];
  const CIRC = PLACE.corners;
  const CELL = 2, nx = Math.ceil(RINK.L / CELL), ny = Math.ceil(RINK.W / CELL);

  // Lean cost: everything from the samples and segs directly. analyze() also
  // computes effort, fatigue, continuity text and more, and calling it ~1000
  // times per steer is what made the picker time out.
  const cost = () => {
    const path = buildPath(program);
    const sm = path.samples;
    if (!sm.length) return 0;
    let off = 0, ccw = 0, cw = 0, leftEnd = 0, rightEnd = 0;
    const cells = new Set(), h = [0, 0, 0, 0];
    for (let i = 0; i < sm.length; i++) {
      const q = sm[i];
      if (!insideRink(q.x, q.y)) off++;
      if (q.x < -RINK.L / 6) leftEnd++; else if (q.x > RINK.L / 6) rightEnd++;
      cells.add(((q.x + RINK.L / 2) / CELL | 0) * ny + ((q.y + RINK.W / 2) / CELL | 0));
      for (let c = 0; c < 4; c++) if (Math.hypot(q.x - CIRC[c][0], q.y - CIRC[c][1]) <= PLACE.cornerRadius) h[c]++;
      if (i) { let d = q.h - sm[i - 1].h; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; if (d > 0) ccw += d; else cw += -d; }
    }
    const imb = Math.abs((ccw / ((ccw + cw) || 1)) * 100 - 50);
    const last = sm[sm.length - 1];
    const endD = Math.hypot(last.x, last.y);
    let spinPen = 0, jumpPen = 0;
    for (let i = 0; i < path.segs.length; i++) {
      const sg = path.segs[i];
      if (sg.lib.cat === 'spins') {
        const m = sampleAt(path, (sg.t0 + sg.t1) / 2);
        spinPen += Math.max(0, Math.hypot(m.x, m.y) - PLACE.spinMaxFromCentre) ** 2;
      } else if (isJumpStart(path.segs, i)) {
        const m = sampleAt(path, sg.t0);
        const dC = Math.hypot(m.x, m.y);
        const dK = Math.min(...PLACE.corners.map((c) => Math.hypot(m.x - c[0], m.y - c[1])));
        if (Math.min(dC, dK) > PLACE.jumpZoneRadius) jumpPen += 1;
      }
    }
    // both ends of the rink should each hold at least ~18% of the program
    const endPen = (Math.max(0, PLACE.endShare - leftEnd / sm.length) + Math.max(0, PLACE.endShare - rightEnd / sm.length)) * 2500;
    return off * 60                                          // stay on the ice: effectively hard
      - cells.size * 3 - h.reduce((t, v) => t + Math.min(v, 180), 0) * 0.8
      + imb * imb * 4 + Math.max(0, endD - 3.5) ** 2 * 7
      + spinPen * 30 + jumpPen * 260 + endPen;
  };
  let best = cost();
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < program.elements.length; i++) {
      const e = program.elements[i];
      let bv = e.aim || 0, bs = best;
      for (const v of grid) { e.aim = v; const c = cost(); if (c < bs) { bs = c; bv = v; } }
      e.aim = bv; best = bs;
    }
  }
  return best;
}

/**
 * Full steering pipeline, asynchronous so the page stays responsive:
 *   1. greedy pass over every element
 *   2. joint search over the few elements feeding a mid-ice jump or a far spin
 *      (greedy cannot coordinate several elements at once, so it gets stuck
 *      with a jump mid-boards; a 3-element joint search moves it in one go)
 *   3. greedy again with the fixed elements frozen
 * onProgress(stage, fraction) is optional. Resolves to the final placement.
 */
async function steerProgramAsync(program, opts = {}) {
  const grid = opts.grid || [-40, -28, -16, -8, 0, 8, 16, 28, 40];
  const jointGrid = opts.jointGrid || [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const passes = opts.passes || 2;
  const onProgress = opts.onProgress || (() => {});
  // Yield to the event loop WITHOUT a timer: Chrome throttles setTimeout in a
  // hidden tab to once a second (once a minute after five minutes), which
  // turned a two-minute steer into hours. A MessageChannel task is not
  // throttled and still lets the page breathe.
  const chan = new MessageChannel();
  const tick = () => new Promise((r) => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => r());          // visible: let the frame paint so the page does not freeze
    } else {
      chan.port1.onmessage = () => r(); chan.port2.postMessage(0);   // hidden: timers are throttled, this is not
    }
  });
  const CIRC = PLACE.corners;
  const CELL = 2, ny = Math.ceil(RINK.W / CELL);
  // opts.frozen: element indices whose aim must not change (e.g. a tail the
  // skater has approved). They still count in the cost; they are just not moved.
  const frozen = new Set(opts.frozen || []);
  const userFrozen = new Set(opts.frozen || []);   // the caller's: never released by any stage below

  const cost = () => {
    const path = buildPath(program), sm = path.samples;
    if (!sm.length) return 0;
    let off = 0, ccw = 0, cw = 0, leftEnd = 0, rightEnd = 0, topSide = 0, botSide = 0;
    const cells = new Set(), h = [0, 0, 0, 0];
    for (let i = 0; i < sm.length; i++) {
      const q = sm[i];
      if (!insideRink(q.x, q.y)) off++;
      if (q.x < -RINK.L / 6) leftEnd++; else if (q.x > RINK.L / 6) rightEnd++;
      if (q.y > RINK.W / 6) topSide++; else if (q.y < -RINK.W / 6) botSide++;
      cells.add(((q.x + RINK.L / 2) / CELL | 0) * ny + ((q.y + RINK.W / 2) / CELL | 0));
      for (let c = 0; c < 4; c++) if (Math.hypot(q.x - CIRC[c][0], q.y - CIRC[c][1]) <= PLACE.cornerRadius) h[c]++;
      if (i) { let d = q.h - sm[i - 1].h; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; if (d > 0) ccw += d; else cw += -d; }
    }
    const imb = Math.abs((ccw / ((ccw + cw) || 1)) * 100 - 50);
    const last = sm[sm.length - 1], endD = Math.hypot(last.x, last.y);
    let sp = 0, jp = 0, safetyPen = 0, cMin = 1e9, cMax = -1e9;
    const chstIds = new Set();
    for (let i = 0; i < path.segs.length; i++) {
      const sg = path.segs[i];
      if (sg.inst && sg.inst.chst && ['turns', 'steps', 'edges', 'choreo'].includes(sg.lib.cat)) chstIds.add(sg.ei);
      // emergency steering inside a jump, spin or held shape is a run at the
      // boards the skater cannot make: every degree over the allowance costs
      if (sg.lib.cat === 'jumps' || sg.lib.cat === 'spins' || sg.lib.cat === 'field') {
        let deg = 0;
        for (let k = 0; k < sm.length; k++) { const q = sm[k]; if (q.t < sg.t0) continue; if (q.t > sg.t1) break; deg += Math.abs(q.corr || 0); }
        if (deg > PLACE.steerInsideMax) safetyPen += 100 + (deg - PLACE.steerInsideMax) * 4;
      }
      if (sg.lib.cat === 'spins') {
        const m = sampleAt(path, (sg.t0 + sg.t1) / 2);
        // a rule miss by a few centimetres must still cost more than any
        // coverage it buys: linear step past the limit, quadratic beyond
        const over = Math.max(0, Math.hypot(m.x, m.y) - PLACE.spinMaxFromCentre);
        sp += over > 0 ? 8 + over * 4 + over * over : 0;
      } else if (isJumpStart(path.segs, i)) {
        const m = sampleAt(path, sg.t0);
        const dC = Math.hypot(m.x, m.y), dK = Math.min(...PLACE.corners.map((c) => Math.hypot(m.x - c[0], m.y - c[1])));
        const ns = path.segs.findIndex((x, k) => k > i && x.lib.cat === 'spins');
        const feeds = ns > 0 && ns - i <= 9;
        if ((feeds ? dC : Math.min(dC, dK)) > PLACE.jumpZoneRadius) jp++;
        // the coach's safety rules, cheaply: the jump's own samples give its
        // distance to the boards in the air and the runway after it lands
        let airFirst = null, airLast = null;
        for (let k = 0; k < sm.length; k++) { const q = sm[k]; if (q.t < sg.t0) continue; if (q.t > sg.t1) break; if (q.air) { if (!airFirst) airFirst = q; airLast = q; } }
        if (airFirst) {
          const bd = Math.min(boardsDistance(airFirst.x, airFirst.y), boardsDistance(airLast.x, airLast.y));
          if (bd < PLACE.jumpBoardsMin) safetyPen += 120 + (PLACE.jumpBoardsMin - bd) * 60;
          let run = 0; for (let d = 0; d <= PLACE.jumpRunwayMin; d += 0.5) { if (!insideRink(airLast.x + Math.cos(airLast.h) * d, airLast.y + Math.sin(airLast.h) * d)) break; run = d; }
          if (run < PLACE.jumpRunwayMin) safetyPen += 120 + (PLACE.jumpRunwayMin - run) * 20;
        }
      }
    }
    // the step sequence should stretch across at least half the rink's length
    let chstPen = 0;
    if (chstIds.size) {
      for (const q of sm) { if (!chstIds.has(q.ei)) continue; cMin = Math.min(cMin, q.x); cMax = Math.max(cMax, q.x); }
      const short = Math.max(0, RINK.L * PLACE.chstLengthShare - (cMax - cMin));
      chstPen = short > 0 ? 150 + short * 40 + short * short * 1.5 : 0;
    }
    // each end third short of its share: a step so the miss itself costs,
    // then steeply per point (4% short = 400+, more than 100 cells of coverage)
    const endShort = Math.max(0, PLACE.endShare - leftEnd / sm.length) + Math.max(0, PLACE.endShare - rightEnd / sm.length);
    const endPen = endShort > 0 ? 150 + endShort * 10000 : 0;
    // full ice: both sides of the width, every corner circle, crossovers on lobes
    const sideShort = Math.max(0, PLACE.sideShare - topSide / sm.length) + Math.max(0, PLACE.sideShare - botSide / sm.length);
    const sidePen = sideShort > 0 ? 150 + sideShort * 10000 : 0;
    const cornerPen = h.reduce((t, v) => t + (v * DT < PLACE.cornerSeconds ? 60 + (PLACE.cornerSeconds - v * DT) * 100 : 0), 0);
    let lobePen = 0;
    for (const sg of path.segs) {
      if (!/^xover|^progressive/.test(sg.lib.id)) continue;
      let turn = 0, arc = 0, prevQ = null;
      for (const q of sm) { if (q.t < sg.t0) continue; if (q.t > sg.t1) break; if (prevQ) { let d = q.h - prevQ.h; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; turn += d; arc += Math.hypot(q.x - prevQ.x, q.y - prevQ.y); } prevQ = q; }
      const deg = Math.abs(turn) / DEG, r = deg > 3 ? arc / Math.abs(turn) : 99, L = PLACE.lobe;
      lobePen += Math.max(0, L.minTurn - deg) * 3 + Math.max(0, deg - L.maxTurn) * 3 + Math.max(0, L.minRadius - r) * 40 + Math.max(0, r - L.maxRadius) * 20;
    }
    const [rLo, rHi] = PLACE.rotationBand, ccwPct = (ccw / ((ccw + cw) || 1)) * 100;
    const rotPen = Math.max(0, rLo - ccwPct, ccwPct - rHi) * 60;
    return off * 60 - cells.size * 4 - h.reduce((t, v) => t + Math.min(v, 180), 0) * 0.8
      + imb * imb * 4 + rotPen + Math.max(0, endD - 3.5) ** 2 * 7 + sp * 30 + jp * 260 + safetyPen + chstPen + endPen + sidePen + cornerPen + lobePen;
  };

  const greedy = async (label, n, fn = cost, g = grid) => {
    let best = fn();
    for (let pass = 0; pass < n; pass++) {
      for (let i = 0; i < program.elements.length; i++) {
        if (frozen.has(i)) continue;
        const e = program.elements[i];
        let bv = e.aim || 0, bs = best;
        for (const v of g) { e.aim = v; const c = fn(); if (c < bs) { bs = c; bv = v; } }
        e.aim = bv; best = bs;
        onProgress(label, (pass + i / program.elements.length) / n);
        await tick();
      }
    }
  };

  // joint search over the three longest-travelling elements before segment k,
  // minimising `measure(path)` while staying on the ice up to that segment
  const joint = async (label, k, measure, window = 3, gridOverride = null) => {
    const g = gridOverride || jointGrid;
    const cand = [];
    for (let i = Math.max(0, k - 9); i < k; i++) {
      const lib = LIB_BY_ID[program.elements[i].libId];
      if (lib.dist >= 8 && !frozen.has(i)) cand.push(i);
    }
    const idx = cand.slice(-window);
    if (idx.length < 2) return false;
    let best = null, n = 0;
    const total = Math.pow(g.length, idx.length);
    const rec = async (d, pick) => {
      if (d === idx.length) {
        idx.forEach((i, j) => { program.elements[i].aim = pick[j]; });
        const path = buildPath(program), tEnd = path.segs[k].t1;
        let off = 0, ccw = 0, cw = 0;
        const sm = path.samples;
        for (let i = 0; i < sm.length; i++) {
          const q = sm[i];
          if (q.t > tEnd) break;
          if (!insideRink(q.x, q.y)) off++;
          if (i) { let d = q.h - sm[i - 1].h; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; if (d > 0) ccw += d; else cw += -d; }
        }
        // placement first, but do not let the fix spin the whole approach one way
        const imb = Math.abs((ccw / ((ccw + cw) || 1)) * 100 - 50);
        const val = measure(path) + off * 0.6 + Math.max(0, imb - 8) * 0.25;
        if (!best || val < best.val) best = { val, pick: pick.slice() };
        if (++n % 8 === 0) { onProgress(label, n / total); await tick(); }
        return;
      }
      for (const v of g) { pick[d] = v; await rec(d + 1, pick); }
    };
    await rec(0, []);
    idx.forEach((i, j) => { program.elements[i].aim = best.pick[j]; });
    idx.forEach((i) => frozen.add(i));
    return idx;
  };

  // joint search over the last three long travellers; if that leaves the
  // target unmet, widen to the last four with a coarser grid
  const place = async (label, k, measure, ok) => {
    const narrow = await joint(label, k, measure);
    if (!narrow || ok(buildPath(program))) return;
    // Not enough leverage in three elements. Un-freeze ONLY what this narrow
    // search froze (never an earlier jump's approach), try four elements on a
    // coarser grid, and keep whichever of the two results is actually better.
    const keep = narrow.map((i) => program.elements[i].aim);
    const before = measure(buildPath(program));
    narrow.forEach((i) => frozen.delete(i));
    const wide = await joint(label + ' (wide)', k, measure, 4, [-40, -27, -13, 0, 13, 27, 40]);
    if (measure(buildPath(program)) > before) {
      if (wide) wide.forEach((i) => frozen.delete(i));
      narrow.forEach((i, j) => { program.elements[i].aim = keep[j]; frozen.add(i); });
    }
  };

  await greedy('steer', passes);

  const feedsSpinAt = (pth, i) => { const ns = pth.segs.findIndex((x, k) => k > i && x.lib.cat === 'spins'); return ns > 0 && ns - i <= 9; };
  const jumpStartAt = (pth, i) => isJumpStart(pth.segs, i);

  // fix any jump that is still mid-ice, earliest first
  let path = buildPath(program);
  const fixJumps = async (from) => {
    for (let i = from; i < path.segs.length; i++) {
      if (!jumpStartAt(path, i)) continue;
      const sg = path.segs[i];
      const m = sampleAt(path, sg.t0);
      const zone = Math.min(Math.hypot(m.x, m.y), ...PLACE.corners.map((c) => Math.hypot(m.x - c[0], m.y - c[1])));
      const t0 = sg.t0;
      // A spin that follows within a few elements has to end up near centre, and
      // the ~60 m of skating between a corner jump and that spin cannot get back
      // to the middle on the ice. So a jump feeding a spin is placed at CENTRE,
      // not "centre or corner".
      const feedsSpin = feedsSpinAt(path, i);
      const zoneOf = (pth) => { const q = sampleAt(pth, t0);
        const dC = Math.hypot(q.x, q.y);
        return feedsSpin ? dC : Math.min(dC, ...PLACE.corners.map((c) => Math.hypot(q.x - c[0], q.y - c[1]))); };
      // the jump must also be SAFE where it lands: away from the boards with
      // runway ahead — measured on the jump's own air samples
      const safetyOf = (pth) => { let f = null, l = null;
        for (const q of pth.samples) { if (q.t < t0) continue; if (q.t > t0 + sg.dur) break; if (q.air) { if (!f) f = q; l = q; } }
        if (!f) return 0;
        const bd = Math.min(boardsDistance(f.x, f.y), boardsDistance(l.x, l.y));
        let run = 0; for (let d = 0; d <= PLACE.jumpRunwayMin; d += 0.5) { if (!insideRink(l.x + Math.cos(l.h) * d, l.y + Math.sin(l.h) * d)) break; run = d; }
        return Math.max(0, PLACE.jumpBoardsMin - bd) * 2 + Math.max(0, PLACE.jumpRunwayMin - run); };
      const measure = (pth) => zoneOf(pth) + safetyOf(pth);
      const safeNow = safetyOf(path) === 0;
      if (!feedsSpin && zone <= PLACE.jumpZoneRadius && safeNow) continue;
      if (feedsSpin && Math.hypot(m.x, m.y) <= PLACE.jumpZoneRadius && safeNow) continue;
      await place('place ' + sg.lib.name, i, measure, (pth) => zoneOf(pth) <= PLACE.jumpZoneRadius && safetyOf(pth) === 0);
      for (let j = 0; j <= i; j++) frozen.add(j);
      await greedy('re-steer', 1);
      path = buildPath(program);
    }
  };
  // then any spin still far from centre
  const fixSpins = async () => {
    for (let i = 0; i < path.segs.length; i++) {
      const sg = path.segs[i];
      if (sg.lib.cat !== 'spins') continue;
      const m = sampleAt(path, (sg.t0 + sg.t1) / 2);
      if (Math.hypot(m.x, m.y) <= PLACE.spinMaxFromCentre) continue;
      const tm = (sg.t0 + sg.t1) / 2;
      const distOf = (pth) => { const q = sampleAt(pth, tm); return Math.hypot(q.x, q.y); };
      await place('centre ' + sg.lib.name, i, distOf, (pth) => distOf(pth) <= PLACE.spinMaxFromCentre);
      for (let j = 0; j <= i; j++) frozen.add(j);
      await greedy('re-steer', 1);
      path = buildPath(program);
    }
  };
  await fixJumps(0);
  await fixSpins();

  // Then use both ends of the rink. Greedy steering never finds this on its
  // own: covering the far end takes several elements pointing the same way at
  // once, and once the jumps are placed everything in front of them is frozen.
  // So if an end third is under-used, try sending each corner jump to a corner
  // on THAT end, re-place everything after it, and keep the change only if the
  // program scores better overall.
  const endsOf = (pth) => { let le = 0, re = 0; for (const q of pth.samples) { if (q.x < -RINK.L / 6) le++; else if (q.x > RINK.L / 6) re++; } return [le / pth.samples.length, re / pth.samples.length]; };
  const score = () => { const pth = buildPath(program); return placementScore(analyzePlacement(program, pth), analyze(program, pth), pth); };
  // The half-ice step sequence is a placement problem: it runs from wherever
  // the jump before it lands to wherever the next anchor is, so it only
  // stretches when that jump lands deep in a corner pointing down the rink.
  // If it is short, joint-search the approach to that jump for the span.
  // the same footprint analyzePlacement measures: the sequence's turns, steps, edges and choreo
  const spanOf = (pth) => { let a = 1e9, b = -1e9; const ids = new Set();
    for (const sg of pth.segs) if (sg.inst.chst && ['turns', 'steps', 'edges', 'choreo'].includes(sg.lib.cat)) ids.add(sg.ei);
    if (!ids.size) return 1;
    for (const q of pth.samples) { if (!ids.has(q.ei)) continue; a = Math.min(a, q.x); b = Math.max(b, q.x); }
    return (b - a) / RINK.L; };
  if (spanOf(path) < PLACE.chstLengthShare) {
    const first = path.segs.findIndex((sg) => sg.inst.chst);
    let jb = -1; for (let i = first - 1; i >= 0 && i >= first - 3; i--) if (jumpStartAt(path, i)) { jb = i; break; }
    if (jb > 0) {
      const savedAims = program.elements.map((e) => e.aim || 0), savedFrozen = [...frozen];
      for (let j = Math.max(1, jb - 9); j < program.elements.length; j++) if (!userFrozen.has(j)) frozen.delete(j);
      const t0 = path.segs[jb].t0;
      const zoneAt = (pth) => { const q = sampleAt(pth, t0); return Math.min(Math.hypot(q.x, q.y), ...PLACE.corners.map((c) => Math.hypot(q.x - c[0], q.y - c[1]))); };
      const measure = (pth) => Math.max(0, PLACE.chstLengthShare - spanOf(pth)) * 100 + Math.max(0, zoneAt(pth) - PLACE.jumpZoneRadius) * 2;
      const before = placementScore(analyzePlacement(program, path), analyze(program, path), path);
      await place('stretch step sequence', jb, measure, (pth) => spanOf(pth) >= PLACE.chstLengthShare && zoneAt(pth) <= PLACE.jumpZoneRadius);
      for (let j = 0; j <= jb; j++) frozen.add(j);
      await greedy('re-steer', 1);
      path = buildPath(program);
      // still short: the sequence itself doubles back — joint-search the aims
      // of its own turns (the four longest before its last element) for span
      if (spanOf(path) < PLACE.chstLengthShare) {
        let last = first; for (let i = first; i < path.segs.length && path.segs[i].inst.chst; i++) last = i;
        const spanPen = (pth) => Math.max(0, PLACE.chstLengthShare - spanOf(pth)) * 100;
        await joint('straighten step sequence', last + 1, spanPen, 4, [-40, -27, -13, 0, 13, 27, 40]);
        path = buildPath(program);
      }
      await fixJumps(jb + 1); await fixSpins();
      const after = placementScore(analyzePlacement(program, path), analyze(program, path), path);
      if (after > before) { savedAims.forEach((v, j) => { program.elements[j].aim = v; }); frozen.clear(); savedFrozen.forEach((j) => frozen.add(j)); path = buildPath(program); }
    }
  }

  // Moving one jump to the short end can leave the other end short; so loop:
  // fix the shorter end, re-measure, up to three times.
  for (let iter = 0; iter < 3 && !opts.noSpread; iter++) {
    const [le0, re0] = endsOf(path);
    if (Math.min(le0, re0) >= PLACE.endShare) break;
    const sign = le0 < re0 ? -1 : 1;
    const endCorners = PLACE.corners.filter((c) => Math.sign(c[0]) === sign);
    let baseScore = score(), kept = false;
    for (let i = 0; i < path.segs.length; i++) {
      if (!jumpStartAt(path, i) || feedsSpinAt(path, i)) continue;
      const m = sampleAt(path, path.segs[i].t0);
      const dNow = Math.min(...endCorners.map((c) => Math.hypot(m.x - c[0], m.y - c[1])));
      if (dNow <= PLACE.jumpZoneRadius) continue;               // already on that end
      const savedAims = program.elements.map((e) => e.aim || 0), savedFrozen = [...frozen];
      let prev = 0;
      for (let k = i - 1; k > 0; k--) if (path.segs[k].lib.cat === 'jumps' || path.segs[k].lib.cat === 'spins') { prev = k; break; }
      for (let j = prev + 1; j < program.elements.length; j++) if (!userFrozen.has(j)) frozen.delete(j);
      const t0 = path.segs[i].t0, name = path.segs[i].lib.name;
      const dEnd = (pth) => { const q = sampleAt(pth, t0); return Math.min(...endCorners.map((c) => Math.hypot(q.x - c[0], q.y - c[1]))); };
      await place('spread ' + name, i, dEnd, (pth) => dEnd(pth) <= PLACE.jumpZoneRadius);
      for (let j = 0; j <= i; j++) frozen.add(j);
      await greedy('re-steer', 1);
      path = buildPath(program);
      await fixJumps(i + 1);
      await fixSpins();
      const sc = score();
      if (opts.log) opts.log(`spread ${name}: corner distance ${dNow.toFixed(1)} -> ${dEnd(path).toFixed(1)} m, ends ${endsOf(path).map((v) => (v * 100).toFixed(0)).join('/')}, score ${baseScore.toFixed(1)} -> ${sc.toFixed(1)} ${sc < baseScore ? 'kept' : 'reverted'}`);
      if (sc < baseScore) { baseScore = sc; kept = true; if (Math.min(...endsOf(path)) >= PLACE.endShare) break; }
      else { savedAims.forEach((v, j) => { program.elements[j].aim = v; }); frozen.clear(); savedFrozen.forEach((j) => frozen.add(j)); path = buildPath(program); }
    }
    if (!kept) break;
  }
  // Last mile: if any rule is still missed by a hair (an end at 17%, a spin at
  // 7.2 m), polish every free aim on a fine grid against the placement score
  // itself — the thing the multi-start keeps — with the lean cost as the
  // tie-breaker so coverage is not thrown away for nothing.
  if (!opts.noPolish) {
    frozen.clear(); userFrozen.forEach((j) => frozen.add(j));
    const pcost = () => score() * 100 + cost() * 0.01;
    const fine = [-40, -32, -24, -16, -10, -5, 0, 5, 10, 16, 24, 32, 40];
    const before = score();
    await greedy('polish', 2, pcost, fine);
    path = buildPath(program);
    if (opts.log) opts.log(`polish: placementScore ${before.toFixed(1)} -> ${score().toFixed(1)}, ends ${endsOf(path).map((v) => (v * 100).toFixed(0)).join('/')}`);
  }
  onProgress('done', 1);
  return analyzePlacement(program, path);
}

/**
 * The steering pipeline is deterministic and greedy, so where it ends up
 * depends on where it starts. Run it from a few different initial aims and
 * keep the best by the skater's placement rules. Slower, but it is what
 * actually solved the programs the single run got stuck on.
 */
function placementScore(q, a, path) {
  // Every rule the skater stated is a STEP (a miss costs 10 even by a hair)
  // plus a slope, so a hard miss always outranks any soft preference; the
  // soft terms (rotation near 50, finish near centre) only break ties.
  // A cleared rule earns a small reward for MARGIN (capped), so the polish does
  // not stop the instant a floor is met by a hair — 18.05% is not "covered".
  const miss = (short, slope, cap = 0, gain = 0) => (short > 0 ? 10 + short * slope : -Math.min(cap, -short) * gain);
  let ends = 0, endD = 0;
  if (path && path.samples.length) {
    let le = 0, re = 0; const sm = path.samples;
    for (const s of sm) { if (s.x < -RINK.L / 6) le++; else if (s.x > RINK.L / 6) re++; }
    ends = miss(PLACE.endShare - le / sm.length, 300, 0.05, 20) + miss(PLACE.endShare - re / sm.length, 300, 0.05, 20);
    const last = sm[sm.length - 1]; endD = Math.hypot(last.x, last.y);
  }
  const [rLo, rHi] = PLACE.rotationBand;
  const rot = Math.max(0, rLo - a.rotation.ccw, a.rotation.ccw - rHi);
  const chst = q.chstSpan ? miss(PLACE.chstLengthShare - q.chstSpan.lengthFrac, 300, 0.08, 12) : 0;
  const sides = q.sides ? miss(PLACE.sideShare - q.sides.top, 300, 0.05, 20) + miss(PLACE.sideShare - q.sides.bottom, 300, 0.05, 20) : 0;
  const corners = q.cornerSeconds ? q.cornerSeconds.reduce((t, v) => t + miss(PLACE.cornerSeconds - v, 10, 1, 1), 0) : 0;
  const lobes = q.lobes ? q.lobes.reduce((t, l) => { const L = PLACE.lobe, deg = Math.abs(l.turn);
    return t + (l.ok ? 0 : 10 + Math.max(0, L.minTurn - deg, deg - L.maxTurn) * 0.5 + Math.max(0, L.minRadius - l.radius, l.radius - L.maxRadius) * 2); }, 0) : 0;
  const cover = q.coveragePct != null ? Math.max(0, PLACE.coverageTarget - q.coveragePct) * 0.5 - Math.min(6, Math.max(0, q.coveragePct - PLACE.coverageTarget)) * 0.3 : 0;   // soft: no step
  // the coach's safety rules: a jump near the boards, a landing with no
  // runway, emergency steering inside a jump or spin — each a step and a
  // slope, so the steer works them like every other rule
  const safety = q.jumps.reduce((t, j) => t
    + miss(PLACE.jumpBoardsMin - Math.min(j.boardsAtTakeoff == null ? 99 : j.boardsAtTakeoff, j.boardsAtLanding == null ? 99 : j.boardsAtLanding), 4, 3, 0.5)
    + miss(PLACE.jumpRunwayMin - (j.runway == null ? 99 : j.runway), 2, 5, 0.3)
    + miss((j.steerInside || 0) - PLACE.steerInsideMax, 0.5), 0)
    + q.spins.reduce((t, sp) => t + miss((sp.steerInside || 0) - PLACE.steerInsideMax, 0.5), 0)
    + (q.steeredInsideElements || []).reduce((t, e) => t + miss((e.degrees || 0) - PLACE.steerInsideMax, 0.5), 0);
  return q.offIce * 100 + ends + chst + sides + corners + lobes + cover + safety
    + q.spins.reduce((t, sp) => t + miss(sp.fromCentre - PLACE.spinMaxFromCentre, 5, 2, 0.3), 0)
    + q.jumps.filter((j) => !j.ok).length * 15
    + q.jumps.filter((j) => j.awkward || !j.builtSpeed).length * 5
    + miss(rot, 2) + miss(endD - PLACE.finishFromCentre, 3)
    + Math.abs(a.rotation.ccw - 50) * 0.3 + Math.max(0, endD - 3.5) * 0.2;
}

async function steerProgramMulti(program, opts = {}) {
  const starts = opts.starts || [0, -32, -16, 16];
  const onProgress = opts.onProgress || (() => {});
  // the aims the program arrives with are a candidate too: a continuation
  // run must never hand back something worse than it was given
  let best = null;
  { const path = buildPath(program), q = analyzePlacement(program, path), a = analyze(program, path);
    best = { score: placementScore(q, a, path), aims: program.elements.map((e) => e.aim || 0), q }; }
  for (let k = 0; k < starts.length; k++) {
    const start = starts[k];
    const fro = new Set(opts.frozen || []);
    // a start of 'keep' runs the pipeline from the aims the program already has
    if (start !== 'keep') program.elements.forEach((e, i) => { if (!fro.has(i)) e.aim = start; });
    await steerProgramAsync(program, { frozen: opts.frozen, log: opts.log, onProgress: (st, f) => onProgress(`${st} (start ${k + 1}/${starts.length})`, f) });
    const path = buildPath(program);
    const q = analyzePlacement(program, path), a = analyze(program, path);
    const sc = placementScore(q, a, path);
    if (!best || sc < best.score) best = { score: sc, aims: program.elements.map((e) => e.aim || 0), q };
    // good enough: every placement rule the score counts is met — on the ice,
    // spins and jumps placed, rotation in the band, both ends, both sides,
    // every corner circle, the crossover lobes and the half-ice sequence
    const chstOk = !q.chstSpan || q.chstSpan.lengthFrac >= PLACE.chstLengthShare;
    if (q.offIce <= PLACE.offIceTolerance && q.spins.every((sp) => sp.ok) && q.jumps.every((j) => j.ok)
      && a.rotation.ccw >= PLACE.rotationBand[0] && a.rotation.ccw <= PLACE.rotationBand[1]
      && q.ends.ok && q.sides.ok && q.cornersOk && q.lobes.every((l) => l.ok) && chstOk) break;
  }
  program.elements.forEach((e, i) => { e.aim = best.aims[i]; });
  return best.q;
}

/**
 * THE RULEBOOK, one row per rule. Every threshold is read from PLACE (or the
 * level's rules); every consumer — the checker's warnings, the harness's
 * `score` misses and its `--summary` — reads these rows, so a number cannot
 * pass in one place and fail in another.
 *   rule    the name the score prints           tag   unsafe | craft | soft
 *   value   what was measured                   floor the threshold
 *   op      'min' (value >= floor) or 'max'     margin  signed, + = clear
 *   status  PASS | THIN | MISS (a soft rule reads SOFT when under)
 *   where   { idx, libId, count } of the element concerned, or null
 *   n       how many elements miss this rule    lever what usually fixes it
 */
function placementRules(program, path, analysis, q, sq) {
  const rows = [];
  // a tagged item from analyzePlacement, or a bare seg
  const at = (x) => (!x ? null : x.idx != null ? { idx: x.idx, libId: x.libId, count: x.count } : x.ei != null ? { idx: x.ei, libId: x.lib.id, count: fmtCount(x.beat0) } : null);
  const rules = (LEVELS[program.level] || LEVELS.open).rules || {};
  const row = (rule, tag, value, floor, op, o = {}) => {
    const margin = o.margin != null ? o.margin : value == null ? Infinity : op === 'max' ? floor - value : value - floor;
    let status = margin < 0 ? 'MISS' : (o.thin && margin < o.thin) ? 'THIN' : 'PASS';
    if (status === 'MISS' && tag === 'soft') status = 'SOFT';
    rows.push({ rule, tag, value, floor, op, unit: o.unit || '', margin, status, where: at(o.at),
      n: o.n != null ? o.n : (status === 'MISS' ? 1 : 0), lever: o.lever || '', msg: o.msg || '', items: o.items || null });
  };
  // the element with the least room: smallest (value - floor) for 'min', largest value for 'max'
  const worst = (items, valueOf, op) => { let w = null;
    for (const it of items) { const v = valueOf(it); if (v == null) continue; if (!w || (op === 'max' ? v > w.v : v < w.v)) w = { it, v }; } return w; };
  const who = (x) => (x ? `#${x.idx} ${x.libId} ${x.count}` : '');
  const named = (x) => `${x.name} at ${fmtTime(x.t)} (${who(x)})`;
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const rot = analysis.rotation.ccw, [rLo, rHi] = PLACE.rotationBand;

  // --- staying on the ice, realistic speeds --------------------------------
  row('offIce', 'unsafe', q.offIce, PLACE.offIceTolerance, 'max', { unit: 's', lever: 'steer again; shorten the run before the boards',
    msg: `${q.offIce.toFixed(1)}s of the routine is off the ice. It has to stay on.` });
  { const w = worst(path.segs.map((s) => ({ s, over: s.speed - (PLACE.maxSpeed[s.lib.cat] || 6) })), (x) => x.over, 'max');
    const f = w && q.tooFast.find((x) => x.idx === w.it.s.ei);
    row('speed.cap', 'unsafe', w ? w.it.s.speed : 0, w ? PLACE.maxSpeed[w.it.s.lib.cat] || 6 : 6, 'max', { unit: 'm/s', at: f, n: q.tooFast.length,
      lever: 'more beats, or a shorter element (lib minB)', items: q.tooFast,
      msg: f ? `${named(f)} runs ${f.speed.toFixed(1)} m/s — over ${f.cap} m/s is not realistic at this level. Give it more beats.` : '' }); }
  { const w = worst(q.steeredInsideElements.length ? q.steeredInsideElements : [], (x) => x.degrees, 'max');
    const all = path.segs.filter((s) => ['jumps', 'spins', 'field'].includes(s.lib.cat));
    const mx = w ? w.it.degrees : Math.max(0, ...(q.jumps.map((j) => j.steerInside)), ...(q.spins.map((s) => s.steerInside)));
    row('steered', 'unsafe', mx, PLACE.steerInsideMax, 'max', { unit: '°', at: w && w.it, n: q.steeredInsideElements.length, items: q.steeredInsideElements,
      lever: 'aim the approach so the element does not run at the boards',
      msg: w ? `${named(w.it)} is bent ${w.it.degrees.toFixed(0)}° by emergency steering while the skater is committed to it — aim the approach instead.` : '' }); }

  // --- rotation, ends, sides, corners, coverage, lobes -----------------------
  row('rotation', 'craft', rot, `${rLo}–${rHi}`, 'in', { unit: '% CCW', margin: Math.min(rot - rLo, rHi - rot), lever: 'mirror a crossover run in the chain, not the steer',
    msg: `Rotation is ${rot.toFixed(0)}% counter-clockwise — outside the ${rLo}–${rHi}% band that reads as balanced.` });
  row('ends', 'craft', Math.min(q.ends.left, q.ends.right), PLACE.endShare, 'min', { unit: '', thin: 0.01, lever: 'start.heading faces the short end; --starts; the spread stage',
    msg: `One end of the rink is barely used (${pct(q.ends.left)} / ${pct(q.ends.right)} of the skating in each end third) — both ends want ${pct(PLACE.endShare)}.` });
  row('sides', 'craft', Math.min(q.sides.top, q.sides.bottom), PLACE.sideShare, 'min', { unit: '', thin: 0.01, lever: 'another start (--starts); aim the crossover runs across',
    msg: `One side of the rink is barely used (${pct(q.sides.top)} / ${pct(q.sides.bottom)} of the skating on each side) — full ice means both sides too.` });
  row('corners', 'craft', Math.min(...q.cornerSeconds), PLACE.cornerSeconds, 'min', { unit: 's', thin: 0.2, lever: 'send a corner jump to the empty corner (spread stage)',
    msg: `Corner circles visited for ${q.cornerSeconds.map((v) => v.toFixed(1)).join(' / ')} s — every corner should get at least ${PLACE.cornerSeconds} s.` });
  row('coverage', 'soft', q.coveragePct, PLACE.coverageTarget, 'min', { unit: '%', lever: 'more starts; longer lobes',
    msg: `${Math.round(q.coveragePct)}% of the ice is covered — full ice coverage wants ${PLACE.coverageTarget}% or more.` });
  { const bad = q.lobes.filter((l) => !l.ok), L = PLACE.lobe;
    const w = worst(bad, (l) => Math.max(0, L.minTurn - Math.abs(l.turn), Math.abs(l.turn) - L.maxTurn) * 0.5 + Math.max(0, L.minRadius - l.radius, l.radius - L.maxRadius) * 2, 'max');
    const l = w && w.it;
    row('lobes', 'craft', l ? `${Math.abs(l.turn)}° r${l.radius.toFixed(1)}` : 'ok', `${L.minTurn}–${L.maxTurn}° r${L.minRadius}–${L.maxRadius}`, 'in', { margin: bad.length ? -1 : 1, at: l, n: bad.length, items: q.lobes,
      lever: 'radiusScale on the run, or another aim',
      msg: l ? `${named(l)} ${Math.abs(l.turn) < L.minTurn ? 'run nearly straight' : Math.abs(l.turn) > L.maxTurn ? 'corkscrew round ' + Math.abs(l.turn) + '°' : 'sit on a ' + l.radius.toFixed(1) + ' m radius'} — crossovers are skated on an edge: a lobe of ${L.minTurn}–${L.maxTurn}° on a ${L.minRadius}–${L.maxRadius} m circle.` : '' }); }

  // --- spins ------------------------------------------------------------------
  { const w = worst(q.spins, (s) => s.fromCentre, 'max');
    row('spin.centre', 'craft', w ? w.v : 0, PLACE.spinMaxFromCentre, 'max', { unit: 'm', thin: 0.3, at: w && w.it, n: q.spins.filter((s) => !s.ok).length, lever: 'joint search of the approach; the jump feeding it goes to centre',
      msg: w && !w.it.ok ? `${named(w.it)} is ${w.v.toFixed(1)} m from centre — spins want to be near the middle.` : '' }); }
  if (rules.spinMinRev) {
    const w = worst(q.spins.flatMap((s) => Object.entries(s.revs).map(([pos, r]) => ({ s, pos, r }))), (x) => x.r, 'min');
    row('spin.revs', 'craft', w ? w.v : null, rules.spinMinRev, 'min', { unit: 'rev', at: w && w.it.s, n: q.spins.filter((s) => s.underRev.length).length, lever: 'more beats on the spin, or a shorter first position',
      msg: w && w.v < rules.spinMinRev ? `${named(w.it.s)}: ${w.it.pos} position gets ${w.v.toFixed(1)} revolutions — the level wants ${rules.spinMinRev} in every position (${q.spins.map((s) => Object.entries(s.revs).map(([p, r]) => `${p} ${r.toFixed(1)}`).join(', ')).join('; ')}).` : '' });
  }
  { const w = worst(q.spins, (s) => -Math.min(s.revPerSec - PLACE.spinRevPerSec[0], PLACE.spinRevPerSec[1] - s.revPerSec), 'max');
    const s = w && w.it;
    row('spin.revPerSec', 'unsafe', s ? s.revPerSec : null, `${PLACE.spinRevPerSec[0]}–${PLACE.spinRevPerSec[1]}`, 'in', { unit: 'rev/s', margin: s ? -w.v : Infinity, at: s, n: q.spins.filter((x) => !x.revPerSecOk).length,
      lever: 'beats on the spin: 6 beats of scratch spin is 3.8 rev/s',
      msg: s && !s.revPerSecOk ? `${named(s)} turns ${s.revPerSec.toFixed(1)} rev/s (${s.totalRev} revolutions in ${s.seconds.toFixed(1)} s) — a real spin sits between ${PLACE.spinRevPerSec[0]} and ${PLACE.spinRevPerSec[1]}.` : '' }); }
  { const w = worst(q.spins, (s) => s.entrySpeed, 'max');
    row('spin.entry', 'craft', w ? w.v : null, PLACE.spinEntrySpeedMax, 'max', { unit: 'm/s', at: w && w.it, n: q.spins.filter((s) => s.entrySpeed > PLACE.spinEntrySpeedMax).length, lever: 'a slower edge into the spin',
      msg: w && w.v > PLACE.spinEntrySpeedMax ? `${named(w.it)} is entered at ${w.v.toFixed(1)} m/s from ${w.it.entry} — over ${PLACE.spinEntrySpeedMax} m/s is hard to centre.` : '' }); }
  { const min = placeFor(program, 'spinSetupSecondsMin'), w = worst(q.spins, (s) => s.setup, 'min');
    row('spin.setup', 'craft', w ? w.v : null, min, 'min', { unit: 's', at: w && w.it, n: q.spins.filter((s) => s.setup < min).length,
      lever: 'a plain edge between the shape before and the spin entry',
      msg: w && w.v < min ? `${named(w.it)} is entered off ${w.it.entry} with ${w.v.toFixed(1)} s of skating into it — a spin needs ${min} s of quiet edge to set up on.` : '' }); }

  // --- jumps: zone, entry, speed, safety, ordering ----------------------------
  { const w = worst(q.jumps, (j) => j.zoneDist, 'max');
    const bad = q.jumps.filter((j) => !j.ok);
    row('jump.zone', 'craft', w ? w.v : 0, PLACE.jumpZoneRadius, 'max', { unit: 'm', at: bad[0] || (w && w.it), n: bad.length, items: q.jumps.map((j) => ({ idx: j.idx, libId: j.libId, count: j.count, where: j.where })),
      lever: 'a jump within nine elements of a spin is pinned to centre; --frozen the front and re-steer the rest',
      msg: bad[0] ? `${named(bad[0])} is in mid-ice — jumps go near centre or in a corner where the crossovers build speed.` : '' }); }
  { const bad = q.jumps.filter((j) => j.awkward);
    row('jump.entry', 'craft', bad.length, 0, 'max', { unit: '', at: bad[0], n: bad.length, lever: 'a simple turn or an edge before the jump',
      msg: bad[0] ? `${named(bad[0])} is entered straight off ${bad[0].entry} — that is an awkward edge to jump from. Use a simple turn or an edge.` : '' }); }
  { const bad = q.jumps.filter((j) => !j.builtSpeed);
    row('jump.builtSpeed', 'craft', bad.length, 0, 'max', { unit: '', at: bad[0], n: bad.length, lever: 'crossovers or stroking in the two elements before',
      msg: bad[0] ? `${named(bad[0])} has no crossovers or stroking in the two elements before it — nothing is building speed.` : '' }); }
  { const w = worst(q.jumps, (j) => j.speedRatio, 'max');
    row('jump.speedRatio', 'craft', w ? w.v : null, PLACE.jumpSpeedRatioCheck, 'max', { unit: 'x', at: w && w.it, n: q.jumps.filter((j) => j.speedRatio > PLACE.jumpSpeedRatioCheck).length,
      lever: 'faster connectors (fewer beats) or a longer jump element',
      msg: w && w.v > PLACE.jumpSpeedRatioCheck ? `${named(w.it)} goes ${w.it.speed.toFixed(1)} m/s off connectors averaging ${w.it.connSpeed.toFixed(1)} m/s (×${w.v.toFixed(2)}) — the speed has to come from somewhere.` : '' }); }
  { const w = worst(q.jumps, (j) => (j.boardsAtTakeoff == null ? null : Math.min(j.boardsAtTakeoff, j.boardsAtLanding)), 'min');
    row('jump.boards', 'unsafe', w ? w.v : null, PLACE.jumpBoardsMin, 'min', { unit: 'm', at: w && w.it, n: q.jumps.filter((j) => j.boardsAtTakeoff != null && Math.min(j.boardsAtTakeoff, j.boardsAtLanding) < PLACE.jumpBoardsMin).length,
      lever: 'aim the run-in down the rink; the jump zone is 9 m from a corner anchor, not the corner',
      msg: w && w.v < PLACE.jumpBoardsMin ? `${named(w.it)} is ${w.it.boardsAtTakeoff.toFixed(1)} m from the boards at takeoff and ${w.it.boardsAtLanding.toFixed(1)} m at landing — keep ${PLACE.jumpBoardsMin} m.` : '' }); }
  { const w = worst(q.jumps, (j) => j.runway, 'min');
    row('jump.runway', 'unsafe', w ? w.v : null, PLACE.jumpRunwayMin, 'min', { unit: 'm', at: w && w.it, n: q.jumps.filter((j) => j.runway != null && j.runway < PLACE.jumpRunwayMin).length,
      lever: 'land pointing along the rink, not at the boards',
      msg: w && w.v < PLACE.jumpRunwayMin ? `${named(w.it)} lands with ${w.v.toFixed(1)} m of ice ahead before the boards — a landing wants ${PLACE.jumpRunwayMin} m of runway.` : '' }); }
  { const w = worst(q.jumps, (j) => j.edgeSeconds, 'min');
    row('jump.edge', 'unsafe', w ? w.v : null, PLACE.jumpEdgeSecondsMin, 'min', { unit: 's', at: w && w.it, n: q.jumps.filter((j) => j.edgeSeconds < PLACE.jumpEdgeSecondsMin).length,
      lever: 'a longer edge on the takeoff code before the jump (the exit of the element before must be the takeoff edge)',
      msg: w && w.v < PLACE.jumpEdgeSecondsMin ? `${named(w.it)} takes off after only ${w.v.toFixed(2)} s on its takeoff edge — hold it ${PLACE.jumpEdgeSecondsMin} s.` : '' }); }
  { const late = q.jumps.filter((j) => j.hardest && j.late);
    const w = worst(late, (j) => j.fatigue, 'max');
    row('jump.fatigue', 'soft', w ? w.v : 0, PLACE.fatigueMax, 'max', { unit: '', at: w && w.it, n: w && w.v > PLACE.fatigueMax ? 1 : 0, items: q.jumps.map((j) => ({ idx: j.idx, libId: j.libId, fatigue: +j.fatigue.toFixed(2) })),
      lever: 'move the hardest jump earlier, or a quieter run into it',
      msg: w && w.v > PLACE.fatigueMax ? `${named(w.it)} is the hardest jump and sits in the last ${Math.round(PLACE.lateJumpShare * 100)}% of the program at ${Math.round(w.v * 100)}% of peak fatigue.` : '' }); }
  { const w = worst(q.jumps.filter((j) => j.beatsAfterTurn != null), (j) => j.beatsAfterTurn, 'min');
    row('jump.afterTurn', 'craft', w ? w.v : null, PLACE.chstToJumpBeats, 'min', { unit: 'beats', at: w && w.it, n: w && w.v < PLACE.chstToJumpBeats ? 1 : 0,
      lever: 'end the sequence on an edge of two beats before the takeoff',
      msg: w && w.v < PLACE.chstToJumpBeats ? `${named(w.it)} takes off ${w.v.toFixed(1)} beats after the last turn of the step sequence — give it ${PLACE.chstToJumpBeats}.` : '' }); }
  row('held.before', 'soft', q.heldBefore.length, 0, 'max', { unit: '', at: q.heldBefore[0], n: q.heldBefore.length, lever: 'an edge between the held shape and the jump or spin',
    msg: q.heldBefore[0] ? `${named(q.heldBefore[0])} comes straight out of ${q.heldBefore[0].held}, a two-footed held shape — there is no edge to take off from.` : '' });

  // --- stops, seams, glides, start and finish ---------------------------------
  { const w = worst(q.afterStop, (x) => x.speed, 'max');
    row('stop.exit', 'craft', w ? w.v : 0, PLACE.afterStopSpeedMax, 'max', { unit: 'm/s', at: w && w.it, n: q.afterStop.length, lever: 'a stroke, crossover or chassé after the stop',
      msg: w ? `${named(w.it)} starts at ${w.v.toFixed(1)} m/s straight after ${w.it.after} — after a stop the skater has no speed; push first.` : '' }); }
  { const w = worst(q.speedStep, (x) => Math.abs(x.delta), 'max');
    row('speedStep', 'craft', w ? w.v : 0, PLACE.speedStepMax, 'max', { unit: 'm/s', at: w && w.it, n: q.speedStep.length, items: q.speedStep, lever: 'match the beats of the two elements to their distances',
      msg: w ? `${named(w.it)} goes from ${w.it.from.toFixed(1)} to ${w.it.to.toFixed(1)} m/s at the seam — a ${Math.abs(w.it.delta).toFixed(1)} m/s step no skater makes.` : '' }); }
  row('glide', 'craft', q.glide.seconds, PLACE.maxGlideSeconds, 'max', { unit: 's', at: q.glide.before, lever: 'shorten a connector instead of anchoring with glide',
    msg: q.glide.before ? `${q.glide.seconds.toFixed(1)} s of glide before ${named(q.glide.before)} — the pattern reads as waiting. Shorten a connector.` : '' });
  row('start', 'craft', q.startFromCentre, PLACE.startFromCentre, 'max', { unit: 'm', lever: 'program.start.x/y',
    msg: `The program starts ${q.startFromCentre.toFixed(1)} m from centre — the opening wants to be near the middle.` });
  row('finish', 'craft', q.finishFromCentre, PLACE.finishFromCentre, 'max', { unit: 'm', lever: 'the aims of the last elements (polish)',
    msg: `The program finishes ${q.finishFromCentre.toFixed(1)} m from centre — the final pose wants to be near the middle.` });
  row('builders', 'craft', q.builderShare, PLACE.speedBuilderShare, 'min', { unit: '', lever: 'crossovers and stroking instead of held edges',
    msg: `Only ${Math.round(q.builderShare * 100)}% of the connecting material builds speed (crossovers, stroking, power pulls, swing rolls) — the rest is turns and held edges.` });

  { const min = placeFor(program, 'jumpRunInSecondsMin'), w = worst(q.jumps, (j) => j.runIn, 'min');
    row('jump.runIn', 'craft', w ? w.v : null, min, 'min', { unit: 's', at: w && w.it, n: q.jumps.filter((j) => j.runIn < min).length,
      lever: 'plain skating (an edge, a swing roll, crossovers) in front of the takeoff turn, not more footwork',
      msg: w && w.v < min ? `${named(w.it)} has ${w.v.toFixed(1)} s of plain skating in front of it — a jump is approached with room to skate, not out of a corridor of turns (${min} s).` : '' }); }
  { const min = placeFor(program, 'jumpRecoverySecondsMin'), w = worst(q.jumps, (j) => j.recovery, 'min');
    row('jump.recovery', 'craft', w ? w.v : null, min, 'min', { unit: 's', at: w && w.it, n: q.jumps.filter((j) => j.recovery < min).length,
      lever: 'an edge or a roll after the landing before the next turn or shape',
      msg: w && w.v < min ? `${named(w.it)} lands straight into ${'the next element'} — give the landing ${min} s of skating to check out and finish.` : '' }); }
  { const min = placeFor(program, 'jumpGapSecondsMin'), spaced = q.jumps.filter((j) => j.sinceJump != null);
    const w = worst(spaced, (j) => j.sinceJump, 'min');
    row('jump.spacing', 'craft', w ? w.v : null, min, 'min', { unit: 's', at: w && w.it, n: spaced.filter((j) => j.sinceJump < min).length,
      lever: 'move a jump to another phrase; the music usually offers one',
      msg: w && w.v < min ? `${named(w.it)} comes ${w.v.toFixed(1)} s after the previous jump — jumps want ${min} s between them to prepare and land.` : '' }); }
  { const min = placeFor(program, 'heldSecondsMin'), w = worst(q.heldShapes, (h) => h.seconds, 'min');
    row('held.seconds', 'craft', w ? w.v : null, min, 'min', { unit: 's', at: w && w.it, n: q.heldShapes.filter((h) => !h.ok).length,
      lever: 'more beats on the shape — a spiral or Bauer that flashes past reads as nothing',
      msg: w && w.v < min ? `${named(w.it)} is held ${w.v.toFixed(1)} s — under ${min} s a held shape does not read.` : '' }); }
  { const max = placeFor(program, 'connectorDiffMax');
    row('connector.difficulty', 'craft', q.hardConnectors.length ? Math.max(...q.hardConnectors.map((h) => h.diff)) : 0, max, 'max',
      { unit: '', at: q.hardConnectors[0], n: q.hardConnectors.length,
        lever: 'the step sequence is where difficulty belongs; connect with material the skater owns',
        msg: q.hardConnectors.length ? `${q.hardConnectors.length} connecting element(s) above difficulty ${max} outside the step sequence (${q.hardConnectors.map((h) => h.libId).join(', ')}) — risk for nothing.` : '' }); }

  // --- the step sequence -------------------------------------------------------
  if (q.chstSpan) {
    row('chst.span', 'craft', q.chstSpan.lengthFrac, PLACE.chstLengthShare, 'min', { unit: '', thin: 0.02, at: sq && sq.first, lever: 'the jump before the sequence lands deep in a corner pointing down the rink (stretch stage)',
      msg: `The step sequence covers ${Math.round(q.chstSpan.lengthFrac * 100)}% of the rink's length — it wants over half the ice.` });
  }
  if (sq) {
    // how many difficult turns a sequence wants is a LEVEL question (a Pre-Pre
    // skater's sequence is threes and mohawks; an Aspire 4 ChSt wants what the
    // vocabulary allows): the level's rules set the floor, else the general one
    const lv = LEVELS[program && program.level] || {}, lr = lv.rules || lv.aspire || {};
    const dMin = lr.chstDifficultMin != null ? lr.chstDifficultMin : PLACE.chstDifficultMin;
    const fMin = lr.chstFamiliesMin != null ? lr.chstFamiliesMin : PLACE.chstFamiliesMin;
    row('chst.difficult', dMin > 0 ? 'craft' : 'soft', `${sq.difficult}/${sq.families}`, `${dMin}/${fMin}`, 'min', { unit: 'turns/families', margin: Math.min(sq.difficult - dMin, sq.families - fMin), at: sq.first,
      lever: 'brackets, counters, rockers, choctaws, twizzles, loops — from the skater\'s vocabulary',
      msg: `The step sequence has ${sq.difficult} ISU difficult turns from ${sq.families} families — it wants at least ${dMin} from ${fMin}.` });
    row('chst.turnRate', 'craft', sq.turnsPerSecond, PLACE.chstTurnsPerSecMax, 'max', { unit: 'turns/s', at: sq.first, lever: 'an edge between the clusters',
      msg: `The step sequence packs ${sq.turnsPerSecond.toFixed(2)} turns per second — over ${PLACE.chstTurnsPerSecMax} is a blur.` });
    row('chst.oneFoot', 'unsafe', sq.longestOneFootSeconds, PLACE.chstOneFootMax, 'max', { unit: 's', at: sq.first, lever: 'a change of foot (mohawk, choctaw, chassé) inside the run',
      msg: `The step sequence has ${sq.longestOneFootSeconds.toFixed(1)} s on one foot without a change — over ${PLACE.chstOneFootMax} s the skater runs out of edge.` });
  }
  return rows;
}

/** the placement rules as checker issues: one warning per missed rule, with the element */
function checkPlacement(program, path, issues, analysis) {
  const q = analyzePlacement(program, path), a = analysis || analyze(program, path), sq = analyzeStepSequence(program, path);
  if (q.offIce > PLACE.offIceTolerance) issues.push({ lvl: 'err', msg: `${q.offIce.toFixed(1)}s of the routine is off the ice. It has to stay on.`, rule: 'offIce' });
  for (const r of placementRules(program, path, a, q, sq)) {
    if (r.rule === 'offIce' || (r.status !== 'MISS' && r.status !== 'SOFT') || !r.msg) continue;
    issues.push({ lvl: 'warn', msg: r.msg + (r.n > 1 ? ` (${r.n} elements)` : ''), rule: r.rule, where: r.where });
  }
  if (q.chstSpan && q.chstSpan.lengthFrac >= PLACE.chstLengthShare) {
    const L = Math.round(q.chstSpan.lengthFrac * 100), W = Math.round((q.chstSpan.width / RINK.W) * 100);
    issues.push({ lvl: 'info', msg: `Half-ice check: the step sequence covers ${L}% of the rink's length and ${W}% of its width — one half of the ice, end boards to centre line.` });
  }
  if (!q.memorable) issues.push({ lvl: 'info', msg: `${q.distinct} distinct elements (${q.oneOffs} used only once). Fewer, repeated pieces are easier to remember.` });
}

/**
 * Level-specific rules from a level's `rules` block (any subset of the fields
 * used below). Written for USFS Aspire 4 first; any level's rubric can be
 * encoded the same way — see the level-rules skill.
 */
function checkLevelRules(L, path, issues) {
  const A = L.rules || L.aspire;
  const jumps = path.segs.filter((s) => s.lib.cat === 'jumps');
  const spins = path.segs.filter((s) => s.lib.cat === 'spins');

  // permitted jump list
  if (A.permittedJumps) {
    const illegal = [...new Set(jumps.filter((s) => !A.permittedJumps.includes(s.lib.id)).map((s) => s.lib.name))];
    if (illegal.length) issues.push({ lvl: 'err', msg: `Not permitted at ${L.name}: ${illegal.join(', ')}.` });
  }

  // max N of any same jump
  if (A.maxSameJump) {
    const counts = {};
    for (const s of jumps) counts[s.lib.name] = (counts[s.lib.name] || 0) + 1;
    const over = Object.entries(counts).filter(([, n]) => n > A.maxSameJump).map(([n, c]) => `${n} ×${c}`);
    if (over.length) issues.push({ lvl: 'err', msg: `Max ${A.maxSameJump} of any same jump — you have ${over.join(', ')}.` });
  }

  // combinations = runs of adjacent jump elements with nothing between them
  // (a jump after a glide starts a new element — comboContinues)
  const runs = [];
  let run = 0;
  for (let i = 0; i < path.segs.length; i++) {
    const s = path.segs[i];
    if (s.lib.cat === 'jumps') { if (run && !comboContinues(path.segs, i)) { if (run > 1) runs.push(run); run = 0; } run++; }
    else { if (run > 1) runs.push(run); run = 0; }
  }
  if (run > 1) runs.push(run);
  if (A.maxCombos != null && runs.length > A.maxCombos) {
    issues.push({ lvl: 'err', msg: `${runs.length} jump combinations — max is ${A.maxCombos}.` });
  }
  if (A.maxJumpsPerCombo) {
    const threes = runs.filter((n) => n > A.maxJumpsPerCombo);
    if (threes.length > (A.comboMayHaveThree || 0)) {
      issues.push({ lvl: 'err', msg: `Only ${A.comboMayHaveThree || 0} combination may contain more than ${A.maxJumpsPerCombo} jumps — you have ${threes.length}.` });
    }
    if (threes.some((n) => n > A.maxJumpsPerCombo + 1)) issues.push({ lvl: 'err', msg: `No combination may contain more than ${A.maxJumpsPerCombo + 1} jumps.` });
  }

  // jump-element count is checked generically, but say it in Aspire terms
  const jumpElements = path.segs.length ? runs.reduce((a, b) => a + b, 0) : 0;
  const soloJumps = jumps.length - jumpElements;
  const nElements = soloJumps + runs.length;
  if (nElements > L.maxJumpElements) {
    issues.push({ lvl: 'err', msg: `${nElements} jump elements (${soloJumps} solo + ${runs.length} combination) — max is ${L.maxJumpElements}.` });
  }

  // spins
  if (A.noFlyingSpins) {
    const flying = [...new Set(spins.filter((s) => /flying/i.test(s.lib.name)).map((s) => s.lib.name))];
    if (flying.length) issues.push({ lvl: 'err', msg: `No flying entries at ${L.name}: ${flying.join(', ')}.` });
  }
  const spinIds = spins.map((s) => s.lib.id);
  if (A.noRepeatedSpin !== false && new Set(spinIds).size !== spinIds.length) issues.push({ lvl: 'err', msg: 'A spin may not be repeated.' });
  if (A.requiredSpin && !spinIds.includes(A.requiredSpin)) {
    issues.push({ lvl: 'err', msg: `Missing the required spin — ${A.requiredSpinName || A.requiredSpin}.` });
  }
  if (A.secondSpinOnePosition) {
    const multi = spins.filter((s) => s.lib.id !== A.requiredSpin && /combination|→/.test(s.lib.name));
    if (multi.length) issues.push({ lvl: 'err', msg: `The second spin must be a spin in one position — ${multi[0].lib.name} is not.` });
  }
  if (spins.length && A.spinMinRev) {
    issues.push({ lvl: 'info', msg: `Minimum ${A.spinMinRev} revolutions in every spin position — counted from the held pose spans (spin.revs in the report).` });
  }

  // Step sequence. A ChSt can be a single library "step pattern" element, or a
  // run of individual turns the choreographer has marked as the sequence — that
  // is what a real ChSt is, and it shows every turn by name in the element list.
  const chstRuns = [];
  let chstRun = 0;
  for (const s of path.segs) {
    if (s.inst && s.inst.chst) chstRun++;
    else { if (chstRun) chstRuns.push(chstRun); chstRun = 0; }
  }
  if (chstRun) chstRuns.push(chstRun);
  // a jump, spin, stop or pose cannot be part of the step sequence
  const wrong = path.segs.filter((s) => s.inst && s.inst.chst && (['jumps', 'spins', 'stops'].includes(s.lib.cat) || /^pose-/.test(s.lib.id)));
  if (wrong.length) issues.push({ lvl: 'err', msg: `Marked as step sequence but not a step: ${wrong.map((s) => `#${s.ei} ${s.lib.id} ${fmtCount(s.beat0)}`).join(', ')} — only turns, steps, edges and choreo belong in the ChSt.` });
  // a library step pattern flagged chst is already inside a chst run — count it once
  const steps = path.segs.filter((s) => s.lib.cat === 'steps' && !(s.inst && s.inst.chst));
  const sequences = steps.length + chstRuns.length;
  if (sequences > L.maxStepSeq) {
    issues.push({ lvl: 'err', msg: `${sequences} step sequences — ${L.name} counts exactly ${L.maxStepSeq}.` });
  }
  if (!sequences && L.maxStepSeq) issues.push({ lvl: 'warn', msg: `No step sequence — ${L.name} expects one${A.stepSeqIsChSt ? ' choreographic step sequence (ChSt) over half the ice' : ''}.` });
  if (chstRuns.length === 1) {
    const q = analyzeStepSequence(null, path);
    if (q) {
      issues.push({ lvl: 'info', msg: `ChSt: ${q.elements} turns, ${q.difficult} of them ISU difficult turns `
        + `from ${q.families} families${q.bothFeet ? ', both feet' : ', one foot only'}`
        + `${q.clusters ? `, ${q.clusters} cluster(s) of 3+` : ''}. `
        + (A.stepSeqIsChSt ? `That would be level ${q.level} if a ChSt carried a level — it does not, but it is the right target.` : `Notional level ${q.level}.`) });
      if (q.armFraction < PLACE.chstArmFractionMin) {
        issues.push({ lvl: 'warn', msg: `Only ${Math.round(q.armFraction * 100)}% of the step sequence has authored arm movement — `
          + 'upper body is a scored feature and wants at least a third.' });
      }
    }
  }
  if (A.fieldMovesFree !== false) issues.push({ lvl: 'info', msg: 'Spirals, spread eagles, Ina Bauers and split jumps are allowed anywhere but are not counted as elements.' });
  if (A.source) issues.push({ lvl: 'info', msg: `Level rules encoded from: ${A.source}.` });
}

/** Average line/extension score across the program (Extension Lab) */
function extensionReport(program, path, samplesN = 90) {
  if (!path.totalTime) return null;
  const rows = [];
  let sum = 0, n = 0, peng = 0;
  const perEl = {};
  for (let i = 0; i < samplesN; i++) {
    const t = (i / (samplesN - 1)) * path.totalTime;
    const w = poseAt(program, path, t);
    if (!w) continue;
    const lm = lineMetrics(w._local);
    const pg = penguinScore(w._local);
    sum += lm.overall; n++; peng += pg;
    const ei = w._sample.ei;
    if (ei >= 0) {
      if (!perEl[ei]) perEl[ei] = { sum: 0, n: 0, notes: new Set() };
      perEl[ei].sum += lm.overall; perEl[ei].n++;
      lm.notes.forEach((x) => perEl[ei].notes.add(x));
    }
  }
  for (const [ei, v] of Object.entries(perEl)) {
    const seg = path.segs.find((s) => s.ei === +ei);
    if (seg) rows.push({ ei: +ei, name: seg.lib.name, score: v.sum / v.n, notes: [...v.notes], ext: seg.lib.ext });
  }
  rows.sort((a, b) => a.score - b.score);
  return { overall: n ? sum / n : 0, penguin: n ? peng / n : 0, rows };
}

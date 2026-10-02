#!/usr/bin/env node
/* ============================================================
   tools/harness.js — build, anchor, steer and verify a program WITHOUT the
   browser. Loads the app's own engine into a Node vm context, so every number
   here is the number the app would show.

   Usage
     node tools/harness.js verify  <program.json | presetId> [--summary]   # full report (JSON), or the pass/fail sheet
     node tools/harness.js score   <a.json> [b.json ...]              # one comparable line per program: hard fails, misses, quality
     node tools/harness.js anchor  <program.json> --at "flip#0=16,spin-camel-sit=54,stop-t#1=@141" [--out f.json]
     node tools/harness.js steer   <program.json> [--starts 0,-16,16,-32,keep] [--headings 0,180] [--frozen 0-12,30] [--verbose] [--out f.json]
     node tools/harness.js envelope [--bucket 2]
     node tools/harness.js chain   <program.json>            # print the chain in counts
     node tools/harness.js lib     [category]                # list library elements with codes/dist

   An element may carry `route` (which way this phrase should travel: left,
   right, near, far, diagonal, ne/nw/se/sw) and `zone` (WHERE on the ice it
   should happen: ne/nw/se/sw corners as seen on a diagram from above, e/w
   ends, n/s sides, centre). `verify` reports both under placement.

   A program file is the app's save format: { format, version, program: {...} }.
   `anchor` targets are seconds, or "@beat" for a beat number (counts: beat =
   (N-1)*8 + (M-1)). The last element is stretched to end exactly on the music.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = vm.createContext({
  console, Math, JSON, Date, Set, Map, Array, Object, Number, String, Boolean, Float32Array, Promise,
  setTimeout, clearTimeout, MessageChannel,
  performance: { now: () => Number(process.hrtime.bigint()) / 1e6 },
  window: undefined,
});
for (const f of ['util.js', 'poses.js', 'library.js', 'engine.js', 'presets.js', 'local.js']) {
  if (!fs.existsSync(path.join(ROOT, 'js', f))) continue;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
}
const E = (expr) => vm.runInContext(expr, ctx);
const G = ctx; // globals live on the context

// ---------- music -----------------------------------------------------------
// The envelope is music/<track>-envelope.json. Which track: --track <name>,
// else the program's musicName, else the only envelope in music/.
let ENV_TRACK = null;
function loadEnvelope(track) {
  // music/ is shipped; private/music/ is the skater's own (gitignored)
  const files = [];
  for (const dir of [path.join(ROOT, 'music'), path.join(ROOT, 'private', 'music')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('-envelope.json')) files.push({ f, full: path.join(dir, f) });
  }
  let file = null;
  const want = track || ENV_TRACK;
  if (want) file = files.find((x) => x.f === want.replace(/\.[a-z0-9]+$/i, '') + '-envelope.json') || files.find((x) => x.f.startsWith(want));
  if (!file && files.length === 1) file = files[0];
  if (!file) return null;
  return JSON.parse(fs.readFileSync(file.full, 'utf8'));
}

// ---------- program I/O -----------------------------------------------------
function loadProgram(arg) {
  if (fs.existsSync(arg)) {
    const data = JSON.parse(fs.readFileSync(arg, 'utf8'));
    G.__data = data; G.__env = loadEnvelope(data.program && data.program.musicName);
    return E(`(() => { const d = __data; const p = newProgram(d.program.name || 'Imported'); Object.assign(p, d.program);
      const env = __env; if (!p.musicDuration && env) { p.musicDuration = env.duration; if (!d.program.bpm) p.bpm = env.bpm; if (d.program.offset == null) p.offset = env.offset; }
      const els = d.program.elements || [];
      const bad = els.filter((e) => !LIB_BY_ID[e.libId]).map((e) => e.libId);
      if (bad.length) throw new Error('unknown element ids: ' + bad.join(', ') + ' (see: node tools/harness.js lib)');
      // the save format's fields, and only those — a misspelt key would be silently ignored otherwise
      const FIELDS = ['libId', 'mirror', 'beats', 'radiusScale', 'aim', 'gapBefore', 'note', 'chst', 'arms', 'distScale', 'route', 'zone'];
      const badKeys = els.flatMap((e, i) => Object.keys(e).filter((k) => !FIELDS.includes(k)).map((k) => '#' + i + ' ' + e.libId + '.' + k));
      if (badKeys.length) throw new Error('unknown element fields: ' + badKeys.join(', ') + ' (save format: ' + FIELDS.join(', ') + ')');
      // an unknown arm pose falls back to second position and an unknown phrase to nothing — refuse both
      const badArms = els.flatMap((e, i) => (e.arms || []).flatMap((k) => (k.pose && !ARM_POSES[k.pose] ? ['#' + i + ' ' + e.libId + ' pose ' + k.pose] : k.phrase && !ARM_PHRASES[k.phrase] ? ['#' + i + ' ' + e.libId + ' phrase ' + k.phrase] : [])));
      if (badArms.length) throw new Error('unknown arm shapes: ' + badArms.join(', ') + ' (ARM_POSES / ARM_PHRASES in js/poses.js)');
      p.elements = els.map((e) => Object.assign({ uid: uid(), mirror: false, beats: LIB_BY_ID[e.libId].beats, radiusScale: 1, aim: 0, gapBefore: 0, note: '' }, e));
      return p; })()`);
  }
  G.__id = arg;
  const p = E(`(() => { const pre = PRESETS.find((x) => x.id === __id); return pre ? loadPreset(pre) : null; })()`);
  if (!p) throw new Error(`no file and no preset called ${arg}`);
  return p;
}
function saveProgram(p, file) {
  G.__p = p;
  const data = E(`(() => { const p = __p; return { format: 'skating-choreographer', version: 1, savedAt: new Date().toISOString(),
    program: { name: p.name, bpm: p.bpm, offset: p.offset, speedScale: p.speedScale, level: p.level, start: p.start, autoSteer: p.autoSteer,
      notes: p.notes || '', credit: p.credit || '', musicName: p.musicName, musicDuration: p.musicDuration, hits: p.hits || [],
      elements: p.elements.map((e) => ({ libId: e.libId, mirror: e.mirror, beats: e.beats, radiusScale: e.radiusScale, aim: e.aim,
        gapBefore: e.gapBefore, note: e.note, chst: e.chst, arms: e.arms, distScale: e.distScale, route: e.route, zone: e.zone })) } }; })()`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- report ----------------------------------------------------------
function report(p) {
  G.__p = p; G.__env = loadEnvelope(p.musicName);
  const rep = E(`(() => {
    const p = __p;
    // a program with no elements is a clean hard fail, not a stack trace
    if (!p.elements.length) return { name: p.name, elements: 0, seconds: 0, musicSeconds: p.musicDuration ? +p.musicDuration.toFixed(2) : null, speedScale: p.speedScale || 1,
      level: p.level, hard: { noElements: true, brokenSeams: 0, impossibleSpeeds: 0, offIceSeconds: 0, ruleErrors: ['no elements'] }, placementScore: null, summary: [], notes: [], warnings: [], key: [] };
    const path = buildPath(p), sm = path.samples;
    const a = analyze(p, path), r = checkRules(p, path, a), q = analyzePlacement(p, path), sq = analyzeStepSequence(p, path);
    const rows = placementRules(p, path, a, q, sq), pscore = placementScore(q, a, path);
    const who = (x) => (x ? { idx: x.idx, libId: x.libId, count: x.count } : null);
    let sum = 0, n = 0, peak = 0, peakEl = '';
    for (let k = 1; k < sm.length; k++) { const s2 = sm[k]; if (s2.ei < 0) continue;
      const d = Math.hypot(s2.x - sm[k-1].x, s2.y - sm[k-1].y) / (s2.t - sm[k-1].t); sum += d; n++;
      const c = LIB_BY_ID[p.elements[s2.ei].libId].cat; if (c !== 'jumps' && c !== 'spins' && d > peak) { peak = d; peakEl = p.elements[s2.ei].libId; } }
    const th = [0, 0, 0]; for (const s of sm) th[s.x < -10 ? 0 : s.x < 10 ? 1 : 2]++;
    const s0 = sm[0], s1 = sm[sm.length - 1];
    const cat = (ei) => (ei >= 0 && p.elements[ei]) ? LIB_BY_ID[p.elements[ei].libId].cat : 'none';
    let worst = 0, over = 0, prev = null;
    for (let t = 0; t < path.totalTime; t += 1 / 30) { const s = sampleAt(path, t), L = poseAt(p, path, t)._local;
      if (prev) { let mx = 0; for (const j of JOINTS) { const d = Math.hypot(L[j][0]-prev[j][0], L[j][1]-prev[j][1], L[j][2]-prev[j][2]); if (d > mx) mx = d; }
        if (cat(s.ei) !== 'jumps') { if (mx > 0.20) over++; if (mx > worst) worst = mx; } }
      prev = {}; for (const j of JOINTS) prev[j] = L[j].slice(); }
    const key = path.segs.filter((s) => ['jumps','spins','choreo','stops','field'].includes(s.lib.cat) || (s.inst.chst && s === path.segs.find((x) => x.inst.chst)))
      .map((s) => fmtCount(s.beat0) + ' ' + fmtTime(s.t0) + ' ' + s.lib.name + (s.inst.chst ? ' [ChSt starts]' : ''));
    return {
      name: p.name, elements: p.elements.length, seconds: +path.totalTime.toFixed(2), musicSeconds: p.musicDuration ? +p.musicDuration.toFixed(2) : null,
      speedScale: p.speedScale || 1, level: p.level, levelName: r.level.name, timeLimit: r.level.time, placementScore: +pscore.toFixed(1),
      hard: { brokenSeams: a.continuity.length, impossibleSpeeds: a.speed.length, offIceSeconds: +q.offIce.toFixed(2),
              ruleErrors: r.issues.filter((i) => i.lvl === 'err').map((i) => i.msg),
              timeMismatch: p.musicDuration ? +(path.totalTime - p.musicDuration).toFixed(2) : null },
      speed: { average: +(sum / n).toFixed(2), footworkPeak: +peak.toFixed(1), footworkPeakElement: peakEl,
               overLevelCap: q.tooFast.map((f) => f.name + ' ' + f.speed.toFixed(1) + ' m/s (' + f.beats + 'b)') },
      placement: { spinsFromCentre: q.spins.map((s) => +s.fromCentre.toFixed(2)), spinsOk: q.spins.every((s) => s.ok),
                   jumps: q.jumps.map((j) => j.name + '@' + fmtTime(j.t) + ':' + j.where), jumpsOk: q.jumps.every((j) => j.ok),
                   awkwardEntries: q.jumps.filter((j) => j.awkward).length, jumpsWithoutSpeed: q.jumps.filter((j) => !j.builtSpeed).length,
                   startFromCentre: +Math.hypot(s0.x, s0.y).toFixed(1), endFromCentre: +Math.hypot(s1.x, s1.y).toFixed(1),
                   // the coach's numbers per jump element: edge held before takeoff, room at the boards, runway on the landing edge,
                   // speed against the connectors before it, fatigue at takeoff, beats after the sequence's last turn, steering inside
                   jumpDetail: q.jumps.map((j) => ({ idx: j.idx, libId: j.libId, count: j.count, where: j.where, entry: j.entryId, builtSpeed: j.builtSpeed, awkward: j.awkward,
                     edgeSeconds: +j.edgeSeconds.toFixed(2), boardsAtTakeoff: j.boardsAtTakeoff == null ? null : +j.boardsAtTakeoff.toFixed(1), boardsAtLanding: j.boardsAtLanding == null ? null : +j.boardsAtLanding.toFixed(1),
                     runway: j.runway == null ? null : +j.runway.toFixed(1), speed: +j.speed.toFixed(1), connectorSpeed: j.connSpeed == null ? null : +j.connSpeed.toFixed(1), speedRatio: j.speedRatio == null ? null : +j.speedRatio.toFixed(2),
                     fatigue: +j.fatigue.toFixed(2), late: j.late, hardest: j.hardest, beatsAfterTurn: j.beatsAfterTurn == null ? null : +j.beatsAfterTurn.toFixed(1), heldBefore: j.heldBefore, steerInside: +j.steerInside.toFixed(0),
                     runIn: +j.runIn.toFixed(2), recovery: +j.recovery.toFixed(2), sinceJump: j.sinceJump == null ? null : +j.sinceJump.toFixed(1),
                     powerRunIn: +j.powerRunIn.toFixed(2), takeoffSpeed: j.takeoffSpeed == null ? null : +j.takeoffSpeed.toFixed(1), airMetres: j.airMetres == null ? null : +j.airMetres.toFixed(1) })),
                   spinDetail: q.spins.map((s) => ({ idx: s.idx, libId: s.libId, count: s.count, fromCentre: +s.fromCentre.toFixed(2), revs: Object.fromEntries(Object.entries(s.revs).map(([k, v]) => [k, +v.toFixed(2)])),
                     revPerSec: +s.revPerSec.toFixed(2), entrySpeed: +s.entrySpeed.toFixed(1), entry: s.entry, heldBefore: s.heldBefore, setup: +s.setup.toFixed(2), powerRunIn: +s.powerRunIn.toFixed(2), steerInside: +s.steerInside.toFixed(0) })),
                   heldShapes: q.heldShapes.map((h) => '#' + h.idx + ' ' + h.libId + ' ' + h.seconds.toFixed(1) + 's' + (h.ok ? '' : ' !')),
                   hardConnectors: q.hardConnectors.map((h) => '#' + h.idx + ' ' + h.libId + ' d' + h.diff),
                   routes: q.routes.map((r) => '#' + r.idx + ' ' + r.libId + ' ' + r.want + ' -> ' + r.got.toFixed(0) + '°' + (r.ok ? '' : ' !')),
                   zones: (q.zones || []).map((z) => '#' + z.idx + ' ' + z.libId + ' ' + z.count + ' wants ' + z.want + ' -> ' + z.metres + ' m away at [' + z.at + ']' + (z.ok ? '' : ' !')),
                   fatigueAtJumps: q.fatigueAtJumps.map((v) => +v.toFixed(2)),
                   steeredInsideElements: q.steeredInsideElements.map((x) => '#' + x.idx + ' ' + x.libId + ' ' + x.degrees.toFixed(0) + '°'),
                   speedStep: q.speedStep.map((x) => '#' + x.idx + ' ' + x.libId + ' ' + x.from.toFixed(1) + '>' + x.to.toFixed(1)),
                   afterStop: q.afterStop.map((x) => '#' + x.idx + ' ' + x.libId + ' ' + x.speed.toFixed(1) + ' m/s after ' + x.after),
                   heldBeforeJumpOrSpin: q.heldBefore.map((x) => '#' + x.idx + ' ' + x.libId + ' after ' + x.held) },
      ice: { coveragePct: +a.coverage.pct.toFixed(0), thirds: th.map((v) => +(v / sm.length * 100).toFixed(1)), rotationCCW: +a.rotation.ccw.toFixed(1),
             sides: [+(q.sides.top * 100).toFixed(1), +(q.sides.bottom * 100).toFixed(1)], cornersOk: q.cornersOk,
             crossoverLobes: q.lobes.map((l) => l.name.replace(' Crossovers', '') + '@' + fmtTime(l.t) + ' ' + l.turn + '° r' + l.radius.toFixed(1) + (l.ok ? '' : ' !')),
             circleSeconds: q.cornerSeconds.map((v) => +v.toFixed(1)) },
      stepSequence: sq ? { turns: sq.elements, difficult: sq.difficult, families: sq.families, clusters: sq.clusters, bothFeet: sq.bothFeet,
                           armFraction: +sq.armFraction.toFixed(2), lengthFrac: q.chstSpan ? +q.chstSpan.lengthFrac.toFixed(3) : null,
                           widthFrac: q.chstSpan ? +(q.chstSpan.width / RINK.W).toFixed(2) : null,
                           turnsPerSecond: +sq.turnsPerSecond.toFixed(2), longestOneFootSeconds: +sq.longestOneFootSeconds.toFixed(1), seconds: +sq.seconds.toFixed(1) } : null,
      material: { crossoverShare: +q.crossoverShare.toFixed(2), speedBuilderShare: +q.builderShare.toFixed(2), distinct: q.distinct, oneOffs: q.oneOffs, memorable: q.memorable,
                  maxGlideSeconds: +Math.max(0, ...p.elements.map((e) => (e.gapBefore || 0) * 60 / p.bpm)).toFixed(1) },
      pose: { worstFootworkJointMove_m: +worst.toFixed(3), framesOver20cm: over },
      arms: (() => {
        const shapes = distinctArmShapes(p), phrases = new Set(); let own = 0, hands = 0;
        for (const e of p.elements) { const tr = e.arms || LIB_BY_ID[e.libId].arms || []; if (armsAuthored(e.arms)) own++;
          for (const k of tr) { if (k.pose && ARM_POSES[k.pose] && ARM_POSES[k.pose].hand) hands++; if (k.phrase && ARM_PHRASES[k.phrase]) phrases.add(k.phrase); } }
        let hmax = 0, hp = null, hAt = '', hmaxFoot = 0, hAtFoot = '';
        for (let t = 0; t < path.totalTime; t += 1 / 30) { const w = poseAt(p, path, t), L = w._local, sm2 = w._sample;
          if (hp) { const v = Math.max(Math.hypot(L.haL[0]-hp.haL[0], L.haL[1]-hp.haL[1], L.haL[2]-hp.haL[2]) * 30, Math.hypot(L.haR[0]-hp.haR[0], L.haR[1]-hp.haR[1], L.haR[2]-hp.haR[2]) * 30);
            const where = sm2.ei >= 0 ? p.elements[sm2.ei].libId + ' @' + fmtTime(t) : 'gap @' + fmtTime(t);
            if (v > hmax) { hmax = v; hAt = where; }
            if (sm2.ei >= 0 && LIB_BY_ID[p.elements[sm2.ei].libId].cat !== 'jumps' && v > hmaxFoot) { hmaxFoot = v; hAtFoot = where; } }
          hp = { haL: L.haL.slice(), haR: L.haR.slice() }; }
        return { elementsWithOwnTrack: own, distinctShapes: shapes.size, phrases: [...phrases], handShapeKeyframes: hands, maxHandSpeed_mps: +hmax.toFixed(1), maxHandSpeedAt: hAt, maxHandSpeedOutsideJumps_mps: +hmaxFoot.toFixed(1), outsideJumpsAt: hAtFoot };
      })(),
      music: (() => {
        // how the scored moments sit on the track: a jump wants a local accent
        // (onset strength at takeoff above the 2 s around it), a stop or a held
        // shape wants a quiet bar. the ratio is the strongest onset within 0.25 s of takeoff against the mean of the 3 s around it; >= 2 reads as "on a hit".
        const env = __env; if (!env || !env.onsets) return null;
        // program time t is audio time t + offset (the app plays Music at offset + App.time)
        const off = p.offset || env.offset || 0;
        const at = (t0, w) => { const t = t0 + off; let s = 0, c = 0; for (let k = Math.max(0, Math.floor((t - w) / env.hop)); k < Math.min(env.onsets.length, Math.ceil((t + w) / env.hop)); k++) { s += env.onsets[k]; c++; } return c ? s / c : 0; };
        let mx = 0; for (let t = 1; t < env.duration - 1; t += 0.5) mx = Math.max(mx, at(t, 1));
        const level = (t) => +(at(t, 1) / mx).toFixed(2);                 // 0..1 against the loudest 2 s of the track
        const jumps = path.segs.filter((sg, i) => isJumpStart(path.segs, i))
          .map((sg) => { const tk = sg.t0 + 0.25; let local = 0; for (let d = -0.25; d <= 0.25; d += 0.025) local = Math.max(local, at(tk + d, 0.06));
            const around = at(tk, 1.5); return { name: sg.lib.name, at: fmtTime(sg.t0), accentRatio: +(local / (around || 1e-6)).toFixed(2), level: level(tk) }; });
        const quiet = path.segs.filter((sg) => sg.lib.cat === 'stops' || sg.lib.cat === 'field' || sg.lib.id === 'choreo-knee-slide')
          .map((sg) => ({ name: sg.lib.name, at: fmtTime(sg.t0), level: level((sg.t0 + sg.t1) / 2) }));
        return { jumps, heldOrStopped: quiet, jumpsOnAccent: jumps.filter((j) => j.accentRatio >= 2).length };
      })(),
      warnings: r.issues.filter((i) => i.lvl === 'warn').map((i) => i.msg),
      notes: r.issues.filter((i) => i.lvl === 'info').map((i) => i.msg),
      // the rulebook, one row per rule (engine placementRules), plus the hand-speed rows only the harness can measure
      summary: rows.map((x) => ({ rule: x.rule, tag: x.tag, value: typeof x.value === 'number' ? +x.value.toFixed(3) : x.value, floor: x.floor, op: x.op, unit: x.unit,
        margin: x.margin === Infinity ? null : +x.margin.toFixed(3), status: x.status, n: x.n, where: who(x.where), lever: x.lever, items: x.items })),
      key,
    };
  })()`);
  // hand speed is measured here (poseAt at 30 fps), so its rows join the rulebook here
  if (rep.summary && rep.arms) {
    const cap = E('ARM_PACE.maxHandSpeed'), capJ = E('ARM_PACE.maxHandSpeedJump');
    const hand = (rule, v, floor, at) => { const m = floor - v; rep.summary.push({ rule, tag: 'craft', value: v, floor, op: 'max', unit: 'm/s', margin: +m.toFixed(3), status: m < 0 ? 'MISS' : 'PASS', n: m < 0 ? 1 : 0,
      where: at ? { idx: null, libId: at.split(' ')[0], count: at.split('@')[1] } : null, lever: 'the engine paces tracks — over the cap is a seam or a bug (repo-gotchas)', items: null }); };
    hand('hands', rep.arms.maxHandSpeedOutsideJumps_mps, cap, rep.arms.outsideJumpsAt);
    hand('hands.jump', rep.arms.maxHandSpeed_mps, capJ, rep.arms.maxHandSpeedAt);
  }
  return rep;
}

// ---------- anchor ----------------------------------------------------------
function anchor(p, spec) {
  G.__p = p; G.__spec = spec;
  E(`(() => { const p = __p, spb = 60 / p.bpm;
    p.elements.forEach((e) => { e.gapBefore = 0; });
    for (const part of __spec.split(',')) {
      const [lhs, rhs] = part.split('='); const m = lhs.match(/^([a-z0-9-]+)(?:#(\\d+))?$/); if (!m) throw new Error('bad anchor ' + part);
      const inst = p.elements.filter((e) => e.libId === m[1])[+(m[2] || 0)]; if (!inst) throw new Error('no element ' + lhs);
      const t = rhs.startsWith('@') ? (+rhs.slice(1)) * spb : +rhs;
      for (let k = 0; k < 8; k++) { const path = buildPath(p); const s = path.segs.find((x) => x.inst === inst); const d = t - s.t0;
        if (Math.abs(d) < 0.05) break; inst.gapBefore = Math.max(0, (inst.gapBefore || 0) + d / spb); }
    }
    const fin = p.elements[p.elements.length - 1]; fin.beats = 4;
    const path = buildPath(p); fin.beats = Math.max(2, ((p.musicDuration || path.totalTime) - path.segs[path.segs.length - 1].t0) / spb);
  })()`);
}

// ---------- score and summary ------------------------------------------------
// hard fails: seams, impossible speeds, off the ice (past the tolerance), rule
// errors from the level, and a program that does not end on the music
function hardFailCount(r) {
  const h = r.hard, tol = E('PLACE.offIceTolerance');
  // the off-ice rule error is the same fail as offIceSeconds — count it once
  return h.brokenSeams + h.impossibleSpeeds + (h.offIceSeconds > tol ? 1 : 0) + h.ruleErrors.filter((e) => !/off the ice/.test(e)).length + (h.timeMismatch != null && Math.abs(h.timeMismatch) > 0.05 ? 1 : 0);
}
const fmtV = (v, unit) => (typeof v !== 'number' ? String(v) : unit === '' && v <= 1 && v >= 0 && String(v).includes('.') ? (v * 100).toFixed(1) + '%' : (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)).replace(/\.?0+$/, ''));
const fmtF = (x) => (typeof x.floor !== 'number' ? String(x.floor) : fmtV(x.floor, x.unit));
const opOf = (x) => (x.op === 'max' ? '<=' : x.op === 'min' ? '>=' : 'in');
// "jump.boards 3.6<6 [#21 salchow] unsafe"
function missLine(x) {
  const op = x.op === 'max' ? '>' : x.op === 'min' ? '<' : '!in';
  return x.rule + ' ' + fmtV(x.value, x.unit) + op + fmtF(x) + (x.where && x.where.idx != null ? ' [#' + x.where.idx + ' ' + x.where.libId + ']' : x.where ? ' [' + x.where.libId + ']' : '') + (x.n > 1 ? ' x' + x.n : '') + ' ' + x.tag;
}
/**
 * The pass/fail sheet, at most 30 lines: header, RESULT, one line per rule
 * (MISS and THIN first, then PASS while the budget allows — the rest are
 * collapsed into one line), and NEXT: the first thing to fix.
 */
function summary(r) {
  const out = [], LINES = 30;
  const hard = hardFailCount(r), rows = r.summary || [];
  const music = r.musicSeconds != null ? r.musicSeconds + ' s' : 'no music';
  out.push(`${r.name} — ${r.elements} elements, ${r.seconds} s vs ${music}, speedScale ${r.speedScale}, ${r.levelName || r.level || '?'}${r.timeLimit ? ' (' + r.timeLimit[0] + '–' + r.timeLimit[1] + ' s)' : ''}, placementScore ${r.placementScore == null ? '—' : r.placementScore}`);
  if (r.hard.noElements) { out.push('RESULT FAIL — no elements'); out.push('NEXT add elements'); return out; }
  const misses = rows.filter((x) => x.status === 'MISS'), thin = rows.filter((x) => x.status === 'THIN'), soft = rows.filter((x) => x.status === 'SOFT');
  out.push((hard || misses.length ? 'RESULT FAIL' : 'RESULT PASS') + ` — ${hard} hard, ${misses.length} misses (${misses.filter((x) => x.tag === 'unsafe').length} unsafe), ${thin.length} thin${soft.length ? ', ' + soft.length + ' soft' : ''}`);
  const hardLines = [];
  if (r.hard.brokenSeams) hardLines.push(`HARD seams ${r.hard.brokenSeams} — every entry edge must be the previous exit (chain)`);
  if (r.hard.impossibleSpeeds) hardLines.push(`HARD speeds ${r.hard.impossibleSpeeds} over 11 m/s or under 1.2 — beats vs distance`);
  if (r.hard.timeMismatch != null && Math.abs(r.hard.timeMismatch) > 0.05) hardLines.push(`HARD time ${r.seconds} s vs music ${r.musicSeconds} s — anchor (the last element is stretched to the music)`);
  for (const e of r.hard.ruleErrors) hardLines.push(`HARD rule ${e}`);
  out.push(...hardLines);
  const line = (x) => {
    const w = x.where ? (x.where.idx != null ? `#${x.where.idx} ${x.where.libId} ${x.where.count || ''}`.trim() : x.where.libId + ' @' + x.where.count) : '';
    const margin = x.margin == null ? '' : (x.margin >= 0 ? '+' : '') + fmtV(x.margin, x.unit);
    return `${x.status.padEnd(4)} ${x.rule.padEnd(15)} ${fmtV(x.value, x.unit).padStart(8)} ${opOf(x)} ${fmtF(x).padEnd(9)} margin ${margin.padEnd(7)}${x.n > 1 ? ' x' + x.n : ''}${w ? '  ' + w : ''}${x.lever ? '  — ' + x.lever : ''}`;
  };
  const order = { MISS: 0, THIN: 1, SOFT: 2, PASS: 3 };
  const sorted = rows.slice().sort((a, b) => order[a.status] - order[b.status] || (a.tag === 'unsafe' ? -1 : 0) - (b.tag === 'unsafe' ? -1 : 0));
  const budget = LINES - out.length - 1;   // one line kept for NEXT
  const shown = sorted.slice(0, budget), rest = sorted.slice(budget);
  if (rest.length && rest.every((x) => x.status === 'PASS')) { out.push(...shown.map(line)); out.push(`PASS ${rest.length} more: ${rest.map((x) => x.rule + ' ' + fmtV(x.value, x.unit)).join(', ')}`); }
  else if (rest.length) { out.push(...shown.slice(0, budget - 1).map(line)); const left = sorted.slice(budget - 1); out.push(`… ${left.length} more: ${left.map((x) => x.status + ' ' + x.rule).join(', ')}`); }
  else out.push(...shown.map(line));
  const first = hardLines.length ? hardLines[0].replace(/^HARD /, '') : misses.length ? `${misses[0].rule} — ${misses[0].lever || 'see verify'}` : thin.length ? `${thin[0].rule} is thin — polish (steer --starts keep)` : 'nothing; score it against the other candidates';
  out.push(`NEXT ${first}`);
  return out;
}

// ---------- main ------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const positional = argv.filter((x, i) => !x.startsWith('--') && !(i && argv[i - 1].startsWith('--')));
  const [cmd, arg, ...rest] = positional;
  ENV_TRACK = opt('--track', null);
  if (cmd === 'verify') {
    const p = loadProgram(arg), r = report(p);
    if (argv.includes('--summary')) console.log(summary(r).join('\n')); else console.log(JSON.stringify(r, null, 1));
  } else if (cmd === 'anchor') {
    const p = loadProgram(arg); anchor(p, opt('--at', '')); saveProgram(p, opt('--out', arg)); console.log(JSON.stringify(report(p).key, null, 1));
  } else if (cmd === 'steer') {
    const p = loadProgram(arg); G.__p = p;
    // --starts: initial aims to try (degrees); 'keep' = the aims already in the file
    G.__starts = opt('--starts', '0,-16,16,-32').split(',').map((x) => (x === 'keep' ? 'keep' : Number(x)));
    // --frozen 0-12,30: element indices whose aims must not change (ranges allowed)
    G.__frozen = (opt('--frozen', '') || '').split(',').filter(Boolean).flatMap((r) => { const [a, b] = r.split('-').map(Number); return b == null ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
    // --verbose: print each stage of the pipeline as it starts (to stderr)
    G.__verbose = argv.includes('--verbose'); G.__log = (m) => process.stderr.write(m + '\n');
    // --headings 0,180: also try these start headings (degrees) and keep the
    // best program by placementScore — the start is the lever for the far end
    G.__headings = opt('--headings', '') ? opt('--headings', '').split(',').map(Number) : [p.start.heading];
    await E(`(async () => { let last = '', best = null; const orig = __p.elements.map((e) => e.aim || 0);
      for (const h of __headings) { __p.start.heading = h; __p.elements.forEach((e, i) => { e.aim = orig[i]; });
        await steerProgramMulti(__p, { starts: __starts, frozen: __frozen, log: __verbose ? __log : null, onProgress: (s, f) => { if (__verbose && s !== last) { last = s; __log(new Date().toISOString().slice(11, 19) + ' heading ' + h + ': ' + s); } } });
        const pth = buildPath(__p), sc = placementScore(analyzePlacement(__p, pth), analyze(__p, pth), pth);
        if (__verbose) __log('heading ' + h + ' -> placementScore ' + sc.toFixed(1));
        if (!best || sc < best.sc) best = { sc, h, aims: __p.elements.map((e) => e.aim || 0) }; }
      __p.start.heading = best.h; __p.elements.forEach((e, i) => { e.aim = best.aims[i]; }); })()`);
    saveProgram(p, opt('--out', arg)); const r = report(p);
    console.log(JSON.stringify({ hard: r.hard, placement: r.placement, ice: r.ice, stepSequence: r.stepSequence }, null, 1));
  } else if (cmd === 'score') {
    // one line per program so rounds can be compared: hard failures first,
    // then the placement rules, then the things a skater and a judge notice
    // The misses are the rulebook's MISS rows (engine placementRules + the
    // hand-speed rows): raw values against PLACE, the same rows `verify
    // --summary` prints and checkPlacement warns from. Soft rules (coverage)
    // are warned and scored but never a miss.
    for (const f of [arg, ...rest]) {
      const r = report(loadProgram(f)); const h = r.hard, ic = r.ice || {}, ss = r.stepSequence || {}, ar = r.arms || {}, mu = r.music || {};
      const hardFails = hardFailCount(r);
      if (h.noElements) { console.log(JSON.stringify({ file: path.basename(f), hardFails, ruleMisses: 0, unsafe: 0, craft: 0, placementScore: null, misses: [], quality: null, error: 'no elements' })); continue; }
      const missed = r.summary.filter((x) => x.status === 'MISS');
      const misses = missed.map(missLine);
      const quality = { coverage: ic.coveragePct, rotation: ic.rotationCCW, ends: ic.thirds, sides: ic.sides, corners: ic.circleSeconds, difficultTurns: ss.difficult, clusters: ss.clusters,
        jumpsOnAccent: mu.jumpsOnAccent, distinct: r.material.distinct, crossovers: r.material.crossoverShare, armShapes: ar.distinctShapes, phrases: ar.phrases.length, avgSpeed: r.speed.average };
      console.log(JSON.stringify({ file: path.basename(f), hardFails, ruleMisses: misses.length, unsafe: missed.filter((x) => x.tag === 'unsafe').length, craft: missed.filter((x) => x.tag === 'craft').length,
        placementScore: r.placementScore, misses, quality }));
    }
  } else if (cmd === 'envelope') {
    const env = loadEnvelope(); if (!env) { console.error('no envelope: export one to music/<track>-envelope.json (see the harness skill), or pass --track <name>'); process.exit(1); }
    // printed in PROGRAM time (= counts): audio time minus the offset, so a
    // bucket labelled 0:26 is the one a jump anchored at 26 s lands in
    const B = +opt('--bucket', '2'), off = env.offset || 0, prof = [], spb = 60 / env.bpm;
    for (let b = 0; b < Math.ceil((env.duration - off) / B); b++) { let s = 0, c = 0;
      for (let k = Math.floor((b * B + off) / env.hop); k < Math.min(env.onsets.length, Math.floor(((b + 1) * B + off) / env.hop)); k++) { s += env.onsets[k]; c++; }
      prof.push(c ? s / c : 0); }
    const mx = Math.max(...prof);
    console.log(`duration=${env.duration.toFixed(2)}s bpm=${env.bpm} offset=${off}  (bucket ${B}s, normalised; times are program time = seconds from beat 1&1, count shown)`);
    prof.forEach((v, i) => { const t = i * B; const beat = Math.round(t / spb); console.log(`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} ${String(Math.floor(beat/8)+1).padStart(2)}&${beat%8+1} ${'#'.repeat(Math.round(v/mx*30)).padEnd(30)} ${(v/mx).toFixed(2)}`); });
  } else if (cmd === 'chain') {
    const p = loadProgram(arg); G.__p = p;
    console.log(E(`(() => { const path = buildPath(__p); const spb = 60 / __p.bpm; const beats = __p.elements.reduce((t, e) => t + e.beats + (e.gapBefore || 0), 0);
      return 'total ' + beats.toFixed(2) + ' beats = ' + path.totalTime.toFixed(2) + ' s; music ' + (__p.musicDuration || 0).toFixed(2) + ' s (' + ((__p.musicDuration || 0) / spb).toFixed(2) + ' beats)'; })()`));
    console.log(E(`(() => { const path = buildPath(__p); let prevExit = null; return path.segs.map((s, i) => { const r = resolve(s.inst); const seam = prevExit && prevExit !== r.entry ? '  <-- SEAM: needs ' + r.entry + ', have ' + prevExit : ''; prevExit = r.exit;
      return String(i).padStart(2) + ' ' + fmtCount(s.beat0).padStart(5) + ' ' + fmtTime(s.t0) + ' ' + s.lib.id + (s.inst.mirror ? '.R' : '') + ' ' + s.inst.beats + 'b' + (s.inst.gapBefore ? ' gap' + (+s.inst.gapBefore.toFixed(2)) : '') + (s.inst.chst ? ' [ChSt]' : '') + ' ' + r.entry + '>' + r.exit + ' ' + s.speed.toFixed(1) + 'm/s' + (s.inst.arms ? ' arms' : '') + seam; }).join('\\n'); })()`));
  } else if (cmd === 'lib') {
    // minB = the fewest beats the element can take at this speedScale/bpm without
    // exceeding the level's speed cap for its category (PLACE.maxSpeed)
    G.__cat = arg || null; G.__ss = +opt('--speedScale', '0.8'); G.__bpm = +opt('--bpm', '126');
    console.log('id                    cat    diff lib-b  dist minB  turn  entry>exit  name      (minB at speedScale ' + G.__ss + ', ' + G.__bpm + ' bpm; turn = the heading change the element makes on its own, + = left/CCW)');
    console.log(E(`LIBRARY.filter((e) => !__cat || e.cat === __cat).map((e) => { const cap = PLACE.maxSpeed[e.cat] || 99; const minB = e.dist ? Math.ceil(e.dist * __ss / (cap * 60 / __bpm) * 10) / 10 : 0;
      let turn = 0; try { const q = newProgram('x'); q.bpm = __bpm; q.speedScale = __ss; q.start = { x: 0, y: 0, heading: 0 }; addElement(q, e.id, {}); const pth = buildPath(q); const sm = pth.samples;
        if (sm.length > 2) { let d = sm[sm.length - 1].h - sm[0].h; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; turn = Math.round(d / DEG); } } catch (err) { turn = 0; }
      return e.id.padEnd(22) + e.cat.padEnd(7) + 'd' + e.diff + ' ' + String(e.beats).padStart(3) + 'b  ' + String(e.dist).padStart(3) + 'm ' + String(minB).padStart(4) + 'b ' + String(turn).padStart(5) + '  ' + (e.entry + '>' + e.exit).padEnd(9) + ' ' + e.name; }).join('\\n')`));
  } else {
    console.log(fs.readFileSync(__filename, 'utf8').split('============================================================')[1]);
  }
}
// the engine's MessageChannel ticks keep the event loop alive, so exit explicitly
main().then(() => process.exit(0)).catch((e) => { console.error(e.message || e); process.exit(1); });

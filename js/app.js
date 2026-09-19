/* ============================================================
   app.js — state, UI wiring, and the render loop
   ============================================================ */

const App = {
  programs: [],            // every open choreography — the tab strip
  current: 0,
  refIndex: -1,            // which program is shown underneath for comparison
  refPath: null,
  program: null,
  path: null,
  analysis: null,
  rules: null,
  ext: null,
  cam: makeCamera(),
  time: 0,
  playing: false,
  speed: 1,
  loop: false,
  sel: -1,                 // selected element index
  filters: { q: '', cats: new Set(), maxDiff: 5, fitOnly: false },
  opts: {
    trace: 'all',          // 'all' | 'current' | 'none'
    ghosts: true, heatmap: false, highlight: -1,
    markings: true, axes: true, walls: true, cusps: true,
    reference: true, refSkater: false,
  },
  dirtyAnalysis: true,
  _raf: 0, _lastFrame: 0,
};

/* ------------------------------------------------------------
   Multiple open programs (the tab strip)
   ------------------------------------------------------------ */
function openProgram(program, opts = {}) {
  if (opts.replaceCurrent && App.programs.length) App.programs[App.current] = program;
  else { App.programs.push(program); App.current = App.programs.length - 1; }
  App.program = program;
  afterLoad();
  renderProgramTabs();
}

function switchProgram(i) {
  if (i < 0 || i >= App.programs.length || i === App.current) return;
  setPlaying(false);
  App.current = i;
  App.program = App.programs[i];
  afterLoad();
  renderProgramTabs();
}

function closeProgram(i) {
  if (App.programs.length <= 1) { toast('That is the only program open.'); return; }
  const wasRef = App.refIndex === i;
  App.programs.splice(i, 1);
  if (App.refIndex === i) App.refIndex = -1;
  else if (App.refIndex > i) App.refIndex--;
  if (App.current >= App.programs.length) App.current = App.programs.length - 1;
  else if (App.current > i) App.current--;
  App.program = App.programs[App.current];
  if (wasRef) App.refPath = null;
  afterLoad();
  renderProgramTabs();
}

function renderProgramTabs() {
  const list = $('#ptList');
  list.innerHTML = '';
  App.programs.forEach((p, i) => {
    const isRef = i === App.refIndex;
    const tab = el('div', { class: 'ptTab' + (i === App.current ? ' on' : ''), title: p.name },
      isRef ? el('span', { class: 'ptDot', title: 'shown as the comparison' }) : null,
      el('span', { class: 'ptName' }, p.name || 'Untitled'),
      el('span', { class: 'ptMeta' }, `${p.elements.length}`),
      el('button', { class: 'ptX', title: 'Close' }, '×'));
    tab.onclick = (ev) => {
      if (ev.target.classList.contains('ptX')) { ev.stopPropagation(); closeProgram(i); return; }
      switchProgram(i);
    };
    list.appendChild(tab);
  });

  // comparison dropdown
  const sel = $('#refSel');
  sel.innerHTML = '';
  sel.appendChild(el('option', { value: '-1' }, 'nothing'));
  App.programs.forEach((p, i) => {
    if (i === App.current) return;
    sel.appendChild(el('option', { value: String(i) }, p.name || 'Untitled'));
  });
  sel.value = String(App.refIndex);
  updateRefPath();
}

function updateRefPath() {
  if (App.refIndex < 0 || App.refIndex >= App.programs.length || App.refIndex === App.current) {
    App.refPath = null;
    return;
  }
  App.refPath = buildPath(App.programs[App.refIndex]);
}

/* ------------------------------------------------------------
   Rebuild
   ------------------------------------------------------------ */
function rebuild(keepTime = true) {
  const prev = App.time;
  App.path = buildPath(App.program);
  App.dirtyAnalysis = true;
  App.time = keepTime ? clamp(prev, 0, App.path.totalTime) : 0;
  renderProgramList();
  renderStats();
  renderProgramTabs();
  if (currentTab() === 'anal') renderAnalysis();
  if (currentTab() === 'ext') renderExtLab();
  if (currentTab() === 'insp') renderInspector();
}

function ensureAnalysis() {
  if (!App.dirtyAnalysis && App.analysis) return;
  App.analysis = analyze(App.program, App.path);
  App.rules = checkRules(App.program, App.path, App.analysis);
  App.ext = extensionReport(App.program, App.path, 80);
  App.dirtyAnalysis = false;
}

/* ------------------------------------------------------------
   Library panel
   ------------------------------------------------------------ */
function renderCatFilter() {
  const wrap = $('#catFilter');
  wrap.innerHTML = '';
  for (const c of CATEGORIES) {
    const on = App.filters.cats.has(c.key);
    const b = el('button', { class: on ? 'on' : '' }, c.name.replace(' & ', ' + '));
    if (on) b.style.background = c.color;
    b.onclick = () => {
      if (on) App.filters.cats.delete(c.key); else App.filters.cats.add(c.key);
      renderCatFilter(); renderLibrary();
    };
    wrap.appendChild(b);
  }
}

function currentExitCode() {
  if (!App.program.elements.length) return null;
  const i = App.sel >= 0 ? App.sel : App.program.elements.length - 1;
  const r = resolve(App.program.elements[Math.min(i, App.program.elements.length - 1)]);
  return r.exit;
}

function renderLibrary() {
  const list = $('#libList');
  const f = App.filters;
  const q = f.q.trim().toLowerCase();
  const fitCode = f.fitOnly ? currentExitCode() : null;

  const items = LIBRARY.filter((e) => {
    if (e.diff > f.maxDiff) return false;
    if (f.cats.size && !f.cats.has(e.cat)) return false;
    if (q && !e.tags.some((t) => t.includes(q)) && !e.name.toLowerCase().includes(q)) return false;
    if (fitCode && e.entry !== fitCode && (!e.mirrorable || mirrorCode(e.entry) !== fitCode)) return false;
    return true;
  });

  $('#libCount').textContent = `${items.length} of ${LIBRARY.length}`;
  list.innerHTML = '';
  if (!items.length) {
    list.appendChild(el('div', { class: 'libEmpty' },
      fitCode ? `Nothing in the library starts on ${fitCode}. Turn off "fits my edge", or add a connecting turn first.`
              : 'Nothing matches that search.'));
    return;
  }

  const byCat = {};
  for (const e of items) (byCat[e.cat] = byCat[e.cat] || []).push(e);
  for (const cat of CATEGORIES) {
    const group = byCat[cat.key];
    if (!group) continue;
    for (const e of group) {
      const dots = el('span', { class: 'diffDots' },
        [1, 2, 3, 4, 5].map((n) => el('i', { class: n <= e.diff ? 'on' : '' })));
      const needsMirror = fitCode && e.entry !== fitCode;
      const row = el('div', { class: 'libItem', title: e.tip },
        el('div', { class: 'swatch' }),
        el('div', {},
          el('div', { class: 'nm' }, e.name, dots),
          el('div', { class: 'meta' }, `${e.entry} → ${e.exit} · ${e.beats} beats${needsMirror ? ' · mirrored' : ''}`)),
        el('div', { class: 'add' }, '+'));
      row.querySelector('.swatch').style.background = cat.color;
      row.onclick = () => {
        addElement(App.program, e.id, { mirror: !!needsMirror });
        // dropped in after the selection rather than always at the end
        if (App.sel >= 0 && App.sel < App.program.elements.length - 1) {
          const moved = App.program.elements.pop();
          App.program.elements.splice(App.sel + 1, 0, moved);
          App.sel += 1;
        } else {
          App.sel = App.program.elements.length - 1;
        }
        rebuild();
        seekToElement(App.sel);
        renderLibrary();
      };
      list.appendChild(row);
    }
  }
}

/* ------------------------------------------------------------
   Program panel
   ------------------------------------------------------------ */
function renderStats() {
  const p = App.path;
  const jumps = p.segs.filter((s) => s.lib.cat === 'jumps').length;
  const spins = p.segs.filter((s) => s.lib.cat === 'spins').length;
  $('#progStats').innerHTML = '';
  const add = (v, l) => $('#progStats').appendChild(el('div', {}, el('b', {}, String(v)), el('span', {}, l)));
  add(fmtTime(p.totalTime), 'length');
  add(p.segs.length, 'elements');
  add(jumps, 'jumps');
  add(spins, 'spins');
}

function renderProgramList() {
  const list = $('#progList');
  list.innerHTML = '';
  const segs = App.path.segs;
  if (!segs.length) {
    list.appendChild(el('div', { class: 'empty' },
      'Empty program. Click elements in the library on the left, or load a preset from the top bar.'));
    return;
  }
  segs.forEach((seg, i) => {
    const inst = seg.inst;
    const isAuto = inst.note === 'auto-inserted connector'
      || inst.note === 'connecting / choreography — not from the protocol';
    const row = el('div', {
      class: 'progRow' + (i === App.sel ? ' sel' : '') + (isAuto ? ' auto' : ''),
      'data-i': i,
    },
      el('div', { class: 'idx' }, String(i + 1)),
      el('div', { class: 'bar' }),
      el('div', { class: 'info' },
        el('div', { class: 'rn' },
          inst.protocol ? el('span', { class: 'protoBadge', title: 'from the competition protocol — this part is exact' }, '●') : null,
          seg.lib.name + (inst.mirror ? ' ↔' : '')),
        el('div', { class: 'rm' }, `${fmtCount(seg.beat0)} · ${seg.entry}→${seg.exit}`)),
      el('div', { class: 'rb' }, inst.beats + 'b'),
      el('button', { class: 'del', title: 'Remove' }, '×'));
    row.querySelector('.bar').style.background = CAT_COLOR[seg.lib.cat];
    row.onclick = (ev) => {
      if (ev.target.classList.contains('del')) {
        App.program.elements.splice(i, 1);
        if (App.sel >= App.program.elements.length) App.sel = App.program.elements.length - 1;
        rebuild(); renderLibrary();
        return;
      }
      App.sel = i; App.opts.highlight = i;
      seekToElement(i);
      renderProgramList(); renderLibrary();
      switchTab('insp');
    };
    list.appendChild(row);

    // seam warning between this element and the next
    const next = segs[i + 1];
    if (next && seg.exit !== next.entry) {
      const w = el('div', { class: 'seamWarn' },
        el('span', {}, '⚠'),
        el('span', {}, `${seg.exit} → ${next.entry}: needs ${suggestConnector(seg.exit, next.entry)}`),
        el('button', {}, 'Fix'));
      w.querySelector('button').onclick = (ev) => {
        ev.stopPropagation();
        const fix = bridge(seg.exit, next.entry, 5);
        if (!fix) { toast('No single connecting step joins those edges — try a different element.'); return; }
        const made = fix.map((f) => Object.assign(
          { uid: uid(), libId: f.libId, mirror: f.mirror, beats: Math.min(LIB_BY_ID[f.libId].beats, 4),
            radiusScale: 1, aim: 0, gapBefore: 0, note: 'auto-inserted connector' }));
        App.program.elements.splice(i + 1, 0, ...made);
        rebuild();
      };
      list.appendChild(w);
    }
  });
}

/* ------------------------------------------------------------
   Inspector
   ------------------------------------------------------------ */
function renderInspector() {
  const box = $('#tab-insp');
  const i = App.sel;
  if (i < 0 || i >= App.program.elements.length) {
    box.innerHTML = '<div class="empty">Select an element in the program to edit it.</div>';
    return;
  }
  const inst = App.program.elements[i];
  const R = resolve(inst);
  const lib = R.lib;
  const seg = App.path.segs.find((s) => s.ei === i);

  box.innerHTML = '';
  const wrap = el('div', { class: 'insp' });

  wrap.appendChild(el('h3', {}, lib.name));
  wrap.appendChild(el('div', { class: 'icat' },
    `${(CATEGORIES.find((c) => c.key === lib.cat) || {}).name} · difficulty ${lib.diff}/5${seg ? ' · ' + fmtCount(seg.beat0) : ''}`));

  wrap.appendChild(el('div', { class: 'codeRow' },
    el('div', {}, `${R.entry}  →  ${R.exit}`),
    el('em', {}, `${describeCode(R.entry)} into ${describeCode(R.exit)}`)));

  const slider = (label, val, min, max, step, fmt, onInput) => {
    const c = el('div', { class: 'ctrl' });
    const lab = el('label', {}, el('span', {}, label), el('span', {}, fmt(val)));
    const inp = el('input', { type: 'range', min, max, step, value: val });
    inp.oninput = () => { lab.lastChild.textContent = fmt(+inp.value); onInput(+inp.value); };
    c.appendChild(lab); c.appendChild(inp);
    return c;
  };

  wrap.appendChild(slider('Duration', inst.beats, 1, 32, 1, (v) => v + ' beats',
    (v) => { inst.beats = v; rebuild(); }));
  wrap.appendChild(slider('Lobe size', inst.radiusScale, 0.4, 2.2, 0.05, (v) => v.toFixed(2) + '×',
    (v) => { inst.radiusScale = v; rebuild(); }));
  wrap.appendChild(slider('Steering at entry', inst.aim, -90, 90, 5, (v) => v + '°',
    (v) => { inst.aim = v; rebuild(); }));
  wrap.appendChild(slider('Pause before', inst.gapBefore, 0, 16, 1, (v) => v + ' beats',
    (v) => { inst.gapBefore = v; rebuild(); }));

  const btns = el('div', { class: 'btnRow' });
  const mir = el('button', { class: 'btn sm' + (inst.mirror ? ' primary' : ' ghost') }, inst.mirror ? 'Mirrored ↔' : 'Mirror L/R');
  mir.onclick = () => { inst.mirror = !inst.mirror; rebuild(); renderInspector(); };
  btns.appendChild(mir);
  const up = el('button', { class: 'btn ghost sm' }, '↑ move up');
  up.onclick = () => { if (i > 0) { const a = App.program.elements; [a[i - 1], a[i]] = [a[i], a[i - 1]]; App.sel = i - 1; rebuild(); renderInspector(); } };
  const dn = el('button', { class: 'btn ghost sm' }, '↓ move down');
  dn.onclick = () => { const a = App.program.elements; if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; App.sel = i + 1; rebuild(); renderInspector(); } };
  const dup = el('button', { class: 'btn ghost sm' }, 'Duplicate');
  dup.onclick = () => {
    App.program.elements.splice(i + 1, 0, Object.assign({}, inst, { uid: uid() }));
    App.sel = i + 1; rebuild(); renderInspector();
  };
  const del = el('button', { class: 'btn ghost sm' }, 'Delete');
  del.onclick = () => { App.program.elements.splice(i, 1); App.sel = Math.min(i, App.program.elements.length - 1); rebuild(); renderInspector(); };
  btns.appendChild(up); btns.appendChild(dn); btns.appendChild(dup); btns.appendChild(del);
  wrap.appendChild(btns);

  if (Music.buffer && App.program.hits.length && seg) {
    const snapRow = el('div', { class: 'btnRow' });
    const snap = el('button', { class: 'btn ghost sm' }, '⇥ Snap start to nearest hit');
    snap.onclick = () => {
      const abs = App.program.offset + seg.t0;
      let best = null;
      for (const hh of App.program.hits) {
        const d = Math.abs(hh - abs);
        if (best === null || d < Math.abs(best - abs)) best = hh;
      }
      if (best === null) return;
      const spb = 60 / App.program.bpm;
      const deltaBeats = Math.round(((best - abs) / spb) * 2) / 2;
      inst.gapBefore = Math.max(0, +(inst.gapBefore + deltaBeats).toFixed(1));
      rebuild(); renderInspector();
      toast(`Moved ${deltaBeats > 0 ? '+' : ''}${deltaBeats} beats onto the hit.`);
    };
    snapRow.appendChild(snap);
    wrap.appendChild(snapRow);
  }

  wrap.appendChild(el('div', { class: 'tipBox' }, el('b', {}, 'Coaching note'), lib.tip));
  wrap.appendChild(el('div', { class: 'tipBox ext' }, el('b', {}, 'Extension / line cue'), lib.ext));

  const noteC = el('div', { class: 'ctrl' });
  noteC.appendChild(el('label', {}, el('span', {}, 'Your note (prints on the coach sheet)')));
  const ta = el('textarea', { placeholder: 'e.g. breathe here / arms port de bras on 5-6-7-8' });
  ta.value = inst.note === 'auto-inserted connector' ? '' : (inst.note || '');
  ta.oninput = () => { inst.note = ta.value; };
  noteC.appendChild(ta);
  wrap.appendChild(noteC);

  if (seg) {
    wrap.appendChild(el('div', { class: 'meterLbl' },
      el('span', {}, `covers ${seg.dist.toFixed(1)} m`),
      el('span', {}, `${seg.speed.toFixed(1)} m/s`)));
  }
  box.appendChild(wrap);
}

/* ------------------------------------------------------------
   Analysis tab
   ------------------------------------------------------------ */
function renderAnalysis() {
  ensureAnalysis();
  const a = App.analysis, r = App.rules;
  const box = $('#tab-anal');
  box.innerHTML = '';

  const sec = (title) => {
    const s = el('div', { class: 'section' }, el('h3', {}, title));
    box.appendChild(s); return s;
  };

  // --- skatability ---
  let s = sec('Can you actually skate it?');
  if (!a.continuity.length) {
    s.appendChild(el('div', { class: 'good' }, '✓ Every element connects — no impossible seams.'));
  } else {
    for (const c of a.continuity) {
      s.appendChild(el('div', { class: 'issue err' }, el('span', { class: 'ic' }, '⚠'),
        el('span', {}, `${c.from} ends ${c.fromCode}, ${c.to} starts ${c.toCode} — needs ${c.fix}.`)));
    }
    const fix = el('button', { class: 'btn ghost sm' }, `Insert ${a.continuity.length} connecting step${a.continuity.length > 1 ? 's' : ''}`);
    fix.onclick = () => { const n = repairProgram(App.program, { diffCap: 5 }); rebuild(); renderAnalysis(); toast(`Inserted ${n} connecting steps.`); };
    s.appendChild(el('div', { class: 'btnRow', style: 'margin-top:8px' }, fix));
  }
  for (const sp of a.speed) {
    s.appendChild(el('div', { class: 'issue warn' }, el('span', { class: 'ic' }, '⚡'),
      el('span', {}, `${sp.name}: ${sp.msg}`)));
  }
  if (a.bounds.length) {
    s.appendChild(el('div', { class: 'issue warn' }, el('span', { class: 'ic' }, '⛸'),
      el('span', {}, `${(a.bounds.length * DT).toFixed(1)}s of the pattern runs into the boards. Reduce a lobe size, or steer an element.`)));
  }

  // --- level rules ---
  s = sec(`Rules check — ${r.level.name}`);
  if (!r.issues.length) s.appendChild(el('div', { class: 'good' }, '✓ Nothing flagged for this level.'));
  for (const i of r.issues) {
    s.appendChild(el('div', { class: 'issue ' + i.lvl },
      el('span', { class: 'ic' }, i.lvl === 'err' ? '✕' : i.lvl === 'warn' ? '!' : 'i'), el('span', {}, i.msg)));
  }
  s.appendChild(el('div', { class: 'noteList' }, r.level.note));
  s.appendChild(el('div', { class: 'issue info' }, el('span', { class: 'ic' }, 'i'),
    el('span', {}, 'These are encoded from the general shape of the well-balanced program — verify against the current USFS rulebook.')));

  // --- ice coverage ---
  s = sec('Ice coverage');
  const pct = a.coverage.pct;
  const m = el('div', { class: 'meter' }, el('i', {}));
  m.firstChild.style.width = clamp(pct, 0, 100) + '%';
  m.firstChild.style.background = pct < 25 ? 'var(--err)' : pct < 40 ? 'var(--warn)' : 'var(--accent2)';
  s.appendChild(m);
  s.appendChild(el('div', { class: 'meterLbl' }, el('span', {}, pct.toFixed(0) + '% of the rink touched'),
    el('span', {}, pct < 25 ? 'too concentrated' : pct < 40 ? 'could spread out' : 'good spread')));
  const heat = el('button', { class: 'btn ghost sm' }, 'Show heatmap in overhead view');
  heat.onclick = () => { App.opts.heatmap = true; $('#tgHeat').checked = true; setCam('overhead'); };
  s.appendChild(el('div', { class: 'btnRow', style: 'margin-top:8px' }, heat));

  // --- rotation balance ---
  s = sec('Rotation balance');
  const bar = el('div', { class: 'rotBar' },
    el('div', {}, a.rotation.ccw > 12 ? a.rotation.ccw.toFixed(0) + '% CCW' : ''),
    el('div', {}, a.rotation.cw > 12 ? a.rotation.cw.toFixed(0) + '% CW' : ''));
  bar.children[0].style.cssText = `width:${a.rotation.ccw}%;background:var(--accent)`;
  bar.children[1].style.cssText = `width:${a.rotation.cw}%;background:#c98bf0`;
  s.appendChild(bar);
  const skew = Math.abs(a.rotation.ccw - 50);
  s.appendChild(el('div', { class: 'noteList' },
    skew > 28 ? 'Heavily one-directional. Judges notice, and so will your hips — try mirroring a few elements.'
              : skew > 15 ? 'Slightly one-sided, which is normal, but a mirrored element or two would balance it.'
              : 'Nicely balanced in both rotational directions.'));

  // --- stamina ---
  s = sec('Effort over time');
  const cvs = el('canvas', { class: 'spark' });
  s.appendChild(cvs);
  requestAnimationFrame(() => drawEffort(cvs, a, App.path));
  const back = a.fatigue.length ? a.fatigue[a.fatigue.length - 1].v : 0;
  const peak = a.fatigue.reduce((m2, f) => Math.max(m2, f.v), 0);
  s.appendChild(el('div', { class: 'noteList' },
    back > peak * 0.92 && a.fatigue.length > 6
      ? 'Your hardest work is at the very end. That is where programs fall apart — consider moving one big element earlier.'
      : 'Load is reasonably spread across the program.'));
}

function drawEffort(cvs, a, path) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cvs.clientWidth || 280, h = 44;
  cvs.width = w * dpr; cvs.height = h * dpr;
  const c = cvs.getContext('2d'); c.scale(dpr, dpr);
  c.clearRect(0, 0, w, h);
  const T = path.totalTime || 1;
  c.fillStyle = '#131d29'; c.fillRect(0, 0, w, h);
  for (const e of a.effort) {
    const x0 = (e.t0 / T) * w, x1 = (e.t1 / T) * w;
    const hh = (e.cost / 5) * (h - 6);
    c.fillStyle = `hsl(${205 - e.cost * 26}, 72%, 55%)`;
    c.globalAlpha = 0.85;
    c.fillRect(x0, h - hh - 2, Math.max(1, x1 - x0 - 0.6), hh);
  }
  c.globalAlpha = 1;
  const peak = a.fatigue.reduce((m, f) => Math.max(m, f.v), 0) || 1;
  c.strokeStyle = '#ff9a5c'; c.lineWidth = 1.6; c.beginPath();
  a.fatigue.forEach((f, i) => {
    const x = (f.t / T) * w, y = h - (f.v / peak) * (h - 8) - 2;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.stroke();
}

/* ------------------------------------------------------------
   Extension Lab
   ------------------------------------------------------------ */
function renderExtLab() {
  ensureAnalysis();
  const box = $('#tab-ext');
  box.innerHTML = '';
  const e = App.ext;
  if (!e || !App.path.segs.length) {
    box.innerHTML = '<div class="empty">Add some elements and the Extension Lab will score your line.</div>';
    return;
  }

  const sec = (title) => { const s = el('div', { class: 'section' }, el('h3', {}, title)); box.appendChild(s); return s; };

  let s = sec('Line score across the program');
  const m = el('div', { class: 'meter' }, el('i', {}));
  m.firstChild.style.width = e.overall + '%';
  m.firstChild.style.background = e.overall < 50 ? 'var(--err)' : e.overall < 68 ? 'var(--warn)' : 'var(--accent2)';
  s.appendChild(m);
  s.appendChild(el('div', { class: 'meterLbl' }, el('span', {}, e.overall.toFixed(0) + ' / 100'),
    el('span', {}, e.overall < 50 ? 'lots to gain here' : e.overall < 68 ? 'decent, not finished' : 'strong line')));
  s.appendChild(el('div', { class: 'noteList' },
    'Measured from free-leg height, free-knee straightness, toe point, skating-knee bend and upper-body carriage in the modelled positions. It scores the shapes the program asks for — not how well you personally hit them.'));

  s = sec('Penguin meter');
  const pm = el('div', { class: 'meter' }, el('i', {}));
  pm.firstChild.style.width = e.penguin + '%';
  pm.firstChild.style.background = e.penguin > 55 ? 'var(--err)' : e.penguin > 38 ? 'var(--warn)' : 'var(--accent2)';
  s.appendChild(pm);
  s.appendChild(el('div', { class: 'meterLbl' }, el('span', {}, e.penguin.toFixed(0) + '% stiff'), el('span', {}, 'lower is better')));
  s.appendChild(el('div', { class: 'noteList' },
    e.penguin > 55 ? 'This program is mostly upright, straight-legged and arms-down. Swap some plain edges for swing rolls, attitude glides and port de bras — those three changes fix most of it.'
      : e.penguin > 38 ? 'Reasonable, but there are stretches with a locked skating knee and small arms. Look for the low-scoring elements below.'
      : 'Plenty of knee bend, reach and shape. This will read as skating, not standing.'));

  s = sec('Weakest line — work these first');
  for (const row of e.rows.slice(0, 8)) {
    const r = el('div', { class: 'extRow' },
      el('span', { class: 'en' }, row.name),
      el('span', { class: 'extBar' }, el('i', {})),
      el('span', { class: 'es' }, row.score.toFixed(0)));
    const bar = r.querySelector('.extBar i');
    bar.style.width = row.score + '%';
    bar.style.background = row.score < 50 ? 'var(--err)' : row.score < 68 ? 'var(--warn)' : 'var(--accent2)';
    r.onclick = () => { App.sel = row.ei; App.opts.highlight = row.ei; seekToElement(row.ei); renderProgramList(); switchTab('insp'); };
    s.appendChild(r);
  }

  s = sec('What the model is telling you');
  const notes = new Set();
  for (const row of e.rows.slice(0, 6)) row.notes.forEach((n) => notes.add(n));
  if (!notes.size) s.appendChild(el('div', { class: 'good' }, '✓ No specific line faults in the modelled positions.'));
  const ul = el('ul', { class: 'noteList' });
  [...notes].forEach((n) => ul.appendChild(el('li', {}, n)));
  s.appendChild(ul);

  s = sec('Cue for the element playing now');
  const live = el('div', { class: 'tipBox ext', id: 'liveCue' }, el('b', {}, 'live'), '—');
  s.appendChild(live);
}

/* ------------------------------------------------------------
   Tabs
   ------------------------------------------------------------ */
function currentTab() { return ($('.tabs button.on') || {}).dataset ? $('.tabs button.on').dataset.tab : 'prog'; }
function switchTab(name) {
  $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $$('.tabBody').forEach((b) => b.classList.add('hidden'));
  $('#tab-' + name).classList.remove('hidden');
  if (name === 'anal') renderAnalysis();
  if (name === 'ext') renderExtLab();
  if (name === 'insp') renderInspector();
}

/* ------------------------------------------------------------
   Playback
   ------------------------------------------------------------ */
function setPlaying(on) {
  App.playing = on;
  $('#playBtn').textContent = on ? '❚❚' : '▶';
  if (on) {
    App._lastFrame = performance.now();
    if (Music.buffer && $('#tgMusic').checked) Music.play(App.program.offset + App.time, App.speed);
  } else {
    Music.stop();
  }
}

function seek(t) {
  App.time = clamp(t, 0, App.path.totalTime || 0);
  if (App.playing && Music.buffer && $('#tgMusic').checked) Music.play(App.program.offset + App.time, App.speed);
}

function seekToElement(i) {
  const seg = App.path.segs.find((s) => s.ei === i);
  if (seg) seek(seg.t0 + 0.01);
}

function tick(now) {
  App._raf = requestAnimationFrame(tick);
  const dt = Math.min(0.1, (now - App._lastFrame) / 1000);
  App._lastFrame = now;

  if (App.playing) {
    if (Music.buffer && Music.playing && $('#tgMusic').checked) {
      App.time = Music.position() - App.program.offset;
    } else {
      App.time += dt * App.speed;
    }
    const loopSeg = App.loop && App.sel >= 0 ? App.path.segs.find((s) => s.ei === App.sel) : null;
    if (loopSeg) {
      if (App.time >= loopSeg.t1 || App.time < loopSeg.t0 - 0.05) seek(loopSeg.t0);
    } else if (App.time >= App.path.totalTime) {
      if (App.loop) seek(0); else { App.time = App.path.totalTime; setPlaying(false); }
    }
  }
  drawAll(dt);
}

/* ------------------------------------------------------------
   Drawing
   ------------------------------------------------------------ */
function fitCanvas(cvs) {
  const dpr = window.devicePixelRatio || 1;
  const w = cvs.clientWidth, h = cvs.clientHeight;
  if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) {
    cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
  }
  const ctx = cvs.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function drawAll(dt) {
  const { ctx, w, h } = fitCanvas($('#view'));
  if (App.opts.heatmap) ensureAnalysis();
  const res = renderFrame(ctx, w, h, {
    program: App.program, path: App.path, cam: App.cam, time: App.time,
    dt: dt || 0,
    opts: App.opts, analysis: App.analysis,
    refProgram: App.refIndex >= 0 ? App.programs[App.refIndex] : null,
    refPath: App.refPath,
  });
  drawHUD(res);
  drawWave();
  updateClock();
}

function drawHUD(res) {
  const s = res.sample;
  const hud = $('#hud'), right = $('#hudRight');
  if (!s || s.ei < 0) {
    hud.innerHTML = '<div class="hName">—</div><div class="hTip">Add elements from the library to build a program.</div>';
    right.innerHTML = '';
    return;
  }
  const inst = App.program.elements[s.ei];
  const lib = LIB_BY_ID[inst.libId];
  const cat = CATEGORIES.find((c) => c.key === lib.cat);
  hud.innerHTML = '';
  const inSeq = !!inst.chst;
  let seqLabel = 'STEP SEQUENCE';
  if (inSeq && App.path) {
    const seqSegs = App.path.segs.filter((sg) => sg.inst && sg.inst.chst);
    if (seqSegs.length) { const t0 = seqSegs[0].t0, t1 = seqSegs[seqSegs.length - 1].t1; let mn = 1e9, mx = -1e9;
      for (const q of App.path.samples) { if (q.t < t0 || q.t > t1) continue; if (q.x < mn) mn = q.x; if (q.x > mx) mx = q.x; }
      const frac = (mx - mn) / RINK.L; seqLabel += ' \u00b7 ' + Math.round(frac * 100) + '% OF THE LENGTH' + (frac >= 0.5 ? ' \u00b7 HALF ICE \u2713' : ' \u00b7 UNDER HALF'); }
  }
  const badge = el('div', { class: 'hBadge' }, inSeq ? seqLabel + ' \u00b7 ' + (cat ? cat.name : lib.cat).toUpperCase() : (cat ? cat.name : lib.cat).toUpperCase());
  badge.style.background = inSeq ? CAT_COLOR.steps : (CAT_COLOR[lib.cat] || '#9aa6b8');
  hud.appendChild(badge);
  hud.appendChild(el('div', { class: 'hName' }, `${s.ei + 1}. ${lib.name}${inst.mirror ? ' ↔' : ''}`));
  hud.appendChild(el('div', { class: 'hCode' }, `${s.code} — ${describeCode(s.code)}`));
  const nxt = App.path.segs[s.ei + 1];
  if (nxt) {
    const dt = Math.max(0, nxt.t0 - App.time);
    hud.appendChild(el('div', { class: 'hNext' }, `next: ${nxt.lib.name}  ·  ${dt.toFixed(1)}s`));
  }
  hud.appendChild(el('div', { class: 'hTip' }, lib.ext));

  const lean = Math.abs(s.lean) / DEG;
  right.innerHTML = '';
  right.appendChild(el('div', {}, 'speed  ', el('b', {}, s.speed.toFixed(1) + ' m/s')));
  right.appendChild(el('div', {}, 'lean   ', el('b', {}, lean.toFixed(0) + '°')));
  right.appendChild(el('div', {}, 'count  ', el('b', {}, fmtCount(s.beat))));

  // live line score in the Extension Lab
  const cue = $('#liveCue');
  if (cue && res.world) {
    const lm = lineMetrics(res.world._local);
    cue.innerHTML = '';
    cue.appendChild(el('b', {}, `${lib.name} — line ${lm.overall.toFixed(0)}/100`));
    cue.appendChild(document.createTextNode(lm.notes.length ? lm.notes[0] : lib.ext));
  }

  // keep the program list's "now playing" marker in sync
  $$('.progRow').forEach((r) => r.classList.toggle('playing', +r.dataset.i === s.ei));
}

function drawWave() {
  const { ctx, w, h } = fitCanvas($('#wave'));
  const dur = Music.buffer ? Music.duration : (App.path.totalTime + App.program.offset) || 1;
  drawWaveform(ctx, w, h, {
    peaks: Music.peaks, duration: dur, time: App.program.offset + App.time,
    bpm: App.program.bpm, offset: App.program.offset, hits: App.program.hits,
    program: App.program, path: App.path, selection: App.sel,
  });
}

function updateClock() {
  $('#clock').textContent = `${fmtTime(App.time)} / ${fmtTime(App.path.totalTime)}`;
  const spb = 60 / App.program.bpm;
  $('#counter').textContent = fmtCount(App.time / spb);
}

/* ------------------------------------------------------------
   Camera controls
   ------------------------------------------------------------ */
function setCam(mode) {
  App.cam.mode = mode;
  $$('#camBar button').forEach((b) => b.classList.toggle('on', b.dataset.cam === mode));
}

function bindViewport() {
  const cvs = $('#view');
  let drag = null;
  cvs.addEventListener('mousedown', (e) => {
    // don't switch camera yet — a plain click should not hijack the view
    drag = { x: e.clientX, y: e.clientY, moved: 0, active: false };
  });
  window.addEventListener('mousemove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (!drag.active) {
      if (drag.moved < 4) return;            // real drag, not a stray click
      drag.active = true;
      if (App.cam.mode !== 'orbit') setCam('orbit');
    }
    App.cam.orbit.az -= dx * 0.006;
    App.cam.orbit.el = clamp(App.cam.orbit.el + dy * 0.005, 0.03, 1.5);
  });
  window.addEventListener('mouseup', () => { drag = null; });
  cvs.addEventListener('wheel', (e) => {
    e.preventDefault();
    App.cam.zoom = clamp(App.cam.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.35, 5);
  }, { passive: false });
  cvs.addEventListener('dblclick', () => {
    App.cam.orbit.follow = !App.cam.orbit.follow;
    toast(App.cam.orbit.follow ? 'Orbit now follows the skater.' : 'Orbit locked to the rink.');
  });

  $$('#camBar button').forEach((b) => { b.onclick = () => setCam(b.dataset.cam); });
}

/* ------------------------------------------------------------
   Music
   ------------------------------------------------------------ */
async function loadMusicFile(file) {
  try {
    toast('Decoding audio…');
    const res = await Music.load(file);
    App.program.musicName = file.name;
    App.program.musicDuration = Music.duration;
    if (res.bpm) { App.program.bpm = res.bpm; $('#bpmInput').value = res.bpm; }
    if (res.offset) App.program.offset = res.offset;
    $('#musicName').textContent = `${file.name} · ${fmtTime(Music.duration)} · detected ${res.bpm} bpm`;
    rebuild();
    toast(`Loaded. Detected ${res.bpm} bpm — if that looks wrong, tap the tempo instead.`);
  } catch (err) {
    toast('Could not decode that file: ' + err.message);
  }
}

function bindMusic() {
  $('#musicBtn').onclick = () => $('#fileAudio').click();
  $('#fileAudio').onchange = (e) => { if (e.target.files[0]) loadMusicFile(e.target.files[0]); };

  const hint = $('#dropHint');
  let depth = 0;
  window.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; hint.classList.add('on'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', () => { if (--depth <= 0) hint.classList.remove('on'); });
  window.addEventListener('drop', (e) => {
    e.preventDefault(); depth = 0; hint.classList.remove('on');
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.type.startsWith('audio') || /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(f.name)) loadMusicFile(f);
    else if (/\.json$/i.test(f.name)) f.text().then(loadProgramText);
  });

  $('#wave').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    const dur = Music.buffer ? Music.duration : (App.path.totalTime + App.program.offset) || 1;
    seek(f * dur - App.program.offset);
  });

  $('#hitBtn').onclick = markHit;
  $('#tapBtn').onclick = () => {
    const bpm = Music.tap();
    if (bpm) { App.program.bpm = Math.round(bpm * 10) / 10; $('#bpmInput').value = App.program.bpm; rebuild(); toast(`Tempo ${App.program.bpm} bpm`); }
    else toast('Keep tapping…');
  };
}

function markHit() {
  const t = App.program.offset + App.time;
  App.program.hits.push(+t.toFixed(3));
  App.program.hits.sort((a, b) => a - b);
  toast(`Hit marked at ${fmtTime(t)} — ${App.program.hits.length} total. Select an element and use "Snap start to nearest hit".`);
}

/* ------------------------------------------------------------
   Menus, files, modals
   ------------------------------------------------------------ */
function bindMenus() {
  const wire = (btnId, menuId) => {
    const b = $('#' + btnId), m = $('#' + menuId);
    b.onclick = (e) => {
      e.stopPropagation();
      const wasOpen = m.classList.contains('open');
      $$('.menu').forEach((x) => x.classList.remove('open'));
      if (!wasOpen) m.classList.add('open');
    };
  };
  wire('newBtn', 'newMenu'); wire('exportBtn', 'exportMenu');
  document.addEventListener('click', () => $$('.menu').forEach((m) => m.classList.remove('open')));

  $('#galleryBtn').onclick = showGallery;
  $('#galleryClose').onclick = () => $('#gallery').classList.add('hidden');
  $('#gallery').onclick = (e) => { if (e.target.id === 'gallery') $('#gallery').classList.add('hidden'); };

  $('#newMenu').onclick = (e) => {
    const act = e.target.closest('button') && e.target.closest('button').dataset.act;
    if (act === 'blank') openProgram(newProgram('Untitled Program ' + (App.programs.length + 1)));
    if (act === 'duplicate') {
      const copy = importJSON(JSON.stringify({ format: 'skating-choreographer', version: 1, program: App.program }));
      copy.name = App.program.name + ' (copy)';
      openProgram(copy);
    }
    if (act === 'import') $('#fileJson').click();
    if (act === 'remix') { if (typeof REMIX_PROGRAMS === 'undefined') { alert('No remix deck loaded — see tools/publish-local.sh and the section-variants skill.'); } else showRemix(); }
    if (act === 'auto') showGenerator();
    if (act === 'protocol') showProtocolBuilder();
  };
  $('#fileJson').onchange = (e) => { if (e.target.files[0]) e.target.files[0].text().then(loadProgramText); };

  $('#exportMenu').onclick = (e) => {
    const act = e.target.closest('button') && e.target.closest('button').dataset.act;
    if (!act) return;
    ensureAnalysis();
    if (act === 'json') exportJSON(App.program);
    if (act === 'all') exportAllJSON(App.programs);
    if (act === 'png') exportPatternPNG(App.program, App.path);
    if (act === 'csv') exportCSV(App.program, App.path);
    if (act === 'sheet') printSheet(App.program, App.path, App.analysis, App.rules);
    if (act === 'card') printCard(App.program, App.path);
  };
}

function loadProgramText(text) {
  try {
    const progs = importAnyJSON(text);
    progs.forEach((p) => openProgram(p));
    toast(progs.length > 1 ? `Loaded ${progs.length} programs into tabs.` : 'Program loaded.');
  } catch (err) { toast('Could not read that file: ' + err.message); }
}

function afterLoad() {
  if (App.programs.length) App.programs[App.current] = App.program;
  App.sel = -1; App.opts.highlight = -1;
  $('#progName').value = App.program.name;
  $('#bpmInput').value = App.program.bpm;
  $('#levelSel').value = App.program.level;
  App.program.hits = App.program.hits || [];
  rebuild(false);
  seek(0);
  renderLibrary();
  switchTab('prog');
}

function showModal(html) {
  $('#modalBody').innerHTML = '';
  if (typeof html === 'string') $('#modalBody').innerHTML = html;
  else $('#modalBody').appendChild(html);
  $('#modal').classList.remove('hidden');
}

/* ------------------------------------------------------------
   Remix — pick a variant for each section of the program
   ------------------------------------------------------------ */
let _remixPicks = null;

function showRemix() {
  const base = App.program;
  if (!_remixPicks) _remixPicks = REMIX_PROGRAMS[0].picks.slice();

  const box = el('div');
  box.appendChild(el('h2', {}, 'Remix'));
  box.appendChild(el('p', {},
    'Five takes on each part of the program. Pick whichever you like from each row — '
    + 'every variant of a section enters and leaves on the same edge and runs for exactly the same '
    + 'number of beats, so any combination joins up cleanly and still lands on the music.'));

  const presetRow = el('div', { class: 'remixPresets' });
  for (const rp of REMIX_PROGRAMS) {
    const b = el('button', { class: 'btn ghost sm', title: rp.note }, rp.name);
    b.onclick = () => { _remixPicks = rp.picks.slice(); draw(); };
    presetRow.appendChild(b);
  }
  box.appendChild(presetRow);

  const grid = el('div', { class: 'remixGrid' });
  box.appendChild(grid);

  const summary = el('div', { class: 'remixSummary' });
  box.appendChild(summary);

  const go = el('button', { class: 'btn primary' }, 'Open this mix in a new tab');
  go.onclick = async () => {
    go.disabled = true;
    const p = buildRemix('La La Land — remix', _remixPicks, base, { steer: false });
    $('#modal').classList.add('hidden');
    openProgram(p);
    toast('Steering the pattern — placing jumps and spins…');
    await steerProgramMulti(p, { onProgress: (stage, f) => { go.textContent = `${stage} ${Math.round(f * 100)}%`; } });
    rebuild(false);
    toast('Remixed. On the ice, spins centred, jumps at centre or in a corner, timing unchanged.');
  };
  box.appendChild(go);

  function draw() {
    grid.innerHTML = '';
    SECTIONS.forEach((sec, si) => {
      const row = el('div', { class: 'remixRow' });
      row.appendChild(el('div', { class: 'remixLabel' },
        el('b', {}, sec.name), el('span', {}, sec.blurb)));
      const opts = el('div', { class: 'remixOpts' });
      VARIANTS[sec.key].forEach((v, vi) => {
        const b = el('button', { class: 'remixOpt' + (_remixPicks[si] === vi ? ' on' : ''), title: v.note },
          el('b', {}, v.name), el('span', {}, v.note));
        b.onclick = () => { _remixPicks[si] = vi; draw(); };
        opts.appendChild(b);
      });
      row.appendChild(opts);
      grid.appendChild(row);
    });
    // live read-out of what this mix actually is
    const p = buildRemix('preview', _remixPicks, base);
    const path = buildPath(p);
    const a = analyze(p, path), r = checkRules(p, path, a), q = analyzeStepSequence(p, path);
    const errs = r.issues.filter((i) => i.lvl === 'err').length;
    summary.innerHTML = '';
    summary.appendChild(el('div', {},
      `${fmtTime(path.totalTime)} · ${p.elements.length} elements · `
      + `${a.continuity.length} broken seams · ${errs} rule errors`
      + (q ? ` · step sequence: ${q.difficult} difficult turns from ${q.families} families` : '')));
  }
  draw();
  showModal(box);
}

function showGenerator() {
  const box = el('div');
  box.appendChild(el('h2', {}, 'Auto-generate a program skeleton'));
  box.appendChild(el('p', {}, 'This lays out a plausible frame — opening, build, jump, spin, step sequence, ending — using only elements that actually connect edge-to-edge at your level. Treat it as a starting point to rip apart, not a finished program.'));
  const form = el('div', { class: 'genForm' });
  const secs = el('input', { type: 'number', value: Math.round(Music.duration || 100), min: 30, max: 300 });
  const bpm = el('input', { type: 'number', value: App.program.bpm, min: 50, max: 200, step: 0.5 });
  const lvl = el('select');
  for (const [k, v] of Object.entries(LEVELS)) lvl.appendChild(el('option', { value: k }, v.name));
  lvl.value = App.program.level;
  const seed = el('input', { type: 'number', value: 1, min: 1, max: 999 });
  form.appendChild(el('label', {}, 'Length (seconds)', secs));
  form.appendChild(el('label', {}, 'BPM', bpm));
  form.appendChild(el('label', {}, 'Level', lvl));
  form.appendChild(el('label', {}, 'Variation', seed));
  box.appendChild(form);
  const go = el('button', { class: 'btn primary' }, 'Generate');
  go.onclick = () => {
    const gen = autoGenerate(+secs.value, lvl.value, +bpm.value, +seed.value);
    if (Music.buffer) { gen.musicName = Music.name; gen.musicDuration = Music.duration; }
    $('#modal').classList.add('hidden');
    openProgram(gen);
    toast('Generated. Every seam connects — now make it yours.');
  };
  box.appendChild(go);
  showModal(box);
}

/* ------------------------------------------------------------
   Program Gallery — where the famous-skater study patterns live
   ------------------------------------------------------------ */
let _galleryBuilt = false;
function showGallery() {
  const modal = $('#gallery');
  modal.classList.remove('hidden');
  if (_galleryBuilt) return;
  _galleryBuilt = true;

  const grid = $('#galGrid');
  grid.innerHTML = '';
  for (const preset of PRESETS) {
    const prog = loadPreset(preset);
    const path = buildPath(prog);

    const cvs = el('canvas');
    const W = 300, H = 165, dpr = window.devicePixelRatio || 1;
    cvs.width = W * dpr; cvs.height = H * dpr;
    cvs.style.aspectRatio = `${W} / ${H}`;
    const c = cvs.getContext('2d');
    c.scale(dpr, dpr);
    drawPatternDiagram(c, W, H, prog, path, { pad: 8, bg: '#ffffff' });

    const openIt = () => {
      openProgram(loadPreset(preset));
      modal.classList.add('hidden');
      toast(`Opened "${preset.name}" in a new tab.`);
    };
    const compareIt = () => {
      openProgram(loadPreset(preset));
      // put it behind the tab you were on
      const justOpened = App.programs.length - 1;
      const back = Math.max(0, justOpened - 1);
      switchProgram(back);
      App.refIndex = justOpened;
      renderProgramTabs();
      modal.classList.add('hidden');
      toast(`"${preset.name}" is now the grey pattern underneath.`);
    };
    cvs.onclick = openIt;

    const card = el('div', { class: 'galCard' }, cvs,
      el('div', { class: 'galBody' },
        el('div', { class: 'galName' }, preset.name),
        el('div', { class: 'galSub' }, preset.subtitle),
        el('div', { class: 'galStats' },
          `${fmtTime(path.totalTime)} · ${preset.bpm} bpm · ${prog.elements.length} elements`),
        el('div', { class: 'galHi' }, (preset.highlights || []).map((h) => el('span', {}, h))),
        preset.exact === 'partial'
          ? el('div', { class: 'galExact' }, el('b', {}, 'Element content: accurate'), 'Choreography between elements: not hers')
          : null,
        el('div', { class: 'galCredit' }, preset.credit),
        el('div', { class: 'galBtns' },
          el('button', { class: 'btn primary sm', onClick: openIt }, 'Open'),
          el('button', { class: 'btn ghost sm', onClick: compareIt }, 'Compare'))));
    grid.appendChild(card);
  }

  $('.galNote').textContent =
    'The skater-named patterns are inspired-by study patterns: they are built from the publicly known element '
    + 'content and the stylistic signatures of those programs, laid out at a level you can actually train. '
    + 'They are not reproductions of the real, copyrighted choreography, and they are not claimed to match it '
    + 'step for step. Use them for spacing, pacing and which signature moves go where.';
}

/* ------------------------------------------------------------
   Build from a competition protocol
   ------------------------------------------------------------ */
function showProtocolBuilder() {
  const box = el('div');
  box.appendChild(el('h2', {}, 'Build from a competition protocol'));
  box.appendChild(el('p', {},
    'Every ISU competition publishes a "judges details per skater" sheet listing the executed elements in order. '
    + 'That list is a published fact, so pasting it here reproduces any real program\'s element content exactly — '
    + 'the right jumps and spins, in the right order.'));
  box.appendChild(el('p', {},
    'What it cannot reproduce is the choreography between those elements. That is a copyrighted creative work and '
    + 'there is no step-by-step record of it here. The gaps are filled with plain connecting steps, and every one of '
    + 'them is labelled in the program list so you always know which parts are real and which are filler.'));

  const form = el('div', { class: 'genForm' });
  const name = el('input', { type: 'text', value: 'From protocol', style: 'width:190px' });
  const bpm = el('input', { type: 'number', value: App.program.bpm, min: 50, max: 200, step: 0.5 });
  const lvl = el('select');
  for (const [k, v] of Object.entries(LEVELS)) lvl.appendChild(el('option', { value: k }, v.name));
  lvl.value = 'open';
  form.appendChild(el('label', {}, 'Program name', name));
  form.appendChild(el('label', {}, 'BPM', bpm));
  form.appendChild(el('label', {}, 'Level', lvl));
  box.appendChild(form);

  const ta = el('textarea', { class: 'protoInput', spellcheck: 'false',
    placeholder: '3A  3F  3Lz+3T  FCSp4  StSq4  LSp4  CCoSp4' });
  ta.value = '3A  3F  3Lz+3T  FCSp4  StSq4  LSp4  CCoSp4';
  box.appendChild(ta);
  box.appendChild(el('p', { class: 'protoHint' },
    'Understands jump codes (1A–4A, 3Lz, 4T…), combinations with + (3Lz+3T, 3F+1Eu+3S), '
    + 'spins (FCSp, CCoSp, LSp, SSp, CSp, USp, FSSp…) and sequences (StSq, ChSq). '
    + 'Level digits and !, e, q, < marks are ignored. Paste a whole row and it will pick out what it recognises.'));

  const report = el('div', { class: 'protoReport' });
  box.appendChild(report);

  const go = el('button', { class: 'btn primary' }, 'Build it');
  go.onclick = () => {
    const res = buildFromProtocol(ta.value, { name: name.value, bpm: +bpm.value, level: lvl.value });
    if (!res.matched.length) {
      report.innerHTML = '';
      report.appendChild(el('div', { class: 'issue err' }, el('span', { class: 'ic' }, '!'),
        el('span', {}, 'Nothing in there was recognised as an element code.')));
      return;
    }
    $('#modal').classList.add('hidden');
    openProgram(res.program);
    let msg = `Built ${res.matched.length} scored elements: ${res.matched.join(', ')}.`;
    if (res.unmatched.length) msg += ` Skipped: ${res.unmatched.slice(0, 6).join(', ')}.`;
    toast(msg);
  };
  box.appendChild(go);
  showModal(box);
}

function showHelp() {
  showModal(`
    <h2>How this works</h2>
    <p>Pick elements from the library on the left; they chain together in order. Each element knows which edge it starts and ends on (<span class="kbd">LFO</span> = Left Forward Outside), so the pattern on the ice, the body lean and the turn direction are all <em>computed</em> from real skating rules rather than drawn by hand.</p>
    <p>That is also why the app can tell you when a program is not skatable: if one element ends on a back inside edge and the next starts on a forward outside edge, something has to happen in between, and the <b>Analysis</b> tab will name it and offer to insert it.</p>
    <h3>Cameras</h3>
    <p><b>Overhead</b> is the classic pattern sheet. <b>Judge's eye</b> is what the panel actually sees. <b>Close / line</b> sits low beside the skater — use it with the Extension Lab. Drag anywhere to orbit, scroll to zoom, double-click to make the orbit follow the skater.</p>
    <h3>Music</h3>
    <p>Drop an audio file anywhere on the window. Nothing is uploaded — it is decoded in your browser. BPM detection works on anything with a pulse; for lyrical or classical music use <b>Tap</b> instead, which is what choreographers do anyway. Press <span class="kbd">M</span> during playback to mark accents, then snap an element onto the nearest one from the Element tab.</p>
    <h3>Keyboard</h3>
    <div class="kbdList">
      <span><span class="kbd">space</span></span><span>play / pause</span>
      <span><span class="kbd">←</span><span class="kbd">→</span></span><span>scrub (hold shift for 1 second)</span>
      <span><span class="kbd">↑</span><span class="kbd">↓</span></span><span>previous / next element</span>
      <span><span class="kbd">L</span></span><span>loop the selected element</span>
      <span><span class="kbd">M</span></span><span>mark a musical hit</span>
      <span><span class="kbd">1</span>–<span class="kbd">6</span></span><span>camera angles</span>
      <span><span class="kbd">delete</span></span><span>remove the selected element</span>
    </div>
    <h3>Honest limits</h3>
    <p>The famous-skater presets are <em>inspired-by study patterns</em> built from publicly known element content and style — not reproductions of the real choreography. Level rules follow the general shape of the well-balanced program and should be checked against the current USFS rulebook. The skater is a stylised model for reading line and pattern, not a biomechanical simulation.</p>
  `);
}

let toastTimer = 0;
function toast(msg) {
  let t = $('#toast');
  if (!t) {
    t = el('div', { id: 'toast' });
    t.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:#17293a;border:1px solid #27455c;color:#dbeaf7;padding:9px 16px;border-radius:9px;z-index:300;font-size:12.5px;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:520px;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .5s'; }, 3400);
}

/* ------------------------------------------------------------
   View options
   ------------------------------------------------------------ */
function bindViewPanel() {
  const panel = $('#viewPanel'), btn = $('#viewBtn');
  btn.onclick = (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle('open');
    btn.classList.toggle('on', open);
  };
  panel.onclick = (e) => e.stopPropagation();
  document.addEventListener('click', () => { panel.classList.remove('open'); btn.classList.remove('on'); });

  $$('input[name=tracemode]').forEach((r) => {
    r.onchange = () => { if (r.checked) App.opts.trace = r.value; };
  });
  const bindChk = (id, key, extra) => {
    const c = $('#' + id);
    if (!c) return;
    c.checked = !!App.opts[key];
    c.onchange = () => { App.opts[key] = c.checked; if (extra) extra(c.checked); };
  };
  bindChk('tgMark', 'markings');
  bindChk('tgAxes', 'axes');
  bindChk('tgWalls', 'walls');
  bindChk('tgCusps', 'cusps');
  bindChk('tgGhosts', 'ghosts');
  bindChk('tgHeat', 'heatmap', (on) => { if (on) ensureAnalysis(); });
  bindChk('tgRef', 'reference');
  bindChk('tgRefSkater', 'refSkater');

  $('#cleanBtn').onclick = () => {
    const clean = App.opts.markings || App.opts.axes || App.opts.cusps || App.opts.trace !== 'none';
    App.opts.markings = App.opts.axes = App.opts.cusps = !clean;
    App.opts.trace = clean ? 'none' : 'all';
    $('#tgMark').checked = $('#tgAxes').checked = $('#tgCusps').checked = !clean;
    $$('input[name=tracemode]').forEach((r) => { r.checked = r.value === App.opts.trace; });
    $('#cleanBtn').textContent = clean ? 'Show everything again' : 'Clean ice (hide everything)';
  };

  $('#refSel').onchange = (e) => {
    App.refIndex = +e.target.value;
    updateRefPath();
    renderProgramTabs();
  };
}

/* ------------------------------------------------------------
   Keyboard
   ------------------------------------------------------------ */
function bindKeys() {
  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const camModes = ['overhead', 'judge', 'front', 'follow', 'close', 'orbit'];
    if (e.key === ' ') { e.preventDefault(); setPlaying(!App.playing); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(App.time - (e.shiftKey ? 1 : 0.1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(App.time + (e.shiftKey ? 1 : 0.1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (App.sel > 0) { App.sel--; App.opts.highlight = App.sel; seekToElement(App.sel); renderProgramList(); renderInspector(); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (App.sel < App.program.elements.length - 1) { App.sel++; App.opts.highlight = App.sel; seekToElement(App.sel); renderProgramList(); renderInspector(); } }
    else if (e.key.toLowerCase() === 'l') { App.loop = !App.loop; $('#loopBtn').classList.toggle('primary', App.loop); toast(App.loop ? 'Looping the selected element.' : 'Loop off.'); }
    else if (e.key.toLowerCase() === 'm') { markHit(); }
    else if (e.key.toLowerCase() === 't') {
      const modes = ['all', 'current', 'none'];
      App.opts.trace = modes[(modes.indexOf(App.opts.trace) + 1) % 3];
      $$('input[name=tracemode]').forEach((r) => { r.checked = r.value === App.opts.trace; });
      toast('Tracing: ' + (App.opts.trace === 'all' ? 'every element' : App.opts.trace === 'current' ? 'selected element only' : 'hidden'));
    }
    else if (e.key === 'Tab') { e.preventDefault(); switchProgram((App.current + 1) % App.programs.length); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (App.sel >= 0) { App.program.elements.splice(App.sel, 1); App.sel = Math.min(App.sel, App.program.elements.length - 1); rebuild(); renderInspector(); }
    } else if (camModes[+e.key - 1]) setCam(camModes[+e.key - 1]);
  });
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
function boot() {
  // level dropdown
  const ls = $('#levelSel');
  for (const [k, v] of Object.entries(LEVELS)) ls.appendChild(el('option', { value: k }, v.name));

  App.programs = [loadPreset(PRESETS[0])];
  App.current = 0;
  App.program = App.programs[0];
  App.path = buildPath(App.program);

  $('#ptAdd').onclick = () => openProgram(newProgram('Untitled Program ' + (App.programs.length + 1)));

  $('#progName').oninput = (e) => { App.program.name = e.target.value; renderProgramTabs(); };
  ls.onchange = (e) => { App.program.level = e.target.value; App.dirtyAnalysis = true; if (currentTab() === 'anal') renderAnalysis(); };
  $('#bpmInput').oninput = (e) => { App.program.bpm = clamp(+e.target.value || 100, 40, 220); rebuild(); };

  $('#libSearch').oninput = (e) => { App.filters.q = e.target.value; renderLibrary(); };
  $('#diffFilter').oninput = (e) => { App.filters.maxDiff = +e.target.value; $('#diffVal').textContent = e.target.value; renderLibrary(); };
  $('#fitOnly').onchange = (e) => { App.filters.fitOnly = e.target.checked; renderLibrary(); };

  bindViewPanel();

  $('#playBtn').onclick = () => setPlaying(!App.playing);
  $('#stopBtn').onclick = () => { setPlaying(false); seek(0); };
  $('#loopBtn').onclick = () => { App.loop = !App.loop; $('#loopBtn').classList.toggle('primary', App.loop); };
  $('#speedRange').oninput = (e) => {
    App.speed = +e.target.value / 100;
    $('#speedVal').textContent = App.speed.toFixed(2) + '×';
    if (App.playing && Music.buffer && $('#tgMusic').checked) Music.play(App.program.offset + App.time, App.speed);
  };
  $('#tgMusic').onchange = () => { if (App.playing) setPlaying(true); };

  $('#repairBtn').onclick = () => { const n = repairProgram(App.program, { diffCap: 5 }); rebuild(); toast(n ? `Inserted ${n} connecting steps.` : 'Nothing to fix — every seam already connects.'); };
  $('#clearBtn').onclick = () => { App.program.elements = []; App.sel = -1; rebuild(false); };
  $('#helpBtn').onclick = showHelp;
  $('#modalClose').onclick = () => $('#modal').classList.add('hidden');
  $('#modal').onclick = (e) => { if (e.target.id === 'modal') $('#modal').classList.add('hidden'); };

  $$('.tabs button').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });

  renderCatFilter();
  renderLibrary();
  bindViewport();
  bindMusic();
  bindMenus();
  bindKeys();
  afterLoad();
  renderProgramTabs();

  App._lastFrame = performance.now();
  App._raf = requestAnimationFrame(tick);

  // Deep links: ?preset=<id>&t=<seconds>&cam=<mode>&tab=<prog|anal|ext|insp>&gallery=1
  // — open a program at a moment, from a camera, on a tab (used for screenshots
  // and for sending someone a link to a moment in a program).
  try {
    const q = new URLSearchParams(location.search);
    const pre = q.get('preset') && PRESETS.find((x) => x.id === q.get('preset'));
    if (pre && pre !== PRESETS[0]) openProgram(loadPreset(pre));   // PRESETS[0] is already open
    if (q.get('cam')) setCam(q.get('cam'));
    if (q.get('t') != null) seek(clamp(+q.get('t') || 0, 0, App.path.totalTime));
    if (q.get('tab')) { const b = $(`.tabs button[data-tab="${q.get('tab')}"]`); if (b) b.click(); }
    if (q.get('gallery')) showGallery();
  } catch (e) { console.warn('deep link', e); }
}

document.addEventListener('DOMContentLoaded', boot);

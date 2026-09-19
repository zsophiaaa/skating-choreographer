/* ============================================================
   export.js — save / load / print / share the program
   ============================================================ */

const FILE_VERSION = 1;

function exportJSON(program) {
  const data = {
    format: 'skating-choreographer',
    version: FILE_VERSION,
    savedAt: new Date().toISOString(),
    program: {
      name: program.name, bpm: program.bpm, offset: program.offset, speedScale: program.speedScale,
      level: program.level, start: program.start, autoSteer: program.autoSteer,
      notes: program.notes || '', credit: program.credit || '',
      musicName: program.musicName, musicDuration: program.musicDuration,
      hits: program.hits,
      elements: program.elements.map((e) => ({
        libId: e.libId, mirror: e.mirror, beats: e.beats,
        radiusScale: e.radiusScale, aim: e.aim, gapBefore: e.gapBefore, note: e.note, chst: e.chst,
        arms: e.arms, distScale: e.distScale,
      })),
    },
  };
  download(safeName(program.name) + '.json', JSON.stringify(data, null, 2), 'application/json');
}

/** every open program in one file */
function exportAllJSON(programs) {
  const data = {
    format: 'skating-choreographer',
    version: FILE_VERSION,
    savedAt: new Date().toISOString(),
    programs: programs.map((program) => ({
      name: program.name, bpm: program.bpm, offset: program.offset, speedScale: program.speedScale,
      level: program.level, start: program.start, autoSteer: program.autoSteer,
      notes: program.notes || '', credit: program.credit || '',
      musicName: program.musicName, musicDuration: program.musicDuration,
      hits: program.hits,
      elements: program.elements.map((e) => ({
        libId: e.libId, mirror: e.mirror, beats: e.beats,
        radiusScale: e.radiusScale, aim: e.aim, gapBefore: e.gapBefore, note: e.note, chst: e.chst,
        arms: e.arms, distScale: e.distScale,
      })),
    })),
  };
  download('skating-programs.json', JSON.stringify(data, null, 2), 'application/json');
}

/** read either a single-program or an all-programs file */
function importAnyJSON(text) {
  const data = JSON.parse(text);
  if (data.format !== 'skating-choreographer') throw new Error('Not a Skating Choreographer file.');
  const list = data.programs ? data.programs : [data.program];
  return list.filter(Boolean).map((raw) => {
    const p = newProgram(raw.name || 'Imported');
    Object.assign(p, raw);
    p.elements = (raw.elements || []).map((e) => Object.assign({ uid: uid() }, e))
      .filter((e) => LIB_BY_ID[e.libId]);
    p.hits = p.hits || [];
    return p;
  });
}

function importJSON(text) {
  const data = JSON.parse(text);
  if (data.format !== 'skating-choreographer') throw new Error('Not a Skating Choreographer file.');
  const p = newProgram(data.program.name || 'Imported');
  Object.assign(p, data.program);
  p.elements = (data.program.elements || []).map((e) => Object.assign({ uid: uid() }, e));
  p.elements = p.elements.filter((e) => LIB_BY_ID[e.libId]);
  return p;
}

function safeName(s) {
  return (s || 'program').replace(/[^a-z0-9\- ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() || 'program';
}

/* ---------- pattern diagram as a PNG ---------- */
function exportPatternPNG(program, path, scale = 2) {
  const W = 1200, H = 660;
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = H * scale;
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  drawPatternDiagram(ctx, W, H - 90, program, path, { title: program.name, bg: '#ffffff' });

  // legend
  ctx.fillStyle = '#1b2a38';
  ctx.font = '12px ui-sans-serif, system-ui';
  let x = 20, y = H - 70;
  for (const cat of CATEGORIES) {
    ctx.fillStyle = cat.color;
    ctx.fillRect(x, y - 8, 11, 11);
    ctx.fillStyle = '#31465c';
    ctx.fillText(cat.name, x + 16, y + 1);
    x += ctx.measureText(cat.name).width + 40;
  }
  ctx.fillStyle = '#6a7d90';
  ctx.font = '11px ui-sans-serif, system-ui';
  ctx.fillText(`${path.segs.length} elements · ${fmtTime(path.totalTime)} · ${program.bpm} bpm · numbers mark where each element starts`, 20, H - 40);
  ctx.fillText('Generated with Skating Choreographer', 20, H - 22);

  c.toBlob((b) => download(safeName(program.name) + '-pattern.png', b, 'image/png'));
}

/* ---------- CSV of the element list ---------- */
function exportCSV(program, path) {
  const rows = [['#', 'count', 'beats', 'time', 'element', 'category', 'entry', 'exit', 'difficulty', 'notation', 'note']];
  path.segs.forEach((seg, i) => {
    rows.push([
      i + 1, fmtCount(seg.beat0), seg.inst.beats, fmtTime(seg.t0),
      seg.lib.name, seg.lib.cat, seg.entry, seg.exit, seg.lib.diff,
      `${seg.entry} ${seg.lib.name}`, (seg.inst.note || '').replace(/"/g, "'"),
    ]);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v)}"`).join(',')).join('\n');
  download(safeName(program.name) + '-elements.csv', csv, 'text/csv');
}

/* ---------- printable coach sheet ---------- */
function printSheet(program, path, analysis, rules) {
  const W = 1100, H = 560;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = H * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  drawPatternDiagram(ctx, W, H, program, path, { bg: '#ffffff' });
  const img = c.toDataURL('image/png');

  const rowsHtml = path.segs.map((seg, i) => `
    <tr>
      <td class="n">${i + 1}</td>
      <td class="ct">${fmtCount(seg.beat0)}</td>
      <td class="tm">${fmtTime(seg.t0)}</td>
      <td><span class="dot" style="background:${CAT_COLOR[seg.lib.cat]}"></span>${esc(seg.lib.name)}${seg.inst.mirror ? ' <em>(mirrored)</em>' : ''}</td>
      <td class="code">${seg.entry} &rarr; ${seg.exit}</td>
      <td class="beats">${seg.inst.beats}</td>
      <td class="tip">${esc(seg.inst.note || seg.lib.ext)}</td>
    </tr>`).join('');

  const issues = (rules.issues || []).map((i) => `<li class="${i.lvl}">${esc(i.msg)}</li>`).join('');
  const breaks = (analysis.continuity || []).map((c2) =>
    `<li class="err">${esc(c2.from)} ends on ${c2.fromCode} but ${esc(c2.to)} starts on ${c2.toCode} — needs ${esc(c2.fix)}</li>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(program.name)} — coach sheet</title>
  <style>
    *{box-sizing:border-box}
    body{font:13px/1.45 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#16232f;margin:26px;}
    h1{font-size:20px;margin:0 0 2px}
    .sub{color:#5c7086;margin-bottom:14px;font-size:12px}
    img{width:100%;border:1px solid #cdd9e4;border-radius:8px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:11.5px}
    th{text-align:left;background:#eef4f9;padding:5px 6px;border-bottom:1px solid #cdd9e4;font-weight:600}
    td{padding:4px 6px;border-bottom:1px solid #e8eef4;vertical-align:top}
    .n{width:26px;color:#7b8ea1}.ct{width:44px;font-family:ui-monospace,monospace;color:#2f6ea8}
    .tm{width:48px;font-family:ui-monospace,monospace;color:#7b8ea1}
    .code{width:110px;font-family:ui-monospace,monospace}
    .beats{width:38px;text-align:center}
    .tip{color:#5c7086;font-size:10.5px}
    .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
    ul{margin:6px 0 14px 18px;padding:0}
    li{margin:2px 0}
    li.err{color:#b4304a}li.warn{color:#a66a1c}li.info{color:#5c7086}
    h2{font-size:13px;margin:16px 0 4px;text-transform:uppercase;letter-spacing:.06em;color:#5c7086}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    @media print{body{margin:12mm}.noprint{display:none}}
  </style></head><body>
  <h1>${esc(program.name)}</h1>
  <div class="sub">${fmtTime(path.totalTime)} &middot; ${program.bpm} bpm &middot; ${path.segs.length} elements &middot; ${esc((LEVELS[program.level] || {}).name || program.level)}${program.musicName ? ' &middot; ' + esc(program.musicName) : ''}</div>
  <img src="${img}" alt="pattern diagram">
  <table><thead><tr><th>#</th><th>Count</th><th>Time</th><th>Element</th><th>Edge in &rarr; out</th><th>Beats</th><th>Cue</th></tr></thead>
  <tbody>${rowsHtml}</tbody></table>
  <div class="grid">
    <div><h2>Check before you skate it</h2><ul>${breaks || issues ? breaks + issues : '<li class="info">Nothing flagged.</li>'}</ul></div>
    <div><h2>Numbers</h2><ul>
      <li class="info">Ice coverage ${analysis.coverage.pct.toFixed(0)}%</li>
      <li class="info">Rotation ${analysis.rotation.ccw.toFixed(0)}% counter-clockwise / ${analysis.rotation.cw.toFixed(0)}% clockwise</li>
      <li class="info">${analysis.summary.jumps} jump elements, ${analysis.summary.spins} spins, ${analysis.summary.steps} step sequences</li>
    </ul></div>
  </div>
  <p class="sub" style="margin-top:18px">Level rules are a guide only — verify against the current USFS rulebook.</p>
  <button class="noprint" onclick="window.print()" style="padding:8px 14px;margin-top:8px">Print</button>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to open the printable sheet.'); return; }
  w.document.write(html); w.document.close();
}

/* ---------- pocket cheat card: counts + notation only ---------- */
function printCard(program, path) {
  const items = path.segs.map((seg, i) =>
    `<div class="r"><span class="c">${fmtCount(seg.beat0)}</span><span class="e">${esc(shortName(seg.lib))}</span><span class="k">${seg.entry}</span></div>`
  ).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(program.name)} — card</title><style>
    body{font:11px/1.3 ui-sans-serif,system-ui;margin:0;padding:10mm;color:#111}
    .card{width:88mm;border:1px dashed #999;border-radius:4mm;padding:5mm}
    h1{font-size:13px;margin:0 0 1mm}.s{font-size:9px;color:#666;margin-bottom:3mm}
    .r{display:flex;gap:3mm;padding:0.8mm 0;border-bottom:1px solid #eee}
    .c{width:12mm;font-family:ui-monospace,monospace;color:#2f6ea8}
    .e{flex:1}.k{font-family:ui-monospace,monospace;color:#888}
    @media print{body{padding:0}.card{border:none}}
  </style></head><body><div class="card">
  <h1>${esc(program.name)}</h1><div class="s">${fmtTime(path.totalTime)} · ${program.bpm} bpm</div>
  ${items}</div>
  <button onclick="window.print()" style="margin-top:6mm">Print</button></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to open the card.'); return; }
  w.document.write(html); w.document.close();
}

function shortName(lib) {
  return lib.name.replace(/ \(.*\)$/, '').replace('Sequence', 'Seq').replace('Spiral', 'Spir');
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

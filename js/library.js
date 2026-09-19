/* ============================================================
   library.js — the figure skating element library
   ------------------------------------------------------------
   Notation: FOOT + DIRECTION + EDGE, e.g. LFO = Left Forward Outside.
   Every element declares entry/exit codes; the engine derives the
   lobe curvature and the body lean from those (see engine.js).

   Fields
     id      unique
     name    display name
     cat     category key (see CATEGORIES)
     diff    1..5   (1 = you already have it, 5 = elite)
     entry   code you must arrive on
     exit    code you leave on
     beats   default musical beats
     dist    metres of ice covered (0 for spins/stops)
     cost    effort 1..5, feeds the stamina curve
     phases  [{k, f, r, rev, code, both}]  k = arc|line|air|spin|hold|pick
     poses   [{t, pose}] keyframes, t in 0..1
     tip     coaching note
     ext     extension / line cue  (written for the "penguin" problem)
     tags    search keywords
   ============================================================ */

const CATEGORIES = [
  { key: 'edges',  name: 'Edges & Strokes', color: '#5ec8f7' },
  { key: 'steps',  name: 'Step Sequence',   color: '#8b7bf0' },
  { key: 'turns',  name: 'Turns',           color: '#f0a35e' },
  { key: 'field',  name: 'Field Moves',     color: '#4fd6a4' },
  { key: 'jumps',  name: 'Jumps',           color: '#f2657a' },
  { key: 'spins',  name: 'Spins',           color: '#f7d45e' },
  { key: 'choreo', name: 'Choreo & Accent', color: '#e07be0' },
  { key: 'stops',  name: 'Stops & Pauses',  color: '#9aa6b8' },
];

let _lib = [];
function E(o) {
  const d = Object.assign({
    diff: 2, beats: 4, dist: 8, cost: 2, mirrorable: true,
    phases: null, poses: [{ t: 0, pose: 'glide' }], tags: [], tip: '', ext: '',
  }, o);
  if (!d.phases) d.phases = [{ k: 'arc', f: 1, r: 9, code: d.entry }];
  d.tags = (d.tags || []).concat([d.name.toLowerCase(), d.id, d.entry, d.exit, d.cat]);
  _lib.push(d);
  return d;
}

/* ============================================================
   1. EDGES & STROKING  — the connecting tissue
   ============================================================ */

E({ id: 'stroke-f', name: 'Forward Stroking', cat: 'edges', diff: 1, entry: 'LFO', exit: 'RFO',
  beats: 4, dist: 11, cost: 2,
  phases: [{ k: 'arc', f: 0.5, r: 14, code: 'LFO' }, { k: 'arc', f: 0.5, r: 14, code: 'RFO' }],
  poses: [{ t: 0, pose: 'stroke_push' }, { t: 0.45, pose: 'glide' }, { t: 0.55, pose: 'stroke_push' }, { t: 1, pose: 'glide' }],
  tip: 'Push from the side of the blade, not the toepick. Full extension behind before you bring it in.',
  ext: 'Hold the pushing leg straight and pointed for a beat longer than feels natural — that pause IS the extension.',
  tags: ['stroking', 'power', 'basic'] });

E({ id: 'stroke-b', name: 'Backward Stroking', cat: 'edges', diff: 2, entry: 'LBO', exit: 'RBO',
  beats: 4, dist: 10, cost: 2,
  phases: [{ k: 'arc', f: 0.5, r: 14, code: 'LBO' }, { k: 'arc', f: 0.5, r: 14, code: 'RBO' }],
  poses: [{ t: 0, pose: 'stroke_push' }, { t: 0.5, pose: 'glide' }, { t: 1, pose: 'glide' }],
  tip: 'Press the hip back over the heel. Shoulders stay square to the direction of travel.',
  ext: 'Free leg reaches in front and stays there — do not snap it back early.',
  tags: ['backward', 'power'] });

E({ id: 'edge-lfo', name: 'LFO Edge', cat: 'edges', diff: 1, entry: 'LFO', exit: 'LFO', beats: 4, dist: 9,
  phases: [{ k: 'arc', f: 1, r: 8, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'swing_back' }, { t: 1, pose: 'glide' }],
  tip: 'Hold one clean lobe. Shoulder over the printing foot, hips level.',
  ext: 'Free hip open, knee straight, toe turned out and pointed. Draw a long line from the hip to the toe.',
  tags: ['edge', 'lobe', 'basic'] });

E({ id: 'edge-lfi', name: 'LFI Edge', cat: 'edges', diff: 1, entry: 'LFI', exit: 'LFI', beats: 4, dist: 9,
  phases: [{ k: 'arc', f: 1, r: 8, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'swing_back' }, { t: 1, pose: 'glide' }],
  tip: 'Inside edges need the arm and shoulder held BACK or you will rotate off the circle.',
  ext: 'Free leg crosses behind the tracing and stays turned out.', tags: ['edge', 'lobe'] });

E({ id: 'edge-lbo', name: 'LBO Edge', cat: 'edges', diff: 2, entry: 'LBO', exit: 'LBO', beats: 4, dist: 8,
  phases: [{ k: 'arc', f: 1, r: 8, code: 'LBO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'swing_forward' }, { t: 1, pose: 'glide' }],
  tip: 'Weight on the back third of the blade. Look over the outside shoulder to hold the curve.',
  ext: 'Free leg crosses in front, pointed, at ankle height minimum.', tags: ['edge', 'backward'] });

E({ id: 'edge-lbi', name: 'LBI Edge', cat: 'edges', diff: 2, entry: 'LBI', exit: 'LBI', beats: 4, dist: 8,
  phases: [{ k: 'arc', f: 1, r: 8, code: 'LBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'swing_forward' }, { t: 1, pose: 'glide' }],
  tip: 'The hardest edge to hold clean. Keep the free side strongly checked.',
  ext: 'Free leg extends behind and turned out — resist letting it drift into the circle.', tags: ['edge', 'backward'] });

E({ id: 'swing-roll-f', name: 'Forward Swing Roll', cat: 'edges', diff: 2, entry: 'LFO', exit: 'RFO',
  beats: 8, dist: 16, cost: 2,
  phases: [{ k: 'arc', f: 0.5, r: 10, code: 'LFO' }, { k: 'arc', f: 0.5, r: 10, code: 'RFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'swing_forward' }, { t: 0.5, pose: 'glide_deep' }, { t: 0.75, pose: 'swing_forward' }, { t: 1, pose: 'glide' }],
  tip: 'Swing the free leg through on count 3 of each 4. The swing is what makes it look like dancing.',
  ext: 'The swing passes THROUGH a pointed toe both directions. Never let the foot flex at the bottom.',
  tags: ['swing', 'roll', 'dance'] });

E({ id: 'swing-roll-b', name: 'Backward Swing Roll', cat: 'edges', diff: 3, entry: 'LBO', exit: 'RBO',
  beats: 8, dist: 14, cost: 2,
  phases: [{ k: 'arc', f: 0.5, r: 10, code: 'LBO' }, { k: 'arc', f: 0.5, r: 10, code: 'RBO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'swing_back' }, { t: 0.5, pose: 'glide_deep' }, { t: 0.75, pose: 'swing_back' }, { t: 1, pose: 'glide' }],
  tip: 'Push the new edge from a deep knee. Keep your head up and trust the edge.',
  ext: 'Reach the swing forward past the skating foot before it comes back.', tags: ['swing', 'roll'] });

E({ id: 'xover-f', name: 'Forward Crossovers', cat: 'edges', diff: 1, entry: 'LFO', exit: 'LFO',
  beats: 8, dist: 20, cost: 3,
  phases: [{ k: 'arc', f: 0.5, r: 7, code: 'LFO' }, { k: 'arc', f: 0.5, r: 7, code: 'RFI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.16, pose: 'crossover_cross' }, { t: 0.3, pose: 'stroke_push' },
          { t: 0.46, pose: 'crossover_cross' }, { t: 0.6, pose: 'stroke_push' },
          { t: 0.78, pose: 'crossover_cross' }, { t: 0.9, pose: 'stroke_push' }, { t: 1, pose: 'glide_deep' }],
  tip: 'The power is in the UNDER-push of the inside foot, not the crossing foot.',
  ext: 'Between crossovers, straighten the pushing leg completely. Most people cut this short and it reads as choppy.',
  tags: ['crossover', 'power', 'basic', 'circle'] });

E({ id: 'xover-b', name: 'Backward Crossovers', cat: 'edges', diff: 2, entry: 'RBO', exit: 'RBO',
  beats: 8, dist: 18, cost: 3,
  phases: [{ k: 'arc', f: 0.5, r: 7, code: 'RBO' }, { k: 'arc', f: 0.5, r: 7, code: 'LBI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.16, pose: 'crossover_cross' }, { t: 0.3, pose: 'stroke_push' },
          { t: 0.46, pose: 'crossover_cross' }, { t: 0.6, pose: 'stroke_push' },
          { t: 0.78, pose: 'crossover_cross' }, { t: 0.9, pose: 'stroke_push' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Sit back into the heel. The under-push scoops sideways, not backwards.',
  ext: 'Straighten and point the under-pushing leg fully before picking it up.', tags: ['crossover', 'power', 'backward'] });

E({ id: 'progressive-f', name: 'Forward Progressives', cat: 'edges', diff: 2, entry: 'LFO', exit: 'LFO',
  beats: 6, dist: 16, cost: 3,
  phases: [{ k: 'arc', f: 0.5, r: 8, code: 'LFO' }, { k: 'arc', f: 0.5, r: 8, code: 'RFI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.4, pose: 'crossover_cross' }, { t: 0.75, pose: 'stroke_push' }, { t: 1, pose: 'glide' }],
  tip: 'Progressives pass the foot, crossovers cross over. Judges see the difference.',
  ext: 'Feet pass close and turned out, no gap and no clunk.', tags: ['progressive', 'run', 'moves in the field'] });

E({ id: 'chasse-f', name: 'Forward Chassé', cat: 'edges', diff: 1, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 9,
  phases: [{ k: 'arc', f: 0.6, r: 9, code: 'LFO' }, { k: 'arc', f: 0.4, r: 9, code: 'RFO', both: true }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.55, pose: 'crossover_cross' }, { t: 1, pose: 'glide' }],
  tip: 'Free foot picks straight up beside the skating foot — no swing, no cross.',
  ext: 'Lift the foot with the toe pointed down, only 3 inches. Small and neat beats big and sloppy.',
  tags: ['chasse', 'dance', 'basic'] });

E({ id: 'crossroll-f', name: 'Forward Cross Roll', cat: 'edges', diff: 3, entry: 'LFO', exit: 'RFO',
  beats: 4, dist: 10,
  phases: [{ k: 'arc', f: 0.5, r: 9, code: 'LFO' }, { k: 'arc', f: 0.5, r: 9, code: 'RFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'crossroll' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Step onto the new outside edge from OUTSIDE the circle — that is what makes it a cross roll.',
  ext: 'The stepping leg crosses in front with a straight knee and reaches before it lands.',
  tags: ['cross roll', 'transition', 'step sequence'] });

E({ id: 'crossroll-b', name: 'Backward Cross Roll', cat: 'edges', diff: 3, entry: 'LBO', exit: 'RBO',
  beats: 4, dist: 9,
  phases: [{ k: 'arc', f: 0.5, r: 9, code: 'LBO' }, { k: 'arc', f: 0.5, r: 9, code: 'RBO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'crossroll' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Cross behind and press the new hip open. Big rolling body movement.',
  ext: 'Let the shoulders rotate opposite the hips — the contrast is what makes it look expensive.',
  tags: ['cross roll', 'backward'] });

E({ id: 'power-pull-f', name: 'Forward Power Pulls', cat: 'edges', diff: 3, entry: 'LFI', exit: 'LFO',
  beats: 6, dist: 12, cost: 3,
  phases: [{ k: 'arc', f: 0.25, r: 5, code: 'LFI' }, { k: 'arc', f: 0.25, r: 5, code: 'LFO' }, { k: 'arc', f: 0.25, r: 5, code: 'LFI' }, { k: 'arc', f: 0.25, r: 5, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'glide' }, { t: 0.5, pose: 'glide_deep' }, { t: 0.75, pose: 'glide' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Pull from the ankle and knee, upper body dead quiet. If your shoulders move it is not a power pull.',
  ext: 'Free leg holds ONE position the whole time. It should look glued.',
  tags: ['power pull', 'edge change', 'moves in the field'] });

E({ id: 'power-pull-b', name: 'Backward Power Pulls', cat: 'edges', diff: 3, entry: 'LBI', exit: 'LBO',
  beats: 6, dist: 11, cost: 3,
  phases: [{ k: 'arc', f: 0.25, r: 5, code: 'LBI' }, { k: 'arc', f: 0.25, r: 5, code: 'LBO' }, { k: 'arc', f: 0.25, r: 5, code: 'LBI' }, { k: 'arc', f: 0.25, r: 5, code: 'LBO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'glide' }, { t: 0.5, pose: 'glide_deep' }, { t: 0.75, pose: 'glide' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Rock heel-to-toe along the blade as you change edge. Deep knee every pull.',
  ext: 'Free leg crossed in front, pointed, unmoving.', tags: ['power pull', 'backward'] });

E({ id: 'edge-change-f', name: 'Forward Change of Edge', cat: 'edges', diff: 2, entry: 'LFO', exit: 'LFI',
  beats: 6, dist: 13,
  phases: [{ k: 'arc', f: 0.5, r: 10, code: 'LFO' }, { k: 'arc', f: 0.5, r: 10, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'glide' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Change on the long axis, in the middle, with no wobble. It should be one continuous S.',
  ext: 'Hold the free leg absolutely still through the change — that is the whole test.',
  tags: ['serpentine', 's', 'change of edge'] });

E({ id: 'edge-change-b', name: 'Backward Change of Edge', cat: 'edges', diff: 2, entry: 'LBO', exit: 'LBI',
  beats: 6, dist: 12,
  phases: [{ k: 'arc', f: 0.5, r: 10, code: 'LBO' }, { k: 'arc', f: 0.5, r: 10, code: 'LBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'glide' }, { t: 1, pose: 'glide_deep' }],
  tip: 'The backward serpentine. Change edge over the long axis with the shoulders quiet.',
  ext: 'Free leg crossed in front and completely still through the change.',
  tags: ['serpentine', 'change of edge', 'backward'] });

E({ id: 'step-fi', name: 'Forward Step-Over (inside)', cat: 'edges', diff: 1, entry: 'LFI', exit: 'RFI',
  beats: 2, dist: 5,
  phases: [{ k: 'arc', f: 0.5, r: 9, code: 'LFI' }, { k: 'arc', f: 0.5, r: 9, code: 'RFI' }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.5, pose: 'stroke_push' }, { t: 1, pose: 'glide' }],
  tip: 'Simply stepping onto the other foot on the same kind of edge. The most useful connector in skating.',
  ext: 'Step onto a bent knee and straighten the leg you just left.',
  tags: ['step', 'connector', 'transition', 'basic'] });

E({ id: 'step-fio', name: 'Step Inside-to-Outside', cat: 'edges', diff: 2, entry: 'LFI', exit: 'RFO',
  beats: 2, dist: 6,
  phases: [{ k: 'arc', f: 0.45, r: 9, code: 'LFI' }, { k: 'arc', f: 0.55, r: 9, code: 'RFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'stroke_push' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Step off an inside edge onto the new outside edge — how you start almost every new lobe.',
  ext: 'Reach the new leg out and land on a bent knee, then straighten the old one behind you.',
  tags: ['step', 'connector', 'transition', 'lobe', 'basic'] });

E({ id: 'step-bi', name: 'Backward Step-Over (inside)', cat: 'edges', diff: 2, entry: 'LBI', exit: 'RBI',
  beats: 2, dist: 5,
  phases: [{ k: 'arc', f: 0.5, r: 9, code: 'LBI' }, { k: 'arc', f: 0.5, r: 9, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.5, pose: 'stroke_push' }, { t: 1, pose: 'glide' }],
  tip: 'Backward version. Place the new foot beside the old one, do not reach for it.',
  ext: 'Keep the hips level as you change feet — no bobbing.',
  tags: ['step', 'connector', 'backward'] });

E({ id: 'step-bo', name: 'Backward Step-Over (outside)', cat: 'edges', diff: 2, entry: 'LBO', exit: 'RBO',
  beats: 2, dist: 5,
  phases: [{ k: 'arc', f: 0.5, r: 9, code: 'LBO' }, { k: 'arc', f: 0.5, r: 9, code: 'RBO' }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.5, pose: 'stroke_push' }, { t: 1, pose: 'glide' }],
  tip: 'Steps from one back outside edge onto the other. Common exit from a jump landing.',
  ext: 'The landing leg stays extended until the moment you step.',
  tags: ['step', 'connector', 'backward'] });

E({ id: 'run-of-three', name: 'Perimeter Power Stroking', cat: 'edges', diff: 2, entry: 'LFO', exit: 'LFO',
  beats: 16, dist: 34, cost: 4,
  phases: [{ k: 'arc', f: 0.25, r: 16, code: 'LFO' }, { k: 'arc', f: 0.25, r: 9, code: 'RFI', both: true },
           { k: 'arc', f: 0.25, r: 9, code: 'LFO' }, { k: 'arc', f: 0.25, r: 16, code: 'RFI', both: true }],
  poses: [{ t: 0, pose: 'stroke_push' }, { t: 0.3, pose: 'glide_deep' }, { t: 0.55, pose: 'crossover_cross' }, { t: 0.8, pose: 'stroke_push' }, { t: 1, pose: 'glide' }],
  tip: 'Use this to get speed for a jump without looking like you are getting speed for a jump.',
  ext: 'Keep the arms in a fixed, quiet frame the whole way around.', tags: ['power', 'speed', 'perimeter'] });

/* ============================================================
   2. TURNS  — one-foot and two-foot
   ============================================================ */

const turnPoses = [{ t: 0, pose: 'glide_deep' }, { t: 0.42, pose: 'turn_entry' }, { t: 0.58, pose: 'turn_exit' }, { t: 1, pose: 'glide' }];

function TURN(id, name, entry, exit, diff, tip, ext, tags, r = 7) {
  return E({ id, name, cat: 'turns', diff, entry, exit, beats: 4, dist: 8, cost: 2,
    phases: [{ k: 'arc', f: 0.5, r, code: entry }, { k: 'arc', f: 0.5, r, code: exit }],
    poses: turnPoses, tip, ext, tags });
}

TURN('three-fo', 'Forward Outside Three', 'LFO', 'LBI', 2,
  'Rotate the upper body first, turn on the ball of the blade, then CHECK. The check is the element.',
  'Free leg stays extended behind through the whole turn — do not let it fly.', ['three turn', '3-turn', 'step sequence']);

TURN('three-fi', 'Forward Inside Three', 'LFI', 'LBO', 2,
  'Hold the shoulders back against the turn until the last second.',
  'Free leg stays in front on exit, toe pointed, hip open.', ['three turn', '3-turn']);

TURN('three-bo', 'Back Outside Three', 'LBO', 'LFI', 3,
  'Turn over the back of the blade. Most people rush and skid — wait for the rise.',
  'Keep the free foot crossed in front all the way to the exit.', ['three turn', 'backward']);

TURN('three-bi', 'Back Inside Three', 'LBI', 'LFO', 3,
  'Strong check on exit or you will step off the circle.',
  'Free leg extends behind on the exit and holds for 2 counts.', ['three turn', 'backward']);

TURN('bracket-fo', 'Forward Outside Bracket', 'LFO', 'LBI', 4,
  'Bracket turns AGAINST the rotation — the cusp points outside the circle. Wind the opposite way from a three.',
  'The free leg being still is the only way a bracket reads clean. Lock it.', ['bracket', 'step sequence', 'advanced turn']);

TURN('bracket-fi', 'Forward Inside Bracket', 'LFI', 'LBO', 4,
  'Counter-rotate hard, turn small. A big bracket is a wrong bracket.',
  'Hold the free hip up and turned out through the cusp.', ['bracket', 'advanced turn']);

TURN('bracket-bo', 'Back Outside Bracket', 'LBO', 'LFI', 5,
  'The hardest of the four brackets for most skaters. Tiny turn, huge check.',
  'Free leg in front, absolutely quiet.', ['bracket', 'advanced turn']);

TURN('bracket-bi', 'Back Inside Bracket', 'LBI', 'LFO', 5,
  'Enter with the shoulders already rotated against the curve.',
  'Point through the exit — the extension is what buys you the level.', ['bracket', 'advanced turn']);

TURN('rocker-fo', 'Forward Outside Rocker', 'LFO', 'LBO', 4,
  'Same edge in and out, but you land on a NEW circle continuing the rotation.',
  'The free leg swings through and extends onto the new lobe.', ['rocker', 'advanced turn'], 8);

TURN('rocker-fi', 'Forward Inside Rocker', 'LFI', 'LBI', 4,
  'Keep travelling forward along the long axis — rockers should not stall.',
  'Long free leg on the new circle sells the change of lobe.', ['rocker', 'advanced turn'], 8);

TURN('counter-fo', 'Forward Outside Counter', 'LFO', 'LBO', 5,
  'Counters turn against the new circle. Pre-rotate the opposite way from a rocker.',
  'Free leg holds behind and then reaches into the new lobe without dropping.', ['counter', 'advanced turn'], 8);

TURN('rocker-bo', 'Back Outside Rocker', 'LBO', 'LFO', 5,
  'A rocker entered backwards. The rise comes earlier than you expect — wait for it or you will skid the exit.',
  'Free leg leads the rotation and then holds absolutely still on the new lobe.', ['rocker', 'backward', 'difficult turn']);

TURN('rocker-bi', 'Back Inside Rocker', 'LBI', 'LFI', 5,
  'Backward entry, forward exit, same edge character. The hardest of the four rockers to keep on a clean lobe.',
  'Shoulders stay square to the tracing through the turn; only the hips rotate.', ['rocker', 'backward', 'difficult turn']);

TURN('counter-bo', 'Back Outside Counter', 'LBO', 'LFO', 5,
  'The classic difficult jump entry — a back counter delivers you onto a forward outside edge with real speed.',
  'The cusp points into the circle. Check hard or the exit lobe collapses.', ['counter', 'backward', 'difficult turn', 'jump entry']);

TURN('counter-bi', 'Back Inside Counter', 'LBI', 'LFI', 5,
  'Counter-rotate against the entry curve, then step out onto the new lobe.',
  'Free hip has to stay lifted or the turn drops onto a flat.', ['counter', 'backward', 'difficult turn']);

TURN('choctaw-fo', 'Outside-Inside Choctaw', 'LFO', 'RBI', 5,
  'Outside edge to inside edge on the other foot. Bigger and more dramatic than the inside choctaw.',
  'Both knees bend on the transfer — a choctaw skated with straight legs looks like a stumble.', ['choctaw', 'difficult turn', 'step sequence']);

TURN('mohawk-bi', 'Back Inside Mohawk', 'LBI', 'RFI', 3,
  'Backward to forward on the other foot, same edge. The everyday way to turn a backward entry into a forward one.',
  'Heel to instep. Do not let the new foot land wide of the tracing.', ['mohawk', 'backward']);

TURN('mohawk-bo', 'Back Outside Mohawk', 'LBO', 'RFO', 4,
  'Harder than the inside version: the free foot has to come behind and turn out.',
  'Open the new hip before the foot lands or it will land on a flat.', ['mohawk', 'backward']);

TURN('counter-fi', 'Forward Inside Counter', 'LFI', 'LBI', 5,
  'Enormous check needed. Think of the turn happening under a still upper body.',
  'Free side stays lifted — no hip drop through the cusp.', ['counter', 'advanced turn'], 8);

E({ id: 'loop-turn-f', name: 'Forward Loop Turn', cat: 'turns', diff: 4, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 6,
  phases: [{ k: 'arc', f: 0.2, r: 8, code: 'LFO' }, { k: 'arc', f: 0.6, r: 1.4, code: 'LFO' }, { k: 'arc', f: 0.2, r: 8, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'contract' }, { t: 1, pose: 'glide' }],
  tip: 'A loop is a small circle drawn on one edge with no change of edge or foot. Keep the body still and let the blade do it.',
  ext: 'The free leg position must be identical entering and exiting the loop.',
  tags: ['loop', 'figure', 'advanced turn'] });

E({ id: 'loop-turn-b', name: 'Back Loop Turn', cat: 'turns', diff: 5, entry: 'LBO', exit: 'LBO',
  beats: 4, dist: 6,
  phases: [{ k: 'arc', f: 0.2, r: 8, code: 'LBO' }, { k: 'arc', f: 0.6, r: 1.4, code: 'LBO' }, { k: 'arc', f: 0.2, r: 8, code: 'LBO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.5, pose: 'contract' }, { t: 1, pose: 'glide' }],
  arms: [{ t: 0, pose: 'second' }, { t: 0.45, pose: 'wrap' }, { t: 0.75, pose: 'wrap' }, { t: 1, pose: 'one_out' }],
  tip: 'A loop drawn on a back edge. Tiny circle, no change of edge or foot, body dead still.',
  ext: 'The free leg must be in exactly the same place coming out as going in.',
  tags: ['loop', 'backward', 'difficult turn', 'advanced turn'] });

E({ id: 'twizzle-1', name: 'Twizzle (1 rotation)', cat: 'turns', diff: 3, entry: 'LFI', exit: 'LFI',
  beats: 2, dist: 4, cost: 2,
  phases: [{ k: 'spin', f: 1, rev: 1, travel: 4, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.3, pose: 'twizzle' }, { t: 0.85, pose: 'twizzle' }, { t: 1, pose: 'turn_exit' }],
  tip: 'A twizzle TRAVELS. If it stays in one spot it is a spin, and it gets no credit.',
  ext: 'Free foot tight against the skating ankle, toe pointed down.', tags: ['twizzle', 'step sequence', 'dance'] });

E({ id: 'twizzle-2', name: 'Twizzle (2 rotations)', cat: 'turns', diff: 4, entry: 'LFI', exit: 'LFI',
  beats: 2, dist: 5, cost: 3,
  phases: [{ k: 'spin', f: 1, rev: 2, travel: 5, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'twizzle' }, { t: 0.85, pose: 'twizzle' }, { t: 1, pose: 'turn_exit' }],
  tip: 'Rotation comes from the initial check release, not from throwing the arms.',
  ext: 'Arms in a small tight circle at the sternum, elbows up not collapsed.', tags: ['twizzle', 'advanced'] });

E({ id: 'twizzle-3', name: 'Twizzle (3 rotations)', cat: 'turns', diff: 5, entry: 'LBI', exit: 'LBI',
  beats: 3, dist: 6, cost: 3,
  phases: [{ k: 'spin', f: 1, rev: 3, travel: 6, code: 'LBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'twizzle' }, { t: 0.9, pose: 'twizzle' }, { t: 1, pose: 'turn_exit' }],
  tip: 'Keep the travel constant. Judges look for continuous motion along the axis.',
  ext: 'Exit with a clean checked extension or the whole thing looks unfinished.', tags: ['twizzle', 'advanced'] });

E({ id: 'mohawk-fi', name: 'Inside Open Mohawk', cat: 'turns', diff: 2, entry: 'LFI', exit: 'RBI',
  beats: 4, dist: 8,
  phases: [{ k: 'arc', f: 0.5, r: 7, code: 'LFI' }, { k: 'arc', f: 0.5, r: 7, code: 'RBI' }],
  poses: turnPoses,
  tip: 'Heel to instep, free foot turned out. The new foot is placed, not stepped.',
  ext: 'The old skating foot extends forward and pointed the instant it leaves the ice.',
  tags: ['mohawk', 'step sequence', 'two foot turn', 'basic'] });

E({ id: 'mohawk-fi-closed', name: 'Inside Closed Mohawk', cat: 'turns', diff: 3, entry: 'LFI', exit: 'RBI',
  beats: 4, dist: 8,
  phases: [{ k: 'arc', f: 0.5, r: 6.5, code: 'LFI' }, { k: 'arc', f: 0.5, r: 6.5, code: 'RBI' }],
  poses: turnPoses,
  tip: 'Free foot goes behind the heel instead of in front. Feels tighter and looks neater.',
  ext: 'Hips stay square to the circle — no twist in the pelvis.', tags: ['mohawk', 'closed'] });

E({ id: 'mohawk-fo', name: 'Outside Mohawk', cat: 'turns', diff: 4, entry: 'LFO', exit: 'RBO',
  beats: 4, dist: 8,
  phases: [{ k: 'arc', f: 0.5, r: 7, code: 'LFO' }, { k: 'arc', f: 0.5, r: 7, code: 'RBO' }],
  poses: turnPoses,
  tip: 'Needs real turnout. Do not fake it by rotating the shoulders early.',
  ext: 'Both legs straight at the moment of the change.', tags: ['mohawk', 'advanced'] });

E({ id: 'choctaw-fi', name: 'Inside-Outside Choctaw', cat: 'turns', diff: 4, entry: 'LFI', exit: 'RBO',
  beats: 4, dist: 9,
  phases: [{ k: 'arc', f: 0.5, r: 7, code: 'LFI' }, { k: 'arc', f: 0.5, r: 7, code: 'RBO' }],
  poses: turnPoses,
  tip: 'Foot AND edge AND direction all change — the lobe flips. Commit to the new curve immediately.',
  ext: 'Reach the new edge with a straight leg before you put it down.',
  tags: ['choctaw', 'step sequence', 'advanced'] });

E({ id: 'choctaw-bo', name: 'Back Outside Choctaw', cat: 'turns', diff: 5, entry: 'LBI', exit: 'RFO',
  beats: 4, dist: 9,
  phases: [{ k: 'arc', f: 0.5, r: 7, code: 'LBI' }, { k: 'arc', f: 0.5, r: 7, code: 'RFO' }],
  poses: turnPoses,
  tip: 'Classic ice dance choctaw. The upper body must stay upright through the change.',
  ext: 'Free leg sweeps through a pointed low arc, never around.', tags: ['choctaw', 'dance', 'advanced'] });

/* ============================================================
   3. STEP SEQUENCE COMBINATIONS
   ============================================================ */

E({ id: 'seq-three-walk', name: 'Three-Turn Walk (LFO3, step, RFO3)', cat: 'steps', diff: 3, entry: 'LFO', exit: 'RBI',
  beats: 8, dist: 16, cost: 3,
  phases: [{ k: 'arc', f: 0.25, r: 7, code: 'LFO' }, { k: 'arc', f: 0.25, r: 7, code: 'LBI' },
           { k: 'arc', f: 0.25, r: 7, code: 'RFO' }, { k: 'arc', f: 0.25, r: 7, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'turn_entry' }, { t: 0.3, pose: 'turn_exit' },
          { t: 0.5, pose: 'crossroll' }, { t: 0.7, pose: 'turn_entry' }, { t: 0.8, pose: 'turn_exit' }, { t: 1, pose: 'glide' }],
  tip: 'The classic serpentine builder. Step from the back inside exit onto the new forward outside.',
  ext: 'Every exit gets a real extension even though it is short. Two counts each.',
  tags: ['step sequence', 'serpentine', 'three turn'] });

E({ id: 'seq-bracket-cluster', name: 'Bracket Cluster (bracket, chassé, bracket)', cat: 'steps', diff: 5, entry: 'LFO', exit: 'RBI',
  beats: 8, dist: 14, cost: 4,
  phases: [{ k: 'arc', f: 0.25, r: 6, code: 'LFO' }, { k: 'arc', f: 0.25, r: 6, code: 'LBI' },
           { k: 'arc', f: 0.25, r: 6, code: 'RFO' }, { k: 'arc', f: 0.25, r: 6, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'turn_entry' }, { t: 0.3, pose: 'turn_exit' },
          { t: 0.45, pose: 'crossover_cross' }, { t: 0.68, pose: 'turn_entry' }, { t: 0.8, pose: 'turn_exit' }, { t: 1, pose: 'presentation' }],
  tip: 'Difficult turn clusters are how you get level in a step sequence. Two hard turns close together on the same foot count more.',
  ext: 'Because it is fast, the only visible line is the upper body. Keep the arms in a strong shape.',
  tags: ['step sequence', 'bracket', 'level', 'cluster'] });

E({ id: 'seq-twizzle-run', name: 'Twizzle Run (twizzle, step, twizzle)', cat: 'steps', diff: 4, entry: 'LFI', exit: 'RFI',
  beats: 8, dist: 14, cost: 3,
  phases: [{ k: 'spin', f: 0.3, rev: 1, travel: 4, code: 'LFI' }, { k: 'arc', f: 0.35, r: 9, code: 'RFO' },
           { k: 'spin', f: 0.35, rev: 1.5, travel: 5, code: 'RFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'twizzle' }, { t: 0.45, pose: 'crossroll' }, { t: 0.75, pose: 'twizzle' }, { t: 1, pose: 'turn_exit' }],
  tip: 'Travel along a straight axis. The connecting step should be one clean cross roll.',
  ext: 'Different arm position on each twizzle — variety is scored.', tags: ['step sequence', 'twizzle'] });

E({ id: 'seq-choctaw-diag', name: 'Choctaw Diagonal', cat: 'steps', diff: 4, entry: 'LFI', exit: 'LFI',
  beats: 8, dist: 18, cost: 3,
  phases: [{ k: 'arc', f: 0.25, r: 8, code: 'LFI' }, { k: 'arc', f: 0.25, r: 8, code: 'RBO' },
           { k: 'arc', f: 0.25, r: 8, code: 'RBI' }, { k: 'arc', f: 0.25, r: 8, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'turn_exit' }, { t: 0.5, pose: 'swing_forward' }, { t: 0.75, pose: 'turn_entry' }, { t: 1, pose: 'glide' }],
  tip: 'Big rolling lobes across the diagonal. Cover ice — a small step sequence looks timid.',
  ext: 'Let each lobe finish before you start the next turn.', tags: ['step sequence', 'diagonal', 'choctaw'] });

E({ id: 'seq-circular', name: 'Circular Step Pattern', cat: 'steps', diff: 4, entry: 'LFO', exit: 'LFO',
  beats: 16, dist: 30, cost: 4,
  phases: [{ k: 'arc', f: 0.2, r: 6, code: 'LFO' }, { k: 'arc', f: 0.2, r: 6, code: 'LBI' },
           { k: 'arc', f: 0.2, r: 6, code: 'RBI' }, { k: 'arc', f: 0.2, r: 6, code: 'RFO' },
           { k: 'arc', f: 0.2, r: 6, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.15, pose: 'turn_entry' }, { t: 0.28, pose: 'turn_exit' },
          { t: 0.45, pose: 'crossover_cross' }, { t: 0.62, pose: 'turn_entry' }, { t: 0.75, pose: 'turn_exit' },
          { t: 0.9, pose: 'presentation' }, { t: 1, pose: 'glide' }],
  tip: 'Keep the circle round and centred. Judges genuinely look at whether the circle is a circle.',
  ext: 'Same body shape at the same point of each quarter — that repetition reads as control.',
  tags: ['step sequence', 'circular', 'circle'] });

E({ id: 'seq-serpentine', name: 'Serpentine Step Pattern', cat: 'steps', diff: 4, entry: 'LFO', exit: 'RFO',
  beats: 16, dist: 34, cost: 4,
  phases: [{ k: 'arc', f: 0.25, r: 9, code: 'LFO' }, { k: 'arc', f: 0.25, r: 9, code: 'LBI' },
           { k: 'arc', f: 0.25, r: 9, code: 'RBO' }, { k: 'arc', f: 0.25, r: 9, code: 'RFO' }],
  poses: [{ t: 0, pose: 'stroke_push' }, { t: 0.2, pose: 'turn_entry' }, { t: 0.32, pose: 'turn_exit' },
          { t: 0.5, pose: 'swing_forward' }, { t: 0.68, pose: 'turn_entry' }, { t: 0.8, pose: 'turn_exit' }, { t: 1, pose: 'presentation' }],
  tip: 'Two or three big lobes end to end. Use the whole width of the rink.',
  ext: 'Change your arms on every lobe, not every turn.', tags: ['step sequence', 'serpentine'] });

E({ id: 'seq-straightline', name: 'Straight Line Step Pattern', cat: 'steps', diff: 4, entry: 'LFO', exit: 'RBI',
  beats: 12, dist: 26, cost: 4,
  phases: [{ k: 'arc', f: 0.2, r: 12, code: 'LFO' }, { k: 'arc', f: 0.2, r: 12, code: 'LBI' },
           { k: 'arc', f: 0.2, r: 12, code: 'RFO' }, { k: 'spin', f: 0.2, rev: 1, travel: 5, code: 'RFI' },
           { k: 'arc', f: 0.2, r: 12, code: 'RBI' }],
  poses: [{ t: 0, pose: 'stroke_push' }, { t: 0.18, pose: 'turn_entry' }, { t: 0.28, pose: 'turn_exit' },
          { t: 0.5, pose: 'crossroll' }, { t: 0.68, pose: 'twizzle' }, { t: 0.85, pose: 'presentation' }, { t: 1, pose: 'glide' }],
  tip: 'The corner-to-corner diagonal. Highest energy moment of most programs — sell it.',
  ext: 'Finish on the far corner with a held position. Do not trail off.',
  tags: ['step sequence', 'diagonal', 'straight line'] });

/* ============================================================
   4. FIELD MOVES / HIGHLIGHTS
   ============================================================ */

E({ id: 'spread-eagle-o', name: 'Outside Spread Eagle', cat: 'field', diff: 4, entry: 'LFO', exit: 'LFO',
  beats: 6, dist: 12, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 8, code: 'LFO', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'spread_eagle' }, { t: 0.85, pose: 'spread_eagle' }, { t: 1, pose: 'glide' }],
  tip: 'Both feet on outside edges, heels toward each other. Needs external hip rotation — build it off ice.',
  ext: 'Chest lifted, arms exactly in line with the feet, head turned along the travel. Do not look at the ice.',
  tags: ['spread eagle', 'highlight', 'field move', 'signature'] });

E({ id: 'spread-eagle-i', name: 'Inside Spread Eagle', cat: 'field', diff: 3, entry: 'LFI', exit: 'LFI',
  beats: 6, dist: 11, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 9, code: 'LFI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'spread_eagle' }, { t: 0.85, pose: 'spread_eagle' }, { t: 1, pose: 'glide' }],
  tip: 'Much more accessible than the outside version — a good first spread eagle.',
  ext: 'Keep both knees pressed straight and the hips forward.', tags: ['spread eagle', 'field move'] });

E({ id: 'ina-bauer', name: 'Ina Bauer', cat: 'field', diff: 4, entry: 'LFO', exit: 'LFO',
  beats: 8, dist: 14, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LFO', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'ina_bauer' }, { t: 0.85, pose: 'ina_bauer' }, { t: 1, pose: 'glide' }],
  tip: 'Front foot forward, back foot turned out behind, back arched. Feet stay parallel-ish, unlike a spread eagle.',
  ext: 'The arch comes from the upper back, not the lower back. Reach the ribs up and the shoulders open.',
  tags: ['ina bauer', 'highlight', 'field move', 'signature', 'arch'] });

E({ id: 'spiral-fo', name: 'Forward Outside Spiral', cat: 'field', diff: 2, entry: 'LFO', exit: 'LFO',
  beats: 8, dist: 16, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'arabesque' }, { t: 0.85, pose: 'arabesque' }, { t: 1, pose: 'presentation' }],
  tip: 'Free leg at or above hip height, held for at least 3 seconds to count as a spiral.',
  ext: 'Square the hips first, THEN lift. A high leg with an open hip reads as sloppy; a lower square one reads as trained.',
  tags: ['spiral', 'arabesque', 'field move', 'extension'] });

E({ id: 'spiral-fi', name: 'Forward Inside Spiral', cat: 'field', diff: 3, entry: 'LFI', exit: 'LFI',
  beats: 8, dist: 15, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'arabesque' }, { t: 0.85, pose: 'arabesque' }, { t: 1, pose: 'presentation' }],
  tip: 'Harder to balance than the outside spiral. Press the skating hip out over the edge.',
  ext: 'Keep the skating shoulder from dropping into the circle.', tags: ['spiral', 'field move'] });

E({ id: 'spiral-bo', name: 'Back Outside Spiral', cat: 'field', diff: 4, entry: 'LBO', exit: 'LBO',
  beats: 8, dist: 14, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LBO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'arabesque' }, { t: 0.85, pose: 'arabesque' }, { t: 1, pose: 'glide' }],
  tip: 'Backward spirals need real trust. Keep the weight over the middle of the blade.',
  ext: 'Look back over the shoulder along the free leg to lengthen the whole line.', tags: ['spiral', 'backward'] });

E({ id: 'spiral-catch', name: 'Catch-Foot Spiral', cat: 'field', diff: 4, entry: 'LFO', exit: 'LFO',
  beats: 8, dist: 14, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LFO' }],
  poses: [{ t: 0, pose: 'arabesque' }, { t: 0.3, pose: 'catchfoot' }, { t: 0.85, pose: 'catchfoot' }, { t: 1, pose: 'presentation' }],
  tip: 'Catch the blade AFTER the leg is already up, never pull yourself into position.',
  ext: 'Chest stays lifted as you catch. The moment the chest drops, the whole shape dies.',
  tags: ['spiral', 'catch foot', 'extension'] });

E({ id: 'spiral-y', name: 'Y-Spiral', cat: 'field', diff: 5, entry: 'LFO', exit: 'LFO',
  beats: 8, dist: 13, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 15, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'y_spiral' }, { t: 0.85, pose: 'y_spiral' }, { t: 1, pose: 'presentation' }],
  tip: 'Needs a full standing split. Do not force it on the ice before you have it off ice.',
  ext: 'Stand absolutely vertical on the skating leg. Any lean turns a Y into a wobble.',
  tags: ['spiral', 'y spiral', 'split', 'advanced', 'flexibility'] });

E({ id: 'spiral-charlotte', name: 'Charlotte Spiral', cat: 'field', diff: 5, entry: 'LFI', exit: 'LFI',
  beats: 8, dist: 12, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 16, code: 'LFI' }],
  poses: [{ t: 0, pose: 'arabesque' }, { t: 0.3, pose: 'charlotte' }, { t: 0.8, pose: 'charlotte' }, { t: 1, pose: 'presentation' }],
  tip: 'Fold forward until the free leg is vertical. Enormous hamstring requirement.',
  ext: 'Reach the hands toward the ice to counterbalance — the arms are part of the line.',
  tags: ['spiral', 'charlotte', 'advanced', 'flexibility'] });

E({ id: 'attitude-glide', name: 'Attitude Glide', cat: 'field', diff: 2, entry: 'LFO', exit: 'LFO',
  beats: 6, dist: 11,
  phases: [{ k: 'arc', f: 1, r: 12, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.25, pose: 'attitude' }, { t: 0.85, pose: 'attitude' }, { t: 1, pose: 'presentation' }],
  tip: 'A bent-knee turned-out free leg. Much more forgiving than a spiral and still looks trained.',
  ext: 'Knee higher than the foot, thigh rotated open. This is the single best cheap-looking-expensive position.',
  tags: ['attitude', 'ballet', 'field move'] });

E({ id: 'lunge', name: 'Lunge', cat: 'field', diff: 2, entry: 'RFO', exit: 'RFO',
  beats: 4, dist: 8, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 20, code: 'RFO', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'lunge' }, { t: 0.8, pose: 'lunge' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Trailing boot drags flat on the ice. Get low — a shallow lunge reads as a stumble.',
  ext: 'Back leg dead straight, chest up, arms long. The line runs from the back toe to the front hand.',
  tags: ['lunge', 'field move', 'low'] });

E({ id: 'shoot-duck', name: 'Shoot the Duck', cat: 'field', diff: 3, entry: 'LFI', exit: 'LFI',
  beats: 4, dist: 8, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 18, code: 'LFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'shoot_duck' }, { t: 0.75, pose: 'shoot_duck' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Full squat on one leg with the other extended forward. Standing back up is the hard half.',
  ext: 'Extended leg dead straight and pointed, parallel to the ice not resting on it.',
  tags: ['shoot the duck', 'squat', 'field move'] });

E({ id: 'hydroblade', name: 'Hydroblade', cat: 'field', diff: 5, entry: 'RBI', exit: 'RBI',
  beats: 4, dist: 9, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 5, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.3, pose: 'hydroblade' }, { t: 0.8, pose: 'hydroblade' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Extreme lean on a deep inside edge with the body almost on the ice. Needs speed to hold the lean.',
  ext: 'The whole body should be one straight diagonal from the blade to the top of the head.',
  tags: ['hydroblade', 'advanced', 'signature', 'low'] });

E({ id: 'cantilever', name: 'Cantilever', cat: 'field', diff: 5, entry: 'LBO', exit: 'LBO',
  beats: 6, dist: 12, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 16, code: 'LBO', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'cantilever' }, { t: 0.8, pose: 'cantilever' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Knees drive forward and the back bends away underneath. Quads and ankles do all the work.',
  ext: 'Keep the shoulders open and the arms wide — do not let them hang.',
  tags: ['cantilever', 'advanced', 'signature', 'arch'] });

E({ id: 'besti-squat', name: 'Besti Squat', cat: 'field', diff: 4, entry: 'RBI', exit: 'RBI',
  beats: 4, dist: 8, cost: 3,
  phases: [{ k: 'arc', f: 1, r: 12, code: 'RBI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.3, pose: 'shoot_duck' }, { t: 0.75, pose: 'shoot_duck' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Backward two-foot squat with the arms forward. Great connector into a spin entry.',
  ext: 'Heels together, knees apart, back flat.', tags: ['squat', 'backward', 'field move'] });

E({ id: 'pivot-f', name: 'Forward Pivot', cat: 'field', diff: 2, entry: 'LFI', exit: 'LFI',
  beats: 4, dist: 3, cost: 2,
  phases: [{ k: 'spin', f: 1, rev: 0.75, travel: 3, code: 'LFI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'pivot' }, { t: 0.85, pose: 'pivot' }, { t: 1, pose: 'glide' }],
  tip: 'One toepick anchored, the other foot draws a circle around it. A classic entrance into a spin.',
  ext: 'Keep the circling leg long and the body tall over the anchored pick.',
  tags: ['pivot', 'entry', 'field move'] });

E({ id: 'toe-drag', name: 'Toe Drag', cat: 'field', diff: 3, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 8,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LFO', both: true }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.3, pose: 'drag' }, { t: 0.8, pose: 'drag' }, { t: 1, pose: 'glide' }],
  tip: 'Free toepick lightly scratches behind you. Cheap, effective, and reads as choreography.',
  ext: 'Free leg fully straight — the drag should look intentional, not like a trip.',
  tags: ['drag', 'transition', 'choreo'] });

/* ============================================================
   5. JUMPS
   ============================================================ */

function JUMP(o) {
  const rev = o.rev;
  const air = o.airPose || 'jump_air';
  return E(Object.assign({
    cat: 'jumps', beats: 2, cost: 4,
    phases: [
      { k: 'arc', f: 0.35, r: o.setupR || 9, code: o.entry },
      { k: 'air', f: 0.35, rev, height: o.height || (0.30 + rev * 0.09), code: o.entry },
      { k: 'arc', f: 0.30, r: 8, code: o.exit },
    ],
    poses: [
      { t: 0, pose: 'jump_setup' }, { t: 0.3, pose: 'jump_takeoff' },
      { t: 0.42, pose: air }, { t: 0.66, pose: air },
      { t: 0.74, pose: 'jump_landing' }, { t: 1, pose: 'jump_landing' },
    ],
  }, o));
}

JUMP({ id: 'waltz', name: 'Waltz Jump', diff: 1, entry: 'LFO', exit: 'RBO', rev: 0.5, dist: 7,
  tip: 'The first jump anyone learns. Step forward, swing the free leg and arms up together, land on a back outside edge.',
  ext: 'The landing is the whole picture: free leg straight behind, arms wide, chin up, hold two counts.',
  tags: ['jump', 'waltz', 'basic'] });

JUMP({ id: 'toe-loop', name: 'Toe Loop', diff: 2, entry: 'RBO', exit: 'RBO', rev: 1, dist: 7,
  tip: 'Reach straight back with the left toepick, do not swing it around. Pick where the blade will land.',
  ext: 'Check out with the free leg extended and hold — most under-rotations show up as a rushed landing.',
  tags: ['jump', 'toe loop', 'toe jump', '1T'] });

JUMP({ id: 'salchow', name: 'Salchow', diff: 2, entry: 'LBI', exit: 'RBO', rev: 1, dist: 7,
  tip: 'Off the back inside edge with a swinging free leg. Let the edge do the rotation — do not pre-rotate the shoulders.',
  ext: 'Free leg swings through wide and pointed, then closes in tight.',
  tags: ['jump', 'salchow', '1S'] });

JUMP({ id: 'loop-jump', name: 'Loop Jump', diff: 3, entry: 'RBO', exit: 'RBO', rev: 1, dist: 6,
  tip: 'No pick, no swinging free leg. Jump straight up off the back outside edge with the feet crossed.',
  ext: 'The crossed air position must be tight and the landing leg unfolds late and straight.',
  tags: ['jump', 'loop', '1Lo'] });

JUMP({ id: 'flip', name: 'Flip', diff: 3, entry: 'LBI', exit: 'RBO', rev: 1, dist: 7,
  tip: 'Back inside edge, right toepick. Keep the left hip in — flutzing/lipping starts with the hip.',
  ext: 'Long reach back on the pick with a straight leg. That reach is what gives you height.',
  tags: ['jump', 'flip', 'toe jump', '1F'] });

JUMP({ id: 'lutz', name: 'Lutz', diff: 4, entry: 'LBO', exit: 'RBO', rev: 1, dist: 8,
  tip: 'The only jump that rotates against its entry edge. Hold that back OUTSIDE edge all the way to the pick.',
  ext: 'Long glide on the entry edge with a still free leg — the setup is half the score.',
  tags: ['jump', 'lutz', 'toe jump', '1Lz'] });

JUMP({ id: 'axel', name: 'Axel', diff: 4, entry: 'LFO', exit: 'RBO', rev: 1.5, dist: 8, cost: 5,
  tip: 'The only forward-takeoff jump, so it is one and a half rotations. Step forward onto a deep bent knee and go UP before you rotate.',
  ext: 'Free leg drives up to hip height on takeoff, straight and pointed, before it crosses in.',
  tags: ['jump', 'axel', '1A'] });

JUMP({ id: 'axel-2', name: 'Double Axel', diff: 5, entry: 'LFO', exit: 'RBO', rev: 2.5, dist: 9, cost: 5,
  tip: 'Two and a half rotations. Everything from the single, but the arms must pull in on takeoff not in the air.',
  ext: 'Hold the takeoff position one beat longer than feels safe — rushing kills the height.',
  tags: ['jump', 'double', '2A'] });

JUMP({ id: 'salchow-2', name: 'Double Salchow', diff: 4, entry: 'LBI', exit: 'RBO', rev: 2, dist: 7, cost: 5,
  tip: 'Usually the first double. Same technique as the single with a faster pull-in.',
  ext: 'Do not shortcut the entry three-turn — the edge quality carries the jump.',
  tags: ['jump', 'double', '2S'] });

JUMP({ id: 'toe-loop-2', name: 'Double Toe Loop', diff: 4, entry: 'RBO', exit: 'RBO', rev: 2, dist: 7, cost: 5,
  tip: 'Great second jump in a combination. Keep the pick reach long even when you are tired.',
  ext: 'Land checked with a real extension — combinations get sloppy on the second landing.',
  tags: ['jump', 'double', '2T', 'combination'] });

JUMP({ id: 'loop-2', name: 'Double Loop', diff: 5, entry: 'RBO', exit: 'RBO', rev: 2, dist: 6, cost: 5,
  tip: 'Hard to get height on. Sit into the edge and spring, do not lean back.',
  ext: 'Tight crossed ankles in the air, no scissoring.', tags: ['jump', 'double', '2Lo'] });

JUMP({ id: 'flip-2', name: 'Double Flip', diff: 5, entry: 'LBI', exit: 'RBO', rev: 2, dist: 7, cost: 5,
  tip: 'Watch the entry edge — a double flip that lips is a double flip with an edge call.',
  ext: 'Strong straight pick leg, hips square at the moment of the pick.', tags: ['jump', 'double', '2F'] });

JUMP({ id: 'lutz-2', name: 'Double Lutz', diff: 5, entry: 'LBO', exit: 'RBO', rev: 2, dist: 8, cost: 5,
  tip: 'Long outside edge into the corner. The counter-rotation must be held to the very last moment.',
  ext: 'Keep the shoulders square over the entry edge for a full 2 seconds.', tags: ['jump', 'double', '2Lz'] });

JUMP({ id: 'half-loop', name: 'Half Loop (Euler)', diff: 3, entry: 'RBO', exit: 'LBI', rev: 1, dist: 6, cost: 3,
  tip: 'Lands on the opposite back inside edge — used as the middle jump of a three-jump combination.',
  ext: 'Land quietly, no scrape. It is a connector, not a highlight.', tags: ['jump', 'euler', 'half loop', 'combination'] });

JUMP({ id: 'half-flip', name: 'Half Flip', diff: 2, entry: 'LBI', exit: 'RFI', rev: 0.5, dist: 5, cost: 3,
  tip: 'Half rotation from a back inside edge onto a forward inside edge, often into a lunge.',
  ext: 'Land on a bent knee and flow out — do not stop dead.', tags: ['jump', 'half flip', 'connector'] });

JUMP({ id: 'split-jump', name: 'Split Jump', diff: 3, entry: 'LBI', exit: 'RFI', rev: 0.5, dist: 7, cost: 4,
  airPose: 'jump_air_split', height: 0.45,
  tip: 'A half-rotation jump into a split position. Reads much bigger than it is.',
  ext: 'Both legs straight, both toes pointed, arms reaching along the legs. Hit the split at the TOP of the jump.',
  tags: ['jump', 'split', 'highlight', 'choreo jump'] });

JUMP({ id: 'stag-jump', name: 'Stag Jump', diff: 3, entry: 'LBI', exit: 'RFI', rev: 0.5, dist: 7, cost: 4,
  airPose: 'jump_air_stag', height: 0.45,
  tip: 'Front knee bent, back leg straight. A gorgeous choreo jump that hides limited flexibility.',
  ext: 'Front thigh parallel to the ice, back leg fully lengthened. Chest lifted.',
  tags: ['jump', 'stag', 'choreo jump', 'highlight'] });

JUMP({ id: 'falling-leaf', name: 'Falling Leaf', diff: 3, entry: 'RBO', exit: 'RBO', rev: 0.75, dist: 6, cost: 3,
  tip: 'A half-loop-ish jump landing on the toepick then flowing back. Lovely as a transition.',
  ext: 'Arch back slightly in the air and keep the free leg long behind.', tags: ['jump', 'falling leaf', 'choreo jump'] });

JUMP({ id: 'mazurka', name: 'Mazurka', diff: 2, entry: 'RBO', exit: 'LFI', rev: 0.5, dist: 5, cost: 3,
  airPose: 'jump_air_split', height: 0.32,
  tip: 'Small crossed-leg hop off the toepick. Beautiful sprinkled through a step sequence.',
  ext: 'Legs cross scissor-straight in the air, both toes pointed.', tags: ['jump', 'mazurka', 'choreo jump'] });

JUMP({ id: 'bunny-hop', name: 'Bunny Hop', cat: 'choreo', diff: 1, entry: 'LFO', exit: 'RFI', rev: 0, dist: 5, cost: 2,
  airPose: 'jump_air_stag', height: 0.24,
  tip: 'Forward hop from one foot to the toepick to the other foot. No rotation, so it is choreography, not a jump element.',
  ext: 'Kick the free leg forward straight and pointed — the kick is the whole trick.',
  tags: ['jump', 'bunny hop', 'basic', 'choreo jump'] });

JUMP({ id: 'ballet-jump', name: 'Ballet Jump', diff: 2, entry: 'RBO', exit: 'RBO', rev: 0.5, dist: 5, cost: 3,
  airPose: 'jump_air_stag', height: 0.30,
  tip: 'A toe-assisted hop with the free leg kicked forward. Great on a musical accent.',
  ext: 'Kicking leg straight to hip height, arms in a clear ballet shape.', tags: ['jump', 'ballet jump', 'choreo jump'] });

JUMP({ id: 'toe-walley', name: 'Toe Walley', diff: 3, entry: 'RBI', exit: 'RBO', rev: 1, dist: 7, cost: 4,
  tip: 'Like a toe loop but off the back INSIDE edge. Rare and a nice thing to have.',
  ext: 'Clean edge in, clean edge out — the whole point is that it is not a toe loop.', tags: ['jump', 'toe walley'] });


/* ---- triples and quads: needed to represent a senior program ---- */

JUMP({ id: 'salchow-3', name: 'Triple Salchow', diff: 5, entry: 'LBI', exit: 'RBO', rev: 3, dist: 8, cost: 5,
  tip: 'Three rotations off a back inside edge. The free-leg swing has to stay wide or the rotation stalls.',
  ext: 'Hold the entry three-turn checked — a rushed entry is the usual cause of an under-rotation.',
  tags: ['jump', 'triple', '3S'] });

JUMP({ id: 'toe-loop-3', name: 'Triple Toe Loop', diff: 5, entry: 'RBO', exit: 'RBO', rev: 3, dist: 8, cost: 5,
  tip: 'The most common second jump of a triple-triple combination. The pick reach must stay long under fatigue.',
  ext: 'Land checked with a real extension — the second jump of a combo is where line disappears.',
  tags: ['jump', 'triple', '3T', 'combination'] });

JUMP({ id: 'loop-3', name: 'Triple Loop', diff: 5, entry: 'RBO', exit: 'RBO', rev: 3, dist: 7, cost: 5,
  tip: 'No pick, no swing. Everything comes from the depth of the back outside edge.',
  ext: 'Ankles crossed tight and still in the air.', tags: ['jump', 'triple', '3Lo'] });

JUMP({ id: 'flip-3', name: 'Triple Flip', diff: 5, entry: 'LBI', exit: 'RBO', rev: 3, dist: 8, cost: 5,
  tip: 'Back inside edge, right toepick. Keep the left hip in or you get an edge call.',
  ext: 'Long straight pick leg, hips square at the moment of the pick.', tags: ['jump', 'triple', '3F'] });

JUMP({ id: 'lutz-3', name: 'Triple Lutz', diff: 5, entry: 'LBO', exit: 'RBO', rev: 3, dist: 9, cost: 5,
  tip: 'Counter-rotated: hold the back OUTSIDE edge all the way into the pick.',
  ext: 'A long, still glide on the entry edge is half the grade of execution.', tags: ['jump', 'triple', '3Lz'] });

JUMP({ id: 'axel-3', name: 'Triple Axel', diff: 5, entry: 'LFO', exit: 'RBO', rev: 3.5, dist: 10, cost: 5,
  tip: 'Three and a half rotations from a forward takeoff. Height first, rotation second — the pull-in happens on the way up.',
  ext: 'The free leg drives up straight and pointed on takeoff before it crosses in.',
  tags: ['jump', 'triple', '3A'] });

JUMP({ id: 'toe-loop-4', name: 'Quad Toe Loop', diff: 5, entry: 'RBO', exit: 'RBO', rev: 4, dist: 9, cost: 5,
  tip: 'Four rotations. Everything about the single, with no margin anywhere.',
  ext: 'Air position must be closed before the first rotation finishes.', tags: ['jump', 'quad', '4T'] });

JUMP({ id: 'salchow-4', name: 'Quad Salchow', diff: 5, entry: 'LBI', exit: 'RBO', rev: 4, dist: 9, cost: 5,
  tip: 'Deep back inside edge with a huge swing. Usually entered from a three-turn or a mohawk.',
  ext: 'Do not let the free leg wrap — it costs you the rotation.', tags: ['jump', 'quad', '4S'] });

JUMP({ id: 'loop-4', name: 'Quad Loop', diff: 5, entry: 'RBO', exit: 'RBO', rev: 4, dist: 8, cost: 5,
  tip: 'The hardest quad to get height on. Very few skaters have it.',
  ext: 'Absolutely still upper body on the entry edge.', tags: ['jump', 'quad', '4Lo'] });

JUMP({ id: 'flip-4', name: 'Quad Flip', diff: 5, entry: 'LBI', exit: 'RBO', rev: 4, dist: 9, cost: 5,
  tip: 'Back inside edge, toe assist, four rotations.',
  ext: 'Square the hips at the pick or the edge call follows.', tags: ['jump', 'quad', '4F'] });

JUMP({ id: 'lutz-4', name: 'Quad Lutz', diff: 5, entry: 'LBO', exit: 'RBO', rev: 4, dist: 10, cost: 5,
  tip: 'Counter-rotated quad. Needs an enormous, quiet entry edge and real speed.',
  ext: 'Hold the outside edge visibly — the whole element is judged on that edge.', tags: ['jump', 'quad', '4Lz'] });

/* ============================================================
   6. SPINS
   ============================================================ */

function SPIN(o) {
  return E(Object.assign({
    cat: 'spins', beats: 8, dist: 0, cost: 3, mirrorable: true,
    phases: [{ k: 'arc', f: 0.18, r: 5, code: o.entry }, { k: 'spin', f: 0.82, rev: o.rev || 6, travel: 0.9, code: o.exit }],
  }, o));
}

SPIN({ id: 'spin-upright', name: 'Upright Spin', diff: 2, entry: 'LFO', exit: 'RBI', rev: 5,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_upright' }, { t: 0.9, pose: 'spin_upright' }, { t: 1, pose: 'presentation' }],
  tip: 'Find the rocking-chair part of the blade just behind the toepick. Spin on a small circle, not a travelling one.',
  ext: 'Grow tall through the spin. Chin level, arms in a defined shape — never "just there".',
  tags: ['spin', 'upright', 'basic'] });

SPIN({ id: 'spin-scratch', name: 'Back Scratch Spin', diff: 3, entry: 'LFO', exit: 'RBI', rev: 9,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_upright' }, { t: 0.3, pose: 'spin_scratch' }, { t: 0.93, pose: 'spin_scratch' }, { t: 1, pose: 'presentation' }],
  tip: 'Free foot crosses at the ankle and slides up the skating leg to accelerate. Arms pull to the chest then overhead.',
  ext: 'Everything squeezes toward one vertical line. Any gap between the legs is lost speed.',
  tags: ['spin', 'scratch', 'fast'] });

SPIN({ id: 'spin-sit', name: 'Sit Spin', diff: 3, entry: 'LFO', exit: 'RBI', rev: 6, cost: 4,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_upright' }, { t: 0.34, pose: 'spin_sit' }, { t: 0.88, pose: 'spin_sit' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Thigh must be parallel to the ice or lower for full credit. Sit DOWN, do not lean forward.',
  ext: 'Free leg straight and pointed in front, arms reaching past it. Back flat, chest proud.',
  tags: ['spin', 'sit', 'basic'] });

SPIN({ id: 'spin-camel', name: 'Camel Spin', diff: 4, entry: 'LFO', exit: 'RBI', rev: 5, cost: 4,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'arabesque' }, { t: 0.34, pose: 'spin_camel' }, { t: 0.88, pose: 'spin_camel' }, { t: 1, pose: 'presentation' }],
  tip: 'Free leg at hip height or above, torso horizontal. The most common error is the hips opening — keep them square.',
  ext: 'One straight line from the free toe through the top of the head. Look forward, not down.',
  tags: ['spin', 'camel', 'extension'] });

SPIN({ id: 'spin-layback', name: 'Layback Spin', diff: 4, entry: 'LFO', exit: 'RBI', rev: 6, cost: 4,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_upright' }, { t: 0.36, pose: 'spin_layback' }, { t: 0.88, pose: 'spin_layback' }, { t: 1, pose: 'presentation' }],
  tip: 'Head back first, then shoulders, then the arch. Free leg in a turned-out attitude behind.',
  ext: 'Arch through the upper back with the ribs lifted — a lower-back-only layback both hurts and looks it.',
  tags: ['spin', 'layback', 'arch'] });

SPIN({ id: 'spin-biellmann', name: 'Biellmann Spin', diff: 5, entry: 'LFO', exit: 'RBI', rev: 6, cost: 5,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_upright' }, { t: 0.3, pose: 'spin_layback' }, { t: 0.45, pose: 'spin_biellmann' }, { t: 0.88, pose: 'spin_biellmann' }, { t: 1, pose: 'presentation' }],
  tip: 'Free blade pulled overhead with both hands. Extreme back and shoulder flexibility — build it slowly.',
  ext: 'The leg should end vertical above the head, not out to the side.', tags: ['spin', 'biellmann', 'advanced', 'flexibility'] });

SPIN({ id: 'spin-broken-leg', name: 'Broken Leg Sit Spin', diff: 4, entry: 'LFO', exit: 'RBI', rev: 6, cost: 4,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_upright' }, { t: 0.35, pose: 'spin_broken_leg' }, { t: 0.88, pose: 'spin_broken_leg' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Sit spin variation with the free leg bent and turned out to the side. Counts as a difficult variation.',
  ext: 'Free knee turned fully open and the foot lifted — not dragging.', tags: ['spin', 'sit', 'variation'] });

SPIN({ id: 'spin-pancake', name: 'Pancake Spin', diff: 5, entry: 'LFO', exit: 'RBI', rev: 6, cost: 5,
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.18, pose: 'spin_sit' }, { t: 0.38, pose: 'spin_pancake' }, { t: 0.88, pose: 'spin_pancake' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Fold the torso flat onto a crossed free leg. Very difficult sit variation with a high level value.',
  ext: 'Get truly flat — a half-folded pancake reads as a failed sit spin.', tags: ['spin', 'sit', 'variation', 'advanced'] });

SPIN({ id: 'spin-flying-camel', name: 'Flying Camel', diff: 5, entry: 'LFO', exit: 'RBI', rev: 5, cost: 5,
  phases: [{ k: 'arc', f: 0.15, r: 6, code: 'LFO' }, { k: 'air', f: 0.15, rev: 0.5, height: 0.30, code: 'LFO' }, { k: 'spin', f: 0.7, rev: 5, travel: 0.9, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.14, pose: 'jump_takeoff' }, { t: 0.24, pose: 'arabesque' }, { t: 0.36, pose: 'spin_camel' }, { t: 0.9, pose: 'spin_camel' }, { t: 1, pose: 'presentation' }],
  tip: 'Fly into the camel position and land already horizontal. Free leg leads the whole way.',
  ext: 'Hit the camel line in the air — landing and then arranging yourself loses the effect.',
  tags: ['spin', 'flying', 'camel', 'advanced'] });

SPIN({ id: 'spin-flying-sit', name: 'Flying Sit Spin', diff: 5, entry: 'LFO', exit: 'RBI', rev: 6, cost: 5,
  phases: [{ k: 'arc', f: 0.15, r: 6, code: 'LFO' }, { k: 'air', f: 0.15, rev: 0.5, height: 0.34, code: 'LFO' }, { k: 'spin', f: 0.7, rev: 6, travel: 0.9, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.14, pose: 'jump_takeoff' }, { t: 0.22, pose: 'jump_air_stag' }, { t: 0.36, pose: 'spin_sit' }, { t: 0.9, pose: 'spin_sit' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Jump up, hit an open position in the air, land straight into the sit. Land on a bent knee, not a straight one.',
  ext: 'The air position should be wide and open before it collapses into the sit.',
  tags: ['spin', 'flying', 'sit', 'advanced'] });

SPIN({ id: 'spin-camel-sit', name: 'Camel → Sit Combination (Aspire 4 required)', diff: 4, entry: 'LFO', exit: 'RBI', rev: 10, cost: 5, beats: 12,
  phases: [{ k: 'arc', f: 0.12, r: 5, code: 'LFO' }, { k: 'spin', f: 0.88, rev: 10, travel: 1.2, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.12, pose: 'arabesque' }, { t: 0.22, pose: 'spin_camel' }, { t: 0.5, pose: 'spin_camel' },
          { t: 0.6, pose: 'spin_sit' }, { t: 0.84, pose: 'spin_sit' }, { t: 0.92, pose: 'spin_scratch' }, { t: 1, pose: 'presentation' }],
  tip: 'The Aspire 4 required spin: forward camel into a forward sit, no flying entry. Minimum 3 revolutions in each position — count them, do not guess.',
  ext: 'Rise through the upright before you drop into the sit; the change of position is the element, not the two shapes on their own.',
  tags: ['spin', 'combination', 'camel', 'sit', 'aspire', 'required'] });

SPIN({ id: 'spin-combo', name: 'Combination Spin (sit → camel → upright)', diff: 4, entry: 'LFO', exit: 'RBI', rev: 10, cost: 5, beats: 12,
  phases: [{ k: 'arc', f: 0.12, r: 5, code: 'LFO' }, { k: 'spin', f: 0.88, rev: 10, travel: 1.2, code: 'RBI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.12, pose: 'spin_upright' }, { t: 0.26, pose: 'spin_sit' }, { t: 0.5, pose: 'spin_sit' },
          { t: 0.62, pose: 'spin_camel' }, { t: 0.78, pose: 'spin_camel' }, { t: 0.88, pose: 'spin_scratch' }, { t: 1, pose: 'presentation' }],
  tip: 'Two revolutions minimum in each position. Change position without losing speed or travelling.',
  ext: 'Each position must be fully reached — passing through a shape is not holding it.',
  tags: ['spin', 'combination', 'combo'] });

SPIN({ id: 'spin-illusion', name: 'Illusion Spin', diff: 5, entry: 'LFO', exit: 'LFO', rev: 3, cost: 4, beats: 6,
  phases: [{ k: 'spin', f: 1, rev: 3, travel: 2, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'illusion' }, { t: 0.5, pose: 'presentation' }, { t: 0.75, pose: 'illusion' }, { t: 1, pose: 'presentation' }],
  tip: 'A rotating cartwheel-like move where the torso drops as the free leg rises. Spectacular as a transition.',
  ext: 'The free leg and torso must form one continuous line through the vertical.',
  tags: ['illusion', 'spin', 'advanced', 'choreo'] });

/* ============================================================
   7. CHOREO / ACCENT / TRANSITIONS
   ============================================================ */

E({ id: 'choreo-presentation', name: 'Presentation Hold', cat: 'choreo', diff: 1, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 6, cost: 1,
  phases: [{ k: 'arc', f: 1, r: 20, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.3, pose: 'presentation' }, { t: 0.85, pose: 'presentation' }, { t: 1, pose: 'glide' }],
  tip: 'Do nothing, beautifully, for four counts. Programs that never stop moving look frantic.',
  ext: 'Chest open, shoulders down, eyes up and out to the audience. This is free points.',
  tags: ['presentation', 'pause', 'choreo', 'expression'] });

E({ id: 'choreo-reach', name: 'Reach & Open (port de bras)', cat: 'choreo', diff: 1, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 7, cost: 1,
  phases: [{ k: 'arc', f: 1, r: 18, code: 'LFO' }],
  poses: [{ t: 0, pose: 'contract' }, { t: 0.45, pose: 'reach_up' }, { t: 0.8, pose: 'presentation' }, { t: 1, pose: 'glide' }],
  tip: 'Contract then expand. The contrast is what makes an arm movement read from the boards.',
  ext: 'Move the arms from the back, not the elbows. Fingers finish the line.',
  tags: ['arms', 'port de bras', 'choreo', 'expression'] });

E({ id: 'choreo-hop', name: 'Choreographic Hop', cat: 'choreo', diff: 2, entry: 'LFO', exit: 'LFO',
  beats: 2, dist: 5, cost: 3,
  phases: [{ k: 'arc', f: 0.4, r: 12, code: 'LFO' }, { k: 'air', f: 0.25, rev: 0, height: 0.22, code: 'LFO' }, { k: 'arc', f: 0.35, r: 12, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.4, pose: 'jump_takeoff' }, { t: 0.55, pose: 'hop_tuck' }, { t: 0.75, pose: 'jump_landing' }, { t: 1, pose: 'glide' }],
  tip: 'A tiny hop on a musical hit. Costs nothing, adds a lot.',
  ext: 'Point both feet in the air, even for a 0.3 second hop.', tags: ['hop', 'accent', 'choreo'] });

E({ id: 'choreo-knee-slide', name: 'Knee Slide', cat: 'choreo', diff: 3, entry: 'RFI', exit: 'RFI',
  beats: 4, dist: 6, cost: 3,
  phases: [{ k: 'line', f: 1, code: 'RFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.25, pose: 'knee_slide' }, { t: 0.7, pose: 'knee_slide' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Drop to one knee and slide. Superb ending move. Wear knee protection while learning it.',
  ext: 'Back leg long, chest up, arms open. Do not curl into a ball.',
  tags: ['knee slide', 'ending', 'choreo', 'dramatic'] });

E({ id: 'choreo-spiral-sequence', name: 'Choreographic Spiral Sequence', cat: 'choreo', diff: 3, entry: 'LFO', exit: 'RFI',
  beats: 12, dist: 26, cost: 3,
  phases: [{ k: 'arc', f: 0.4, r: 14, code: 'LFO' }, { k: 'arc', f: 0.2, r: 8, code: 'LFI' }, { k: 'arc', f: 0.4, r: 14, code: 'RFI' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.15, pose: 'arabesque' }, { t: 0.4, pose: 'arabesque' },
          { t: 0.5, pose: 'presentation' }, { t: 0.65, pose: 'attitude' }, { t: 0.9, pose: 'attitude' }, { t: 1, pose: 'presentation' }],
  tip: 'Two or three spirals linked with a change of edge or foot. A required choreo element in many levels.',
  ext: 'Change the arm and leg shape between spirals — repetition of the identical position scores lower.',
  tags: ['spiral sequence', 'choreo', 'required element'] });

E({ id: 'choreo-hydro-lunge', name: 'Hydro-Lunge Combo', cat: 'choreo', diff: 5, entry: 'RBI', exit: 'RFO',
  beats: 8, dist: 16, cost: 4,
  phases: [{ k: 'arc', f: 0.5, r: 6, code: 'RBI' }, { k: 'arc', f: 0.5, r: 12, code: 'RFO', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.2, pose: 'hydroblade' }, { t: 0.45, pose: 'hydroblade' },
          { t: 0.62, pose: 'lunge' }, { t: 0.88, pose: 'lunge' }, { t: 1, pose: 'glide_deep' }],
  tip: 'Two low moves back to back — very effective as a contrast against a fast section.',
  ext: 'Stay low through the transition. Standing up between them kills it.',
  tags: ['choreo', 'low', 'advanced', 'signature'] });

E({ id: 'choreo-eagle-into-jump', name: 'Spread Eagle → Jump Entry', cat: 'choreo', diff: 5, entry: 'LFO', exit: 'LFO',
  beats: 8, dist: 18, cost: 4,
  phases: [{ k: 'arc', f: 0.55, r: 9, code: 'LFO', both: true }, { k: 'arc', f: 0.45, r: 9, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.15, pose: 'spread_eagle' }, { t: 0.5, pose: 'spread_eagle' },
          { t: 0.68, pose: 'glide_deep' }, { t: 0.85, pose: 'jump_setup' }, { t: 1, pose: 'jump_setup' }],
  tip: 'The famous "difficult entry" transition. Big bonus for going into a jump straight out of a hard move.',
  ext: 'Do not lose the eagle line early to prepare the jump. Hold, then change.',
  tags: ['transition', 'difficult entry', 'choreo', 'signature'] });

E({ id: 'choreo-body-roll', name: 'Body Roll', cat: 'choreo', diff: 2, entry: 'LFI', exit: 'LFI',
  beats: 4, dist: 6, cost: 2,
  phases: [{ k: 'arc', f: 1, r: 16, code: 'LFI', both: true }],
  poses: [{ t: 0, pose: 'contract' }, { t: 0.35, pose: 'cantilever' }, { t: 0.7, pose: 'reach_up' }, { t: 1, pose: 'presentation' }],
  tip: 'A wave through the spine on a two-foot glide. Cheap, expressive, and works with almost any music.',
  ext: 'Let it travel head → chest → hips → knees. One joint at a time.',
  tags: ['body roll', 'choreo', 'expression', 'contemporary'] });

E({ id: 'choreo-shoulder-lead', name: 'Shoulder-Led Glide', cat: 'choreo', diff: 1, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 8, cost: 1,
  phases: [{ k: 'arc', f: 1, r: 14, code: 'LFO' }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.4, pose: 'contract' }, { t: 0.8, pose: 'presentation' }, { t: 1, pose: 'glide' }],
  tip: 'Lead the movement with one shoulder and let the head follow. Instantly less robotic.',
  ext: 'The free leg should keep its extension while the upper body moves independently.',
  tags: ['choreo', 'expression', 'upper body'] });

/* ============================================================
   8. STOPS & PAUSES
   ============================================================ */

E({ id: 'stop-hockey', name: 'Hockey Stop', cat: 'stops', diff: 2, entry: 'LFI', exit: 'LFI',
  beats: 2, dist: 3, cost: 2,
  phases: [{ k: 'line', f: 1, code: 'LFI', both: true }],
  poses: [{ t: 0, pose: 'glide_deep' }, { t: 0.4, pose: 'hockey_stop' }, { t: 1, pose: 'hockey_stop' }],
  tip: 'A snap stop on a musical hit is one of the strongest accents in skating.',
  ext: 'Land the stop in a shape you have chosen, not wherever you happen to end up.',
  tags: ['stop', 'accent', 'hit'] });

E({ id: 'stop-t', name: 'T-Stop', cat: 'stops', diff: 2, entry: 'LFO', exit: 'LFO',
  beats: 2, dist: 4, cost: 1,
  phases: [{ k: 'line', f: 1, code: 'LFO', both: true }],
  poses: [{ t: 0, pose: 'glide' }, { t: 0.4, pose: 'tstop' }, { t: 1, pose: 'tstop' }],
  tip: 'Quiet, controlled stop. Good for ending a lyrical section.',
  ext: 'Keep the upper body completely still and tall as the blade drags.', tags: ['stop', 'quiet'] });

E({ id: 'pose-open', name: 'Opening Pose', cat: 'stops', diff: 1, entry: 'LFO', exit: 'LFO',
  beats: 4, dist: 0, cost: 1,
  phases: [{ k: 'hold', f: 1, code: 'LFO' }],
  poses: [{ t: 0, pose: 'contract' }, { t: 0.5, pose: 'contract' }, { t: 0.8, pose: 'reach_up' }, { t: 1, pose: 'presentation' }],
  tip: 'Your first 4 counts. Judges form an impression before you take a single stroke — use them.',
  ext: 'Pick one clear shape and hold it dead still until the music tells you to move.',
  tags: ['opening', 'pose', 'start'] });

E({ id: 'pose-final', name: 'Final Pose', cat: 'stops', diff: 1, entry: 'RBI', exit: 'RBI',
  beats: 4, dist: 0, cost: 1,
  phases: [{ k: 'hold', f: 1, code: 'RBI' }],
  poses: [{ t: 0, pose: 'presentation' }, { t: 0.3, pose: 'reach_up' }, { t: 1, pose: 'reach_up' }],
  tip: 'Land the last note. Hold until the music is genuinely finished, then breathe.',
  ext: 'Full body extension, eyes up. Do not deflate the moment the music stops.',
  tags: ['ending', 'pose', 'final'] });

/* ============================================================
   Exports / helpers
   ============================================================ */

const LIBRARY = _lib;
const LIB_BY_ID = Object.fromEntries(LIBRARY.map((e) => [e.id, e]));

/** parse a code like 'LFO' -> {foot:'L', dir:'F', edge:'O'} */
function parseCode(code) {
  if (!code || code.length < 3) return { foot: 'L', dir: 'F', edge: 'O' };
  return { foot: code[0], dir: code[1], edge: code[2] };
}

/** mirror a code: LFO <-> RFO */
function mirrorCode(code) {
  const c = parseCode(code);
  return (c.foot === 'L' ? 'R' : 'L') + c.dir + c.edge;
}

const CODE_NAMES = {
  L: 'Left', R: 'Right', F: 'Forward', B: 'Backward', O: 'Outside', I: 'Inside',
};
function describeCode(code) {
  const c = parseCode(code);
  return `${CODE_NAMES[c.foot]} ${CODE_NAMES[c.dir]} ${CODE_NAMES[c.edge]}`;
}

if (typeof module !== 'undefined') module.exports = { LIBRARY, CATEGORIES };

/* ============================================================
   DEFAULT ARM TRACKS
   ------------------------------------------------------------
   Upper-body movement is a scored feature, so every element carries an arm
   track by default. An instance can still override with its own `arms`.
   Rules: jumps gather, wrap in the air, check the landing; twizzles wrap and
   snap open; brackets stay still; spins go long-line -> sit -> overhead ->
   check; held positions arrive early and hold; crossovers stay quiet.
   ============================================================ */
(function defaultArms() {
  const A = (t, pose) => ({ t, pose });
  const byId = {
    'pose-open':          [A(0, 'crossed'), A(0.6, 'crossed'), A(1, 'low')],
    'pose-final':         [A(0, 'overhead'), A(0.4, 'diagonal'), A(1, 'diagonal')],
    'choreo-reach':       [A(0, 'low'), A(0.5, 'one_out'), A(1, 'second')],
    'choreo-presentation':[A(0, 'second'), A(0.3, 'overhead'), A(0.8, 'overhead'), A(1, 'second')],
    'stop-t':             [A(0, 'second'), A(0.5, 'press_down'), A(1, 'press_down')],
    'swing-roll-f':       [A(0, 'second'), A(0.45, 'overhead'), A(0.8, 'open_back'), A(1, 'second')],
    'swing-roll-b':       [A(0, 'second'), A(0.45, 'overhead'), A(0.8, 'open_back'), A(1, 'second')],
    'crossroll-f':        [A(0, 'second'), A(0.5, 'diagonal'), A(1, 'second')],
    'crossroll-b':        [A(0, 'second'), A(0.5, 'diagonal'), A(1, 'second')],
    'power-pull-f':       [A(0, 'low'), A(0.5, 'second'), A(1, 'low')],
    'power-pull-b':       [A(0, 'low'), A(0.5, 'second'), A(1, 'low')],
    'spread-eagle-o':     [A(0, 'second'), A(0.3, 'diagonal'), A(0.75, 'diagonal'), A(1, 'second')],
    'spread-eagle-i':     [A(0, 'second'), A(0.3, 'diagonal'), A(0.75, 'diagonal'), A(1, 'second')],
    'ina-bauer':          [A(0, 'second'), A(0.3, 'overhead'), A(0.75, 'open_back'), A(1, 'overhead')],
    'spiral-fo':          [A(0, 'second'), A(0.3, 'spiral_arms'), A(0.85, 'spiral_arms'), A(1, 'reach_fwd')],
    'spiral-fi':          [A(0, 'second'), A(0.3, 'spiral_arms'), A(0.85, 'spiral_arms'), A(1, 'reach_fwd')],
    'spiral-catch':       [A(0, 'overhead'), A(0.35, 'spiral_arms'), A(0.85, 'spiral_arms'), A(1, 'reach_fwd')],
    'attitude-glide':     [A(0, 'second'), A(0.35, 'one_up'), A(0.85, 'one_up'), A(1, 'second')],
    'lunge':              [A(0, 'second'), A(0.4, 'reach_fwd'), A(0.85, 'reach_fwd'), A(1, 'second')],
    'spin-camel-sit':     [A(0, 'reach_fwd'), A(0.18, 'spiral_arms'), A(0.45, 'spiral_arms'), A(0.55, 'reach_fwd'), A(0.8, 'reach_fwd'), A(0.9, 'overhead'), A(1, 'check')],
    'spin-scratch':       [A(0, 'second'), A(0.2, 'overhead'), A(0.45, 'crossed'), A(0.75, 'wrap'), A(1, 'overhead')],
    'twizzle-1':          [A(0, 'second'), A(0.2, 'wrap'), A(0.8, 'wrap'), A(1, 'check')],
    'twizzle-2':          [A(0, 'second'), A(0.2, 'wrap'), A(0.8, 'wrap'), A(1, 'check')],
    'twizzle-3':          [A(0, 'second'), A(0.15, 'wrap'), A(0.85, 'wrap'), A(1, 'check')],
    'bracket-fo':         [A(0, 'low'), A(1, 'low')],
    'bracket-fi':         [A(0, 'low'), A(1, 'low')],
    'bracket-bo':         [A(0, 'low'), A(1, 'low')],
    'bracket-bi':         [A(0, 'low'), A(1, 'low')],
    'counter-fo':         [A(0, 'second'), A(0.45, 'crossed'), A(1, 'reach_fwd')],
    'counter-fi':         [A(0, 'second'), A(0.45, 'crossed'), A(1, 'reach_fwd')],
    'counter-bo':         [A(0, 'second'), A(0.45, 'crossed'), A(1, 'reach_fwd')],
    'counter-bi':         [A(0, 'second'), A(0.45, 'crossed'), A(1, 'reach_fwd')],
  };
  const byCat = {
    jumps:  [A(0, 'low'), A(0.35, 'wrap'), A(0.7, 'wrap'), A(1, 'check')],
    spins:  [A(0, 'second'), A(0.2, 'overhead'), A(0.85, 'overhead'), A(1, 'check')],
    turns:  [A(0, 'second'), A(0.45, 'check'), A(1, 'second')],
    edges:  [A(0, 'low'), A(0.5, 'low'), A(1, 'second')],
    field:  [A(0, 'second'), A(0.3, 'spiral_arms'), A(0.85, 'spiral_arms'), A(1, 'second')],
    choreo: [A(0, 'low'), A(0.5, 'overhead'), A(1, 'second')],
    stops:  [A(0, 'second'), A(0.5, 'crossed'), A(1, 'crossed')],
    steps:  [A(0, 'second'), A(0.5, 'one_up'), A(1, 'second')],
  };
  for (const e of LIBRARY) if (!e.arms) e.arms = byId[e.id] || byCat[e.cat] || null;
})();

/* ============================================================
   presets.js — starter programs, "inspired by" study patterns,
   and an automatic program-skeleton generator.

   IMPORTANT / HONEST NOTE
   The famous-skater presets below are *inspired-by study patterns*.
   They are built from the publicly known element content and the
   stylistic signatures of those programs (spread eagles, Ina Bauers,
   layback spins, and so on) at a level you can actually train.
   They are NOT reproductions of the real, copyrighted choreography.
   ============================================================ */

/* a chain entry is [libId, mirror, beats?, extraOpts?] */
const PRESETS = [




  {
    id: 'starter-prepre', highlights: ['4 jump elements', '2 spins near centre', '2 spirals held 5 s', 'one stop on the change', 'sequence from threes and mohawks'],
    name: 'Pre-Pre Starter',
    subtitle: 'A complete Pre-Preliminary free skate — singles, two spins, two spirals, one stop, placed on the ice by the rules',
    credit: 'Original, level-appropriate; built headless with tools/harness.js from .agents/profiles/example-prepre.md',
    level: 'prepre', bpm: 96, speedScale: 0.8, start: {x: -3, y: 0, heading: 180},
    notes: 'A complete Pre-Preliminary free skate to a generic 4/4 track at 96 bpm, 162 counts = 1:41, built headless and placed on the ice by the rules (speedScale 0.8, ~3 m/s average). Four jump elements — Salchow+toe loop in the left corner on the first hit (6&3), waltz jump at centre (11&1) into the sit spin, a loop near centre (14&8) straight into the step sequence, and the flip out of the sequence (18&4) into the scratch spin; two spins near centre; two spirals held five seconds each (left forward outside on the opening melody, left forward inside on the second melody); a lunge and the one T-stop on the music change at 9&1 with a presentation glide out of it; a step sequence of threes, a mohawk, cross rolls and steps only (0 ISU difficult turns by design — a Pre-Pre sequence is not levelled) running from centre to the far end. Starts and finishes near centre. Every element carries an arm track and a hand note. It passes the verifier on every rule but one: the step sequence spans 49.3% of the length against the 50% floor - 0.4 m short. A good first task for your agent: `node tools/harness.js verify starter-prepre --summary`, then make it pass.',
    chain: [
      ["pose-open", false, 4, {"aim": 16, "arms": [{"t": 0, "pose": "bras_bas"}, {"t": 0.5, "pose": "first"}, {"t": 1, "pose": "fifth"}], "note": "Opening pose at centre ice on 1&1, facing down the rink. Still for four counts. Hands: rounded low (bras bas), rising through first to fifth overhead as the melody starts."}],
      ["choreo-reach", false, 4, {"aim": -28, "arms": [{"t": 0, "pose": "fifth"}, {"t": 0.5, "pose": "reach_fwd"}, {"t": 1, "pose": "second"}], "note": "Reach and open on 1&5 — the first travelling counts. Hands: from fifth, one hand reaches forward along the line of travel, then both open to second."}],
      ["stroke-f", false, 4, {"aim": -24, "arms": [{"t": 0, "pose": "second"}, {"t": 0.5, "pose": "open_back"}, {"t": 1, "pose": "second"}], "note": "Two long strokes on 2&1 — the melody wants stroking, not crossovers. Hands: second, opening back on the push, back to second."}],
      ["xover-f", true, 7, {"aim": -40, "radiusScale": 1.25, "arms": [{"t": 0, "pose": "second"}, {"t": 0.15, "phrase": "seesaw", "until": 0.85, "cycles": 2}, {"t": 1, "pose": "second"}], "note": "Forward crossovers on the right foot (a wide clockwise lobe) from 2&5 — the pulse starts here. Hands: seesaw, one high one low, two cycles over the run."}],
      ["crossroll-f", true, 4, {"aim": -28, "arms": [{"t": 0, "pose": "second"}, {"t": 0.5, "pose": "first"}, {"t": 1, "pose": "fifth"}], "note": "Cross roll onto the left forward outside on 3&4 — this IS the spiral edge; get the arms up before the leg. Hands: second, through first, to fifth overhead."}],
      ["spiral-fo", false, 8, {"aim": -24, "arms": [{"t": 0, "pose": "fifth"}, {"t": 0.25, "pose": "arabesque_arms"}, {"t": 0.85, "pose": "arabesque_arms"}, {"t": 1, "pose": "second"}], "note": "SPIRAL 1: left forward outside, 3&8 to 4&7 (five seconds), on the sustained note of the opening melody. Hands: from fifth into arabesque arms (front arm long, back arm long), held for the whole edge, opening to second as the leg comes down."}],
      ["stroke-f", false, 4, {"aim": -40, "arms": [{"t": 0, "pose": "second"}, {"t": 0.5, "pose": "open_back"}, {"t": 1, "pose": "low"}], "note": "Stroke out of the spiral on 4&8. Hands: second, open back on the push, settling low for the jump entry."}],
      ["crossroll-f", true, 4, {"aim": 8, "arms": [{"t": 0, "pose": "low"}, {"t": 1, "pose": "second"}], "note": "Cross roll onto the left forward outside on 5&4 — the same cross roll as before the spiral, now into the jump. Hands: low to second, nothing fussy."}],
      ["three-fo", false, 3, {"aim": 40, "arms": [{"t": 0, "pose": "second"}, {"t": 0.5, "pose": "check"}, {"t": 1, "pose": "low"}], "note": "LFO three on 5&8 into the Salchow — the three-turn entry. Hands: check on the turn, then low and quiet for the takeoff."}],
      ["salchow", false, 2, {"aim": -8, "arms": [{"t": 0, "pose": "low"}, {"t": 0.35, "pose": "wrap"}, {"t": 0.7, "pose": "wrap"}, {"t": 1, "pose": "check"}], "note": "JUMP ELEMENT 1: single Salchow on 6&3, in a corner, on the first big accent of the track. Hands: low, wrap in the air, check on the landing."}],
      ["toe-loop", false, 2, {"aim": 24, "arms": [{"t": 0, "pose": "check"}, {"t": 0.35, "pose": "wrap"}, {"t": 0.7, "pose": "wrap"}, {"t": 1, "pose": "check"}], "note": "Single toe loop straight off the Salchow landing (6&5) — one jump element. Hands: from the check, wrap, check again; no reset between the two jumps."}],
      ["crossroll-b", true, 3, {"aim": -8, "arms": [{"t": 0, "pose": "check"}, {"t": 1, "pose": "second"}], "note": "Back cross roll onto the left back outside on 6&7, out of the landing. Hands: from the check to second."}],
      ["xover-b", true, 7, {"aim": -40, "radiusScale": 1.1, "arms": [{"t": 0, "pose": "second"}, {"t": 0.15, "phrase": "wave_roll", "until": 0.85, "cycles": 1}, {"t": 1, "pose": "second"}], "note": "Back crossovers on the left foot (clockwise lobe) 7&2–7&8, carrying the program along the ice. Hands: one wave rolling from hand to hand over the head across the run."}],
      ["mohawk-bo", false, 3, {"aim": 24, "arms": [{"t": 0, "pose": "second"}, {"t": 0.5, "pose": "check"}, {"t": 1, "pose": "first"}], "note": "Left back outside mohawk on 8&1 onto the right forward outside, turning forward. Hands: check through the turn, gathering to first for the lunge."}],
      ["lunge", false, 5, {"aim": 20, "arms": [{"t": 0, "pose": "first"}, {"t": 0.3, "pose": "diagonal"}, {"t": 0.8, "pose": "diagonal"}, {"t": 1, "pose": "press_down"}], "note": "LUNGE on 8&4 on the right forward outside, three counts down as the music thins before the change. Hands: one high one low on a diagonal line, held, then both pressing down to the ice as the stop arrives."}],
      ["stop-t", true, 2, {"aim": 40, "arms": [{"t": 0, "pose": "press_down"}, {"t": 0.6, "pose": "press_down"}, {"t": 1, "pose": "heart"}], "note": "T-STOP on 9&1 (0:40) — the music change. The one stop in the program; everything goes still for two counts. Hands: pressed down, then both hands to the heart on the second count."}],
      ["choreo-presentation", true, 3, {"aim": 8, "arms": [{"t": 0, "pose": "heart"}, {"t": 0.4, "pose": "offer"}, {"t": 1, "pose": "second"}], "note": "The light move out of the stop, 9&3: a presentation glide. Hands: from the heart, both palms open forward (offer), then out to second — the gesture that makes the stop read as intended."}],
      ["xover-f", true, 7, {"aim": -40, "radiusScale": 1.25, "arms": [{"t": 0, "pose": "second"}, {"t": 0.15, "phrase": "rise_fall", "until": 0.85, "cycles": 2}, {"t": 1, "pose": "second"}], "note": "Forward crossovers on the right foot 9&6–10&4 (clockwise lobe) — the build to the waltz jump. Hands: rising and falling together on the beat, twice."}],
      ["crossroll-f", true, 4, {"aim": 40, "arms": [{"t": 0, "pose": "second"}, {"t": 1, "pose": "low"}], "note": "Cross roll onto the left forward outside on 10&5 — the waltz jump takes off from this edge. Hands: down to low, quiet."}],
      ["waltz", false, 2, {"aim": 16, "arms": [{"t": 0, "pose": "low"}, {"t": 0.3, "pose": "overhead"}, {"t": 0.7, "pose": "overhead"}, {"t": 1, "pose": "check"}], "note": "JUMP ELEMENT 2: waltz jump on 11&1 near centre ice. The easiest jump gets the show: hands over the head in the air. Hands: low on the edge, both arms overhead through the air, check on the landing."}],
      ["mohawk-bo", true, 3, {"aim": -40, "arms": [{"t": 0, "pose": "check"}, {"t": 1, "pose": "second"}], "note": "Right back outside mohawk on 11&3 onto the left forward outside — the spin entry edge. Hands: from the check out to second."}],
      ["spin-sit", false, 8, {"aim": 40, "arms": [{"t": 0, "pose": "second"}, {"t": 0.2, "pose": "wrap"}, {"t": 0.4, "pose": "reach_fwd"}, {"t": 0.85, "pose": "reach_fwd"}, {"t": 1, "pose": "check"}], "note": "SPIN 1: sit spin from 11&6, near centre, five seconds on the steady part of the track. Hands: second on the entry edge, wrap to pull in, both reaching forward past the free leg in the sit, check on the exit."}],
      ["mohawk-bi", true, 3, {"aim": -16, "arms": [{"t": 0, "pose": "check"}, {"t": 0.5, "pose": "second"}, {"t": 1, "pose": "fifth"}], "note": "Right back inside mohawk on 12&6 straight out of the spin, onto the left forward inside — the second spiral edge. Hands: check, second, and up to fifth before the leg goes."}],
      ["spiral-fi", false, 8, {"aim": 40, "distScale": 1.2, "arms": [{"t": 0, "pose": "fifth"}, {"t": 0.25, "pose": "spiral_arms"}, {"t": 0.85, "pose": "spiral_arms"}, {"t": 1, "pose": "second"}], "note": "SPIRAL 2: left forward inside, 13&1 to 13&8 (five seconds), on the second melody — the other edge from spiral 1, curving the other way. (The profile's default put the inside spiral on the right foot; it is on the left here so the spiral itself carries the turn back down the ice — say if you want it swapped.) Hands: from fifth into spiral arms (one forward, one back), held, opening to second."}],
      ["mohawk-fi", false, 3, {"arms": [{"t": 0, "pose": "second"}, {"t": 1, "pose": "low"}], "note": "Left forward inside mohawk on 14&1 onto the right back inside. Hands: second down to low."}],
      ["power-pull-b", true, 4, {"aim": -40, "distScale": 1.25, "arms": [{"t": 0, "pose": "low"}, {"t": 0.15, "phrase": "pump", "until": 0.85, "cycles": 3}, {"t": 1, "pose": "low"}], "note": "Back power pulls on the right foot 14&4–14&7, inside to outside, building into the loop — the loop takes off from the last outside pull. Hands: fists pumping on the beat, three times, then low."}],
      ["loop-jump", false, 2, {"aim": -24, "arms": [{"t": 0, "pose": "low"}, {"t": 0.35, "pose": "wrap"}, {"t": 0.7, "pose": "wrap"}, {"t": 1, "pose": "check"}], "note": "JUMP ELEMENT 3: single loop on 14&8, near centre ice, landing pointed down the rink so the step sequence runs from centre to the far end. Hands: low, wrap, check."}],
      ["mohawk-bo", true, 3, {"aim": -40, "chst": true, "arms": [{"t": 0, "pose": "check"}, {"t": 0.5, "pose": "second"}, {"t": 1, "pose": "jazz_hands"}], "note": "STEP SEQUENCE starts on 15&2: right back outside mohawk out of the loop landing onto the left forward outside. Hands: from the check, opening to second, then jazz hands — the sequence is the dancing part."}],
      ["crossroll-f", false, 4, {"aim": -16, "chst": true, "arms": [{"t": 0, "pose": "jazz_hands"}, {"t": 0.15, "phrase": "flick", "until": 0.85, "cycles": 2}, {"t": 1, "pose": "low"}], "note": "Cross roll left-to-right on 15&5, travelling down the ice. Hands: one hand flicks out to the side, then the other."}],
      ["three-fo", true, 3, {"aim": 10, "chst": true, "arms": [{"t": 0, "pose": "low"}, {"t": 0.5, "pose": "check"}, {"t": 1, "pose": "second"}], "note": "RFO three on 16&1 (clockwise). Hands: check on the turn, open to second."}],
      ["step-bi", true, 2, {"aim": 40, "chst": true, "arms": [{"t": 0, "pose": "second"}, {"t": 1, "pose": "first"}], "note": "Step back onto the left back inside on 16&4. Hands: second gathering to first through the change of foot."}],
      ["three-bi", false, 3, {"aim": -10, "chst": true, "arms": [{"t": 0, "pose": "first"}, {"t": 0.5, "pose": "check"}, {"t": 1, "pose": "jazz_low"}], "note": "LBI three on 16&6 (counter-clockwise) — the mirror of the RFO three. Hands: check, then jazz hands at the hips."}],
      ["crossroll-f", false, 3, {"chst": true, "arms": [{"t": 0, "pose": "jazz_low"}, {"t": 0.5, "pose": "jazz_hands"}, {"t": 1, "pose": "jazz_low"}], "note": "Cross roll again on 17&1, the same as before but quicker. Hands: jazz hands up and back to the hips."}],
      ["three-fo", true, 3, {"aim": 8, "chst": true, "arms": [{"t": 0, "pose": "jazz_low"}, {"t": 0.5, "pose": "check"}, {"t": 1, "pose": "second"}], "note": "RFO three on 17&4 — the same turn as 16&1, so the sequence says itself back: cross roll, three, step, three; cross roll, three, step. Hands: check, then second."}],
      ["step-bi", true, 2, {"aim": 28, "chst": true, "arms": [{"t": 0, "pose": "second"}, {"t": 1, "pose": "low"}], "note": "Step onto the left back inside on 17&7 — the flip edge. Hands: down to low."}],
      ["edge-lbi", false, 4, {"aim": -28, "chst": true, "arms": [{"t": 0, "pose": "low"}, {"t": 0.5, "pose": "second"}, {"t": 1, "pose": "low"}], "note": "Hold the left back inside edge for three counts from 18&1 and pick — the sequence ends on the takeoff edge with no reset. Hands: low, a breath open, low again for the pick."}],
      ["flip", false, 2, {"aim": -40, "arms": [{"t": 0, "pose": "low"}, {"t": 0.35, "pose": "wrap"}, {"t": 0.7, "pose": "wrap"}, {"t": 1, "pose": "check"}], "note": "JUMP ELEMENT 4: single flip on 18&4, straight out of the step sequence with no glide, near centre ice. Hands: low, wrap, check."}],
      ["xover-b", false, 6, {"aim": -40, "radiusScale": 1.25, "arms": [{"t": 0, "pose": "check"}, {"t": 0.2, "phrase": "seesaw", "until": 0.85, "cycles": 2}, {"t": 1, "pose": "second"}], "note": "Back crossovers out of the flip landing, 18&6–19&3, curving back toward centre for the final spin. Hands: seesaw, one high one low, twice."}],
      ["mohawk-bo", true, 3, {"aim": 40, "arms": [{"t": 0, "pose": "second"}, {"t": 0.5, "pose": "second"}, {"t": 1, "pose": "low"}], "note": "Right back outside mohawk on 19&4 onto the left forward outside — the same spin entry as the sit spin. Hands: second, held quiet, settling low for the spin entry."}],
      ["spin-scratch", false, 8, {"arms": [{"t": 0, "pose": "low"}, {"t": 0.2, "pose": "wrap"}, {"t": 0.5, "pose": "wrap"}, {"t": 0.8, "pose": "overhead"}, {"t": 1, "pose": "fists_up"}], "note": "SPIN 2: scratch spin from 19&7 near centre, five seconds to finish. Hands: low on the entry, pulled tight to the chest, then overhead as it accelerates, fists up on the exit."}],
      ["pose-final", false, 3, {"aim": -40, "arms": [{"t": 0, "pose": "fists_up"}, {"t": 0.4, "pose": "v_high"}, {"t": 1, "pose": "v_high"}], "note": "Final pose on 20&7, near centre, held to the last chord. Hands: fists up, opening to a wide V overhead."}],
    ],
  },

  {
    id: 'insp-valieva', highlights: ['3A', '3F', '3Lz+3T', 'FCSp', 'StSq', 'LSp', 'CCoSp'],
    name: 'Valieva 2022 SP — element content',
    subtitle: 'The seven scored elements, in the order she performed them',
    credit: 'ELEMENT CONTENT is from the competition record and is accurate. '
      + 'The CHOREOGRAPHY between the elements is not hers — it is generic connecting material, '
      + 'because the actual choreography is a copyrighted work and no step-by-step record of it exists here.',
    exact: 'partial',
    level: 'open', bpm: 88, start: { x: -22, y: -7, heading: 0.2 },
    notes: 'Her 2021-22 short program to "In Memoriam" (Kirill Richter). Documented: the three jump elements '
      + 'and their order — triple Axel first, then triple flip, then the triple Lutz + triple toe combination. '
      + 'The spin and step types are the ones the senior short program required that season (a flying spin, a '
      + 'layback, a combination spin with one change of foot, and a step sequence). Everything between those '
      + 'elements is filler I wrote, and the element durations are placeholders — set them against your own music.',
    chain: [
      ['pose-open', false, 6], ['choreo-reach', false, 8],
      ['stroke-f', false, 8], ['crossroll-f', true, 6],
      ['xover-f', false, 14],
      ['choreo-eagle-into-jump', false, 10],
      ['axel-3', false, 3],
      ['xover-b', false, 16], ['three-bo', true, 5],
      ['mohawk-fi', true, 5],
      ['flip-3', false, 3],
      ['stroke-b', true, 8], ['edge-lbo', false, 10],
      ['lutz-3', false, 3], ['toe-loop-3', false, 3],
      ['xover-b', false, 16], ['three-bo', true, 5], ['step-fio', true, 4],
      ['spin-flying-camel', false, 12],
      ['three-bi', true, 5], ['crossroll-f', true, 6],
      ['ina-bauer', false, 12],
      ['seq-straightline', false, 18],
      ['three-bi', true, 5],
      ['spin-layback', true, 14],
      ['three-bi', false, 5],
      ['spin-combo', false, 16],
      ['pose-final', false, 8],
    ],
  },

  {
    id: 'insp-yuna', highlights: ['enormous lobes','spiral sequence','spread eagle','camel spin','unhurried pacing'],
    name: 'Inspired: Yuna Kim',
    subtitle: 'Study pattern — huge edges, spiral sequence, unhurried carriage',
    credit: 'Inspired by the style of her competitive programs',
    level: 'open', bpm: 92, start: { x: -24, y: 4, heading: -0.15 },
    notes: 'The lesson from Yuna is space and calm: enormous lobes, very few but very long spirals, and nothing rushed. Great programme to steal *pacing* from.',
    chain: [
      ['pose-open', false, 4], ['choreo-shoulder-lead', false, 4],
      ['stroke-f', false, 4], ['swing-roll-f', true, 8],
      ['crossroll-f', false, 4], ['three-fo', true, 4],
      ['salchow', true, 2],
      ['xover-b', true, 8], ['three-bo', false, 4],
      ['mohawk-fi', false, 4], ['flip', true, 2],
      ['stroke-b', false, 4], ['three-bo', true, 4],
      ['power-pull-f', true, 6],
      ['choreo-spiral-sequence', true, 12],
      ['mohawk-fi', false, 4], ['three-bi', false, 4],
      ['spin-camel', false, 10],
      ['three-bi', true, 4], ['choreo-reach', true, 4],
      ['spread-eagle-o', true, 6],
      ['three-fo', true, 4], ['axel', true, 2],
      ['xover-b', true, 8], ['three-bo', false, 4],
      ['seq-serpentine', false, 16],
      ['three-fo', true, 4], ['three-bi', true, 4],
      ['spin-combo', false, 12],
      ['three-bi', true, 4], ['choreo-presentation', true, 4],
      ['mohawk-fi', true, 4], ['pose-final', true, 4],
    ],
  },

  {
    id: 'insp-alysa', highlights: ['quick feet','twizzle run','flying sit spin','split jump','knee slide'],
    name: 'Inspired: Alysa Liu',
    subtitle: 'Study pattern — quick feet, attacking entries, high energy',
    credit: 'Inspired by her competitive style',
    level: 'open', bpm: 128, start: { x: -20, y: -8, heading: 0.25 },
    notes: 'Fast, punchy, lots of turns per second. Notice how much shorter every element is — that is what makes it read as energetic.',
    chain: [
      ['pose-open', false, 4],
      ['stroke-f', false, 4], ['crossroll-f', true, 4], ['crossroll-f', false, 4],
      ['three-fo', true, 3], ['axel', true, 2],
      ['xover-b', true, 6], ['three-bo', false, 3], ['mohawk-fi', false, 3],
      ['flip', true, 2], ['falling-leaf', true, 2],
      ['stroke-b', false, 4],
      ['three-bo', true, 3], ['power-pull-f', true, 4],
      ['seq-twizzle-run', true, 8],
      ['mohawk-fi', true, 3], ['three-bi', true, 3],
      ['spin-flying-sit', true, 8],
      ['three-bi', false, 3],
      ['choreo-hop', false, 2], ['three-fo', false, 3], ['salchow', false, 2], ['toe-loop', false, 2],
      ['xover-b', false, 6], ['three-bo', true, 3], ['mohawk-fi', true, 3],
      ['split-jump', false, 2], ['choreo-knee-slide', false, 3],
      ['stop-t', true, 2],
      ['stroke-f', true, 4], ['crossroll-f', false, 4],
      ['seq-circular', true, 12],
      ['three-fo', true, 3], ['three-bi', true, 3],
      ['spin-combo', true, 10],
      ['three-bi', false, 3], ['pose-final', true, 4],
    ],
  },

  {
    id: 'drill-extension', highlights: ['spirals','attitude glide','spread eagle','held edges','half tempo'],
    name: 'Extension Drill',
    subtitle: 'Every element in this one exists to fix line',
    credit: 'Original practice sequence',
    level: 'open', bpm: 72, start: { x: -24, y: 0, heading: 0 },
    notes: 'Slow on purpose. Run this at half tempo with the Extension Lab open and watch the line score. There is nowhere to hide in it.',
    chain: [
      ['pose-open', false, 4], ['edge-lfo', false, 8], ['crossroll-f', false, 4],
      ['spiral-fo', true, 8], ['three-fo', true, 4],
      ['edge-lbi', true, 8], ['three-bi', true, 4],
      ['attitude-glide', false, 6], ['edge-change-f', false, 6],
      ['spiral-fi', false, 8], ['mohawk-fi', false, 4],
      ['edge-lbi', true, 6], ['three-bi', true, 4],
      ['spiral-fo', false, 8], ['three-fo', false, 4],
      ['spread-eagle-i', true, 6],
      ['choreo-reach', true, 4], ['lunge', true, 4],
      ['choreo-presentation', false, 4], ['pose-final', true, 4],
    ],
  },

  {
    id: 'drill-edges', highlights: ['swing rolls','power pulls','cross rolls','no tricks'],
    name: 'Edge Quality Warm-Up',
    subtitle: 'Lobes, power pulls, swing rolls — no tricks',
    credit: 'Original practice sequence',
    level: 'open', bpm: 84, start: { x: -26, y: -10, heading: 0.2 },
    notes: 'Skate this before you touch a jump. It is the whole "skating nicely everywhere" problem in eight minutes of ice time.',
    chain: [
      ['stroke-f', false, 4], ['swing-roll-f', true, 8], ['swing-roll-f', false, 8],
      ['crossroll-f', false, 4], ['crossroll-f', true, 4],
      ['xover-f', false, 8], ['three-fo', false, 4],
      ['power-pull-b', true, 6], ['three-bo', true, 4],
      ['power-pull-f', true, 6], ['mohawk-fi', true, 4],
      ['xover-b', false, 8], ['three-bo', true, 4],
      ['edge-change-f', true, 6], ['mohawk-fi', true, 4],
      ['edge-lbi', true, 6], ['three-bi', true, 4],
      ['choreo-presentation', false, 4],
    ],
  },

  {
    id: 'drill-steps', highlights: ['brackets','counters','choctaws','twizzles','turn clusters'],
    name: 'Step Sequence Lab',
    subtitle: 'Brackets, twizzles, choctaws — the level-up material',
    credit: 'Original practice sequence',
    level: 'open', bpm: 108, start: { x: -25, y: -11, heading: 0.35 },
    notes: 'Difficult turns in clusters, both rotational directions, using the full diagonal. This is what a judge is looking at when they assign a level.',
    chain: [
      ['stroke-f', false, 4], ['crossroll-f', true, 4],
      ['bracket-fo', false, 4], ['three-bi', false, 4],
      ['twizzle-1', false, 2], ['mohawk-fi', false, 3],
      ['three-bi', true, 3], ['counter-fo', true, 4],
      ['three-bo', true, 3], ['power-pull-f', true, 4],
      ['choctaw-fi', true, 4], ['three-bo', false, 4],
      ['rocker-fi', false, 4], ['three-bi', false, 3],
      ['seq-bracket-cluster', false, 8],
      ['three-bi', true, 3], ['twizzle-2', true, 2],
      ['mohawk-fi', true, 3], ['three-bi', true, 3],
      ['choreo-presentation', false, 4],
    ],
  },
];

/* ------------------------------------------------------------
   Load a preset into a program object
   ------------------------------------------------------------ */
const PROTOCOL_IDS = new Set(['axel-3', 'flip-3', 'lutz-3', 'toe-loop-3', 'spin-flying-camel',
  'seq-straightline', 'spin-layback', 'spin-combo']);

function loadPreset(preset) {
  const p = newProgram(preset.name);
  p.bpm = preset.bpm;
  p.level = preset.level;
  if (preset.speedScale) p.speedScale = preset.speedScale;
  p.start = Object.assign({}, preset.start);
  p.notes = preset.notes;
  p.credit = preset.credit;
  if (preset.music) {
    p.musicName = preset.music.name;
    p.musicDuration = preset.music.duration;
    p.offset = preset.music.offset || 0;
  }
  for (const [libId, mirror, beats, extra] of preset.chain) {
    if (!LIB_BY_ID[libId]) { console.warn('preset references unknown element', libId); continue; }
    const inst = addElement(p, libId, Object.assign({ mirror: !!mirror }, beats ? { beats } : {}, extra || {}));
    if (inst && preset.exact === 'partial' && PROTOCOL_IDS.has(libId)) inst.protocol = 'scored element';
  }
  repairProgram(p);
  return p;
}

/**
 * Walk the program and insert the smallest possible connecting step
 * wherever one element's exit edge doesn't match the next one's entry.
 * This is the same routine behind the "Fix this seam" button.
 * Returns the number of connectors inserted.
 */
function repairProgram(program, opts = {}) {
  const maxPasses = opts.maxPasses || 3;
  let inserted = 0;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (let i = 0; i < program.elements.length - 1; i++) {
      const a = resolve(program.elements[i]);
      const b = resolve(program.elements[i + 1]);
      if (a.exit === b.entry) continue;
      const fix = bridge(a.exit, b.entry, opts.diffCap);
      if (!fix) continue;
      const made = fix.map((f) => {
        const lib = LIB_BY_ID[f.libId];
        return Object.assign({ uid: uid(), libId: f.libId, mirror: f.mirror, beats: Math.min(lib.beats, 4),
          radiusScale: 1, aim: 0, gapBefore: 0, note: 'auto-inserted connector' });
      });
      program.elements.splice(i + 1, 0, ...made);
      inserted += made.length;
      i += made.length;
      changed = true;
    }
    if (!changed) break;
  }
  return inserted;
}

/** find a 1- or 2-element bridge from one edge code to another */
function bridge(fromCode, toCode, diffCap = 4) {
  const ok = (c) => c.lib.diff <= diffCap;
  const one = findConnectors(fromCode, toCode).filter(ok);
  if (one.length) return [one[0]];
  const mids = elementsFrom(fromCode, (e) => (e.cat === 'turns' || e.cat === 'edges') && e.diff <= diffCap);
  let best = null;
  for (const m of mids) {
    const second = findConnectors(m.exit, toCode).filter(ok);
    if (second.length) {
      const score = m.lib.diff + second[0].lib.diff;
      if (!best || score < best.score) best = { score, pair: [m, second[0]] };
    }
  }
  return best ? best.pair : null;
}

/* ============================================================
   BUILD FROM AN ISU PROTOCOL
   ------------------------------------------------------------
   A competition protocol ("judges details per skater") lists the
   executed elements in order, e.g.

       3A  3F  3Lz+3T  FCSp4  StSq4  LSp4  CCoSp4

   That list is published fact, so the element CONTENT of any real
   program can be reproduced exactly. The choreography between the
   elements cannot — this fills the gaps with plain connecting steps
   and marks them as such.
   ============================================================ */

const PROTOCOL_JUMPS = {
  A: [null, 'axel', 'axel-2', 'axel-3', 'axel-3'],          // index = rotations (1A..4A)
  S: [null, 'salchow', 'salchow-2', 'salchow-3', 'salchow-4'],
  T: [null, 'toe-loop', 'toe-loop-2', 'toe-loop-3', 'toe-loop-4'],
  LO: [null, 'loop-jump', 'loop-2', 'loop-3', 'loop-4'],
  F: [null, 'flip', 'flip-2', 'flip-3', 'flip-4'],
  LZ: [null, 'lutz', 'lutz-2', 'lutz-3', 'lutz-4'],
  EU: [null, 'half-loop', 'half-loop', 'half-loop', 'half-loop'],
  W: [null, 'waltz', 'waltz', 'waltz', 'waltz'],
};

const PROTOCOL_OTHER = {
  // spins
  FCSP: 'spin-flying-camel', FSSP: 'spin-flying-sit',
  CCOSP: 'spin-combo', COSP: 'spin-combo', FCCOSP: 'spin-combo',
  LSP: 'spin-layback', CLSP: 'spin-layback',
  CSP: 'spin-camel', CCSP: 'spin-camel',
  SSP: 'spin-sit', CSSP: 'spin-sit',
  USP: 'spin-upright', CUSP: 'spin-upright',
  FUSP: 'spin-upright', FLSP: 'spin-layback',
  // sequences
  STSQ: 'seq-straightline', CISTSQ: 'seq-circular', SLSTSQ: 'seq-straightline', SESTSQ: 'seq-serpentine',
  CHSQ: 'choreo-spiral-sequence', CHST: 'choreo-spiral-sequence',
  CHSQ1: 'choreo-spiral-sequence',
  // spirals / misc
  SPSQ: 'choreo-spiral-sequence',
};

/** parse one element token like "3Lz+3T" or "FCSp4" -> [{libId, label, combo}] */
function parseProtocolToken(token) {
  const clean = token.trim().replace(/[!*qeE<]+$/g, '').replace(/\s+/g, '');
  if (!clean) return [];
  const out = [];
  const parts = clean.split('+');
  parts.forEach((part, i) => {
    const jm = part.match(/^(\d)(A|S|T|Lo|F|Lz|Eu|W)$/i);
    if (jm) {
      const rot = Math.min(4, Math.max(1, +jm[1]));
      const kind = jm[2].toUpperCase();
      const table = PROTOCOL_JUMPS[kind];
      const id = table && table[rot];
      if (id) out.push({ libId: id, label: part, combo: i > 0 });
      return;
    }
    const key = part.replace(/[0-9B]+$/, '').toUpperCase();
    const id = PROTOCOL_OTHER[key];
    if (id) out.push({ libId: id, label: part, combo: false });
  });
  return out;
}

/**
 * Build a program from a protocol element list.
 * Returns { program, matched, unmatched }.
 */
function buildFromProtocol(text, opts = {}) {
  const tokens = String(text)
    .replace(/[\n\r,;]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !/^[\d.,+-]+$/.test(t));       // drop bare numbers (base values, GOE, totals)

  const p = newProgram(opts.name || 'From protocol');
  p.bpm = opts.bpm || 100;
  p.level = opts.level || 'open';
  p.start = { x: -22, y: -6, heading: 0.15 };

  const matched = [], unmatched = [];
  addElement(p, 'pose-open', { note: 'connecting / choreography — not from the protocol' });

  for (const tok of tokens) {
    const parsed = parseProtocolToken(tok);
    if (!parsed.length) { unmatched.push(tok); continue; }
    for (const item of parsed) {
      const inst = addElement(p, item.libId, { note: 'PROTOCOL: ' + item.label });
      if (inst) { inst.protocol = item.label; inst.combo = item.combo; }
      matched.push(item.label);
    }
  }
  addElement(p, 'pose-final', { note: 'connecting / choreography — not from the protocol' });

  // fill every seam with real connecting steps so the result is skatable
  repairProgram(p, { diffCap: 4 });
  for (const e of p.elements) {
    if (e.note === 'auto-inserted connector') e.note = 'connecting / choreography — not from the protocol';
  }
  return { program: p, matched, unmatched };
}

/* ------------------------------------------------------------
   Connector search — used by the auto-generator and by the
   "fix this seam" button in the continuity panel.
   ------------------------------------------------------------ */
const CONNECTOR_CATS = ['turns', 'edges', 'choreo'];

function findConnectors(fromCode, toCode, opts = {}) {
  const prefer = opts.prefer || ['turns', 'edges', 'choreo'];
  const cats = opts.cats || CONNECTOR_CATS;
  const out = [];
  for (const e of LIBRARY) {
    if (cats && cats.indexOf(e.cat) < 0) continue;
    for (const mirror of [false, true]) {
      if (mirror && !e.mirrorable) continue;
      const en = mirror ? mirrorCode(e.entry) : e.entry;
      const ex = mirror ? mirrorCode(e.exit) : e.exit;
      if (en === fromCode && ex === toCode) {
        out.push({ libId: e.id, mirror, lib: e, rank: prefer.indexOf(e.cat) < 0 ? 9 : prefer.indexOf(e.cat) });
      }
    }
  }
  out.sort((a, b) => a.rank - b.rank || a.lib.diff - b.lib.diff);
  return out;
}

/** all elements (with mirror flag) that can start from a given code */
function elementsFrom(code, filter) {
  const out = [];
  for (const e of LIBRARY) {
    if (filter && !filter(e)) continue;
    for (const mirror of [false, true]) {
      if (mirror && !e.mirrorable) continue;
      const en = mirror ? mirrorCode(e.entry) : e.entry;
      if (en === code) out.push({ libId: e.id, mirror, lib: e, exit: mirror ? mirrorCode(e.exit) : e.exit });
    }
  }
  return out;
}

/**
 * Auto-generate a program skeleton.
 * Walks a template of "what kind of element belongs here", and at each
 * step picks something that is actually reachable from the current edge.
 */
function autoGenerate(seconds, level, bpm, seed = 1) {
  let rnd = seed * 9301 + 49297;
  const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length) % arr.length];

  const L = LEVELS[level] || LEVELS.open;
  const spb = 60 / bpm;
  const targetBeats = seconds / spb;

  // difficulty ceiling per level
  const maxDiff = level === 'prepre' ? 4 : level === 'prelim' ? 4 : 5;
  const ok = (e) => e.diff <= maxDiff;

  // the shape of a competitive program, as a list of intents
  const template = [
    'open', 'choreo', 'build', 'build', 'jump', 'link', 'field',
    'link', 'jump', 'link', 'spin', 'link', 'build', 'field',
    'link', 'jump', 'link', 'steps', 'link', 'jump', 'link', 'spin',
    'choreo', 'close',
  ];

  const wants = {
    open: (e) => e.id === 'pose-open',
    close: (e) => e.id === 'pose-final',
    choreo: (e) => e.cat === 'choreo' && ok(e),
    build: (e) => e.cat === 'edges' && ok(e),
    link: (e) => (e.cat === 'turns' || e.cat === 'edges') && ok(e),
    jump: (e) => e.cat === 'jumps' && ok(e) && e.diff <= L.maxJumpDiff,
    spin: (e) => e.cat === 'spins' && ok(e),
    field: (e) => e.cat === 'field' && ok(e),
    steps: (e) => e.cat === 'steps' && ok(e),
  };

  const p = newProgram('Auto-generated skeleton');
  p.bpm = bpm; p.level = level;
  p.start = { x: -22, y: -6, heading: 0.15 };

  let code = 'LFO';
  let beats = 0;
  let jumps = 0, spins = 0, steps = 0;

  const place = (cand) => {
    addElement(p, cand.libId, { mirror: cand.mirror });
    code = cand.exit;
    beats += cand.lib.beats;
    if (cand.lib.cat === 'jumps') jumps++;
    if (cand.lib.cat === 'spins') spins++;
    if (cand.lib.cat === 'steps') steps++;
  };

  // bridge from `code` to something that satisfies `want`, at most 2 hops
  const advance = (want) => {
    const filt = wants[want];
    let cands = elementsFrom(code, filt);
    if (want === 'jump' && jumps >= L.maxJumpElements) cands = [];
    if (want === 'spin' && spins >= L.maxSpins) cands = [];
    if (want === 'steps' && steps >= L.maxStepSeq) cands = [];
    if (cands.length) { place(pick(cands)); return true; }

    // one connecting turn, then try again
    const links = elementsFrom(code, (e) => (e.cat === 'turns' || e.cat === 'edges') && ok(e));
    for (let i = 0; i < links.length; i++) {
      const l = links[(i * 7) % links.length];
      const next = elementsFrom(l.exit, filt);
      if (next.length) { place(l); place(pick(next)); return true; }
    }
    // two connecting turns
    for (const l of links) {
      const l2s = elementsFrom(l.exit, (e) => e.cat === 'turns' || e.cat === 'edges');
      for (const l2 of l2s) {
        const next = elementsFrom(l2.exit, filt);
        if (next.length) { place(l); place(l2); place(pick(next)); return true; }
      }
    }
    if (links.length) { place(pick(links)); return false; }
    return false;
  };

  for (const want of template) {
    if (want === 'close') break;
    advance(want);
    if (beats > targetBeats * 1.15) break;
  }
  // pad with edges until we're close to the target, then close it out
  let guard = 0;
  while (beats < targetBeats - 8 && guard++ < 40) {
    if (!advance(rand() < 0.5 ? 'build' : 'link')) break;
  }
  advance('close');
  return p;
}

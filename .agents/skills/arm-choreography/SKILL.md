---
name: arm-choreography
description: Author arm and hand movement — the `arms:` keyframe track, the 45 named arm shapes (classic carriage, ballet positions, jazz hands, boxing, cover-face and other gestures), hand shapes drawn on the model (spread, fist, flat), the moving arm PHRASES (wave roll, pump, jazz shake, boxing, rolling hands, port de bras…), which shape suits which element and musical moment, hands over the head in the air on a jump, and the matching per-element hand note. Use whenever a program is being built (every element gets a track), the user asks for hand detail or "dancing hands", or the skater looks frozen from the waist up.
---

# Arms and hands

## Why this exists

A whole-body pose track only moves the arms when it hits a keyframe, so between
keyframes the hands sit dead still. Arms are therefore their **own track**,
laid over the body pose, on every element:

```js
arms: [{ t: 0, pose: 'second' }, { t: 0.45, pose: 'wrap' }, { t: 1, pose: 'check' }]
```

`t` is 0..1 through the element. Set it on a library element (applies
everywhere) or on an instance (`inst.arms`, program-specific, saved in the
JSON and in a preset's `{ arms: […] }`). An instance track wins. Elements with
no track fall back to `armBreath()`, a small beat-phased sway — the hands are
never completely still, but a fallback is not choreography.

Only elbows and hands are overridden; shoulders stay with the torso. Mirrored
with everything else (left-foot authoring, like the poses).

**Dancing hands on every element** is a general rule (**program-craft** §17):
every element carries a track, the hands do something different in every
section, and the passages with a pulse get a *phrase* (below), not a held
shape. What "dancing hands" means to a given skater is in their profile —
*the current profile's words: "jazz hands, hands up and down, ballerina
positions, rolling, covering the face, boxing… hands above the head for some
jumps"* — and that is what the vocabulary below was built to answer.

## The vocabulary (`ARM_POSES` in js/poses.js)

**Classic carriage** — `second` (wide, shoulder height: the neutral) · `low` ·
`overhead` · `crossed` (at the chest) · `press_down` (hands pressing to the
ice: stops, twizzle exits) · `reach_fwd` · `open_back` (swing rolls, the arch
of a Bauer) · `one_up` · `one_out` · `diagonal` (one high one low on a line:
cross rolls, final poses) · `wrap` (tight: twizzles and jumps in the air) ·
`spiral_arms` (one forward one back: spirals, camel) · `check` (landing check:
**every jump landing**).

**Ballet** — `bras_bas` (rounded low) · `first` (rounded in front) · `third` ·
`fourth` · `fifth` (rounded overhead) · `arabesque_arms` (front arm long, back
arm long — spirals, attitude).

**Jazz / show** (hand shape `spread` unless noted) — `jazz_hands` (up and out,
fingers fanned) · `jazz_low` (at the hips) · `jazz_side` (one up one low) ·
`v_high` (a wide V overhead) · `hips` (hands on hips, `flat`) · `shrug`
(palms up at the waist, `flat`) · `hat_tip` (one hand at the brow, `flat`) ·
`sway_L` / `sway_R` (both arms swept to one side) · `crest_L` / `crest_R`
(one arm up like the crest of a wave).

**Gesture / story** — `cover_face` (both hands over the face, `flat`) ·
`cover_eyes` (one hand over the eyes) · `heart` (hands to the chest) ·
`prayer` · `offer` (both palms forward, `flat`) · `reach_side` · `guard`
(boxer's guard, `fist`) · `punch_L` / `punch_R` (`fist`) · `fists_up` /
`fists_down` (`fist`) · `circle_1..4` (the four points of hands rolling round
each other in front of the chest).

A shape's `hand` field (`'spread' | 'fist' | 'flat'`, or `[L, R]`) is drawn on
the model as a glyph — a fan of fingers, a dot, a short extension — so jazz
hands and fists actually read on screen. Check a shape by drawing it
off-screen and POSTing the canvas to `tools/inbox.py` (**harness**):

```js
// ts = program-time seconds to draw; these five are from the La La Land program — pick your own moments
const p=App.program, path=App.path, W=240, H=300, ts=[0.8, 26.35, 67.8, 84.9, 99.2];
const cv=document.createElement('canvas'); cv.width=W*ts.length; cv.height=H; const ctx=cv.getContext('2d');
ctx.fillStyle='#0b1a26'; ctx.fillRect(0,0,cv.width,H);
ts.forEach((t,i)=>{ const w=poseAt(p,path,t), s=w._sample, a=s.bodyH+0.6;
  const cs={pos:[s.x+Math.cos(a)*5.5, s.y+Math.sin(a)*5.5, 1.9], target:[s.x,s.y,1.0], up:[0,0,1], ortho:false, fov:40*DEG};
  const proj=makeProjector(cs,W,H); ctx.save(); ctx.translate(i*W,0); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
  drawSkater(ctx,proj,w); ctx.restore(); });
await fetch('http://localhost:8778/hands.png',{method:'POST', body: cv.toDataURL('image/png')});
```

## Phrases — arms that keep moving (`ARM_PHRASES`)

A keyframe holds a shape; a **phrase** is a function of phase that keeps the
hands moving for as long as you say. Track entry:

```js
{ t: 0.15, phrase: 'pump', until: 0.85, cycles: 3 }   // fists pump three times between 15% and 85% of the element
```
`until` defaults to just before the next keyframe (a short ease-in is left);
`cycles` defaults to 1. Every phrase starts and ends on the **same, fixed
shape** — `wave_roll` on `sway_L`, `pump`
on `fists_up`, `rise_fall` on `overhead`, `jazz_shake` on `jazz_hands`,
`boxing` on `guard`, `roll_hands` on `circle_1`, `port_de_bras` on
`bras_bas`, `seesaw` on `crest_L`, `flick` on `low`. The track eases from the
previous keyframe to that start shape over the time between them, so **leave
≥ 0.1 of the element** (or start the phrase from a matching keyframe); a
keyframe 0.08 before `rise_fall` snapped the hands at 9.8 m/s.

| Phrase | What it is | Use it on |
|---|---|---|
| `wave_roll` | a wave from one hand, over the head, down the other arm | a long crossover run, a swell |
| `pump` | fists pumping | a build with a pulse — into a jump |
| `rise_fall` | both hands up and down together, open | "hands go up and down" on a steady beat |
| `jazz_shake` | jazz hands shaking | the big-band climax, the last power pulls |
| `boxing` | guard → left jab → guard → right cross | a mohawk or step in the sequence |
| `roll_hands` | hands rolling round each other at the chest | power pulls, a glide |
| `port_de_bras` | bras bas → first → fifth → second → down | the melodic opening |
| `seesaw` | the two hands swapping high and low | crossovers |
| `flick` | one hand flicking out to the side, then the other | light, playful bars |

**Pacing is guaranteed by the engine, not by the author.** Arms on a skater
do not snap: `ARM_PACE` in `js/poses.js` re-times every track per element so
a move between two shapes takes at least 0.45 s (0.25 s inside a jump) and
longer when the hands travel further (average ≤ 3 m/s), a phrase cycle takes
at least 0.9 s and at least what its shapes need, keyframes are pulled
earlier or thinned when there is no room, and the arms cross-fade over 0.45 s
at every seam and every change of foot (computed from the unblended pose, so
the mix is exactly half-and-half at the change). Write the shapes you want,
in the order you want, and the engine makes them a move — `cycles: 4` on a
short element simply becomes fewer cycles. The harness measures the result:
`arms.maxHandSpeedOutsideJumps_mps` must be ≤ 5 (`ARM_PACE.maxHandSpeed`) and
`maxHandSpeed_mps` ≤ 8 inside a jump; both are rule misses in `score`. The
seventeen programs in the gallery all sit at 3.8–4.9 with the pacing on.

## Rules that hold up

- **Jumps:** `low → wrap → wrap → check` is the working default. For **hands
  over the head in the air**: `low → overhead (0.3) → overhead (0.7) → check`
  (both arms, "Rippon") or `one_up` (one arm, "tano"). Give at most two or
  three jumps that; the rest stay wrapped so the ones that fly read. In a
  combination do **not** reset between the two jumps.
- **Twizzles:** `wrap`, held, then snap open on the last quarter — into
  `jazz_hands` in a jazz passage, `check` otherwise.
- **Brackets:** arms **still**. A bracket has to be seen, not decorated. Hold
  whatever shape you arrived in (`jazz_low`, `hat_tip`, `reach_side`…).
- **Counters:** cross through the cusp (`crossed`), then reach out of it.
- **Spins:** camel = `spiral_arms`; sit = `reach_fwd`; rise through
  `overhead`/`fifth`; exit on `check` or, at the end of the program,
  `fists_up`.
- **Held positions (Bauer, spiral):** get there early and hold. `first → fifth
  → open_back → overhead` on a Bauer; `fifth → arabesque_arms` on a spiral.
- **Stops:** `press_down`, then a gesture that names the moment — `hips`,
  `cover_eyes`, `heart`. The move *out* of the stop is where the hands fly
  (`v_high` on a bunny hop; `choreo-presentation` is the library's "light
  move out of a stop" when there is no hop).
- **Phrase cycle rates:** `wave_roll` needs ≥ 2 beats per cycle (3 cycles on
  6 beats snapped at 12 m/s); `pump`/`seesaw` ≥ 1 beat per cycle.
- **Silence and fades:** arms come down slowly (`heart`, `offer`, `bras_bas`).
  Nothing sharp.
- **Foot changes swap the arms.** Poses are authored for the left foot and
  mirrored on the right, so an *asymmetric* shape (`diagonal`, `one_up`,
  `jazz_side`, `hat_tip`, `punch_L`) held across an element that changes
  foot — a mohawk, a step, a chassé — swaps sides. The engine cross-fades
  the arms over 0.45 s through the change, so it reads as the hands trading
  places; if that is not the picture you want, use a symmetric shape through
  the change (`second`, `low`, `guard`, `jazz_hands`) and go asymmetric after
  it. `verify` names the fastest hand moment: `arms.outsideJumpsAt`.
- **Make the same jump look different twice.** Two flips: one wrapped, one
  overhead; different entries.
- **Match the music's character.** Ballet shapes and `port_de_bras` on the
  melody; `seesaw`/`wave_roll` on the builds; `jazz_hands`, `boxing`,
  `hat_tip`, `jazz_shake` on the big-band climax; `cover_face`/`cover_eyes`
  where it goes quiet; `v_high` on the last chord.
- **Fold arms in BEFORE blending.** `poseAt()` composes body + arms in one
  `compose()` and only then applies the seam, gap and foot-change fades. Do
  not reorder it — the hands snapped 1.2 m at every seam the first time.

## Write the note too

Every element carries a `note`; end it with `Hands: …` — one or two sentences
a skater can read at the rink: what the hands do, what the head does, why,
tied to the music (e.g. "on the 0:26 accent" in the La La Land notes, "as it
goes quiet"). The track moves
the model; the note tells the human.

## Measuring it

`node tools/harness.js verify` → `arms: { elementsWithOwnTrack, distinctShapes,
phrases, handShapeKeyframes, maxHandSpeed_mps }` and `stepSequence.armFraction`
(must be 1). *Example from the La La Land build (C — Harder v3): 39/51 own
tracks, 29 shapes, 7 phrases, 7.9 m/s peak (in a jump).*

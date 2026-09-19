---
name: build-program
description: Build a complete figure skating program from a music envelope, a skater profile and an element list — decide the layout on the music, chain the elements edge-to-edge, give every element arms and a note, lock timings to the beat, steer the pattern, verify, score, save, and publish to the gallery. Use whenever asked to create, rebuild, or substantially rework a program, for any skater and any track. The other skills (program-craft, skater-profile, music-mapping, step-sequence, arm-choreography, verify-program, harness, level-rules) are the parts; this is the order to do them in.
---

# Building a program

**Read `program-craft` and then the skater's profile (`skater-profile`) first.**
The first says what a good program is; the second says what this skater can
do, how fast they skate, and what they have already told us they want. The
level rubric is in **level-rules**. Everything below is mechanics. The
commands show the current profile's numbers as examples; take yours from the
active profile.

Work headless through **harness** (`node tools/harness.js …`). The browser is
for the skater to watch the result, not for building it.

## 0. Read the music

```
node tools/harness.js envelope --bucket 2
```
Find the hits, the silences, the plateau and the sustained climax
(**music-mapping**). Note bpm/offset from the envelope file (which envelope
the harness picks, and how to build with no music at all, is in **harness**).

## 1. Decide the layout on paper

Write the timeline before touching code: which element lands on which musical
moment, and why. Jumps on hits; held shapes and a stop on the quiet bars; the
required spin on a plateau; the step sequence on the biggest sustained passage;
the hardest jump on the peak; the melodic opening gets extension and stroking.
Say which trade you made at the biggest moment (hardest jump *or* a held line).
If the profile already has a counts table, that table *is* the timeline.

## 2. Chain the elements

`node tools/harness.js lib [category] --speedScale X --bpm Y` prints every
element with its entry and exit edge codes (`LFO`, `RBI`, …), beats, distance,
minimum beats and natural curl at the profile's speed. **The exit of each
element must equal the entry of the next**; `mirror: true` swaps L↔R. Pick
every connector yourself — `repairProgram()` will insert the cheapest one and
that is how a program ends up with the same "back three + step" after every
jump. Use the jump-entry recipes from **program-craft** every time.

All jumps land `RBO`. Flip and Salchow take off from `LBI`, Lutz from `LBO`,
Loop and Toe loop from `RBO` (so they are the only jumps that can follow
directly in a combination).

Write the chain as a save file — `{ format: 'skating-choreographer', version: 1,
program: { name, bpm, offset, speedScale, level, start: {x, y, heading},
musicDuration, elements: [ { libId, mirror, beats, aim: 0, gapBefore: 0,
chst, arms, note } ] } }` (`heading` in degrees; `{x:-6,y:0,heading:0.25}` is
the La La Land start) — then `verify` and check `hard.brokenSeams` is **0
before doing anything else**.

Give every element an **arm track and a note** as you write it, not after
(**arm-choreography**). Mark the step sequence run `chst: true`, including its
lead-in steps, so it covers half the ice (**step-sequence**).

## 3. Lock the timings

```
node tools/harness.js anchor draft.json --at "flip#0=16,flip#1=@55,spin-camel-sit=54,stop-t#1=@141"
```
Seconds, or `@beat` (counts: `beat = (N−1)×8 + (M−1)`), all in program time;
the beat numbers above are from the current profile's counts table — use
your profile's. Anchoring only ADDS glide, so build the chain slightly short
and let the gaps absorb slack; **nothing can be moved earlier by anchoring** —
if an anchor comes out late with its gap already 0, the chain in front of it
is too long: shorten a connector's beats (not below its `minB`) or remove
one. Never put a gap on the second jump of a combination or on a jump that
fires straight out of the step sequence. Keep every glide under ~1.5 s (the
accepted programs are under 0.7).

**Budget the fixed spans first.** The tail after the last jump is a fixed
number of counts (the jump, its exit, the final spin at its minimum, the pose
≥ 2) — place the last jump so that budget ends on the music. Budget the front
the same way: the first stop *starts* on its count, so the front before it is
exactly that many counts. *For the current profile: the tail is Lutz 2 +
mohawk 3 + lunge 3 + scratch spin 6 + pose ≥ 2 = 16 counts; stop 1 starts on
3&1 = beat 16, so the front is 16 counts — an opening pose (4), a reach (4)
and a spiral that reads (8) in C3.* Both budgets are written out in the
profile.

## 4. Steer the pattern

```
node tools/harness.js steer draft.json --out steered.json
```
`aim` changes direction only, never timing. The pipeline places jumps and
spins, stretches the step sequence across half the ice, spreads the program
over both ends and keeps the best of several starts (by `placementScore`,
which counts ends, the sequence span and the rotation band). Two to three
minutes per start; run it in the background.

Do it as a small batch, not one run: write two or three `start` variants of
the anchored file (`heading` 0 / 180 in degrees, and one from the other side
of centre), steer them ONE AT A TIME (each is ~250 MB and 2–5 min per start;
`--headings 0,180` runs both headings in one command) with `--out`, `score`
them all. Then, if
the winner is still short somewhere, the levers in **program-craft** §7 —
in that order: the chain's curl (rotation, sequence span), the start
heading (ends), `--frozen 0-N` on a front you like with fresh starts for the
rest. Freezing a tail does not hold it. The same start set is deterministic:
never repeat one.

## 5. Verify and score — all of it

```
node tools/harness.js verify steered.json
node tools/harness.js score steered.json <the base preset or file you are building on>
```
The full checklist is in **verify-program**. The ones people skip and regret:
speeds over the level cap, the ends of the rink, the half-ice footprint of the
step sequence, and that every other gallery preset still builds if you touched
`js/`.

## 6. Save and publish

- The save file goes in the repo root (`<music>-<level>.json`) or under
  `experiments/` for a candidate.
- To put it in the gallery: `node tools/json2preset.js js/presets-experiments.js
  id=file.json:"subtitle" …` regenerates the experiment cards (they load after
  presets.js); or, for a permanent program, add a preset to `js/presets.js`
  with the chain as `[libId, mirror, beats, { aim, gapBefore, chst, arms, note }]`
  rows.
  **When splicing a chain into presets.js, find the closing bracket by counting
  brackets, never by searching for `\n    ],`** — a naive search once deleted
  two other presets. After editing presets.js confirm `PRESETS.length` is the
  count before your change plus the presets you added.
- Then in the browser: `cmd+shift+r` (plain reload serves cached JS),
  re-upload the music, re-set bpm/offset to the profile's, load the preset,
  and tell the skater to press space.

---
name: harness
description: Build, anchor, steer, verify and score a program from the command line with tools/harness.js — the app's own engine loaded into Node, so every number matches the browser. Use for any program work that does not need the picture (which is nearly all of it), for comparing several programs, and for the experiment loop in experiments/. Also covers tools/inbox.py, the way frames and JSON get out of the page when you do need the browser.
---

# The headless harness

`tools/harness.js` loads `js/util.js poses.js library.js engine.js presets.js
variants.js` into a Node `vm` context. Nothing is reimplemented: `buildPath`,
`analyze`, `checkRules`, `analyzePlacement`, `analyzeStepSequence`, `poseAt`,
`steerProgramMulti` are the app's functions. The numbers are the app's numbers
(checked: a steer run in the page and in the harness gave identical spins,
thirds, rotation and coverage).

```
node tools/harness.js verify   <program.json | presetId> [--summary]   # full JSON report, or the ≤ 30-line pass/fail sheet
node tools/harness.js score    <a.json> [b.json …]                # one comparable line each: hard fails, misses (named), quality
node tools/harness.js chain    <program.json | presetId>          # element list in counts, with speeds
node tools/harness.js anchor   <program.json> --at "flip#0=16,spin-camel-sit=54,stop-t#1=@141" [--out f.json]
node tools/harness.js steer    <program.json> [--starts 0,-16,16,-32,keep] [--headings 0,180] [--frozen 0-12,30] [--verbose] [--out f.json]
node tools/harness.js envelope [--bucket 2]                       # the music, bucketed and normalised
node tools/harness.js lib      [category] [--speedScale X] [--bpm Y]   # library ids, edges, beats, distances, minB, curl
```

`lib` computes `minB` (fewest beats under the category speed cap) and `turn`
(natural curl) at the given `--speedScale` / `--bpm`; the defaults are the
current profile's (0.8, 126). Pass the active profile's values for another
skater or track — every count table in the skills says what it was computed at.

**Which envelope**: the harness looks for `music/<track>-envelope.json` and
`private/music/<track>-envelope.json`, choosing by `--track <name>`, else the
program's `musicName`, else — if exactly one envelope exists anywhere — that
one. That last rule is a trap for a program with no music: it silently
inherits that envelope's `musicDuration` (and meaningless accent ratios) and
can then fail the length check. **Building without music?** Set
`musicDuration` in the program yourself (the length you want) and give it no
`musicName`; `anchor` then stretches the final pose to that length and
`verify` reports `music: null`. A program file's own `bpm`/`offset` win over
the envelope's.

An element may carry **`route`** (`'left' | 'right' | 'far' | 'near' |
'diagonal' | degrees`) — the direction the skater wants to travel over it.
The steer honours it and `verify` reports `placement.routes`; see
**program-craft** §2b.

A program file is the app's save format `{ format, version, program: {…} }`
with `program.elements[] = { libId, mirror, beats, radiusScale, aim, gapBefore,
note, chst, arms, distScale }` — those fields and no others: the loader
refuses a misspelt key, an unknown `libId`, and an unknown arm pose or phrase
name, so a typo cannot silently become "no arms". `distScale` stretches an
element's travel (clamped 0.5–1.5). Write one by hand or with a short
Node/Python script — the chain is the design; the harness does the rest.

## The loop

1. **Read the music**: `envelope` (needs `music/<track>-envelope.json`, exported
   once from the page — see below). Decide the layout on paper: which element
   lands on which musical moment (**music-mapping**).
2. **Write the chain** as JSON. Every element's entry edge must equal the
   previous exit edge (`lib` prints them; `mirror: true` swaps L↔R). Use the
   jump-entry recipes from **program-craft**; put `chst: true` on the step
   sequence run; give every element `arms` and a `note` (**arm-choreography**).
3. **`anchor`** the jumps, spin and stops to their seconds or counts (`@beat`
   is a beat *number*, `(N−1)×8+(M−1)`, not a count string; the skater's
   anchors are tabulated in the active profile — **skater-profile** says
   where — and the `--at` example above uses the current profile's beats).
   It only adds glide (`gapBefore`) — build the chain slightly short. If an
   anchor comes out late with gap 0, shorten a connector. The last element is
   stretched to end on the music.
4. **`steer`** — `--headings 0,180` tries both start headings (the lever for
   the far end) and keeps the best; `--verbose` prints each stage (place,
   stretch, spread, polish) and what it decided. 1–4 min per start per
   heading; ~250 MB; run one at a time in the background. It steers aims
   only, never timing.
5. **`verify --summary`** first: `RESULT PASS|FAIL — N hard, M misses (U
   unsafe), K thin`, one line per rule with its value, floor, margin, the
   element (`#idx libId count`) and a lever, and `NEXT`. Then the JSON
   (`verify`) for the numbers — everything in **verify-program** is there,
   including `summary[]` (the same rows), `notes[]`, `placementScore`,
   `placement.jumpDetail[]` / `spinDetail[]` (the coach's numbers: edge
   seconds, boards at takeoff and landing, runway, speed ratio, fatigue,
   revolutions per position, rev/s, entry speed) and the skater's own speed
   targets from their profile.
6. **`score`** several candidates side by side: `hardFails`, `ruleMisses`
   (= `misses.length`), `unsafe`, `craft`, `placementScore`, then `misses[]`
   — `"jump.boards 3.6<6 [#21 salchow] x3 unsafe"` — then the quality
   block. The misses are the rulebook's rows (engine `placementRules`, every
   threshold from `PLACE`), compared on raw values; the same rows the checker
   warns from and the summary prints.

`verify` also gives `music.jumps[].accentRatio` (onset strength at takeoff
— the strongest onset within 0.25 s of takeoff against the 3 s around it; ≥ 2 reads as "on a hit") and the level under
each stop and held shape (0 = silence, 1 = the loudest 2 s of the track). They
are hints for the ear, not a score.

## Gotchas

- The engine's `MessageChannel` ticks keep Node's event loop alive; the harness
  calls `process.exit` itself. Do not pipe a steer through `tail` and wait for
  EOF — run it in the background with a timeout and read the `--out` file.
- `steer` writes the steered aims back into the file you gave it unless
  `--out` is set. Keep the un-steered chain if you may want to re-steer.
- `--frozen a-b` holds those aims through every stage; it holds a **front's
  placement** but not a tail's (the tail rotates with the heading the front
  hands it). `--starts keep` continues from the file's aims — pointless after
  you changed `start.heading`, since those aims were tuned for the old one.
- The multi-start keeps the best by `placementScore` — every stated rule is
  a step of 10 plus a slope, a cleared rule earns a small reward for margin,
  and a miss by a hair outranks any soft preference — and stops early when
  all of them are met. `--headings` keeps only the winning heading; when
  both may be clean and you care which end gets more, run them as separate
  `--out` files and choose. `verify` prints raw margins (`thirds` to 0.1,
  spins to 0.01, `lengthFrac` to 0.001) — 18.05% is not covered. The pipeline ends with a
  **polish** pass that minimises that score directly on a fine grid; it is
  what turns "an end at 17%" into 19%. *Example from the La La Land
  experiments: since these landed, the two round-2 chains that took 19 and
  31 runs reach 0 misses in **one** run (`--starts 0 --headings 180`).*
- `envelope --bucket 0.5` is the resolution to anchor by; 2 s is for the
  shape. The accent ratio is measured on the first jump of a combination.
- `radiusScale` on an element (save format) scales its lobes; leave it 1
  unless an element must fit a tighter space. `distScale` scales its travel.
- A jump after a `gapBefore` is **not** part of the combination before it —
  the level check, the placement and the steer all count it as its own jump
  element. Put the glide before the first jump, not between them.
- Stops decelerate: a `line` phase on a `stops` element ramps from the entry
  speed to near-still, so a stop travels by its entry speed, not the library
  distance, and the element after it is checked (`stop.exit`) unless it is a
  stroke, crossover or chassé.
- `hardFails` counts a program that does not end on the music
  (`|seconds − musicSeconds| > 0.05`) and one over the level's time cap; a
  file with no elements is a clean `no elements` fail.
- Preset ids work everywhere a file does (e.g. `verify starter-prepre`), including the ids in your own `js/local.js`.
- `pose.worstFootworkJointMove_m` is measured at 30 fps here (the browser
  snippet used 60), so ~0.8 m on a bunny hop or knee slide is normal; a snap
  elsewhere is a bug (**repo-gotchas**).

## When you do need the browser

Screenshots fail and repeat downloads are blocked, so the page hands things
back through a tiny receiver instead:

```
python3 tools/inbox.py <outdir> 8778 &        # then, from the page:
fetch('http://localhost:8778/frame.png', {method:'POST', body: canvas.toDataURL()})
fetch('http://localhost:8778/x.json',    {method:'POST', body: JSON.stringify(data)})
```

Export the music envelope once per track (after `file_upload` of the mp3 into
`#fileAudio`, and re-setting bpm/offset to the profile's — loading music
resets them). Example for the current track (La La Land, 126 bpm, offset
0.453 s); substitute your file name, bpm and offset:

```js
const env={name:'lalala.mp3', duration:Music.duration, hop:Music.onsetHop, bpm:126, offset:0.453,
  onsets:[...Music.onsets].map(v=>+v.toFixed(4))};
await fetch('http://localhost:8778/lalala-envelope.json',{method:'POST', body: JSON.stringify(env)});
```
then move it to `music/` (or `private/music/`). To *look* at poses, draw them off-screen and POST the
canvas — the `hands2.png` recipe in **arm-choreography**.

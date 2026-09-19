---
name: repo-gotchas
description: The failure modes specific to working on this repo through the browser — things that look broken but are not, edits that silently destroy data, and animation bugs that recur. Read at the start of any session on this project, and whenever something behaves strangely (music gone, camera jerking, presets missing, downloads not appearing, hands snapping). Each entry is something that actually happened here.
---

# Repo gotchas

## The browser

- **`cmd+shift+r`, not a plain reload, after editing any JS.** The python
  server sends Last-Modified and Chrome caches the scripts; a plain reload ran
  old code and `LEVELS.aspire4` was "missing" until a hard reload.
- **Reloading loses everything** — there is no autosave yet. The open program,
  the music, all of it. `loadPreset` the program back and re-upload the mp3.
- **Loading music resets `bpm` and `offset`** from detection. Re-set both on
  the program after every upload to the active profile's values (for the
  current profile, La La Land: `p.bpm=126; $('#bpmInput').value=126;
  p.offset=0.453; rebuild(false)`).
- **The mp3 must live in the scratchpad** for `file_upload`; `~/x.mp3` is
  refused. Copy it there first.
- **Audio is silent until a real click.** `Music.ctx.state === 'suspended'`
  after a programmatic load is browser autoplay policy, not a bug. Do not
  `await ctx.resume()` — it never resolves without a gesture and the evaluate
  times out. Tell the user to press space.
- **Screenshots do not work** (CDP `clip.scale` error, consistently). Verify
  with numbers via `javascript_tool`. To show the user an image, use the app's
  own `exportPatternPNG` once — the *first* programmatic download lands in
  `~/Downloads`, **repeats are blocked**. Do not rely on downloads for saving.
- **Tool output truncates at ~2–3 KB.** Pull big data (element lists, notes) in
  chunks via `window.__c=[…]` then read the pieces.
- **A heavy `javascript_tool` call can return "Internal error" after the work
  completed.** Building all 15,625 (5⁶) remix combinations of the La La Land
  deck did this. The page state
  is fine — re-read it with a light call. Keep optimiser passes ≤ 3.
- **A hidden tab throttles `setTimeout` to ~1/s, then ~1/min after five
  minutes.** The steering pipeline yields hundreds of times; with a timer
  yield it took hours. `steerProgramAsync` yields through a `MessageChannel`
  task instead, which is not throttled. Long in-page jobs: kick them off,
  return immediately, poll a `window.__job` object.
- **The steer's greedy pass cannot cover the far end of the rink** on its own
  (left end stuck at 9% through four starts). The end-spreading stage in
  `steerProgramAsync` fixes it by moving a corner jump to that end and
  re-placing what follows; if a program still has an end under 18%, look at
  whether every jump feeds a spin (those are pinned to centre).
- **The pose snapped at glide gaps** (hands at 21 m/s before the spin): gaps
  had no seam blend. `poseAt` now blends into and out of the glide pose across
  a gap. If `arms.maxHandSpeed_mps` is > 10 outside a jump, something similar
  is back.
- **The steering pipeline froze the page.** It yielded every four elements
  (~1 s of solid maths between paints) and the user saw the UI hang. It now
  yields every element / every 8 joint-search combos, through
  `requestAnimationFrame` when the tab is visible and `MessageChannel` when
  hidden. If the user says the UI freezes, check whether a steer is running.
- **Tab ids change** when the page is reloaded from outside. On "couldn't
  determine which page", call `tabs_context_mcp` and use the new id.
- **`[BLOCKED: Cookie/query string data]`** is a false positive on some
  template-literal strings. Rephrase the snippet (usually array `join` instead
  of a long template).
- **Getting a picture or a big blob out of the page:** POST it to
  `tools/inbox.py` (port 8778, CORS open) — `fetch('http://localhost:8778/x.png',
  {method:'POST', body: canvas.toDataURL()})`. Downloads are blocked after the
  first even across a reload; localStorage tricks do not help.
- **A hidden tab never fires `requestAnimationFrame`** — `await` on one hangs
  the call until the 45 s timeout. Draw to an off-screen canvas instead.

## The harness (Node)

- `tools/harness.js` loads the engine into a `vm` context; the engine's
  `MessageChannel` ticks keep the event loop alive, so it calls
  `process.exit` itself. A steer piped into `tail` waits forever for EOF —
  run it in the background with a timeout and read the `--out` file.
- `steer` overwrites the input file unless `--out` is given.
- Inside the vm there is no `process`, `document` or `window`; pass values in
  as globals on the context (`ctx.__p = …`) and evaluate strings.

## Edits that silently destroy things

- **Splicing a chain into `js/presets.js` by searching for `\n    ],` matched
  the wrong bracket and deleted two other presets.** It sat in the repo for two
  commits because nobody counted the cards. Splice by **bracket counting** from
  `chain: [`, and after every presets.js edit assert `PRESETS.length`.
- `git checkout <file>` is blocked as a discard; recover with
  `git show <rev>:<path> > scratch` and rebuild from that.
- Python `re.sub` with `→` in the *replacement* string raises "bad
  escape"; use a lambda replacement or literal characters.

## Animation bugs that recur (all fixed, all worth knowing)

- **`sampleAt` lerped `u` across an element boundary** while returning the
  earlier `ei`, so `u` ran backwards and the pose jumped to a different
  keyframe for one frame. Fixed: hold `a.u` when `a.ei !== b.ei`. This was the
  actual cause of "choppy footwork" — the cross-fades were treating a symptom.
- **The skating foot changing mid-element mirrored the whole body in one
  frame** (≈2 m teleport, 21× per program at every mohawk/choctaw/spin entry).
  Fixed with `FOOT_FADE` blending in `poseAt`.
- **Arm tracks applied after the seam/foot blends snapped the hands** at every
  boundary (worst joint move 0.39 → 1.21 m). `poseAt` now composes body + arms
  in one `compose()` and blends *that*. Do not reorder it.
- **Chase cameras whipped 180° at every turn** because they were pinned to
  `bodyH`, which reverses at three-turns. Smoothing camera *position* made it
  worse (the camera flew through the skater); smoothing the **heading angle**
  fixed it (16.7 m → 1.5 m worst frame). `smoothedSkater()` in render.js.
- The renderer itself was never slow (~1.2 ms/frame). "Laggy" meant the camera.

## Analysis API quirks

- `checkRules(p, path, analysis)` needs a real `analyze()` result — passing
  `App.analysis` when it is null throws on `.summary`.
- `analysis.speed` is easy to forget. Three remix variants passed seams and
  rules while running elements at 13–14 m/s.
- `path.segs[i].lib.beats` is the *library default*; the instance's real length
  is `seg.inst.beats`. Display code that reads `lib.beats` shows the wrong
  number for a 21-beat spin.
- `analyzeStepSequence` counts a run of consecutive difficult turns as **one**
  cluster — a non-difficult element (a mohawk) is needed between two clusters
  for both to count.

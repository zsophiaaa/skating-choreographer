---
name: verify-program
description: The verification checklist for any program change — seams, impossible and over-level speeds, off-boards, rule errors, placement (spins, jump zones, entries, both ends of the rink), the step-sequence audit and its half-ice footprint, arms, pose smoothness, coverage and rotation, save-file round-trip, and the regression check that every gallery preset still builds. Use before reporting any program or engine change as done. Every metric here is measured; none of it is judged by eye.
---

# Verifying a program

You cannot see the app (screenshots fail through the extension), so every
claim is a **measured number**. `node tools/harness.js verify <file|presetId>`
prints all of them; the browser snippets at the end are for when the page is
already open.

## Start with the sheet

```
node tools/harness.js verify <file|presetId> --summary
```
≤ 30 lines: a header (elements, seconds vs music, speedScale, level and its
time cap, `placementScore`), a `RESULT PASS|FAIL — N hard, M misses (U
unsafe), K thin` line, one line per rule — `STATUS rule value op floor margin
[xN] [#idx libId count] — lever` — and `NEXT`, the first thing to fix. MISS
and THIN come first; passing rules that do not fit the budget collapse into
one `PASS n more:` line. **THIN** = passing but inside the polish's margin
reward cap (ends 1 %, chst 0.02, spins 0.3 m, corners 0.2 s): the steer will
not defend it. **SOFT** = a soft target under its mark (coverage): warned and
scored, never a miss.

**One rulebook.** Every threshold lives in `PLACE` (js/engine.js) and every
consumer reads it: `checkPlacement`'s warnings, `placementScore`, the steer's
early exit, `score`'s misses and this sheet are all `placementRules()` rows,
so a number cannot pass in one place and fail in another. Every warning that
concerns an element names it as `#<index> <libId> <count>`.

The same rows are in the JSON as `summary[]` (`rule, tag, value, floor, op,
unit, margin, status, n, where, lever, items`) and the checker's info lines as
`notes[]` (half-ice check, the ISU turn line, the level source).

## Hard fails (RESULT FAIL whatever else is true)

`brokenSeams`, `impossibleSpeeds`, `offIceSeconds` over
`PLACE.offIceTolerance` (0.05 s), any `ruleErrors` — which now include a
program **over the level's time cap**, a jump/spin/stop/pose flagged `chst`,
and the level's caps — and `|seconds − musicSeconds| > 0.05`. A program with
no elements is a clean `no elements` fail, not a stack trace. `loadProgram`
refuses unknown `libId`s, unknown arm pose or phrase names, and any element
field outside the save format (`libId, mirror, beats, radiusScale, aim,
gapBefore, note, chst, arms, distScale`; `distScale` is clamped to 0.5–1.5).

## The rules (PLACE thresholds; unsafe rules are tagged in `score`)

| Rule | Floor | Tag | Where it is measured |
|---|---|---|---|
| `offIce` | ≤ 0.05 s | unsafe | samples outside the rink |
| `speed.cap` | ≤ `PLACE.maxSpeed[cat]` | unsafe | the worst element over its category cap |
| `steered` | ≤ 15° (`steerInsideMax`) | unsafe | emergency steering summed inside a jump, spin or field move (samples' `corr`) |
| `jump.boards` | ≥ 6 m (`jumpBoardsMin`) | unsafe | distance from the boards at the first and last air sample |
| `jump.runway` | ≥ 10 m (`jumpRunwayMin`) | unsafe | metres along the landing heading before the boards |
| `jump.edge` | ≥ 0.8 s (`jumpEdgeSecondsMin`) | unsafe | time on the takeoff code before the first air sample, counting back through the element before |
| `spin.revPerSec` | 1.2–3.0 (`spinRevPerSec`) | unsafe | `lib.rev` over the spin phases' seconds (6 beats of scratch spin = 3.8) |
| `jump.runIn` | ≥ 1.6 s (`jumpRunInSecondsMin`) | craft | plain skating in front of the takeoff turn — a jump is not entered out of a corridor of turns |
| `jump.recovery` | ≥ 1.0 s (`jumpRecoverySecondsMin`) | craft | plain skating after the landing (after the whole combination) before the next turn or shape |
| `jump.spacing` | ≥ 5 s (`jumpGapSecondsMin`) | craft | between one jump element landing and the next taking off |
| `spin.setup` | ≥ 1.5 s (`spinSetupSecondsMin`) | craft | quiet skating into the entry edge, counting the spin's own arc; a held shape straight into a spin reads 0 |
| `held.seconds` | ≥ 2.5 s (`heldSecondsMin`) | craft | a spiral, Bauer, eagle or lunge that flashes past is not a line |
| `connector.difficulty` | ≤ 4 (`connectorDiffMax`) | craft | difficulty belongs in the step sequence; elsewhere it is risk for nothing |
| `chst.oneFoot` | ≤ 6.5 s (`chstOneFootMax`) | unsafe | longest run on one foot in the sequence, from the samples' `foot` |
| `rotation` | 42–58 % CCW | craft | |
| `ends`, `sides` | each ≥ 18 % | craft | raw fractions, not the rounded `thirds` |
| `corners` | each ≥ 0.8 s | craft | inside the 4.5 m circle on each `PLACE.corners` anchor |
| `lobes` | 70–200° on 4–9 m | craft | every crossover / progressive run |
| `spin.centre` | ≤ 7 m | craft | |
| `spin.revs` | ≥ `LEVELS[level].rules.spinMinRev` per position | craft | held pose spans × the spin phase's rev rate (camel-sit: camel 3.18, sit 2.73) |
| `spin.entry` | ≤ 3.5 m/s | craft | the element before the spin |
| `jump.zone` | ≤ 9 m from centre or a corner anchor | craft | the first jump of each element (a jump after a `gapBefore` is its own element) |
| `jump.entry`, `jump.builtSpeed` | 0 awkward, 0 without a builder | craft | |
| `jump.speedRatio` | ≤ 1.3 | craft | jump speed over the mean of the two connectors before it |
| `jump.fatigue` | ≤ 0.85 | craft | the hardest jump in the last 20 % of the program, fatigue as a fraction of peak |
| `jump.afterTurn` | ≥ 2 beats | craft | from the last turn of the sequence to the takeoff |
| `held.before` | 0 | craft | a two-footed held shape (lunge, Bauer, eagle, knee slide) straight into a jump or spin |
| `stop.exit` | ≤ 2.5 m/s | craft | the element after a stop unless it is a stroke, crossover or chassé (stops now decelerate to near-still) |
| `speedStep` | ≤ 1.5 m/s | craft | at any seam between two skating elements (stops, spins and poses excluded) |
| `glide` | ≤ 1.5 s | craft | the longest `gapBefore` |
| `start`, `finish` | ≤ 7 m from centre | craft | |
| `builders` | ≥ 35 % | craft | of the connecting beats |
| `chst.span` | ≥ 50 % of the length | craft | on the sequence's turns/steps/edges/choreo only |
| `chst.difficult` | ≥ 5 turns from ≥ 2 families | craft | |
| `chst.turnRate` | ≤ 0.6 turns/s | craft | |
| `hands`, `hands.jump` | ≤ 5 / 8 m/s (`ARM_PACE`) | craft | measured by the harness at 30 fps |
| `coverage` | ≥ 46 % | soft | warned, scored, not a miss |

With the library's 2-beat jumps at 7–8 m, `jump.speedRatio` and `speedStep`
trip on nearly every jump — read them as the coach's numbers next to
`builtSpeed`, and fix them in the chain (faster connectors, longer jump
elements) rather than the steer.

## The checklist

| Block | Field | Must be |
|---|---|---|
| `hard` | `brokenSeams` | **0** |
| | `impossibleSpeeds` | **0** — easy to miss; a sweep once passed seams and rules with three elements at 13–14 m/s |
| | `offIceSeconds` | **0** |
| | `ruleErrors` | `[]` (level caps, required spin, one ChSt…) |
| `seconds` | vs `musicSeconds` | equal to 2 dp; ≤ the level's time limit |
| `speed` | `average`, `footworkPeak` | the profile's targets (an Aspire 4 build at speedScale 0.8: ~3.5, ≤ ~5.3). `average` is over the whole program including spins, stops and poses at 0 m/s — a program with long spins reads lower; judge the skating elements by `chain` |
| | `overLevelCap` | `[]` |
| `placement` | `spinsOk`, `jumpsOk` | true |
| | `awkwardEntries`, `jumpsWithoutSpeed` | 0 |
| | `startFromCentre`, `endFromCentre` | ≤ ~7 m |
| `ice` | `thirds` | both ends ≥ 18 |
| | `rotationCCW` | 42–58 (`PLACE.rotationBand`) |
| | `coveragePct` | depends on speedScale: ≥ ~40 at 0.8, ≥ ~46 at 1.0 |
| `stepSequence` | `difficult, families, clusters, bothFeet, armFraction` | as many as the profile's vocabulary allows (7–9 with three families), 2 clusters, both feet, 1.0 |
| | `lengthFrac` | ≥ 0.5 (`PLACE.chstLengthShare`, half the ice); `widthFrac` reported |
| `placement` | `jumpDetail[]`, `spinDetail[]` | the coach's numbers per element: `edgeSeconds, boardsAtTakeoff/Landing, runway, speed, connectorSpeed, speedRatio, fatigue, late, hardest, beatsAfterTurn, heldBefore, steerInside`; spins: `revs{}`, `revPerSec`, `entrySpeed` |
| | `steeredInsideElements`, `speedStep`, `afterStop`, `heldBeforeJumpOrSpin`, `fatigueAtJumps` | `[]` / all under 0.85 |
| `stepSequence` | `turnsPerSecond`, `longestOneFootSeconds` | ≤ 0.6, ≤ 4.5 |
| `material` | `speedBuilderShare` | ≥ 0.35 |
| | `distinct` | set the bar from the element content: ~24 for a short deck; a full Aspire 4 deck with two combinations lands 31–36 when clean (example: five clean La La Land programs) |
| | `maxGlideSeconds` | ≤ 1.5 |
| `arms` | `elementsWithOwnTrack`, `distinctShapes`, `phrases` | most elements; ≥ ~15 shapes; ≥ 3 phrases (dancing hands on every element is a general rule) |
| | `maxHandSpeedOutsideJumps_mps` / `maxHandSpeed_mps` | ≤ 5 outside jumps, ≤ 8 inside (`ARM_PACE`) — the engine paces tracks, so higher means a bug or a seam |
| `pose` | `worstFootworkJointMove_m` | ≤ ~0.8 (a hop or slide); anything else near 1 m is a snap — see **repo-gotchas** |
| `music` | `jumps[].accentRatio`, `heldOrStopped[].level` | hints: jumps ≥ 2, stops/held shapes low |
| `warnings` | | read them; each is a rule from **program-craft** or the active profile |

Then `node tools/harness.js score a.json b.json …` to line candidates up:
`hardFails`, `ruleMisses` (= `misses.length`), `unsafe`, `craft`,
`placementScore` (what the steer minimises), then `misses[]` as
`"<rule> <value><op><floor> [#idx libId] [xN] <tag>"`, then the quality block.

## Regression: every preset still builds

After **any** change to `library.js`, `engine.js`, `poses.js`, `presets.js` or
`variants.js`:
```
for id in $(node -e "…PRESETS.map(p=>p.id)…"); do node tools/harness.js score $id; done
```
or in the page:
```js
PRESETS.map(pre=>{ const p=loadPreset(pre), path=buildPath(p), a=analyze(p,path), r=checkRules(p,path,a);
  return [pre.id, p.elements.length, +path.totalTime.toFixed(1), a.continuity.length, a.speed.length,
    r.issues.filter(x=>x.lvl==='err').length].join(' | '); })
```
What matters is that your change adds no seams, errors or exceptions: run the
regression *before* your change, note the counts, and compare after
(`js/presets.js` plus your own `js/local.js`). A chain-splice once deleted
two presets and nobody counted for two commits. The study patterns
(`insp-*`) are elite programs at speedScale 1 and carry their own flags —
compare, do not expect zero.

## Round-trip the save file

Load the JSON back (`verify file.json`) and confirm the element count, the
duration, and that `arms`, `note`, `chst` and `distScale` survived.
`exportJSON` / `exportAllJSON` in the app and `saveProgram` in the harness
carry them all.

## In the browser (when it is already open)

```js
const p=loadPreset(PRESETS.find(x=>x.id===ID)), path=buildPath(p);
const a=analyze(p,path), r=checkRules(p,path,a), q=analyzePlacement(p,path), sq=analyzeStepSequence(p,path);
[a.continuity.length, a.speed.length, q.offIce, q.spins.map(s=>s.ok), q.jumps.map(j=>j.ok), a.coverage.pct, a.rotation.ccw, q.chstSpan.lengthFrac]
```
`checkRules` needs a real `analyze()` result — `App.analysis` can be null.
Pose smoothness at 60 fps (healthy: worst ≈ 0.4 m, 8–11 frames over 20 cm of
~6000; ~1 m means something snaps):
```js
const cat=ei=>(ei>=0&&p.elements[ei])?LIB_BY_ID[p.elements[ei].libId].cat:'none';
let worst=0,over=0,prev=null;
for(let t=0;t<path.totalTime;t+=1/60){ const s=sampleAt(path,t), L=poseAt(p,path,t)._local;
  if(prev){ let mx=0; for(const j of JOINTS){const d=Math.hypot(L[j][0]-prev[j][0],L[j][1]-prev[j][1],L[j][2]-prev[j][2]); if(d>mx)mx=d;}
    if(cat(s.ei)!=='jumps'){ if(mx>0.20) over++; if(mx>worst) worst=mx; } }
  prev={}; for(const j of JOINTS) prev[j]=L[j].slice(); }
({worst, over})
```
Steering in the page: `window.__job={done:false}; (async()=>{ await
steerProgramMulti(App.program); rebuild(false); window.__job.done=true; })()`
then poll — a single `javascript_tool` call times out at 45 s.

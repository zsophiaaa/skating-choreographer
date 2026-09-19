# Round 1 — results

Five fresh agents, skills at commit 881a518 (+ three mid-round fixes, see
"what went wrong with the round itself"), brief `experiments/BRIEF.md`, one
creative angle each. All five delivered a program with **0 hard fails and 0
rule misses**. Scored with `node tools/harness.js score` (harness at the end
of the round, so the music column is on the program clock for all six):

| version | angle | cover | rot | ends | diff turns | jumps on hit | distinct | xover | arm shapes | phrases | avg m/s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **c3** (base) | — | 43 | 55 | 22/58/20 | 7 | 2 | 36 | .24 | 29 | 7 | 3.51 |
| v1 | melody / ballet | 46 | 52 | 21/59/21 | 7 | 3 | 36 | .23 | 29 | 7 | 3.47 |
| v2 | jazz / show | **48** | 48 | **25/50/25** | 7 | **4** | 35 | .34 | 31 | **9** | 3.61 |
| v3 | memorable | 43 | 51 | 26/49/25 | 6 | 4 | **31** | .32 | 27 | 6 | 3.46 |
| v4 | whole ice | 44 | 50 | 23/53/24 | 7 | 3 | 34 | **.38** | **33** | 9 | 3.56 |
| v5 | loud vs quiet | 40 | 52 | 18/61/21 | 7 | 4 | 36 | .37 | 29 | 8 | 3.53 |

Every version keeps the skater's skeleton (spiral opening, stop at 3&1, flips
5&2 / 7&7, Salchow+loop ~10&8, Bauer 14&1, camel→sit 15&2, stop 18&5–6 + hop,
knee slide, Lutz+loop 21&2, ChSt, Lutz 25&1, lunge, scratch spin) — the brief
and `skater-rules` pin it, which is the point. They differ in the front
(v1: right-foot opening, attitude glide at 0:10; v2: two strokes; v3: mirrored
opening and a different sequence; v4: full crossover recipe carrying flip 2 to
the far corner) and in the arms (all five wrote a track and a hand note on
every element; v2 and v4 used nine phrases).

**Best by the numbers: v2** (both ends 25%, four jumps on hits, nine phrases,
0.34 crossovers) — with v4 close (all four circles, 0.38 crossovers, 33 arm
shapes). v3 is the most different and the most memorable (31 distinct ids, a
true mirrored sequence at the cost of one difficult turn).

## What the agents found missing (deduplicated, with the fix)

| # | Finding (how many of 5 hit it) | Fix |
|---|---|---|
| 1 | **Two clocks.** Audio time = program time + `offset` (0.453 s ≈ one beat). The envelope and the accent check were on the audio clock; the skater's counts are program time. (4/5) | Harness: `envelope` prints program time with counts; `verify.music` indexes at `t + offset`. Skills: one sentence in program-craft §6, music-mapping, harness. |
| 2 | **The steer is not one deterministic step.** Same chain, four starts: sequence span 0.29–0.48, an end 13–27%. `steerProgramMulti` early-exited after the first start that met jumps/spins/rotation, ignoring the ends and the half-ice span. (4/5) | Engine: early exit now also needs both ends ≥ 18% and ChSt ≥ 0.45. Skills: "run several starts, score each"; `--starts keep` (start from the file's aims) and `--frozen a-b` added to the harness. |
| 3 | **`program.start.heading` is the lever for the far end** and nobody said it could be changed. (3/5) | program-craft §7 + build-program §4: if an end is under 18% after the steer, turn the start toward it and re-steer. |
| 4 | **Minimum beats per element at speedScale 0.8** not written down; the binding constraint is the category cap, not "dist ≥ 12 → 4 beats". (3/5) | `lib` prints a `minB` column at the program's speedScale. Table in program-craft §5. |
| 5 | **Takeoff is ~0.3 s into a 2-beat jump element**; "flip on 5&2" means the element starts on 5&2. (2/5) | music-mapping. |
| 6 | **`anchor` only adds glide**; to move something earlier, shorten what is in front. The tail after the last Lutz is a fixed 14 counts. (2/5) | build-program §3. |
| 7 | **Phrases start on a fixed shape** (`pump` on `fists_up`, `rise_fall` on `overhead`); a keyframe 0.08 before one snaps. (1/5) | arm-choreography: start shape per phrase; leave ≥ 0.1 of the element to ease in. |
| 8 | **`distinct ≤ 24` is unreachable** with this element content; five programs landed at 31–36. (3/5) | verify-program: ≤ ~32 with this content; 24 is for a shorter deck. |
| 9 | **Which foot the skater spirals on / whether field moves may be mirrored / never mirror a jump.** (2/5) | skater-rules: not stated by the skater — left foot (as in C) until they say; jumps are never mirrored (a mirrored flip is a clockwise flip). |
| 10 | **The stop count**: "~18&5" from the skater, C3 lands 18&6. (1/5) | skater-rules: the stop *starts* on 18&5 or 18&6; both accepted. |
| 11 | **`chst` elements must be contiguous** for one sequence; a lead-in with a gap makes two runs. (1/5) | step-sequence. |
| 12 | **The shared scratchpad** — parallel agents overwrote each other's drafts. (3/5) | BRIEF: keep every intermediate in your own folder. |
| 13 | **The tree changed mid-round** (engine + harness fixes while agents ran). (3/5) | README protocol: freeze the tree for the round; fixes go in between rounds. |
| 14 | `jumpsOnAccent` threshold 1.15 was noise; the ratio is now a peak search (≥ 2). | Harness. |
| 15 | Rotation depends on placement (board avoidance bends the path), not only the chain. (1/5) | program-craft §2. |

## Verdict on the skills

The skills were sufficient for a fresh agent to produce a legal, on-music,
well-placed program with dancing hands in one session — the failure modes were
all in *how much fighting the steer took* (items 2, 3, 6) and in unstated
conventions (1, 4, 5, 9, 10). None of the five produced anything the skater
has said they do not want. Round 2 should test whether the fixes make the
steer a one-shot step and whether a brief with *less* of the skeleton pinned
produces something new rather than five C3 variants.

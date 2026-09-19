# Round 2 — results

Five fresh agents, skills at 182883c, brief `round-2/BRIEF.md`: design your own
layout (no copying c3 or round 1) and count your steers. All five delivered
**0 hard fails, 0 rule misses** by the round-2 harness. The score below is the
round-3 harness, which also counts rotation outside 42–58 as a miss:

| version | angle | cover | rot | ends | jumps on hit | distinct | xover | arm shapes | phrases | steers |
|---|---|---|---|---|---|---|---|---|---|---|
| c3 (base) | — | 43 | 55 | 22/58/20 | 2 | 36 | .24 | 29 | 7 | — |
| v1 | melody / ballet | 45 | 52 | 21/50/29 | 4 | 35 | .29 | 32 | 9 | **4** |
| v2 | jazz / show | 42 | **60** | 19/44/37 | 4 | 31 | .35 | 31 | 9 | 19 |
| v3 | memorable | 39 | 53 | 25/56/19 | **5** | **31** | .37 | 26 | 6 | 16 |
| v4 | whole ice | 44 | 53 | 27/49/24 | 4 | 33 | .33 | 30 | 8 | 13 |
| v5 | loud vs quiet | 44 | 48 | **40/41/19** | **5** | 34 | .41 | **35** | 9 | 23 + 8 |

What is actually new this round (none of these are C3 variants):

- **v1 "Adagio"** — start facing the left end, spiral straight down the rink,
  attitude glide between the flips, Bauer feeding the camel directly, a
  second swing roll launched on the 1:04 accent into the 18&5 stop, zero glide.
- **v2** — right-foot spiral out of a swing roll, one entry recipe for every
  front jump with three flavours, boxing on all four mohawks, a new sequence.
- **v3** — 31 distinct pieces, a twizzle–counter–twizzle cluster mirrored on
  each foot, all five jumps on hits.
- **v4** — the full flip recipe carries the program the whole length of the ice
  from flip 1 in the left corner to flip 2 top-right; an 8-count knee slide
  filling the silence; the sequence runs 35 m down the ice (0.59).
- **v5** — the boldest: one flip in the front, **flip 2 fired out of the spin
  exit at 18&1 as the last loud thing before the stop cuts the music**, all
  five jumps on hits, the sequence 0.62 of the length, 40% of the program in
  the left end.

**Best by the numbers: v5**, then v4 and v1. v1 is the one that proved the
skills' claim: four steers, and the lever that decided it was the start.

## Did the round-1 fixes work?

Partly. Nobody hit the clock problem, the min-beats table or the anchor
semantics again. But the steer took 4–31 runs, and three findings from round
1 were still true because the fix was wrong or incomplete:

| # | Finding (how many of 5) | Fix |
|---|---|---|
| 1 | **`start.heading` is degrees; program-craft §7 said radians** ("~3.0 faces −x"). Two agents turned the start 3° and concluded the lever was dead. (4/5) | Skill corrected: degrees, 0 faces +x, 180 faces −x. |
| 2 | **The half-ice span is a placement problem the steer had no term for.** `placementScore` (what multi-start keeps) ignored it; the jump before the sequence stops being placed the moment it is anywhere in a zone; the span only clears 0.45 when that jump lands deep in a corner pointing down the rink. (5/5) | Engine: `chstSpan` in `placementScore`; a **stretch stage** that joint-searches the approach to the jump before the sequence for the span; `PLACE.chstLengthShare`. Skill: says why, and what to check (`placement.jumps[]` for that jump). |
| 3 | **Rotation thresholds disagreed** (verify 45–58, engine ±12, score not counted) and rotation is mostly a chain property — mirroring one crossover run moved it 10 points, eight polish steers moved it 1. (3/5) | `PLACE.rotationBand = [42, 58]` used by the steer, the score and the panel; skill: fix rotation in the chain (the clockwise turn-round recipe), then steer. |
| 4 | **`--frozen` was not honoured** by the end-spreading stage (it released everything after the previous anchor). (1/5, verified) | Engine: caller-frozen indices are never released by any stage. |
| 5 | **The natural curl of each element is unwritten** — a bracket/three/mohawk turns 65° on its own, crossovers 147–163°, counters and twizzles 0° — and it decides both the sequence span and the rotation. (2/5) | `lib` prints a `turn` column; table in program-craft §5 and step-sequence. |
| 6 | Start variants are cheap to run in parallel and should come *before* the first steer, not as a repair. (2/5) | build-program §4. |
| 7 | Freezing the **front** works; freezing a tail rotates it (already stated in program-craft, missing from build-program/harness). `--starts keep` after changing the heading reuses aims tuned for the old heading. (3/5) | harness + build-program. |
| 8 | Sequence travel budget: Σ dist × speedScale ≥ ~55 m or it cannot span half the ice whatever the steer does. (1/5) | step-sequence. |
| 9 | "Keep the end part after the hop" vs "the sequence is yours". (3/5) | skater-rules: the tail is what the skater liked; the sequence may be redesigned only when the brief says so, and say that you did. |
| 10 | `envelope --bucket 0.5` for anchoring; the accent ratio is per combination's first jump; `radiusScale` exists; `choreo-presentation` is the "light move out of the stop". (1/5 each) | music-mapping / harness / arm-choreography one-liners. |

## Verdict

Design freedom worked: five genuinely different layouts, all legal, all on
the music, two of them (v4, v5) better than the base by every measured
number. The cost was steer effort, and the causes were all in the pipeline —
now fixed in the engine rather than documented around. Round 3 should re-run
the same brief and measure only one thing: **how many steers to 0 misses**.

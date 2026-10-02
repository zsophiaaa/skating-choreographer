---
name: step-sequence
description: Build a step sequence (ChSt) that audits well — as many ISU difficult turns as the skater's vocabulary allows (only the turn families in their profile), two clusters of three on different feet, both rotational directions, arm tracks on every turn, compact elements that stay under the speed limit, a count budget fixed by the anchors either side, a visible half-ice footprint, and an exit that lands directly on the next jump's takeoff edge. Use whenever building, improving, or judging a step sequence in this repo, or when the user says the sequence is boring, choppy, or "like a black box".
---

# Building a step sequence

Never use `seq-circular`, `seq-serpentine`, `seq-straightline` or the other
`steps`-category library elements for a real program. They are canned blocks —
five generic arcs and a few pose keyframes with no actual turns in them. A
sequence built from one is the most detailed-looking part of the program and
the one part the skater cannot read or practise. Build the sequence from
**individual named turns** and mark them `chst: true` so the rule check still
counts exactly one sequence.

## What counts (and what does not)

Only six families are ISU **difficult turns**: **twizzle, bracket, loop turn,
counter, rocker, choctaw**. `turnFamily(libId)` in `js/engine.js` tells you.

**Three turns and mohawks are NOT difficult turns.** They count for nothing.
Use them deliberately — as the cheap way to change feet, and as the separator
between clusters (below) — but never mistake a sequence full of them for a hard
one. *Worked example from one 100-second free skate: the first sequence was eleven turns
and audited at 5 difficult = notional level 1, because the three-turns were
padding.*

Targets: **as many difficult turns as the skater's vocabulary allows**,
**two clusters of 3+ difficult turns on different feet**, **both rotational
directions**, **arm track on every turn**. A ChSt at Aspire levels carries no
level; these are quality targets, and say so.

**Check the skater's profile (`skater-profile`) first** for which families they
actually know, and build only from those. Never reach for a family they do
not know to get the count up; the honest ceiling with three families is
about 7–9 difficult turns, with all six it is higher. *For the current
profile: twizzles, brackets and counters — not choctaws, loop turns or (so
far) rockers. Three families, 7–9 difficult turns.*

## The structure that works

```
CLUSTER A  — 3–4 difficult turns, LEFT foot, back to back
SEPARATOR  — a mohawk (not difficult) that changes to the RIGHT foot, plus a three if the mirror needs a different edge
CLUSTER B  — the same turns mirrored on the RIGHT foot
TAIL       — a bracket, then a cross roll (or a mirrored mohawk) that lands on the next jump's edge
```

*Worked example from one 100-second free skate (`climax` variant A in js/variants.js):*
counter, bracket, twizzle · mohawk, three · counter, bracket, twizzle ·
bracket, cross roll — "three on the left, the same three on the right". 7
difficult turns and the skater can say it back.

The separator is the trick: `analyzeStepSequence()` counts a run of consecutive
difficult turns as one cluster, so two clusters need a non-difficult element
between them. Putting the foot change *there* does two jobs at once.

Mirroring cluster B off cluster A (`mirror: true` on the same turn ids) gives
both rotational directions for free and reads as control.

## Difficulty lives here — and nowhere else

The sequence is the one place in the program where hard turns pay. Outside it,
connecting material stays at or below the skater's comfortable difficulty
(`connector.difficulty`, **program-craft** §2.11). And inside it, a sequence
built from turns the skater *owns* — clean, with room between them — scores
and looks better than one built from turns they can only just do: a scrappy
counter is a deduction, a clean bracket is not. Take the honest ceiling from
their profile and spend the rest of the budget on flow: a plain lead-in roll
so the combination before it has somewhere to land, an edge between clusters,
and a travelling roll on the way out that doubles as the next jump's run-in.

## It has to cover half the ice — visibly

At Aspire levels the ChSt is "one ½ of the ice" — end boards to the centre
line — and it must be *obvious* where it is (a general rule from
**program-craft**, not one skater's taste). Eight compact turns cap out
around 35% of the length because turns double back on themselves, so **mark
the lead-in steps (the three, the step) `chst: true` as part of the sequence**
and finish it with a travelling element (a power pull or cross roll) into the
jump; that reaches ~50% of the length by ~60% of the width. The `chst`
elements must be **contiguous** — a flagged lead-in with an unflagged element
after it makes two sequences and fails the rule check (and when a jump
combination directly precedes the sequence there is no lead-in to flag).

**Budget the counts first.** The sequence's length is fixed by the anchors
either side of it (the landing of the jump before, the takeoff of the jump
after); count that window from the profile's counts table before choosing a
single turn. *For the current profile it is **27 counts** (the loop lands
21&6, the Lutz is on 25&1): seven 3-count turns + a 2-count twizzle + a
4-count closer is exactly 27.* `twizzle-2` is a *forward* inside twizzle
(LFI→LFI), `twizzle-3` back inside (LBI→LBI) — they are not interchangeable
in a chain. Closers that land on the Lutz edge (LBO): `power-pull-b` (a
builder — the safe choice), `crossroll-b.R`, `mohawk-fo.R`, or a 4-count
`edge-lbo` (already on the edge, but not a builder: then the element before
it must be one, or `builtSpeed` fails).

**Budget the travel and the curl on paper.** Σ(dist × speedScale) over the
flagged elements must be ≥ ~55 m or no steer can stretch it across 30 m of
rink (a twizzle-heavy sequence at 52 m spanned 0.37–0.64 purely on luck).
And add up each element's natural `turn` (`node tools/harness.js lib
--speedScale X --bpm Y`; at speedScale 0.8 a three, bracket or mohawk is
±65° on its own, a counter or twizzle 0°). A sequence whose running curl hooks
past ~90° doubles back on itself; keep the sum within about ±65° by
alternating mirrored and unmirrored turns. The span is a steer outcome as
much as a chain property: it is largest when the jump before the sequence
lands in a far corner pointing down the rink, so check
`stepSequence.lengthFrac` after every steer and use the levers in
**program-craft** §7 if it is under 0.45. The steering cost pulls the
sequence across ≥ half the length (`chstPen`); `analyzePlacement().chstSpan`
measures it; the harness reports `stepSequence.lengthFrac` and `widthFrac`.
It is drawn with a halo on the ice, a dashed box and label on the diagram, a
STEP SEQUENCE badge in the HUD, and the analysis panel always prints the
half-ice line ("Half-ice check: …").

## Keep it compact

Sequence turns run at **3 beats** each for a learning skater (2 at elite
speed). Check every element's `dist` — speed is
`dist × speedScale / (beats × 60/bpm)` and the analyser flags anything absurd,
but 8–9 m/s is already fast for footwork. The traps:

- `edge-change-f/b` travel **12–13 m** — open-ice elements, not sequence
  material. The first draft put one in at 2 beats: 13.7 m/s.
- Anything with `dist ≥ 12` needs ≥ 4 beats. Print the table before choosing
  (`node tools/harness.js lib turns` gives `minB` directly; in the page):

```js
['bracket-fo','counter-bo','twizzle-3','choctaw-fo','edge-change-f'].map(id=>{const e=LIB_BY_ID[id],spb=60/App.program.bpm,ss=App.program.speedScale||1;
  return `${id} dist=${e.dist} 2b=${(e.dist*ss/(2*spb)).toFixed(1)} 4b=${(e.dist*ss/(4*spb)).toFixed(1)} m/s`}).join('\n')
```

If there is no compact element for an edge change you need, **reroute** —
e.g. go `LFO → LBI` through a bracket instead of `LFO → LFI` through a change
of edge.

## End on the next jump's edge

Finish the sequence so its last exit *is* the takeoff edge of the jump that
follows, with no glide and no connector. For a Lutz (LBO): `crossroll-b`
mirrored (`RBO→LBO`) or `mohawk-fo` mirrored (`RFO→LBO`); for a flip or
Salchow (LBI) a three or a bracket that exits LBI. That is a difficult entry
and "recognisable steps immediately preceding" in one move
(`docs/CHOREOGRAPHY.md` §3). It also saves the beats a separate rocker would
have cost.

## Audit it

```js
analyzeStepSequence(App.program, App.path)
// → {difficult, families, level, clusters, bothFeet, armFraction, ...}
```
Aim for `clusters === 2`, `bothFeet`, `armFraction === 1`, and as many
`difficult` as the vocabulary allows (7–9 with three families, e.g. the
current profile's twizzle/bracket/counter). The rules panel shows the same
line.

## The pieces available

Back rockers, back counters, a back loop turn and an outside-inside choctaw
are in the library (`rocker-bo/bi`, `counter-bo/bi`, `loop-turn-b`,
`choctaw-fo`), plus brackets and twizzles. Which of them a given skater may
use is in their profile (`skater-profile`); *for the current profile only
the counters, brackets and twizzles are usable.*

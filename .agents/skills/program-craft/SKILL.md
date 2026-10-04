---
name: program-craft
description: The general rules for a figure skating program that reads as choreography rather than a list of elements — placement on the ice (spins near centre, jumps in a corner or at centre, both ends used, start and finish near centre), connecting material and speed builders, comfortable jump entries, rotation balance, stops and held shapes on the quiet music, one of each highlight, arms that keep moving, memorability, realistic speed for the level, talking in counts, and how the steering enforces it. Skater-independent and music-independent; the worked examples are labelled. Read before building or judging any program, then read the skater's own profile (skater-profile) for what overrides it.
---

# Program craft

These hold for any skater and any music. The skater's profile (**skater-profile**)
says which of them they have their own opinion about, what they can and cannot
do, and how fast they skate; it wins where it conflicts. Most of the numbers
below are the ones the code uses — `PLACE` in `js/engine.js` — and every one of
them is measured by `node tools/harness.js verify` (see **harness**).

Where a number depends on the skater's `speedScale` or the track's bpm, the
table says what it was computed at. The current profile
(the one named in `.agents/profiles/ACTIVE`; the worked examples below are from an Aspire 4 build at speedScale 0.8, 126 bpm); regenerate
any such table for another skater or track with
`node tools/harness.js lib --speedScale X --bpm Y`. Passages marked
*"Worked example from one 100-second free skate"* are that one program, not a rule.

## 1. Placement on the ice

1. **The whole routine stays on the ice.** Hard. `offIce` must be 0.
2. **Spins near centre**: ≤ `PLACE.spinMaxFromCentre` (7 m). A spin at the boards
   looks like an accident.
3. **Jumps at centre or in one of the four corners** — the corner is where the
   crossovers before the jump build speed. Within `PLACE.jumpZoneRadius` (9 m) of
   centre or of a corner anchor (`PLACE.corners` ≈ the faceoff circles). Mid-ice,
   mid-boards jumps are wrong. A jump that feeds a spin within a few elements
   has to be at **centre**, because the skating between a corner jump and a spin
   cannot get back to the middle.
4. **Use both ends of the rink, and both sides.** Each end third of the length
   should hold ≥ `PLACE.endShare` (18%) of the samples, and neither side may
   be left empty ("the left side is not covered" is a complaint any skater
   will make). This is the rule greedy steering misses on its own — covering
   the far end takes several elements pointing the same way — so the steer
   has a dedicated stage for it.
5. **Start and finish near centre** (≤ ~7 m). The end pose is on the last chord.
6. Coverage of ~40–45% of the rink's cells is normal for a slower skater; ~50%
   for a fast one. Do not chase coverage at the cost of the rules above.

## 2. Room to skate — the elements are the program

The jumps, the spins and the sequence are what the skater is judged on and what
they will remember being proud of. Everything else exists to deliver them with
speed and to get them out of them safely. A program that is *interesting*
between the elements and cramped at them is the wrong way round.

6. **A jump is approached on plain skating, not out of a corridor of turns.**
   At least `PLACE.jumpRunInSecondsMin` (1.6 s) of edges, strokes, crossovers
   or rolls immediately in front of the takeoff turn — `jump.runIn` in the
   report. One turn (the three, the mohawk, the step onto the edge) may sit
   between that run and the jump; a *second* turn there is what makes a
   take-off feel rushed. Detailed footwork before a jump costs speed and adds
   nothing: the judge sees the jump, not the fuss before it.
7. **Every landing gets room to finish.** At least
   `PLACE.jumpRecoverySecondsMin` (1.0 s) of plain skating after the landing
   (after the whole combination) before the next turn, held shape or spin —
   `jump.recovery`. A landing that runs straight into a turn is a check-out
   the skater cannot make, and it is where a clean jump still looks bad.
8. **Jumps are spread through the program.** At least
   `PLACE.jumpGapSecondsMin` (5 s) between one jump element landing and the
   next taking off (`jump.spacing`; combinations are one element). Two jumps
   in the same phrase read as a jumping pass, not choreography, and the second
   one gets no preparation.
9. **A spin needs a set-up, not just an entry.** At least
   `PLACE.spinSetupSecondsMin` (1.5 s) of quiet skating into the entry edge
   (`spin.setup`, which counts the spin's own entry arc), at
   ≤ `PLACE.spinEntrySpeedMax` (3.5 m/s). **Never a held shape straight into a
   spin** — a Bauer, spiral or lunge has to be abandoned to get into the
   entry, and the spin travels. Put one plain edge between them; it costs four
   beats and it is the difference between a centred spin and a scraped one.
10. **A held shape is held long enough to read**: ≥ `PLACE.heldSecondsMin`
    (2.5 s) for a spiral, Bauer, eagle or lunge (`held.seconds`). A 1.9 s
    spiral is a position the skater passed through, not a line.
11. **Difficulty belongs in the step sequence.** Outside it, connecting
    material stays at or below `PLACE.connectorDiffMax` (library difficulty 4)
    — `connector.difficulty`. A hard turn used as glue is risk for nothing.

12. **Power comes from pushing, and a jump is as big as the speed it leaves
    with.** At least `PLACE.crossoverSecondsMin` (1.5 s) of *speed-builder*
    material — crossovers, strokes, swing rolls, power pulls — in the approach
    to every jump and every spin (`jump.power`, `spin.power`). Plain edges
    carry speed; only pushing makes it. The engine caps a jump's travel at
    `PLACE.jumpSpeedRatioMax` × the speed it was approached at, so the air
    distance (`jump.size`, ≥ `PLACE.jumpAirMetresMin`) is a direct readout of
    the run-in: in one build, giving the Lutz 3.3 s of back crossovers instead
    of a cross roll took it from 4.9 to 6.6 m/s at the takeoff and from 1.5 m
    to 2.1 m of air. **A spin wants the same**: crossovers into the entry edge,
    slowed over the last second or two (`spin.entry`), not a held shape.

12b. **A jump cannot leave faster than the edge it rides in on.** The speed the
    engine gives a takeoff is the speed of the element immediately before it —
    not the fastest thing in the approach. So never buy a jump's *placement* by
    shortening its takeoff edge: a `distScale` on the last connector, or a
    2-beat edge where 3 was needed, throws away every crossover in front of it.
    In one build a Lutz had 3.8 s of back crossovers and then a takeoff edge
    shortened to half its length to pull the landing toward centre; the honest
    takeoff was 4.4 m/s and 1.4 m of air — the smallest jump in the program, on
    the loudest bar of the music. Making the *takeoff edge itself* the long,
    fast one (a full cross roll ridden for three counts, ~5 m/s) gave 6.6 m/s
    and 2.1 m with no extra beats. Re-aim the approach to move a jump; never
    shrink the last edge. The edge also has to be long enough to be seen
    (`jump.edge`), which is the same fix pointing the same way.

Those numbers are per-level: a level's `rules` block in `js/engine.js`
overrides any of them (`jumpRunInSecondsMin`, `jumpRecoverySecondsMin`,
`jumpGapSecondsMin`, `spinSetupSecondsMin`, `heldSecondsMin`,
`connectorDiffMax`), so a beginner can be given more room, not less.

## 2b. The skater's own outline

A skater often knows the shape they want on the ice before they know the
steps: *"go left first, stop on the music change, then the preparation goes
right, and the spiral runs on the diagonal."* That is a real constraint and
it is worth more than any pattern an optimiser invents, because it is the
one they will picture at the rink.

Write it into the chain: any element may carry **`route`** in the save
format — `'left'` (−x), `'right'` (+x), `'far'` (+y), `'near'` (−y, the
judges' side), `'diagonal'` (any 45°), or a heading in degrees. The steer
carries a penalty for an element whose net travel is more than
`PLACE.routeToleranceDeg` (25°) off what was asked, and `route.follow`
reports the worst offender, so the outline survives steering instead of
being argued with. Route the *phrases* (the opening run, the preparation,
the spiral), not every element — over-constrain it and the jumps cannot
reach their corners.

Give the skater the result in their own words ("the opening runs to the left
end, the stop is at x = −15, the preparation comes back right"), and say
which way the rink's left is on the diagram, because "left" depends on who
is facing where.

## 3. Connecting material

7. **Speed builders ≥ 35% of the connecting beats** (`builderShare`). What
   counts is `PLACE.speedBuilders`: `xover-f/b`, `stroke-f/b`,
   `power-pull-f/b`, `progressive-f`, `swing-roll-f/b`, `crossroll-f/b`,
   `run-of-three`. Mohawks, threes, edges, chassés and choreo moves are not
   builders — so `builtSpeed` (a builder in the two elements before a jump)
   fails if an expressive element sits between the last builder and the
   turn into the jump. Put the reach or the chassé *before* the last builder.
   Which builders the skater wants, and how many, is in their profile.
   **Crossovers are skated on an edge, on a curve** — a crossover run drawn
   as a straight line is not a crossover (`verify` reports the crossover
   lobes). Seven back-to-back crossover runs read as filler; none reads as a
   skater with no speed. *For the current profile: crossovers, not
   progressives; "not too many strokes"; crossovers at ~25–45% of the
   connecting beats has been accepted.*
8. **Entries are standard. Use the real ones.** Every jump and spin has a
   conventional approach that skaters are taught and judges expect to see; a
   clever substitute is a liability on a jump and reads as a mistake on a spin.
   For a counter-clockwise skater (mirror all of this for a clockwise one):

   | element | the standard approach | in library terms |
   |---|---|---|
   | **Lutz** | back crossovers, then a long back-OUTSIDE edge ridden in a wide arc, reaching back for the pick | `xover-b.R` (clockwise) → `edge-lbo` or `crossroll-b.R` → jump |
   | **Flip** | back crossovers, then a turn onto the back INSIDE edge — an inside mohawk or a forward three | `xover-b` → `step-bf` → `edge-change-f.R` → `mohawk-fi.R` → jump |
   | **Salchow** | back crossovers, step forward, forward outside THREE-TURN onto the back inside edge, check, swing the free leg through | `xover-b` → `step-bf` → `three-fo` → jump |
   | **Loop / toe loop** | straight off the back outside landing edge of the jump before it, or off back crossovers | second jump of a combination, or `xover-b` → `step-bo` |
   | **Camel / sit / combination spin** | back crossovers as a WIND-UP, turning the *opposite* way to the spin, then step forward onto the forward outside entry edge | `xover-b.R` → `step-bo` → `step-bf` → spin |

   Two things in that table do most of the work. **`step-bf` — stepping forward
   out of a back crossover run onto the other foot's forward outside edge — is
   the single most common transition in skating**, and a chain that lacks it
   can only leave crossovers through a turn, which is not what is skated. And
   **the wind-up turns the other way**: back crossovers before a counter-clockwise
   spin go clockwise, because what loads the spin is the body being wound
   against it. The same is true of the Lutz, whose crossovers curve away from
   the direction the jump rotates. Getting that backwards gives the skater
   nothing to unwind.

   Everything else about the approach follows rules 6–12: no d5 turn right
   before a takeoff, a speed builder in the two elements before it, and the
   room those rules ask for (`awkward`, `builtSpeed` in `analyzePlacement`).
   **Use the same recipe each time** — one entry learned and used twice is
   worth more than two clever ones, and it is what makes a program learnable.

8b. **Where on the ice each element happens, and how to ask for it.** The
   conventions are not arbitrary and skaters know them:
   - **Lutzes go in corners, on a diagonal** — the long edge runs into the
     corner, and putting the two of them in opposite corners uses the ice and
     keeps them from looking like the same jump twice.
   - **Flip and Salchow** take a corner or the centre; what they need is the
     straight run the entry turn sits on.
   - **Spins happen near the centre** (`spin.centre`), where a panel can see
     the centring.
   - **A step sequence starts at one end and travels** — the ISU patterns are
     circular, midline and diagonal, and all three begin at an end or a corner
     rather than in the middle. Starting it mid-ice wastes half its length.
   Say so with **`zone`** on the element: `'ne' | 'nw' | 'se' | 'sw'` for the
   corners as the skater sees them on a diagram from above (+x right, +y top),
   `'e' | 'w'` for the ends, `'n' | 's'` for the sides, `'centre'`. The steer
   pulls the element toward that anchor and `zone.place` reports how far it
   landed from it (`PLACE.zoneToleranceM`). Use it for the handful of elements
   whose position the skater actually cares about — it is a constraint, and
   every one of them costs the steer somewhere else.

8c. **Play to what the skater owns.** The profile outranks this whole section.
   Prefer the thing they do well held longer over the thing they do barely:
   a forward outside spiral held four seconds beats a forward inside spiral
   held two; the jump entry they own beats a clever one. If the profile does
   not say, ask, and write the answer down. Nothing in a program is worth less
   than a difficult thing done badly on the way to a jump.

8d. **A crossover run curls the way the feet make it curl.** Right-over-left
   goes one way and left-over-right the other; a skater cannot do the opposite
   on the same feet. But a crossover run's lobe is shallow enough that *aiming*
   can bend it the other way round, and then the chain still reads `.R` while
   the skater on the ice circles the wrong way. It is invisible in the save
   file and obvious the moment anyone watches. `lobes` reports the measured
   turn with its sign and flags `reversed` against the element's own edges
   (`curveSignOf` on its arc phases); the steer pays 300 for one. **Check the
   sign, not just the magnitude** — especially on a wind-up, where the whole
   point is which way it goes. Two presets in this repo shipped with a reversed
   run for months before the check existed, and a skater spotted one by eye
   before the harness could.

9. **Rotation balance 42–58% CCW** (`PLACE.rotationBand`). Forward crossovers on LFO and backward on
   RBO both turn left; mirror half the runs (`mirror: true`) so the deck does
   not spin one way. Rotation also depends on placement — `buildPath` bends
   anything near the boards back toward centre and that counts — so re-check
   it after every steer, not only from the chain. **Never mirror a jump** (a
   mirrored flip is a clockwise flip); field moves and the opening pose may be
   mirrored to put a shape on the other foot.
10. **No dead ice.** Glides (`gapBefore`) under ~1.5 s. Anchor elements to the
    music by shortening connectors, not by adding glide.

## 4. Music

11. **Jumps on hits, held shapes on silences, the spin on a plateau, the step
    sequence on the sustained climax.** Read the measured envelope
    (**music-mapping**); the harness reports each jump's `accentRatio` and the
    level under each stop and held shape.
12. **Stops where the music goes quiet, with a light move out.** A stop with a
    small light move out of it (a bunny hop, a hand gesture,
    `choreo-presentation`) is what makes a quiet bar read as intentional. Two
    stops in a 1:40 program is plenty; three over-decorates. Where the stops
    go for a given skater and track is in the profile, in counts.
13. **The melodic opening gets extension and stroking**, not crossovers — a
    spiral, a reach, long edges. Crossovers there sound like warm-up. But
    *stroking* means strokes: an opening built only of held shapes and choreo
    moves has nothing in it that pushes, and the skater reaches the first stop
    or the first jump with no speed and no way to have got any. Count the
    pushes in the front of the program — at least one speed-builder per eight
    counts — and remember a standing start is 0 m/s, which no check measures
    because the opening pose covers no distance. One build opened with a pose,
    a reach, a 2.9 s one-foot glide and a chassé: sixteen counts, no stroke,
    and then thirteen counts to find jump speed from a standstill.
13b. **A held shape must contain the swell, not end at it.** Place a held line
    so the musical moment it is for falls *inside* it. An Ina Bauer timed to
    start where the lift starts is over by the time the lift blooms, and the
    connecting material behind it gets the moment instead; one build had the
    Bauer at 0:46.7–0:49.5 against a lift at 0:50, and the crossovers after it
    were what the audience saw on the swell. Check it in `music.heldOrStopped`
    and by reading `chain`'s timestamps against `envelope`, and fix it by
    holding the shape *longer* rather than moving it — moving it costs the
    element on the other side, lengthening it costs only connecting material.

13c. **Do not spend every held shape in the first half.** List the held shapes
    with their times (`placement.heldShapes`) against the envelope. If the
    last one ends before the music's biggest passage begins, the program peaks
    choreographically before the music does, and the climax — usually the
    busiest footwork in the program — has nothing in it for the eye to rest
    on. One build had all three held shapes before 0:50 of a 99.6 s program
    and nothing sustained in the last fifty seconds. The cheapest repair costs
    no beats: hold one *arm* shape, still and open, for a second or more on
    the biggest bar, on an element that is already travelling.

13d. **Phrase over the units when the units are short.** A back half made of
    1.3-second connectors reads as uniformly busy no matter how good each one
    is, because weight, suspension and attack are all *differences* and there
    are none. You usually cannot lengthen the elements — the elements are the
    program — so phrase the arms across three or four of them: one unbroken
    rise from low to overhead over three turns, instead of three separate
    arrivals. The feet do not change; the eye starts reading four-second
    phrases instead of 1.3-second events.

14. **Come out of a spin into something.** Time the spin so its exit lands on
    the next lift.

## 5. Highlights and memorability

15. **One of each highlight.** One Ina Bauer, one spiral, one knee slide, one
    lunge — each is a moment; two of the same is a habit. Do not stack held
    shapes in a silence. The profile says which shapes the skater wants and
    which are forbidden.
16. **Easy to remember.** Few distinct element ids (`distinct`, `oneOffs`):
    ≤ ~24 reads as a program for a short deck; a full Aspire 4 deck with two
    combinations and a built step sequence lands ~31–36 even when clean, so
    set the bar from the element content and compare like with like. A step
    sequence that mirrors itself ("three on the left, the same three on the
    right") is easier to hold than an asymmetric one with the same turns.
    Reuse the same jump-entry recipe.
17. **The arms are choreography, not decoration — dancing hands on every
    element.** Every element carries an arm track and a hand note; the hands
    should be doing something different in every section, and something
    *moving* (a phrase) on the passages with a pulse. See
    **arm-choreography** — the vocabulary is large now (ballet positions, jazz
    hands, boxing, hands over the head in the air) and the harness counts
    distinct shapes and phrases.

## 6. Realistic speed

18. **Measure it.** Instantaneous speed is `hypot(dx,dy)/dt` between consecutive
    samples; the harness reports the program average and the footwork peak.
    The library's nominal distances are an advanced skater's; `program.
    speedScale` scales every element's travel *and* lobe radius so speeds drop
    and turns keep their shape. Beats are fixed by the music, so distance is the
    only lever. Per-category caps live in `PLACE.maxSpeed`; the skater's profile
    sets `speedScale` and the target average. *For the current profile
    (Aspire 4, speedScale 0.8): ~3.5 m/s average, footwork peaking near 5, a
    single-jump takeoff ≤ 7.* Slower means smaller: say so when coverage drops.
19. **Every travelling element has a minimum length in beats.** The binding
    limit is its category cap: `node tools/harness.js lib --speedScale X --bpm
    Y` prints `minB`, the fewest beats it may take — round up to a whole beat.
    Turns take **3 beats**, not 2, at a learning level — including the
    3-rotation twizzle: `minB` is a nominal *average* (5.0 m/s at 2 beats,
    under the cap) but `speed.footworkPeak` is the measured instantaneous
    speed and hits 6.3 there. Check `footworkPeak` after shortening anything.
    **Minimums at speedScale 0.8 / 126 bpm** (the current profile; regenerate
    for any other): forward crossovers 7, back crossovers 6, forward swing
    roll 6, back swing roll 5, power pulls 4, stroking 4, spiral 6 (and ≥ 3 s
    to read as a spiral: use 8), Ina Bauer 5 (use 6–8), attitude glide 4,
    cross rolls 4, turns 3, twizzles 2–3, knee slide 4–5, stop 2.
20. **Every element has a natural curl** — the heading change it makes on its
    own, before any `aim` (which adds at most ±40°): `node tools/harness.js
    lib --speedScale X --bpm Y` prints it as `turn` (+ = left/CCW). **At
    speedScale 0.8** (the curl does not depend on bpm, but does on the scale;
    regenerate for another): forward crossovers +163°, back crossovers +147°,
    a three / bracket / mohawk ±65°, spiral +65°, Ina Bauer +57°, power pulls
    ∓40°, an LBO edge −57°; counters, twizzles, cross rolls, stroking and
    swing rolls ~0°. Mirrored elements curl the other way. Add the curls up on
    paper: a sequence whose running curl hooks past ~90° doubles back and
    cannot span half the ice; a front whose runs all curl left will read
    65–70% CCW whatever the steer does. The curl tally predicts the *pinned*
    parts (the sequence, rotation balance); between anchors the steer has
    ±40° per element and will reshape the open ice — do not expect the
    crossing you drew, expect the corners you asked for. At these minimums
    the one 19-count clockwise turn-round available between two LBI jumps is
    `crossroll-b.R, xover-b.R, mohawk-bo, stroke-f.R, three-fo`.

## 7. Talk in counts — and know which clock

Skaters give timings as **counts**: `18&5` = eight-count 18, beat 5 — what
`fmtCount(beat)` prints. `beat = (N − 1) × 8 + (M − 1)`; seconds = beat × 60 /
bpm. Anchor to the count they gave and read the element list back in counts
(`node tools/harness.js chain <file>`). The profile tabulates the skater's
counts as beat numbers so nobody converts by hand.

**There are two clocks.** Counts, anchors, `fmtTime`, `chain` and the harness
`envelope`/`music` block are all in **program time** (0 = beat 1&1). The audio
plays at `program time + program.offset` (the profile's offset; for the
current profile, a 126 bpm track, 0.453 s ≈ one beat). Never quote a
time off the raw waveform without subtracting the offset. A 2-beat jump
element takes off ~0.3 s after it starts, so "flip on 5&2" means the element
*starts* on 5&2.

## 8. How the steering enforces the placement rules

`steerProgramAsync()` in engine.js: a greedy pass over every element's `aim`
(direction only, never timing), then joint searches over the three or four
longest-travelling elements before any mid-ice jump or far spin, then an
**end-spreading stage** that sends a corner jump to the under-used end and
re-places what follows, keeping the change only if `placementScore` improves.
Stages, in order: greedy over every aim → place each mid-ice jump and far
spin (joint search over the approach) → **stretch** the step sequence (the
approach to the jump before it, then its own turns) → **spread** to the
under-used end (loops over both ends) → **polish** every free aim against the
placement score itself. `--verbose` shows each decision.

`steerProgramMulti()` runs it from several starting aims and keeps the best —
the pipeline is greedy and deterministic, and half the programs only came right
from a non-zero start; it stops early only when jumps, spins, rotation, both
ends and the half-ice sequence are all met. Use it through the harness:
`node tools/harness.js steer <file> --starts 0,-16,16,-32,keep --out x.json`.

**Expect variance, and use the levers.** The same chain from four starts has
given sequence spans of 0.29–0.48 and an end at 13–27%. So:
- run several starts (separately if you want to see each), `score` them all,
  keep the best; `--starts keep` continues from the aims already in the file;
- **`program.start.heading` is the lever for the far end.** It is in
  **degrees** (`buildPath` multiplies by `DEG`): 0 faces +x (the right end),
  180 faces −x (the left end). *Worked example from one 100-second free skate: C3 uses
  0.25 — i.e. straight down the rink.* The opening's ~30 m of near-straight
  travel goes where the heading points, so face the end you want the first
  stop at. Write 2–3 start variants *before* the first steer, steer them in
  parallel with `--out`, score, and continue the best;
- a jump within nine elements of a spin is pinned to centre (`feedsSpinAt`),
  so only the other jumps can carry the program to a corner;
- `--frozen 0-12` holds the aims of a **front** you are happy with while the
  rest is re-steered (never released by any stage). Freezing a *tail* does
  not hold its placement — see below. `--starts keep` after changing the
  start heading reuses aims tuned for the old heading; use fresh starts then.
- **The half-ice sequence is a placement problem.** It runs from wherever the
  jump before it lands to the next anchor (usually a jump pinned to centre by
  the final spin), so it only spans half the ice when that jump lands deep in
  a corner pointing down the rink. The steer now has a stretch stage for it
  and `placementScore` counts the span; if it is still short, read
  `placement.jumps[]` for the jump before the sequence — "corner" is what you
  want — and check the sequence's travel budget (**step-sequence**).
- **Rotation is a chain property first.** The steer moves it a few points;
  mirroring one crossover run moves it ten. `PLACE.rotationBand` (42–58) is
  the one band used by the steer, the score and the panel. Un-steered
  rotation numbers are noise (board avoidance bends the path) — judge it
  after a steer, fix it in the chain.

**Freezing a tail's aims does not freeze its placement** — the whole tail
rotates with the heading the front hands it — so when someone says "keep the
end part", keep its *elements* and steer everything.

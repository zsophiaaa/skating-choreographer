# Choreography reference

Working notes on how real programs are actually put together, gathered so the
choreography in this repo is built on something other than taste. Everything
here is from published ISU/USFS rules or widely documented practice; nothing in
it describes any individual skater's copyrighted choreography.

Sources are listed at the bottom.

---

## 1. Difficult turns — the ISU list

Only six turn families count as **difficult turns** for step sequence levels:

| Difficult turn | In this library |
|---|---|
| Twizzle | `twizzle-1` `twizzle-2` `twizzle-3` |
| Bracket | `bracket-fo` `bracket-fi` `bracket-bo` `bracket-bi` |
| Loop (turn) | `loop-turn-f` `loop-turn-b` |
| Counter | `counter-fo` `counter-fi` `counter-bo` `counter-bi` |
| Rocker | `rocker-fo` `rocker-fi` `rocker-bo` `rocker-bi` |
| Choctaw | `choctaw-fi` `choctaw-fo` `choctaw-bo` |

**Three turns and mohawks are NOT difficult turns.** They are perfectly good
connecting material and they belong in a sequence, but they do not count toward
a level. A sequence that is mostly three-turns looks busy and counts as nothing.

This is the single most useful fact for building a step sequence, and the reason
`analyzeStepSequence()` in `js/engine.js` counts turns by family rather than by
how hard they feel.

### Notional levels (by count of difficult turns)

| Level | Difficult turns required |
|---|---|
| 1 — minimum variety | 5 |
| 2 — simple variety | 7 |
| 3 — variety | 9 |
| 4 — complexity | 11 |

> **At Aspire 4 the sequence is a ChSt, which carries no level at all.** These
> counts are still the right target for *quality* — they are a proxy for "is
> there actually anything in this sequence" — but do not tell a skater they are
> "getting a level" from a ChSt. They are not.

---

## 2. The other step sequence features

Beyond raw turn count, the level features reward structure. All of these are
worth building toward even where no level is awarded.

**Difficult turn clusters.** Two combinations of **3 difficult turns on
different feet**, executed with continuous flow. Only one difficult turn may be
repeated between the two combinations. Only the first combination attempted on
each foot is counted.

**Both rotational directions.** Full body rotation covering at least **one third
of the pattern in each direction**. A sequence that only turns one way reads
one-sided no matter how hard the turns are — this is why the La La Land sequence
mirrors its twizzle rather than repeating it.

**Upper body movements.** Visible use of arms, head and torso — movements that
genuinely affect the balance of the body core — for a combined total of at least
**one third of the pattern**. This is a scored feature, not decoration. It is
the reason this repo has an arm-track system (`arms:` on a library element)
rather than leaving the arms to whatever the leg pose happens to imply.

**Body movements inside a cluster.** A newer feature: two core-affecting
movements performed *during* a combination of three difficult turns.

---

## 3. Jump entries

The first two positive-GOE bullets for a jump are:

1. unexpected / creative / **difficult entry**
2. clear recognizable **steps or free skating movements immediately preceding**
   the element

So the approach to a jump is worth as much as the jump. A jump entered from a
plain backward glide throws away both bullets.

### What each jump needs to take off from

| Jump | Takeoff | Library entry code |
|---|---|---|
| Toe loop | back outside, toe-assisted | `RBO` |
| Salchow | back inside, edge | `LBI` |
| Loop | back outside, edge | `RBO` |
| Flip | back inside, toe-assisted | `LBI` |
| Lutz | back **outside**, toe-assisted | `LBO` |
| Axel | forward outside, edge | `LFO` |

The Lutz is the awkward one: it needs a back **outside** edge, which is the
opposite curve from the flip. Anything that delivers `LBO` cleanly is a good
Lutz entry — a rocker (`LFO→LBO`), a counter (`LFO→LBO`), a back cross roll, or
back power pulls.

### Difficult entries that are actually skated

- **Back counter into the jump.** The classic difficult entry — documented from
  Midori Ito into a double Axel, later Yuzuru Hanyu into a triple Axel.
- **Twizzle into the jump.** Harder still; Hanyu has done twizzle → 3A.
- **Rocker into the jump.** `rocker-fo` is `LFO→LBO`, which lands exactly on a
  Lutz takeoff edge. Cheap to do and reads as a real transition.
- **Straight out of a step sequence**, with no glide or reset between.
- **Spread eagle or Ina Bauer immediately before** (`choreo-eagle-into-jump`).

### Combinations

The second jump takes off from the **landing edge** of the first, with no step
between — which is why every combination in this repo is two adjacent jump
elements with `gapBefore: 0`. Since all jumps land `RBO`, the jumps that can
follow directly are the ones entered from `RBO`: **toe loop and loop**. That is
not a stylistic choice, it is the edge model.

A **jump sequence** is different from a combination: two or three jumps where
the second and/or third is a waltz jump, with a direct step from the landing
curve.

---

## 4. Program layout conventions

- **Jumps first, while the legs are fresh.** Hard content crammed at the end is
  the classic amateur error; the analysis panel in this repo flags it.
- **Spins are recovery.** A spin is the one place a skater gets breath back, so
  they tend to sit after a hard passage, not before one.
- **The step sequence goes where the music is biggest**, because it is the part
  of the program that reads as dancing rather than executing.
- **Use the whole sheet.** Coverage and the four faceoff circles are a decent
  proxy; a program that lives in the middle third looks small.
- **Both rotational directions across the whole program**, not only inside the
  step sequence.
- **Start and finish near centre ice.** The opening pose and the final pose are
  free impression points and both are best seen from the middle.

---

## 4b. This skater's rules (override everything above where they conflict)

Stated directly by the skater. Enforced by `checkPlacement()` in `js/engine.js`
and by the steering pipeline; the full brief is the active profile in `.agents/profiles/` (see the skater-profile skill).

- **Vocabulary:** counters, mohawks, brackets, three-turns, twizzles,
  crossovers, field moves. **No choctaws, no loop turns**; rockers not yet.
- **Stays on the ice.** Hard.
- **Spins near centre** (≤ 7 m). **Jumps near centre or in a corner** (≤ 9 m
  of either) — the corner is where the crossovers build speed.
- **Crossovers are the connecting material**, forward and backward, not
  strings of edges and three-turns.
- **Comfortable jump entries**: flip/Salchow via back crossovers → mohawk →
  forward crossovers → three-turn; Lutz via cross roll → back crossovers
  curving the other way, which land on the outside edge. Never a d5 turn right
  before a takeoff.
- **Pause at the music change** near the start, as the opening statement
  gives way to the "jumpy" section (~0:08–0:10 in the La La Land cut).
- **Easy to remember**: the same recipe for every jump of a type, mirrored
  step sequences, few one-off elements.

---

## 5. How this maps onto the code

| Idea | Where it lives |
|---|---|
| Difficult-turn families | `DIFFICULT_TURNS` in `js/engine.js` |
| Step sequence audit | `analyzeStepSequence()` in `js/engine.js` |
| ChSt as a run of turns | `chst: true` on an element instance |
| Arm/hand choreography | `ARM_POSES` + `arms:` track, `js/poses.js` |
| Aspire 4 rules | `LEVELS.aspire4` + `checkAspire()`, `js/engine.js` |
| Section variants | `SECTIONS` + `VARIANTS`, `js/variants.js` |
| Skater's placement rules | `PLACE`, `analyzePlacement()`, `checkPlacement()`, `steerProgramAsync()`, `js/engine.js` |

---

## Sources

- [ISU Communication 2788 — Levels of Difficulty and GOE, 2026-27](https://isu-d8g8b4b7ece7aphs.a03.azurefd.net/isudamcontainer/CMS/Corporate-Site/Governance/Transparency/ISU-Communications/2788-SP-Levels-and-GOE-2026-April-23-FINAL-1777993961-0366.pdf)
- [ISU Technical Panel Handbook, Single Skating](https://www.usfigureskating.org/sites/default/files/media-files/TP%20Handbook%20Single%20Skating%202024-2025%20July%2024%20FINAL.pdf)
- [Key updates to levels of difficulty and GOE guidelines for 2026-27](https://www.goldenskate.com/key-updates-to-levels-of-difficulty-and-goe-guidelines-for-2026-27-figure-skating-season/)
- [Step sequence — Wikipedia](https://en.wikipedia.org/wiki/Step_sequence)
- [Counter turn](https://en.wikipedia.org/wiki/Counter_turn) · [Rocker turn](https://en.wikipedia.org/wiki/Rocker_turn)
- [Figure skating jumps — Wikipedia](https://en.wikipedia.org/wiki/Figure_skating_jumps)
- [USFS Aspire Program Requirements](https://usfigureskating.org/documents/2025/8/19/Aspire_Program_Requirements.pdf)

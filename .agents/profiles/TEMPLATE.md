# Skater profile — <name> (<level>), <music>

The general rules are in the **program-craft** skill; this file is what is
specific to this one skater. When the two conflict, this wins. Write only
what the skater actually said or what was measured; mark guesses as guesses.

Current program: `<file>.json` (gallery: **<preset id>**).

## Level and speed

- Level and rubric (see **level-rules** or add the level to `LEVELS` in `js/engine.js`).
- Element content they want (jumps, spins, one step sequence).
- `speedScale` (0.8 for a pre-bronze skater; 1.0 is an advanced skater's distances).
  Target average m/s, footwork peak, jump takeoff — measure, do not assume.
- Music: file, bpm, offset, duration (`music/<track>-envelope.json`).

## What they can do — and cannot

**Know:** (turns, field moves, jumps they own)
**Do not know / do not want:** (never put these in)
Which difficult-turn families that leaves for the step sequence.

## Their taste, in their words

- The version they like as a base, and what was rejected.
- Connecting material (crossovers vs stroking vs progressives; how many).
- Where the stops go, with counts; what comes out of each stop.
- The opening (melody: extension, not crossovers?).
- Highlights: one of each of which shapes; which are forbidden.
- Which counts the jumps and spins land on (table below).
- Ice coverage wants; the step sequence visibly over half the ice.
- Arms: what "dancing hands" means to them.
- Memorability.

## Not stated yet (defaults until they say)

- Which foot the spiral is on.
- Whether the tail (after the last stop) is fixed or open.

## Counts

| moment | count | beat | program time |
|---|---|---|---|
| … | | | |

`beat = (N − 1) × 8 + (M − 1)`; program time = beat × 60 / bpm; audio = program time + offset.

## The tail they liked, as elements

(element ids with beats, so nobody has to reverse-engineer it from a preset)

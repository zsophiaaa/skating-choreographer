# Skater profile — example (USFS Pre-Preliminary), any 1:30–1:50 track

This is a **fictional example** of a filled-in profile, written for the
shipped `starter-prepre` program so a new user can see every section in use.
Copy `TEMPLATE.md` for a real skater and write only what they said or what
you measured. The general craft is in the **program-craft** skill; the
profile wins where the two conflict.

Current program: `starter-prepre` (gallery card "Pre-Pre Starter").

## Level and speed

- **USFS Pre-Preliminary free skate** (`level: 'prepre'` in `js/engine.js`:
  ~1:35–1:50, max 4 jump elements, 2 spins, 1 step sequence, singles only).
  If a different federation's sheet applies, encode it first — **level-rules**.
- Element content: waltz jump, Salchow+toe loop, flip, and one more single;
  a sit spin and a back scratch spin; one step sequence; two spirals.
- `speedScale: 0.8` (a learning skater; the library's distances are an
  advanced skater's). Target ~3.5 m/s average, footwork peaking ≤ ~5.3 m/s,
  single-jump takeoff ≤ ~6.5 m/s — check `speed` in `verify`, do not assume.
- Music: `<track>.mp3`, bpm and offset from the exported envelope
  (`music/<track>-envelope.json`, see **harness**).

## What they can do — and cannot

**Know:** three-turns, mohawks, crossovers, power pulls, cross rolls, swing
rolls, spirals (forward, both edges), lunge, attitude glide.
**Do not know / do not want:** brackets, counters, rockers, choctaws, loop
turns, twizzles — none of these in the step sequence; build it from
three-turns, mohawks and edges and say plainly that it audits at zero
difficult turns (a Pre-Pre step sequence is not levelled).

## Their taste, in their words

- "I want it to look like skating, not a list of tricks" — connecting
  material is crossovers and stroking; ≥ 35 % of the connecting beats are
  speed builders.
- Extension moments where the music breathes: two spirals, held ≥ 3 s each.
- One stop, at the music change, with a light move out of it.
- Jumps in the corners or at centre; spins near centre; both ends of the
  rink used; the step sequence visibly across half the ice.
- Hands: "not stiff" — an arm track on every element, ballet shapes on the
  melody, nothing fussy on the jump entries.
- Easy to remember: the same jump entry every time.

## Not stated yet (defaults until they say)

- Which foot the spirals are on: forward outside on the left, inside on the
  right (as in the starter).
- Whether the ending is fixed: no — open.

## Counts

Fill in from the envelope once the track is chosen: `beat = (N − 1) × 8 +
(M − 1)`; program time = beat × 60 / bpm; audio = program time + offset.

| moment | count | beat | program time |
|---|---|---|---|
| stop (music change) | | | |
| jump 1 | | | |
| … | | | |

# Skating Choreographer — Plan & Design Doc

> The skater's original notes (kept below, cleaned up but not reworded away).
> Everything under "Research" / "Design decisions" / "New ideas" was added while building.

---

## 0. User persona

A skater at USFS Intercollegiate Pre-Preliminary level who wants to build their
own program: preliminary moves and free skate passed, single jumps through the
Axel, doubles in progress, and — in their own assessment — extension and
"skating nicely everywhere" are the weak points.

**What that implies for the product:**

- Level target: **USFS Intercollegiate Pre-Preliminary** — short-ish program, singles, basic spins.
- Skills owned: prelim moves (edges, crossovers, 3-turns, mohawks, power pulls, spirals), single jumps incl. Axel.
- Skills in progress: doubles.
- **Pain point #1: extension / line.** So the tool can't just be a timeline — it has to *show the body*, from angles where line is visible, and it has to nag about extension per element.
- **Pain point #2: "skating nicely everywhere"** = transitions, edge quality, carriage between the big tricks. So the tool should make the *connecting tissue* first-class, not an afterthought.

---

## 1. Original goals (the skater's list, preserved)

1. Visualize choreography elements smoothly from different angles (front, high up, next to, etc.), with play / slow-motion / scrub, and watch the skater skate each part.
   *(What's the best representation of each moment? Research current products / how do choreographers do it themselves?)*
2. A big library of figure skating choreography elements — especially step-sequence moves (spread eagle, brackets, etc.), from basic to advanced. Assume the user already knows basic moves.
3. Import music and have elements line up with the music.
4. Export something with all the elements.
5. "Imported" choreography for famous programs — e.g. Kamila Valieva's 2022 Olympic-season SP, Yuna Kim, Alysa Liu.
6. Research what a choreographer and an amateur like me would want in it.

---

## 2. Research

### 2a. How choreographers actually work today (and what tools exist)

| Method | What it is | What it's good at | What it misses |
|---|---|---|---|
| **Pattern / ice diagrams** | Rink outline on paper, tracing drawn as lobes + arrows, turn symbols on the cusps. The coaching standard. | Ice coverage, patterns, where you are on the rink | No body, no timing |
| **Music count sheets** | Program written as 8-counts: "8&1 – spread eagle into 3-turn, 8&2 – Axel" | Musicality, hits, phrasing | No spatial info |
| **Video + slowdown** (Coach's Eye, Hudl, Dartfish, just phone slow-mo) | Film it, scrub it, draw on it | Real body, real line | Only after you can already skate it |
| **Skating notation** | `LFO`, `RBI bracket` — Foot + Direction + Edge + move | Precise, unambiguous, compact | Steep for beginners, no picture |
| **Jump-tracker wearables** (e.g. rotation/airtime sensors) | Data on jumps | Jump metrics | Nothing about choreography |
| **General 3D/anim tools** (Blender, dance apps) | Full 3D | Anything | No skating semantics — no edges, no rink, no ISU vocabulary |

**Gap:** nobody combines *pattern diagram + body pose + music counts + skating notation* in one editable object. That's the whole product.

### 2b. So: what is the best representation of "a moment"?

A moment on the ice is fully described by **four layers**, and this app stores all four:

1. **Notation layer** — `foot + direction + edge` (e.g. `LFO`) plus the move name. This is the atomic truth of skating and it's what coaches say out loud.
2. **Tracing layer** — where the blade is on the ice and how the lobe curves. Derived automatically, not hand-drawn (see 3b).
3. **Body layer** — a 3D pose (skeleton keyframes) blended over time, plus a physically-derived **edge lean**.
4. **Music layer** — start beat + duration in beats, so everything lives in 8-counts, not seconds.

Key insight that makes this work: **layers 2 and 3 can be derived from layer 1.** If you know you're on a Left Forward Outside edge, you know which way you lean and which way the circle curves. So the user picks elements, and the pattern draws itself.

### 2c. What an amateur (and a coach) actually wants — beyond the obvious

- **"Is this even skatable?"** The #1 amateur mistake is stringing moves that can't connect — you can't exit a move on `LBI` and start the next one on `RFO` without a step. → **Edge continuity checker.**
- **"Am I using the whole rink?"** Judges and coaches say this constantly. → **Ice-coverage heatmap.**
- **"Am I only ever turning left?"** Almost everyone is CCW-dominant. → **Rotation balance meter.**
- **"Where do I breathe?"** Programs with no rest are unskatable at the end. → **Effort/stamina curve.**
- **"Does it fit the rules?"** → **Well-balanced program checker** for the target level.
- **"Give me something to hold at the rink."** → **Printable pocket cheat card.**

---

## 3. Design decisions

### 3a. Tech
Plain HTML/CSS/JS, no build step, no npm, no CDN. Open `index.html` and it works, offline, on rink wifi. The 3D is a small hand-written renderer on a 2D canvas (perspective projection + depth sort) — no Three.js dependency.

### 3b. The physics/geometry model (why the tracing is real, not decorative)

Every element declares an **entry** and **exit** as `(foot, direction, edge)`. From that:

```
leanSide  = (L+O or R+I) ? +1(body-left) : -1(body-right)
curveSign = leanSide * (direction === 'F' ? +1 : -1)
leanAngle = atan(v² / (g·r))        # real edge lean from speed + lobe radius
```

This one rule reproduces skating correctly and for free:
- **3-turn / bracket** (edge changes, direction changes) → curve sign is unchanged → *stays on the same lobe*. ✅ correct
- **Rocker / counter** (edge same, direction changes) → curve sign flips → *new lobe*. ✅ correct
- **Mohawk** (foot changes, direction changes, edge type same) → same lobe. ✅ correct
- **Choctaw** (foot changes, direction changes, edge changes) → new lobe. ✅ correct

So the pattern on the ice is *computed*, and the continuity checker falls straight out of the same data.

### 3c. Camera angles (goal #1)
Overhead (the classic pattern-sheet view), Judge's Eye (from the boards, long side — how you're actually scored), Front (down the long axis), Follow (chase cam behind the skater), Close (low, near the blade — best for seeing extension), and Free Orbit (drag to rotate, scroll to zoom).

---

## 4. Feature list as built

- [x] 3D rink + skater with correct near-plane clipping, 6 camera presets + free orbit, play / pause / scrub / 0.1×–1.5× speed / loop-selected
- [x] Motion trail ("ghosts") and full ice tracing with turn cusps
- [x] 115-element library, searchable, filtered by category + difficulty, each with a coaching tip and an **extension cue**
- [x] Program timeline in **8-counts**, drag to reorder, per-element inspector (beats, lobe radius, mirror L/R, notes)
- [x] Music import (drag a file in), waveform, auto-BPM + tap tempo, downbeat offset, snap-to-beat
- [x] **Hit markers** — tap `M` while the music plays to mark accents, then snap elements onto them
- [x] Preset "study patterns" inspired by famous programs (clearly labelled as *inspired-by*, not copies)
- [x] Export: `.json` program, pattern diagram `.png`, printable coach sheet, `.csv` element list; import `.json` back
- [x] Live analysis panel: edge continuity, ice coverage, rotation balance, effort curve, speed sanity, level rules check

## 5. New ideas added (beyond the original 6)

1. **Extension Lab** — per-element extension cues written for exactly this problem, plus a live *line score* that measures free-leg height, knee straightness and toe point in the current pose.
2. **Penguin Meter** — cheeky but real: scores upright rigidity vs. knee bend + carriage across the program. Named after the persona note.
3. **Edge continuity checker** — flags every "you can't get there from here" seam and suggests the connecting step that fixes it.
4. **Ice-coverage heatmap** — overhead view shades where you actually skate, so dead zones are obvious.
5. **Rotation balance meter** — CCW vs CW usage, because everyone is one-sided.
6. **Effort / stamina curve** — element cost over time, warns about a back-loaded program you'll die in.
7. **Well-balanced program checker** for the target level (editable, with a "verify against the current USFS rulebook" note — rules change yearly).
8. **Pocket cheat card** — a tiny printable card with counts + notation to look at before you step on.
9. **Auto-skeleton** — give it a music length and a level and it lays out a plausible program frame you then edit. It only picks elements that actually connect edge-to-edge, so what it produces is skatable by construction.
10. **Automatic seam repair** — the same connector search runs on every preset at load time and behind the "Fix" button on each broken seam, inserting the smallest real connecting step that joins two edges.
11. **Program tabs** — several choreographies open at once, with any one of them drawn underneath
    the current one in grey as a comparison. For building an SP and an FS together, or A/B-ing two
    versions of the same section.
12. **Program Gallery** — the built-in programs shown as cards with real pattern previews, so the
    famous-skater study patterns are actually findable instead of buried in a dropdown.
13. **Full view control** — every layer drawn on the ice can be switched off independently, plus a
    one-click "clean ice", plus a tracing mode that shows only the element you have selected.
14. **Protocol builder** — paste an ISU judges'-details element list and get a skatable program with that
    exact element content, with protocol elements and invented connectors visually distinguished.
15. **Auto-steer** — the skater bends the lobe away from the boards instead of skating into them, so a pattern stays on the ice without you hand-aiming every element.

---

## 6. Honest caveats

- A program splits into **element content** (published fact — reproducible exactly) and **choreography** (a copyrighted creative work — not reproduced). The app labels every element as one or the other, and the *Build from a competition protocol* tool exists so any real program's content can be entered exactly.
- Level rules are encoded from the general shape of the USFS well-balanced program and are **editable in the UI** — always verify against the current season's rulebook.
- The skater model is a stylized skeleton for reading *line and pattern*, not a biomechanical simulation. It will not tell you whether you can land the double.

## 7. Later / not built yet

- Two-skater (partner / synchro) mode
- Import a video and overlay the model on it
- Real 8-count phrase detection from the audio (currently BPM + manual hits)
- Sharing a program by URL

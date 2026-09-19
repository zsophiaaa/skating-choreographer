---
name: music-mapping
description: Read a track's measured energy envelope (music/<track>-envelope.json, via the harness) and decide which element type belongs on each musical moment — jumps on hits, stops and held positions on quiet bars, the required spin on a plateau, the step sequence on the biggest sustained passage, extension on a melody. Use before laying out any program, and whenever the user says a section does not match what they hear. The user's ear beats the envelope; the envelope is for finding what they mean.
---

# Mapping elements to the music

## Read the envelope, don't guess

The track's onset-strength envelope lives in `music/<track>-envelope.json`
(exported once from the page — **harness** says how). Print it bucketed and
normalised with `node tools/harness.js envelope --bucket 2`; the shape is what
matters, not the absolute numbers. In the page the same data is `Music.onsets`
at `Music.onsetHop` seconds per frame.

`node tools/harness.js verify` then reports, for the program you built, each
jump's `accentRatio` (the strongest onset within 0.25 s of takeoff against the
3 s around it; ≥ 2 is "on a hit") and the `level` under every stop and held
shape — the quickest check that the layout you wrote is the one the track has.

**Clock:** everything the harness prints is **program time** (0 = beat 1&1);
the audio runs `offset` later (the profile's offset; 0.453 s for La La Land).
The skater's counts are program time. A jump takes off ~0.3 s into its
element, so put the element's start on the count. A track's onsets sit up to
half a beat off the bpm grid — anchor to the count, then check the ratio, not
the other way round.

What to look for, in order of usefulness:

| Shape in the envelope | What it is | What goes there |
|---|---|---|
| Single 2 s bucket ≫ neighbours | a hit / the peak | the hardest jump element, landing ON it |
| Several buckets high in a row | sustained climax | the step sequence — it is the part that reads as dancing |
| Drop to < 0.2 after being ≥ 0.4 | near-silence, a "breath" | held positions: Ina Bauer, spiral, spread eagle. **No technical content** |
| Long flat run at 0.4–0.6 | plateau | the required spin — spins are recovery and want a steady floor |
| Steady rise over ~10 s | a build | crossovers or power pulls into a jump; the build should end on the jump |
| Local bump (.44 among .35s) | an accent | a single jump, a choreo hop, a twizzle — something that lands on one count |
| Decay to ~0 at the end | the fade | a long edge running out, then the final pose held until it is gone |

Two real examples from this repo, so you can see the reasoning (they are
examples of the method, not rules):

**Interstellar (First Step)** — quiet build, one spike at 1:00, a drop, a second
broad build to 1:24. The camel→sit sits on the build (0:43–0:54) and exits
*into* the lift; a catch-foot spiral holds the sustained note through 1:00; the
back spin sits on the second peak. The user chose the spin timings by ear and
they matched the envelope exactly — trust that.

**La La Land (Epilogue) — the current profile's track** — a quiet melodic opening (0:00–0:08), a change to
light music at 0:08 (with a small hit at 0:10 that nobody has used but a
choreographic hop fits), a long build with accents at 0:16, 0:26 and 0:38, a lift
at 0:50, a plateau 0:54–1:04 (the spin), a true near-silence at 1:08–1:14,
then a climax at 1:16 that stays big to the end. The accepted layout: spiral +
stroking on the opening, a stop at the change, flips on 0:16 and 0:26, the
Salchow+loop on 0:38, the Ina Bauer on the 0:50 lift, camel→sit on the
plateau, a **stop at 18&6 with a bunny hop** as it goes quiet, a knee slide in
the silence, Lutz+Loop on 1:16, the step sequence 1:19–1:31 on the climax,
the last Lutz at 1:31, lunge into the scratch spin, pose on the last chord.
The counts are in the profile; the pattern (stop where it goes quiet, light
move out, hardest jump on the peak, sequence on the climax) is the general
rule.

## Rules of thumb that survived contact with the user

- **The biggest musical moment gets either the hardest jump or a held line —
  it is a real trade.** Interstellar gives 1:00 to a spiral (the user's call, a
  sustained note wants stillness); La La Land gives 1:16 to the Lutz+Loop
  (because the silence just before it already has the beautiful line). Say which
  you chose and why.
- **Come out of a spin *into* something.** Time the spin so its exit lands on
  the next lift, not in the middle of nothing.
- **A jump straight out of a step sequence** with no glide is a stronger
  construction than a jump after a reset, and it is explicitly rewarded (see
  `docs/CHOREOGRAPHY.md` §3).
- **Twirly, rotational figures in the music → twizzles**, not three-turns.
- **Do not put busy footwork on a silence.** The user will hear it as wrong even
  if the counts line up.
- **A stop where it goes quiet, and something light out of it.** A stop with a
  bunny hop or a hand gesture after it is what makes a quiet bar read as
  intentional rather than as a gap.
- **A melody wants extension** — a spiral, a reach, long stroking — not
  crossovers.
- **When the user describes what they hear ("a bright held note until 1:03"),
  re-read the envelope around that time at 2 s resolution and build to their
  description.** They have heard the track; the envelope has not.

## Timings the user has set are anchors, not suggestions

If they say the spin starts at 0:43 and exits at 0:54, the spin is 0:43–0:54.
Build the rest around it. Report exactly where every anchored element landed
(`fmtTime(seg.t0)`), and say plainly if one could not be hit and why.

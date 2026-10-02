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
the audio runs `offset` later (the profile's offset; 0.453 s in one worked example).
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

Two shapes of track, to show the reasoning (they are examples of the method,
not rules):

**A slow orchestral build** — quiet build, one spike around the middle, a drop,
a second broader build to the end. The combination spin goes on the first build
and exits *into* the spike; a held line (a spiral, caught or not) takes the
sustained note at the spike itself; the last spin takes the second peak. Here
the biggest moment went to stillness, not to a jump, because a long sustained
note wants a line held through it.

**A jazz or big-band finale** — a quiet melodic opening, a change of character
early, a long build with three or four accents, a lift, a plateau, a near
silence two-thirds through, then a climax that stays big to the end. The
opening takes stroking and an extension; the change of character takes a stop;
the accents take the jumps; the lift takes the one big held line; the plateau
takes the required spin; the silence takes a stop, a small choreographic jump
and something on the ice; the climax takes the hardest jump and then the step
sequence.

What generalises from both is the *order of decisions*, not the layout: find
the silences and the peak first, decide what the peak gets (hardest jump or
held line — see below), put the required spin on the longest steady passage,
and let the connecting material fall where it must. A skater's own counts, when
they have them, outrank all of it.

## Rules of thumb that survived contact with the user

- **The biggest musical moment gets either the hardest jump or a held line —
  it is a real trade.** in one build the skater gave a sustained
  spike to a spiral because a held note wants stillness; in another the peak got
  the hardest jump, because the near-silence just before it already carried the
  beautiful line. Say which
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

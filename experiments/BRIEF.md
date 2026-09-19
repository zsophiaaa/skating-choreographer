# Brief

Build me a free skate to **La La Land — Epilogue** (`music/lalala-envelope.json`)
for the skater whose profile is active in `.agents/profiles/` (see the skater-profile skill). Read every
skill in `.agents/skills/` before you start — `build-program` says the order.

I want it to feel like choreography, not a list: on the music, covering the
ice, with the hands dancing the whole way through, and something I can
remember. Everything I have said about what I like and what I can do is in the
skills. Your angle for this version is in your instructions.

Deliver, in your folder:

- `program.json` — the save file, steered, passing `node tools/harness.js verify`
  with no hard fails, and as few rule misses as you can get.
- `notes.md` — the layout on paper in counts (what lands on which musical
  moment and why), the trade you made at the biggest moment, the arm plan by
  section, what you could not get right and what in the skills was unclear or
  missing (this last part is the most valuable thing you write).
- `verify.json` — the harness output for the final file.

Do not edit anything under `js/`, `.agents/`, `music/` or another version's
folder. Keep every intermediate file (drafts, anchored chains, steer outputs,
helper scripts) inside your own folder — the scratchpad is shared with the
other versions running at the same time. Do not use the browser; the harness
has everything.

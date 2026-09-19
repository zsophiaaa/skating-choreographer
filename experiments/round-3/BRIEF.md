# Brief — round 3

Same task as `experiments/round-2/BRIEF.md` (design your own layout; count
your steers), which itself points at `experiments/BRIEF.md`. Read all three
and every skill first.

This round measures one thing: **how many steers it takes to reach 0 rule
misses now that the pipeline has a stretch, spread and polish stage.** So:

1. Steer with the documented batch — `--headings 0,180` on the anchored file
   — and score before doing anything else by hand. Say in `notes.md` what
   that first run gave (ends, span, rotation, misses) and what, if anything,
   you had to do after it.
2. Run **one steer at a time** (each is ~250 MB and several minutes; five
   versions run in parallel on this machine). Background it with a timeout
   and poll the `--out` file.
3. If the first run is clean, spend the time you saved on the arms and the
   notes instead of on more steers.

Deliverables as before, in your own folder: `program.json`, `notes.md`,
`verify.json`. Keep every intermediate file in your folder.

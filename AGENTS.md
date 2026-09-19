# For coding agents

This repo is a browser figure-skating choreography app (pure static JS in `js/`, no build,
open `index.html`) plus the material you need to build a skater a complete program without
the browser: agent skills in `.agents/skills/`, the skater's own rules in `.agents/profiles/`,
and a headless harness in `tools/harness.js` that runs the app's engine in Node.

## Read first

- `.agents/skills/*/SKILL.md` — all of them. Start with **build-program**; it is the order to
  do everything in and points at the rest. (`.claude/skills` is a symlink to the same files.)
- `.agents/profiles/ACTIVE` names the current skater; read `.agents/profiles/<that>.md` in
  full before touching a chain. `TEMPLATE.md` is the blank for a new skater.
- `experiments/README.md` if you are asked to run or score a round.

## The harness

```
node tools/harness.js            # usage: verify | score | chain | anchor | steer | envelope | lib
```

Build headless. The browser is for the skater to watch the result, not for building it.

## The three rules that matter most

1. **The profile outranks the general rules.** `program-craft` says what a good program is;
   the active profile says what this skater can do, how fast they skate, and what they have
   asked for and rejected. Where they conflict, the profile wins. Never put in a turn the
   profile says they do not know.
2. **Measure, never assert.** Every claim about a program is a number from
   `node tools/harness.js verify` or `score`: seams 0, off-ice 0, no speed over the level
   cap, spins and jumps placed, both ends of the rink, the step sequence over half the ice,
   rotation in band, glides under 1.5 s. Do not report "looks good"; report the report.
3. **Every element gets arms and a note.** An `arms` track and a one-line hand note on every
   element, written as the chain is written, not after. The step sequence is built from
   individual named turns marked `chst: true`, never a canned `seq-*` block.

## Working rules

- Never edit `js/engine.js`, `js/library.js` or `js/poses.js` while a steer is running (yours or anyone's) — the steer and `verify` will disagree and you will chase ghosts. Likewise do not edit `js/`, the skills or another version's folder while an experiment round is
  running; the tree is frozen until every agent has finished.
- `steer` writes back into the file you give it unless `--out` is set; keep the un-steered
  chain. Run one steer at a time, in the background, and read the `--out` file.
- After any change to `library.js`, `engine.js`, `poses.js`, `presets.js` or `variants.js`,
  confirm every gallery preset still builds (`verify-program` has the loop).
- The skater's mp3 is gitignored; `music/<track>-envelope.json` is the committed, measured
  substitute and is what the harness reads.

## Where new knowledge goes

- **General** (true for any skater or any music): the relevant skill in `.agents/skills/`.
  A gotcha goes in `repo-gotchas`; a craft rule in `program-craft`; a harness flag in `harness`.
- **This skater** (something they said, a count, a rejection): their profile in
  `.agents/profiles/`, quoted, with the number, the same session. Do not paraphrase a
  preference into a stronger claim than they made.
- Do not create a `CLAUDE.md`; this file and the skills are the whole briefing.

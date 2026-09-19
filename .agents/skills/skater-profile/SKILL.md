---
name: skater-profile
description: The skater's own profile — level, the turns they know and do not, how fast they skate, their taste, the counts their jumps and stops land on, and what they have rejected. Everything in it was said by the skater and outranks the general rules in program-craft. Read before building or changing anything for a skater, and whenever a variant, sequence, entry or arm choice is being made. Says where profiles live, which one is active, and how to write a new one.
---

# The skater's profile

A program is built for one person. The general craft (**program-craft**) says
what a good program is; the profile says what *this* skater can do, how fast
they skate, what they have asked for and what they have rejected. **When the
two conflict, the profile wins.** The profile is the brief.

## Where

- Profiles live in `.agents/profiles/<name>.md`. The active one is named in
  `.agents/profiles/ACTIVE` (one line, no extension). Read that file first,
  then the profile. If `ACTIVE` is missing, there is no skater yet: ask, and
  write one before building anything.
- `.agents/profiles/TEMPLATE.md` is the shape of a new one;
  `.agents/profiles/example-prepre.md` is a filled-in (fictional) example of
  every section.
- A real skater's profile is named `local-<name>.md` — `local-*` and `ACTIVE`
  are gitignored, so their taste and counts stay on their machine. Their
  programs, envelope and remix deck live in `private/` the same way
  (`tools/publish-local.sh` puts the programs in the gallery).

## How to use it

1. Read the whole profile before touching a chain. Every line of "their
   taste, in their words" is a rule; every line of "do not know" is a hard no.
2. Anchor to the counts in its table (`anchor --at "...=@beat"`), then read the
   element list back in counts (`chain`), because that is how they check it.
3. When you make a judgment the profile does not cover (which foot a spiral is
   on, whether a tail is fixed), do it, and **say so** in the notes — the
   "Not stated yet" section is where those defaults are recorded.
4. When the skater says something new, put it in the profile — quoted, with
   the count or the number — the same session. Do not paraphrase a preference
   into a stronger claim than they made.

## Writing a new profile

Copy `TEMPLATE.md` to `local-<name>.md`. Fill in only what the skater said or what you measured
(`node tools/harness.js verify` for speeds). Set `speedScale` first — the
library's distances are an advanced skater's, and a learning skater's program
built at 1.0 averages ~5 m/s. Then the element content and the level
(**level-rules**), then their vocabulary, then their taste as they say it.
Point `ACTIVE` at it.

## Where it is enforced

`checkPlacement()` in `js/engine.js` (the rules panel) and the harness `verify`
report measure the placement rules the profile relies on: `offIce`,
`spins[].ok`, `jumps[].ok/awkward/builtSpeed`, `crossoverShare`,
`builderShare`, `tooFast`, `chstSpan`, ends, sides, corners, coverage,
crossover lobes, `distinct`. The numbers behind them are `PLACE` in engine.js;
change them there when a profile needs different ones, and say so in the
profile.

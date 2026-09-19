---
name: level-rules
description: How to find, verify and encode the competition rules for a skater's level — element caps, permitted jumps, required spins, combination rules, what the step sequence is — so the checker enforces the real rubric rather than a memory of it. Use whenever a skater names a level or federation, before claiming any program is "legal", and when adding a level to LEVELS in js/engine.js. USFS Aspire 4 is the worked example.
---

# Level rules

The program has to be legal at the skater's level, and "legal" is whatever the
federation's current sheet says — not what an agent remembers. So the rules
for a level are **researched, verified against the source, encoded in the
engine, and the source is recorded**. The checker then enforces them on
every build and the rules panel names the source.

## 1. Find the rubric

1. The profile names the level and federation (**skater-profile**). If it
   does not, ask — "pre-bronze", "Aspire 4", "Intercollegiate pre-pre",
   "Skate Canada STAR 5", "British Skating Level 3" are all different sheets.
2. Fetch the federation's *current* requirements document (USFS: the Aspire
   / Excel / Standard track requirement sheets; Skate Canada: STARSkate
   program requirements; ISU: the Technical Panel Handbook and the current
   Communication for elements). Prefer the PDF the federation publishes over
   a club's summary.
3. **Read it, do not parse it from memory.** If the PDF's text layer is
   unreadable, render pages to images (`qlmanage -t -s 2000 -o out/ file.pdf`
   on macOS, or `pdftoppm`) and read the images. Note the document title,
   season and the date you read it.

## 2. What to extract

For a free skate at a learning level, the sheet usually gives:

| Rule | `LEVELS.<id>` field | Notes |
|---|---|---|
| Program length | `time: [min, max]` seconds | often "max 1:40" → `[0, 100]` |
| Max jump elements | `maxJumpElements` | a combination counts as one element |
| Permitted jumps | `rules.permittedJumps` | library ids (`node tools/harness.js lib jumps`) |
| Repeat rule | `rules.maxSameJump` | "max 2 of any same jump" |
| Combinations | `rules.maxCombos`, `rules.maxJumpsPerCombo`, `rules.comboMayHaveThree` | |
| Max spins | `maxSpins` | |
| Required spin | `rules.requiredSpin` (library id), `rules.requiredSpinName` | add the spin to the library if it is missing |
| Second spin | `rules.secondSpinOnePosition` | |
| Spin entries / revolutions | `rules.noFlyingSpins`, `rules.spinMinRev` | revolutions are reported, not counted |
| Repeated spins | `rules.noRepeatedSpin` (default true) | |
| Step sequence | `maxStepSeq`, `rules.stepSeqIsChSt` | a ChSt "over half the ice" carries no level |
| Field moves | `rules.fieldMovesFree` (default true) | spirals, eagles, Bauers not counted |
| Hardest jump allowed | `maxJumpDiff` | library difficulty (singles 4, doubles 5) |
| Source | `rules.source` | document, season, date read — **required** |

Every `rules.*` field is optional; `checkLevelRules()` in `js/engine.js` only
checks what is present. Write what the sheet says, nothing it does not.

## 3. Encode and verify

1. Add the level to `LEVELS` in `js/engine.js` (the Level dropdown fills from
   it). Put the sheet's own wording in `note`.
2. Build a deliberately illegal program (six jumps, a repeated spin, a
   flying entry) and confirm `node tools/harness.js verify` lists each as a
   `ruleErrors` line; then a legal one and confirm it is clean. Run the
   preset regression (**verify-program**).
3. Record in the profile: the level id, the source line, and the element
   content the skater wants within it.

## 4. Worked example — USFS Aspire 4 free skate (the current profile's level)

Source: USFS *Aspire Program Requirements* 2025 (PDF), read 2026-09; the
text layer was unreadable and the pages were rendered to PNG and read.
Encoded as `LEVELS.aspire4`:

- **1:40 max.** **Jumps — max 5 jump elements.** Permitted: waltz, ½ flip,
  ½ Lutz, single Salchow, toe loop, Euler, loop, flip, Lutz. No Axel, no
  doubles. Max 2 of any same jump (a repeat need not be in a combination).
  Max 2 combinations, two jumps each, one may have three; or one combination
  and one jump sequence.
- **Spins — max 2.** Required: forward camel → forward sit combination
  (`spin-camel-sit`, added to the library for this — the older `spin-combo`
  is sit→camel→upright, the wrong order). Second spin single-position (a back
  scratch is fine). No flying entries, min 3 revolutions per position, no
  repeated spin, basic positions only.
- **Step sequence — max 1: a choreographic step sequence over ½ the ice.**
  Carries no level; difficult-turn counts are quality targets, and say so.
- **Moves in the field** allowed anywhere, not counted as elements.

What the code cannot check: revolutions, position quality. The panel says so.

## 5. Adding another federation's level

Same table; the field names are federation-neutral. If a sheet has a rule
the table cannot express (e.g. "one jump must be an Axel", "the spin must
change foot"), add a field and a check in `checkLevelRules()` beside the
others, name it in this table, and cite the sheet in `rules.source`.

# Skill experiments

The three rounds below were run on one skater's La La Land program; the
programs themselves are the skater's and are not shipped — `results.md` in
each round keeps the scores and the findings, which is what changed the
skills. Run the same loop on your own profile and track.

The question each round answers: **can an agent that has read only the skills
in `.agents/skills/` and the code build a program the skater would accept?**
Where it cannot, the skills are wrong or incomplete, not the agent.

## Protocol

1. `BRIEF.md` is the task, written the way the skater would say it. It does
   not restate anything a skill already says.
2. Five fresh `general-purpose` agents run in parallel with the same brief and
   one sentence of creative angle each. They get no conversation history —
   only the repo, the skills and the brief. They may not edit `js/`, the
   skills or other agents' folders.
3. Each writes `round-N/vK/program.json` (the app's save format), `notes.md`
   (the layout on paper: what lands where and why, in counts) and the
   harness `verify` output.
4. Scoring, in `round-N/results.md`:
   - `node tools/harness.js score round-N/*/program.json <the base program>`
   - hard fails and rule misses first; then the skater's stated wants
     (checked by hand against `skater-profile`); then quality.
   - For every miss: *which skill should have prevented it, and what sentence
     was missing or misleading.*
5. Fix the skills. Commit. Next round.
6. **The tree is frozen while a round runs.** Engine, harness and skill fixes
   wait until every agent has finished — three of the round-1 agents had the
   harness change under them mid-steer, which made their runs incomparable.

## Rounds

| Round | Date | Skills version | Best `ruleMisses` | Notes |
|---|---|---|---|---|
| 1 | 2026-09-13 | 881a518 | 0 (all five) | all clean; findings were steer variance and unstated conventions — see round-1/results.md |
| 2 | 2026-09-14 | 182883c | 0 (all five), 4–31 steers | own layouts; half-ice span and rotation were pipeline gaps, now engine fixes — see round-2/results.md |
| 3 | 2026-09-14 | 5683b78 | 0 (all five), **1 steer each** | pipeline question answered; remaining findings were margins, count budgets and arm rules — see round-3/results.md |

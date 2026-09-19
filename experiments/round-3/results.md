# Round 3 — results

Five fresh agents, skills at 5683b78, brief `round-3/BRIEF.md`: own layout,
and measure **steers to zero misses** with the rebuilt pipeline (rule-miss
steps in the cost, stretch, spread loop, polish, `--headings`).

| version | angle | steers to 0 | first run gave | cover | rot | ends | jumps on hit | distinct | xover | arm shapes | phrases |
|---|---|---|---|---|---|---|---|---|---|---|---|
| c3 (base) | — | — | — | 43 | 55 | 22/58/20 | 2 | 36 | .24 | 29 | 7 |
| v1 | melody / ballet | **1** | clean on both headings (un-steered: 6 misses) | 40 | 50 | 20/46/34 | **5** | 35 | .22 | 28 | 6 |
| v2 | jazz / show | **1** (+3 for choreography) | clean; 19/53/28, span .45 | 42 | 51 | 21/54/25 | **5** | 36 | .26 | 33 | 7 |
| v3 | memorable | **1** | clean; 18/50/32, span .45 | 43 | 50 | 18/50/32 | 4 | **29** | .30 | 27 | 8 |
| v4 | whole ice | **1** | clean; 29/53/19, span .45 | 42 | 49 | 29/53/19 | 4 | 33 | .26 | 32 | 9 |
| v5 | loud vs quiet | **1** | clean; 25/49/26 (un-steered: spins out, 2 jumps mid-ice, 5/67/27) | 42 | 50 | **25/49/26** | **5** | 35 | .32 | **34** | 8 |

Round 2 needed 4–31 steers per version; round 3 needed **one, five times out
of five**, from chains the agents had never steered before. The agents put
the saved time into the arms and the notes.

What is new: v1's zero-net-curl "cross roll → mohawk → 8-count swing roll →
three" line between the flips and a Bauer running straight into a spin that
exits on the 1:04 accent; v2's "curtain up" opening (hands over the face →
offered to the audience), a choreographic hop with jazz hands on the unused
0:10 hit, one clockwise recipe into both the Salchow and the Bauer; v3's one
run-in used three times and a sequence that is the same four ids on each
foot (29 distinct pieces); v4's right-foot spiral down the rink and a
sequence across 77% of the width; v5's spin exit via a back-inside mohawk
onto the 17&7 accent and power pulls into the stop one count before the cut.

**Best by the numbers: v5** (both ends ≥ 25%, all five jumps on hits, 34 arm
shapes) with v2 and v3 close; v3 is the one to learn fastest.

## What the agents found (deduplicated, with the fix)

| # | Finding (how many of 5) | Fix |
|---|---|---|
| 1 | **A clean steer lands exactly on the floors** (an end at 18.05%, the sequence at 0.453, a spin at 6.995 m) because the score had no reward for margin, and `verify` rounded them to 19 / 0.45 / 7.0. (3/5) | Engine: a capped margin reward inside each band; polish always runs. Harness: raw margins. Re-steering v4's chain now gives 27/22, spins 4.3/3.0, span 0.52. |
| 2 | **`minB` is a nominal average; `footworkPeak` is measured** — a 2-count triple twizzle passes the cap at 5.0 and peaks at 6.3. (3/5) | program-craft §5: twizzle-3 is a 3-beat element; check `footworkPeak` after shortening anything. |
| 3 | **The sequence's count budget (27) and the twizzle edges** (`twizzle-2` is forward inside, `twizzle-3` back inside) were unstated. (3/5) | step-sequence: budget, edges, closers that land on the Lutz edge and which of them are builders. |
| 4 | **`PLACE.speedBuilders` only in engine.js**; an expressive element between the last builder and the turn fails `builtSpeed`. (2/5) | program-craft §2: the list, and "expressive elements before the last builder". |
| 5 | **Asymmetric arm shapes across a foot change snap** (12–14 m/s) because poses mirror with the skating foot. (2/5) | arm-choreography rule; `verify` names the element (`outsideJumpsAt`). |
| 6 | The skater's anchors as beat numbers, and the tail as element ids and counts, were only recoverable by running `chain lalaland-c3`. (2/5) | skater-rules: the table. |
| 7 | Recipe × direction × counts: which entry fits which window. (2/5) | program-craft §2 table (five recipes with counts and curl). |
| 8 | `--headings` keeps only the winner by soft tie-break; run both as `--out` files when it matters. (2/5) | harness skill. |
| 9 | The curl tally predicts the pinned parts, not the open ice. (1/5) | program-craft §5. |
| 10 | The unused 0:10 hit; `@beat` is a number; "16 counts" is where the stop starts; `chain` did not print the total. (1/5 each) | music-mapping / harness / build-program / `chain` prints total beats vs music. |

## Verdict

The pipeline question is answered: with the skills as they are, a fresh
agent takes a paper design to a legal, on-music, well-placed, dancing-hands
program in **one steer**. What the rules cannot measure is taste — which of
fifteen clean programs the skater actually wants to skate — and that is the
input the next round needs.

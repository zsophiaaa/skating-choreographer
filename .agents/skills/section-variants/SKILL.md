---
name: section-variants
description: Author interchangeable variants of a program section for the Remix picker in js/variants.js — the entry/exit/beats contract, the chain validator, the beat-vs-distance speed budget, and the constraints a variant must respect (same jumps and spins, no over-speed elements, real spin length). Use when adding or editing variants, cutting a new program into sections, or when the user wants more choices for one part of a program.
---

# Section variants

## Where a deck lives

A remix deck is one program's sections, so it belongs to one skater: keep
it in `private/variants.js` (gitignored) and run `tools/publish-local.sh`,
which folds it into `js/local.js` where the app loads it. The shipped repo
has no deck; the New ▾ → Remix item says so until one is built.

## The contract

A section's variants are interchangeable **only** because they all share the
same three numbers, defined once in `SECTIONS`:

- **entry** edge code, **exit** edge code, and
- **beats** = Σ(element beats + gapBefore) — exact, to 0.01.

Matching edges mean any variant joins its neighbours with no connector; matching
beats mean every element after the swap still lands on the same beat of the
music. *Example from the La La Land deck: all 5⁶ combinations come out at
exactly 99.631 s with zero seams and no re-anchoring.* Break either and the
Remix picker silently produces a program that drifts off the music.

`validateVariants()` checks every variant against its contract and **must
return `[]`**. Run it first, before any of the heavier checks.

## Element content is held constant per section

Every variant of a section holds exactly the scored elements that section
owns in the base program — the same jumps, the same spin, the marked ChSt.
Vary the transitions, the held positions, the turn order — never the scored
content — so no combination can exceed the level's caps. *Example from the
La La Land deck: every "Flight" variant holds exactly two flips; every
"Build" the Salchow+Loop; every "Spin & drop" the camel→sit; every "Climax"
the Lutz+Loop, a marked ChSt, and the solo Lutz.*

## Authoring one

Chain format: `[libId, mirror, beats, gapBefore?, chst?]`. Check it live before
writing it to the file:

```js
window.checkChain=function(chain,entry,exit,beats){ let code=entry,b=0,probs=[];
  chain.forEach(([id,m,bt,gap],i)=>{ const lib=LIB_BY_ID[id]; if(!lib){probs.push(i+': unknown '+id);return;}
    const e=m?mirrorCode(lib.entry):lib.entry, x=m?mirrorCode(lib.exit):lib.exit;
    if(e!==code) probs.push(`${i} ${id}${m?'.R':''}: needs ${e}, have ${code}`); code=x; b+=bt+(gap||0); });
  if(code!==exit) probs.push(`exit ${code}, want ${exit}`);
  if(Math.abs(b-beats)>0.01) probs.push(`beats ${b.toFixed(2)}, want ${beats}`);
  return {ok:!probs.length, beats:+b.toFixed(3), probs}; };
checkChain([['pose-open',0,4],['stroke-f',0,4] /* … */], 'LFO','LBI',32)
```

Then build it in isolation and check speeds — the contract check does not
cover them:
```js
const picks=[0,0,0,0,0,0]; picks[sectionIndex]=variantIndex;
const p=buildRemix('t',picks,base), path=buildPath(p), a=analyze(p,path);
[a.continuity.length, a.speed.length, path.segs.filter(s=>s.speed>11).map(s=>s.lib.id+' '+s.speed.toFixed(1))]
```

## The speed budget will bite

Speed = `lib.dist × speedScale / (beats × 60/bpm)`. One beat is `60/bpm`
seconds (0.476 s at the current profile's 126 bpm). *Example from the La La
Land deck (at speedScale 1.0, before the profile set 0.8): three variants
failed the first sweep this way:*

| Element | dist | at 2 beats | what happened |
|---|---|---|---|
| `edge-change-b` | 12 m | 12.6 m/s | rebalanced: took 2 beats off the eagle |
| `spiral-fo` | 16 m | at 2.4 b, 14.0 m/s | rebalanced inside the same total |
| `swing-roll-b` | 14 m | — | **would not fit**: a 16-beat ending must also hold a ≥6-beat spin and a ≥2-beat pose |

When it genuinely does not fit, **redesign the variant's idea** rather than
shipping something unskatable — the swing-roll ending became "Long final pose".

Other floors: a back scratch spin needs ≥ 6 beats (three revolutions), a final
pose ≥ 2, and anything with `dist ≥ 12` needs ≥ 4 beats — or, exactly, the
`minB` that `node tools/harness.js lib --speedScale X --bpm Y` prints for the
profile's speed.

## Publishing

The five named mixes in `REMIX_PROGRAMS` are pushed into `PRESETS` at load by
`publishRemixPresets()` in variants.js, so the gallery cards and the picker
share one source of truth. Add a mix there, not as a hand-written preset.

After editing variants.js: `validateVariants()`, then each new variant in
isolation, then ~100 random `buildRemix` combinations checking seams, speed,
rule errors and that `path.totalTime` is a single value across all of them.

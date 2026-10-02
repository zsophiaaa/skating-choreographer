#!/usr/bin/env python3
"""Put the real count (and clock) at the front of every rink note.

She talks and learns in counts, and a note without one is a note she cannot
find on the music. The count is generated from the chain, so run this after
ANY change to beats or gapBefore — a hand-typed count goes stale the moment
an element above it changes length, which is how a note came to name 1&7 for
an element that starts on 2&3.  Usage: stamp-counts.py <save file> [--check]
"""
import json, re, sys
f = sys.argv[1]; check = '--check' in sys.argv
d = json.load(open(f)); P = d['program']; spb = 60.0 / P['bpm']
STAMP = re.compile(r'^\d+&\d+(\.\d+)?\s+\d+:\d\d(\.\d)?\s+')
beat = 0.0; out = []; changed = 0
for e in P['elements']:
    beat += e.get('gapBefore', 0)
    bar, cnt = int(beat // 8) + 1, beat % 8 + 1
    t = beat * spb
    stamp = '%d&%g  %d:%04.1f  ' % (bar, round(cnt, 2), int(t // 60), t % 60)
    note = STAMP.sub('', e.get('note', ''))
    if stamp + note != e.get('note', ''): changed += 1
    out.append(stamp + note)
    beat += e['beats']
if check:
    print('%d of %d notes carry a stale or missing count' % (changed, len(out)))
    sys.exit(1 if changed else 0)
for e, n in zip(P['elements'], out): e['note'] = n
json.dump(d, open(f, 'w'), indent=1)
print('stamped %d notes (%d changed)' % (len(out), changed))

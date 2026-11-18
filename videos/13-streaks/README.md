# 13 — Six in a row

## The question

My mate won six in a row. Is he on a hot streak, or is it just luck?

Asked by anyone who has watched a friend win at cards, darts or a coin toss.
The maths says nothing about any one person's skill. It says what pure luck
looks like in bulk: over a hundred fair tries, a run of six turns up about four
times in five, and a run of seven about every second time. So six in a row on
its own is not evidence of a hot streak. It is what chance does.

## How we ran it

1. **What a practitioner adds:** the exact distribution of the longest run is
   the standard run-length result (Feller's recurrent-events treatment). A
   made-up sequence tends to alternate too often, so its longest run is short.
   The expected longest run in n fair flips grows like log2(n), about 7 for 100.
   Runs do not make the next flip any likelier to repeat; the coin has no
   memory. Whether a person is skilled needs far more than one run to judge.
2. **Raw material:** 1,000 sequences of 100 fair flips from a seeded generator,
   plus one invented sequence that never runs past four.
3. **Methods:** dynamic programming over the current run length gives the exact
   chance of no run of k or more; the longest-run distribution is the
   difference between neighbouring k.
4. **Done-check (outside the model):** `streaks.test.ts` asserts 97.2%, 80.7%
   and 54.2% for runs of five, six and seven or more, brute-forces short
   sequences against the dynamic programme, and checks a 20,000-sequence run
   converging on the exact answer.

---

### BEAT 1 — HOOK · 0.0–5.0s

> Hot streak, or luck? Your mate just won six in a row.

**On screen:** Frame 0 is the payoff and the thumbnail: the distribution of the
longest run in 1,000 sequences of 100 flips, with the exact heights marked and
six picked out. The headline asks the question. From about 1.5s the bars drain
to nothing.
**Caption:** `HOT STREAK, OR LUCK?`

### BEAT 2 — THE RULE · 5.0–11.0s

> Flip a fair coin a hundred times. Each flip is heads or tails, fifty-fifty.

**On screen:** A ten by ten grid of discs fills in, one per flip. A filled disc
is heads and a hollow ring is tails, with a key saying so.
**Caption:** `100 FLIPS, 50-50 EACH`

### BEAT 3 — HOW IT'S JUDGED · 11.0–15.5s

> Look for the longest run of one face. Is it six or more?

**On screen:** The grid stays. The line of "six or more" is spelled out under
the headline.
**Caption:** `LONGEST RUN OF ONE FACE`

### BEAT 4 — ONE EXAMPLE · 15.5–22.0s

> In this hundred, the longest run is six. Nothing was hot. It's a coin.

**On screen:** The six cells of the run are ringed in order and counted 1 to 6
on the grid.
**Caption:** `THIS HUNDRED: SIX IN A ROW`

### BEAT 5 — THE CLASSROOM · 22.0–28.0s

> Ask a class to invent a hundred flips. They rarely write a run of six.

**On screen:** Two small grids side by side: a made-up sequence, labelled as an
illustration, whose longest run is four, and a real one whose longest run is
six.
**Caption:** `MADE UP: LONGEST RUN 4`

### BEAT 6 — NOW 1,000 · 28.0–32.0s

> Now a thousand more sets of a hundred flips.

**On screen:** Bars grow as the 1,000 sequences are sorted by their longest run,
with a counter.
**Caption:** `1,000 SETS OF 100 FLIPS`

### BEAT 7 — THE RESULTS · 32.0–37.0s

> Eight in ten hold a run of six or more. The exact maths agrees.

**On screen:** The exact heights land on the bars. The six-or-more share is
shown beside the exact 80.7%, in vermilion because it is the exact answer.
**Caption:** `SIX OR MORE: 8 IN 10`

### BEAT 8 — THE POINT · 37.0–43.5s

> In a hundred tries, six in a row turns up four times in five. What do you
> think?

**On screen:** The hook's frame again, so the last frame matches frame 0 and
the video loops.
**Caption:** `HOT STREAK, OR LUCK?`

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Flips per sequence | 100 | `FLIPS` |
| Sequences | 1,000 | `SEQUENCES` |
| Run of five or more | 97.2% | `probRunAtLeast(100, 5)` |
| Run of six or more, exact | 80.7% | `probRunAtLeast(100, 6)` |
| Run of seven or more | 54.2% | `probRunAtLeast(100, 7)` |
| Run of six or more, simulated | 81.1% of 1,000 | `runStreaks` |
| Longest run, made-up example | 4 | `inventedSequence` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/streaks.test.ts
```

General information only, not financial advice.

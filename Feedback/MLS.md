## Maximum Length Sequence (MLS)

A **Maximum Length Sequence** (also called an _m-sequence_) is a type of pseudorandom binary sequence with the longest possible period for a given shift register length — hence "maximum length."

---

### How It's Generated

An MLS is produced by a **Linear Feedback Shift Register (LFSR)**: a chain of _n_ binary memory cells (flip-flops) where the next state is computed by XOR-ing specific "tapped" cells and feeding the result back into the register.

```
  ┌───┬───┬───┬───┐
→ │ D │ D │ D │ D │ → output
  └───┴─┬─┴───┴─┬─┘
        └──XOR──┘ ← feedback
```

- An _n_-stage LFSR produces a sequence of length **2ⁿ − 1** before repeating.
- That's the maximum possible period (all-zeros state is excluded, as it causes the register to lock up).
- The choice of which cells to tap determines whether you get a max-length sequence — these are described by **primitive polynomials** over GF(2).

---

### Key Properties

|Property|Description|
|---|---|
|**Period**|2ⁿ − 1 bits|
|**Balance**|Exactly 2ⁿ⁻¹ ones and 2ⁿ⁻¹ − 1 zeros per period|
|**Run property**|Runs of 1s and 0s follow a specific statistical pattern|
|**Autocorrelation**|Near-ideal: peak at zero lag, value of −1 everywhere else (like white noise)|
|**Shift-and-add**|XOR of any two shifts of the sequence is another shift of the same sequence|

The autocorrelation property is arguably the most important — it makes MLS behave like **white noise** in a very precise, deterministic way.

---

### Why It Matters

Because an MLS is **deterministic yet noise-like**, it's enormously useful:

- **Acoustics / Room Impulse Response measurement** — play an MLS through a speaker, record the result, cross-correlate with the original → you get the room's impulse response. Fast and noise-immune.
- **Spread-spectrum communications (CDMA)** — GPS, 3G/4G use MLS-like codes so multiple users share the same frequency band without interfering.
- **Cryptography** — used as building blocks in stream ciphers (though alone, LFSRs are cryptographically weak).
- **Bit error rate testing (BERT)** — standard test patterns (e.g. PRBS-7, PRBS-23) are m-sequences used to stress communication links.
- **System identification** — probing a system's response without needing an ideal impulse.

---

### Simple Example (n = 3)

Using feedback taps at positions 3 and 2 (polynomial x³ + x + 1):

|Step|Register state|Output|
|---|---|---|
|0|1 0 1|1|
|1|1 1 0|0|
|2|0 1 1|1|
|3|1 0 1|1 → (repeats)|

Wait — with n=3 the period is 2³−1 = **7**. Starting from `001`:

`0 0 1 0 1 1 1` → repeats. Seven bits, all non-zero states visited exactly once.

---

### Summary

An MLS is the "most random" sequence a simple shift register can produce. Its combination of **determinism, maximal period, and white-noise-like statistics** makes it a foundational tool in signal processing, communications, and testing.
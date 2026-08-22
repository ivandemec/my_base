---
title: "BA Frequency Response Error Analysis — 50 Ω Receiver"
date: 2026-08-18
tags: [error-analysis, balanced-armature, frequency-response, uncertainty, measurement]
source: "Derived from voltage-divider error propagation with BA AC impedance model"
---

# Balanced Armature Frequency Response Error Analysis

## 50 Ω Receiver (±10%), 12 Ω Sense Resistor (±1%)

## 1. System Description

| Parameter | Value |
|---|---|
| Drive level | 850 mV |
| Series (sense) resistor | 12 Ω ±1% |
| Receiver DCR (BA) | 50 Ω ±10% |
| Correction samples | 10 BA units (averaged at discrete frequency points) |
| Measurement samples | 100,000 BA units |
| Frequency range | 100 Hz – 10 kHz |

**Circuit model:** A voltage divider where the BA impedance $Z_{BA}(f)$ is the load, and $R_{sense} = 12\;\Omega$ is in series:

$$V_{meas}(f) = V_{drive} \cdot \frac{Z_{BA}(f)}{R_{sense} + Z_{BA}(f)}$$

A **voltage level correction** is determined by averaging measurements on 10 BA samples at discrete frequency points. This correction constant (one value per frequency) is then applied to all 100,000 subsequent measurements.

---

## 2. Balanced Armature AC Impedance Model

The BA is not a simple resistor — its AC impedance is frequency-dependent and varies unit-to-unit:

$$Z_{BA}(f) = R_{DCR} + j\omega L_e + Z_{motional}(f)$$

where the motional impedance is:

$$Z_{motional}(f) = R_{mot} \cdot \frac{j\omega/\omega_0}{1 - (\omega/\omega_0)^2 + j\omega/(Q\,\omega_0)}$$

### Model Parameters

| Parameter | Symbol | Value | Tolerance |
|---|---|---|---|
| DC resistance | $R_{DCR}$ | 50 Ω | ±10% |
| Voice coil inductance | $L_e$ | 0.5 mH | ±10% |
| Resonance frequency | $f_0$ | 2000 Hz | ±5% |
| Q factor | $Q$ | 2.5 | ±15% |
| Motional resistance | $R_{mot}$ | 50 Ω | — |

### Simulated BA Impedance (Monte Carlo, 100,000 units)

| Freq (Hz) | \|Z_BA\| nominal (Ω) | Mean (Ω) | Std (Ω) | CV (%) |
|---|---|---|---|---|
| 100 | 50.1 | 50.1 | 2.9 | 5.8 |
| 200 | 50.5 | 50.5 | 2.9 | 5.7 |
| 500 | 53.5 | 53.5 | 2.8 | 5.2 |
| 1000 | 67.6 | 67.7 | 2.8 | 4.2 |
| 2000 | 175.1 | 173.5 | 11.1 | 6.4 |
| 3000 | 83.3 | 83.5 | 4.4 | 5.3 |
| 5000 | 54.9 | 54.9 | 2.9 | 5.3 |
| 7000 | 52.3 | 52.4 | 2.9 | 5.5 |
| 10000 | 55.1 | 55.1 | 2.8 | 5.0 |

**Key result:** BA impedance varies ~5.4% (mean CV) across the population at all frequencies.

---

## 3. Error Sources

### 3.1 Correction Sampling Bias (Systematic)

The correction constant is the average of 10 BA samples. The standard error of this mean is:

$$u_{corr} = \frac{CV_{pop}}{\sqrt{N_{corr}}} = \frac{5.4\%}{\sqrt{10}} = 1.70\%$$

where $CV_{pop}$ is the population coefficient of variation of $|Z_{BA}(f)|$.

**This is a fixed bias** applied to all 100,000 units — it does not average out.

### 3.2 BA Unit-to-Unit Spread (Systematic, Per-Unit)

Each BA unit's impedance deviates from the population mean (correction constant) by:

$$u_{spread} = CV_{pop} = 5.37\%$$

**This is a per-unit systematic error** — each of the 100,000 units has its own bias. On aggregate (population mean), these deviations average to zero, but for any individual measurement, the full 5.37% applies.

### 3.3 Sense Resistor Tolerance (±1%, Systematic)

Standard uncertainty (rectangular distribution):

$$u(R_{sense}) = \frac{1\%}{\sqrt{3}} = 0.577\%$$

The sensitivity of the divider ratio to $R_{sense}$ is attenuated:

$$s(R_{sense}) = \frac{-R_{sense}}{|R_{sense} + Z_{BA}|} \approx -0.19 \text{ (at 100 Hz)}$$

Contributed error: $|s| \cdot u = 0.19 \times 0.577\% = 0.11\%$

### 3.4 Receiver DCR Tolerance (±10%, Systematic)

Standard uncertainty:

$$u(R_{DCR}) = \frac{10\%}{\sqrt{3}} = 5.774\%$$

The sensitivity of the divider ratio to $|Z_{BA}|$ is:

$$s(Z_{BA}) = \frac{R_{sense}}{|R_{sense} + Z_{BA}|} \approx 0.19 \text{ (at 100 Hz)}$$

Contributed error: $|s| \cdot u = 0.19 \times 5.774\% = 1.11\%$

> **Note:** With the 50 Ω receiver, the divider ratio is 12/(12+50) ≈ 0.193. This is **larger** than the 100 Ω case (0.107), meaning resistor tolerance errors pass through with less attenuation. However, the DCR tolerance's contribution is still smaller than the BA unit spread.

### 3.5 Measurement Noise (Random)

With 100,000 samples, random noise is suppressed by $\sqrt{N}$:

$$u_{noise} = \frac{\sigma_{single}}{\sqrt{N_{meas}}} = \frac{1\%}{\sqrt{100{,}000}} = 0.003\%$$

**Negligible** — not included in the final budget.

### 3.6 Frequency-Response Flatness

The RC bandwidth limit from stray capacitance ($\sim$100 pF) and total impedance is:

$$f_{RC} = \frac{1}{2\pi \cdot R_{total} \cdot C_{stray}} \approx \frac{1}{2\pi \cdot 62 \cdot 100\,\text{pF}} \approx 25.7\;\text{MHz}$$

This is far above 10 kHz, so **no frequency-dependent amplitude error** from the RC limit.

---

## 4. Voltage Divider Sensitivity (Frequency-Dependent)

| Freq (Hz) | \|Z_BA\| (Ω) | \|H\| | V_meas (mV) | s(R_sense) | s(Z_BA) |
|---|---|---|---|---|---|
| 100 | 50.1 | 0.8071 | 686.0 | −0.1930 | 0.1928 |
| 200 | 50.5 | 0.8089 | 687.5 | −0.1913 | 0.1912 |
| 500 | 53.5 | 0.8215 | 698.3 | −0.1795 | 0.1794 |
| 1000 | 67.6 | 0.8647 | 735.0 | −0.1379 | 0.1378 |
| 2000 | 175.1 | 0.9359 | 795.5 | −0.0641 | 0.0640 |
| 3000 | 83.3 | 0.8857 | 752.8 | −0.1159 | 0.1158 |
| 5000 | 54.9 | 0.8216 | 698.4 | −0.1786 | 0.1785 |
| 7000 | 52.3 | 0.8145 | 692.3 | −0.1857 | 0.1856 |
| 10000 | 55.1 | 0.8304 | 705.8 | −0.1716 | 0.1715 |

**Observation:** At resonance (2 kHz), $|Z_{BA}|$ peaks at 175 Ω, pushing the divider ratio to 0.936 and reducing sensitivity to resistor errors. At the band edges, $|Z_{BA}| \approx 50$ Ω and sensitivity is highest.

---

## 5. Combined Uncertainty

All error sources are combined in root-sum-of-squares (RSS), assuming independence:

$$u_{combined}(f) = \sqrt{u_{corr}^2 + u_{spread}^2 + \left[s(R_{sense}) \cdot u(R_{sense})\right]^2 + \left[s(Z_{BA}) \cdot u(R_{DCR})\right]^2}$$

### Error Budget by Frequency

| Freq (Hz) | (a) Corr bias | (b) Unit spread | (c) R_sense ±1% | (d) DCR ±10% | Combined (1σ) | Expanded (k=2, 95%) |
|---|---|---|---|---|---|---|
| 100 | 1.70% | 5.37% | 0.111% | 1.113% | **5.75%** | **11.49%** |
| 200 | 1.70% | 5.37% | 0.110% | 1.104% | **5.74%** | **11.49%** |
| 500 | 1.70% | 5.37% | 0.104% | 1.036% | **5.73%** | **11.46%** |
| 1000 | 1.70% | 5.37% | 0.080% | 0.796% | **5.69%** | **11.39%** |
| 2000 | 1.70% | 5.37% | 0.037% | 0.370% | **5.65%** | **11.30%** |
| 3000 | 1.70% | 5.37% | 0.067% | 0.669% | **5.68%** | **11.35%** |
| 5000 | 1.70% | 5.37% | 0.103% | 1.031% | **5.73%** | **11.46%** |
| 7000 | 1.70% | 5.37% | 0.107% | 1.072% | **5.74%** | **11.48%** |
| 10000 | 1.70% | 5.37% | 0.099% | 0.990% | **5.72%** | **11.45%** |

The error is remarkably **flat across frequency** (5.65–5.75%, 1σ) because the BA population CV is relatively uniform and the divider sensitivity stays in a moderate range.

---

## 6. Summary

### Two Interpretations of Error

| Interpretation | 1σ | k=2 (95%) | Absolute (850 mV) |
|---|---|---|---|
| **Per-unit** (any single measurement) | **±5.7%** | **±11.4%** | ±48.6 mV (1σ), ±97.1 mV (k=2) |
| **Population mean** (aggregate of 100k units) | **±1.9%** | **±3.9%** | — |

**Per-unit:** Includes the BA unit-to-unit spread (5.37%), which does not average out — each unit has its own impedance curve that deviates from the correction constant.

**Population mean:** The unit spread averages out across 100,000 units. Only the correction sampling bias (1.70%) and resistor tolerances remain.

### Error Source Breakdown

| Source | 1σ | Share of variance | Type |
|---|---|---|---|
| BA unit-to-unit spread | 5.37% | **87%** | Systematic (per-unit) |
| Correction sampling bias | 1.70% | **9%** | Systematic (fixed) |
| DCR tolerance (±10%) | ~1.0% | **3%** | Systematic |
| R_sense tolerance (±1%) | ~0.1% | <1% | Systematic |
| Measurement noise | 0.003% | ~0% | Random (negligible) |

### Comparison: 50 Ω vs 100 Ω Receiver

| Metric | 50 Ω (±10%) | 100 Ω (±10%) | Ratio |
|---|---|---|---|
| Per-unit 1σ | ±5.7% | ±8.4% | 0.68× (better) |
| Per-unit k=2 | ±11.4% | ±16.8% | 0.68× (better) |
| Population 1σ | ±1.9% | ±6.1% | 0.31× (better) |
| Divider sensitivity | 0.193 | 0.107 | — |

The 50 Ω receiver is **32% better** in per-unit error because:
- The BA unit spread (5.37%) is similar in both cases
- But the divider ratio 12/(12+50)=0.193 vs 12/(12+100)=0.107 means the DCR tolerance contribution is larger (1.1% vs 0.6%)
- The key advantage: the population mean error drops from 6.1% to 1.9% because the DCR tolerance propagates with higher sensitivity, but the BA spread — which is already captured in the per-unit number — dominates less

### Why 100,000 Samples Don't Help

All dominant errors are **systematic**, not random:
- **Correction bias** (1.70%): Fixed offset from calibrating on only 10 units — more measurement samples cannot fix this
- **Unit spread** (5.37%): Each BA has its own impedance curve — this is a per-unit systematic, not random noise
- **Resistor tolerances**: Hardware-limited, fixed

The 100,000 samples only suppress random noise (already negligible at 0.003%).

---

## 7. Formulas Used

### Voltage Divider (AC)

$$H(f) = \frac{Z_{BA}(f)}{R_{sense} + Z_{BA}(f)}, \qquad V_{meas}(f) = V_{drive} \cdot |H(f)|$$

### BA Impedance

$$Z_{BA}(f) = R_{DCR} + j\omega L_e + R_{mot} \cdot \frac{j\omega/\omega_0}{1 - (\omega/\omega_0)^2 + j\omega/(Q\,\omega_0)}$$

### Logarithmic Sensitivity Coefficients

$$s(R_{sense}) = \frac{\partial \ln|H|}{\partial \ln R_{sense}} = \frac{-R_{sense}}{|R_{sense} + Z_{BA}|} \cdot \cos(\theta_{divider})$$

$$s(Z_{BA}) = \frac{\partial \ln|H|}{\partial \ln |Z_{BA}|} = \frac{R_{sense}}{|R_{sense} + Z_{BA}|} \cdot \cos(\theta_{divider})$$

where $\theta_{divider} = \angle(R_{sense} + Z_{BA}) - \angle(Z_{BA})$.

In practice, these are computed numerically by perturbation: $\pm 0.1\%$ perturbation of $R_{sense}$ or $|Z_{BA}|$ and measuring the resulting change in $|H|$.

### Standard Uncertainty (Rectangular Distribution)

$$u = \frac{\text{tolerance}}{\sqrt{3}}$$

### Correction Sampling Error (Standard Error of Mean)

$$u_{corr} = \frac{CV_{pop}}{\sqrt{N_{corr}}}$$

### Combined Uncertainty (RSS)

$$u_{combined} = \sqrt{u_{corr}^2 + u_{spread}^2 + [s(R_{sense}) \cdot u(R_{sense})]^2 + [s(Z_{BA}) \cdot u(R_{DCR})]^2}$$

### Expanded Uncertainty

$$U = k \cdot u_{combined}, \qquad k=2 \text{ for } 95\% \text{ confidence}$$

---

## 8. Improvement Paths

| Improvement | Effect on 1σ | New per-unit error |
|---|---|---|
| Baseline (50 Ω, 10 samples) | — | 5.7% |
| Increase correction to 100 samples | (a) 1.70% → 0.54% | 5.4% |
| Tighten DCR to ±1% | (d) 1.0% → 0.1% | 5.4% |
| Per-unit impedance measurement | (b) eliminated | 1.8% |
| All three combined | — | ~0.6% |

**Most impactful:** Per-unit impedance measurement (eliminates the 87% contributor). If that's not feasible, increasing correction samples to 100 provides marginal improvement since the unit spread dominates.

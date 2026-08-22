---
title: "Balanced Armature Frequency Response Error Budget — R_DCR = 50 Ω"
date: 2026-08-18
tags: [measurement, error-budget, balanced-armature, frequency-response, uncertainty-analysis]
---

# Balanced Armature Frequency Response Error Budget

**Receiver DCR:** 50 Ω ±10%  
**Series resistor:** 12 Ω ±1%  
**Drive level:** 850 mV  
**Correction samples:** 10 (averaged at each frequency point)  
**Measurement samples:** 100,000  
**Frequency band:** 100 Hz – 10 kHz

---

## 1. System Topology

```
V_drive (850 mV) → R_series (12 Ω ±1%) → Z_BA(ω) → GND
                                         ↑
                                    V_out measured here
```

The balanced armature (BA) presents a **complex, frequency-dependent impedance** Z_BA(ω) that varies **sample-to-sample**. The DC resistance R_DCR = 50 Ω ±10% is only the low-frequency asymptote; the AC impedance rises through the mechanical resonance (~2–3 kHz) and again at higher frequencies due to inductance.

### Voltage Divider (AC)

$$V_{out}(\omega) = V_{drive} \cdot \frac{Z_{BA}(\omega)}{Z_{BA}(\omega) + R_{series}}$$

### BA Impedance Model (estimated)

| Freq (Hz) | \|Z_BA\| (Ω) | Notes |
|-----------|-------------|-------|
| 100       | 55          | Mostly R_DCR |
| 500       | 60          | Slight inductive rise |
| 1000      | 75          | Approaching resonance |
| 2000      | 100         | Near resonance — impedance rises |
| 3000      | 90          | Resonance region |
| 5000      | 80          | Post-resonance |
| 10000     | 95          | Inductive rise |

### BA Sample-to-Sample Variation (CV)

| Freq (Hz) | CV_BA | Notes |
|-----------|-------|-------|
| 100       | 10%   | Dominated by R_DCR tolerance |
| 500       | 10%   | Still mostly R_DCR |
| 1000      | 12%   | Resonance variation begins |
| 2000      | 18%   | Near resonance — max variation |
| 3000      | 20%   | Resonance peak — worst case |
| 5000      | 15%   | Post-resonance |
| 10000     | 12%   | Inductive region |

---

## 2. Error Sources

Four independent contributions are evaluated:

| # | Source | Type | Nature |
|---|--------|------|--------|
| 1 | BA impedance sample-to-sample variation | Type A | Systematic (per-unit) |
| 2 | Correction factor mean estimation (N=10) | Type A | Systematic |
| 3 | R_series ±1% tolerance | Type B (rectangular) | Frequency-independent |
| 4 | Measurement noise (N=100k) | Type A (random) | Random |

---

## 3. Formulas

### 3.1 Series Resistor Tolerance (Type B, Rectangular Distribution)

A component with tolerance ±a% has a rectangular (uniform) distribution. The standard uncertainty is:

$$u(R_{series}) = \frac{R_{series} \cdot \text{tol}}{\sqrt{3}}$$

The sensitivity of V_out to R_series is:

$$\frac{\partial V_{out}}{\partial R_{series}} = -\frac{V_{drive} \cdot Z_{BA}}{(Z_{BA} + R_{series})^2}$$

Relative uncertainty contribution:

$$\frac{u(V)_{R_s}}{V_{out}} = \frac{R_{series}}{Z_{BA} + R_{series}} \cdot \frac{\text{tol}_{R_s}}{\sqrt{3}}$$

### 3.2 Correction Factor — Mean Estimation (Type A)

The correction C(ω_k) is the arithmetic mean of N_corr = 10 BA samples measured at frequency point ω_k. The standard uncertainty of the mean (standard error) is:

$$\frac{u(C)}{C} = \frac{CV_{BA}(\omega)}{\sqrt{N_{corr}}} = \frac{CV_{BA}(\omega)}{\sqrt{10}}$$

This represents how accurately the 10-sample mean estimates the true population mean. It is a **systematic** error — it does not reduce with measurement samples.

### 3.3 Per-Unit Mismatch (Scenario B)

When the average correction is applied to each individual unit, the per-unit error combines the mean estimation error and the population spread:

$$u_{unit} = CV_{BA}(\omega) \cdot \sqrt{1 + \frac{1}{N_{corr}}}$$

This is the RSS of:
- The mean estimation error: CV/√N
- The per-unit deviation from the mean: CV

### 3.4 Measurement Noise (Type A, Random)

With N_meas = 100,000 samples, random noise averages as:

$$\frac{u_{noise}}{V} = \frac{CV_{noise}}{\sqrt{N_{meas}}} = \frac{CV_{noise}}{\sqrt{100{,}000}} \approx \frac{CV_{noise}}{316}$$

For any reasonable single-shot CV (0.5–5%), this yields < 0.02% → **negligible**.

### 3.5 Combined Standard Uncertainty

Independent contributions are combined by root-sum-of-squares (RSS):

**Scenario A (population-level):**

$$u_{comb,A}(\omega) = \sqrt{\left(\frac{CV_{BA}(\omega)}{\sqrt{N_{corr}}}\right)^2 + \left(\frac{u(V)_{R_s}}{V_{out}}\right)^2}$$

**Scenario B (per-unit):**

$$u_{comb,B}(\omega) = \sqrt{\left(CV_{BA}(\omega) \cdot \sqrt{1 + \frac{1}{N_{corr}}}\right)^2 + \left(\frac{u(V)_{R_s}}{V_{out}}\right)^2}$$

### 3.6 Expanded Uncertainty (k=2, ~95% Confidence)

$$U = k \cdot u_{comb}, \quad k = 2$$

### 3.7 Conversion to Decibels

$$\Delta L\,[dB] = 20 \cdot \log_{10}(1 + u_{rel})$$

---

## 4. Calculation Results

### 4.1 Series Resistor Contribution

| Freq (Hz) | \|Z_BA\| (Ω) | R_s/(Z+R_s) | rel u(V) | dB |
|-----------|-------------|-------------|----------|-----|
| 100       | 55          | 0.1791      | 0.1034%  | 0.0090 |
| 500       | 60          | 0.1667      | 0.0962%  | 0.0084 |
| 1000      | 75          | 0.1379      | 0.0796%  | 0.0069 |
| 2000      | 100         | 0.1071      | 0.0619%  | 0.0054 |
| 3000      | 90          | 0.1176      | 0.0679%  | 0.0059 |
| 5000      | 80          | 0.1304      | 0.0753%  | 0.0065 |
| 10000     | 95          | 0.1121      | 0.0647%  | 0.0056 |

→ **Negligible** (< 0.01 dB) at all frequencies. R_series << Z_BA, so the divider is insensitive.

### 4.2 Correction Factor — Mean Estimation Error

| Freq (Hz) | CV_BA | u(C)/C = CV/√10 | dB (k=1) | dB (k=2) |
|-----------|-------|----------------|----------|----------|
| 100       | 10%   | 3.16%          | 0.270    | 0.533    |
| 500       | 10%   | 3.16%          | 0.270    | 0.533    |
| 1000      | 12%   | 3.79%          | 0.324    | 0.635    |
| 2000      | 18%   | 5.69%          | 0.481    | 0.936    |
| 3000      | 20%   | 6.32%          | 0.533    | 1.035    |
| 5000      | 15%   | 4.74%          | 0.403    | 0.787    |
| 10000     | 12%   | 3.79%          | 0.324    | 0.635    |

### 4.3 Per-Unit Mismatch (Scenario B)

| Freq (Hz) | CV_BA | u_unit = CV×√(1+1/N) | dB (k=1) | dB (k=2) |
|-----------|-------|---------------------|----------|----------|
| 100       | 10%   | 10.5%               | 0.866    | 1.654    |
| 500       | 10%   | 10.5%               | 0.866    | 1.654    |
| 1000      | 12%   | 12.6%               | 1.030    | 1.950    |
| 2000      | 18%   | 18.9%               | 1.502    | 2.782    |
| 3000      | 20%   | 21.0%               | 1.654    | 3.043    |
| 5000      | 15%   | 15.7%               | 1.269    | 2.376    |
| 10000     | 12%   | 12.6%               | 1.030    | 1.950    |

### 4.4 Combined Error Budget

#### Scenario A — Population-Level (mean estimation error only)

| Freq (Hz) | u(C)/C | u(R_s) | u_comb | k=1 (dB) | k=2 (dB) |
|-----------|--------|--------|--------|----------|----------|
| 100       | 3.16%  | 0.10%  | 3.16%  | 0.271    | 0.533    |
| 500       | 3.16%  | 0.10%  | 3.16%  | 0.271    | 0.533    |
| 1000      | 3.79%  | 0.08%  | 3.80%  | 0.324    | 0.636    |
| 2000      | 5.69%  | 0.06%  | 5.69%  | 0.481    | 0.937    |
| 3000      | 6.32%  | 0.07%  | 6.32%  | 0.533    | 1.035    |
| 5000      | 4.74%  | 0.08%  | 4.74%  | 0.403    | 0.787    |
| 10000     | 3.79%  | 0.06%  | 3.80%  | 0.324    | 0.635    |

#### Scenario B — Per-Unit (individual unit mismatch)

| Freq (Hz) | u_unit | u(R_s) | u_comb | k=1 (dB) | k=2 (dB) |
|-----------|--------|--------|--------|----------|----------|
| 100       | 10.5%  | 0.10%  | 10.49% | 0.866    | 1.654    |
| 500       | 10.5%  | 0.10%  | 10.49% | 0.866    | 1.654    |
| 1000      | 12.6%  | 0.08%  | 12.59% | 1.030    | 1.950    |
| 2000      | 18.9%  | 0.06%  | 18.88% | 1.502    | 2.782    |
| 3000      | 21.0%  | 0.07%  | 20.98% | 1.654    | 3.043    |
| 5000      | 15.7%  | 0.08%  | 15.73% | 1.269    | 2.376    |
| 10000     | 12.6%  | 0.06%  | 12.59% | 1.030    | 1.950    |

---

## 5. Summary

```
┌──────────────────────────────────────────────────────────────────┐
│  R_DCR = 50 Ω ±10%, R_series = 12 Ω ±1%, V_drive = 850 mV       │
│  N_corr = 10, N_meas = 100,000, Band: 100 Hz – 10 kHz           │
│                                                                  │
│  SCENARIO A (population-level):                                 │
│    k=1:  0.27 – 0.53 dB   (worst at ~3 kHz)                     │
│    k=2:  0.53 – 1.03 dB   (95% confidence)                      │
│                                                                  │
│  SCENARIO B (per-unit):                                         │
│    k=1:  0.87 – 1.65 dB   (worst at ~3 kHz)                     │
│    k=2:  1.65 – 3.04 dB   (95% confidence)                      │
└──────────────────────────────────────────────────────────────────┘
```

### Error Sources Ranked

1. **★★★ DOMINANT: BA impedance sample-to-sample variation** (CV 10–20%)
   - The 10-sample correction captures the mean but NOT per-unit spread
   - Worst around mechanical resonance (~2–3 kHz) where CV peaks at ~20%
   - Does NOT improve with 100k measurement samples

2. **★★ Mean estimation** — how well 10 samples estimate the true mean
   - u(C)/C = CV/√10 → 3.2–6.3% depending on frequency
   - Contributes 0.27–0.53 dB (k=1) even in the best case

3. **★ Negligible: R_series ±1% tolerance**
   - < 0.01 dB at all frequencies (R_series << Z_BA)

4. **★ Negligible: Measurement noise** (100k samples)
   - σ/√100000 → < 0.01 dB (random noise fully averaged)

### Key Insights

- The **100,000 samples** eliminate random measurement noise, but the error is dominated by **BA sample-to-sample impedance variation** that the 10-sample correction cannot capture.
- The correction removes the **average offset** but each unit still differs from the average by ~10–20% depending on frequency.
- The error is **frequency-dependent** and peaks at the BA mechanical resonance (~2–3 kHz), where impedance variation between samples is greatest.
- Changing R_DCR from 100 Ω to 50 Ω does **not materially change** the error budget — the dominant error is the BA impedance CV (a relative measure), not the absolute impedance.

### Improvement: Increasing Correction Samples

At 3 kHz (CV_BA = 20%), increasing the correction sample count:

| N_corr | CV/√N | k=2 (dB) | Improvement |
|--------|-------|----------|------------|
| 10     | 6.32% | 1.035    | 1.0×       |
| 20     | 4.47% | 0.744    | 1.4×       |
| 50     | 2.83% | 0.478    | 2.2×       |
| 100    | 2.00% | 0.341    | 3.0×       |
| 200    | 1.41% | 0.242    | 4.3×       |

→ Going from 10 → 50 correction samples **halves** the mean estimation error.
→ The per-unit mismatch (Scenario B) does NOT improve with more correction samples.

---

## 6. Assumptions and Limitations

1. **BA impedance values** (|Z_BA| and CV_BA) are estimates based on typical balanced armature behavior. Actual values should be measured.
2. **CV_BA is frequency-dependent** — the values used here assume worst-case variation at the mechanical resonance (~2–3 kHz). If the BA resonance is at a different frequency, the error profile shifts accordingly.
3. **R_DCR ±10%** is treated as a rectangular (uniform) distribution per GUM (Guide to the Expression of Uncertainty in Measurement). If the manufacturer specifies a confidence interval (e.g., ±10% at 95%), the divisor would be 2 instead of √3.
4. **The correction is assumed to be done at the same frequency points** as the measurement. If interpolation between correction points is needed, additional error arises.
5. **Phase/magnitude coupling** is not considered — only the magnitude of Z_BA is corrected. If the measurement requires phase accuracy, the complex impedance variation must be analyzed separately.
6. **Temperature effects** are not included. BA impedance can drift with temperature, adding a further systematic if measurements span different thermal conditions.

---

## References

- GUM: *Guide to the Expression of Uncertainty in Measurement* (JCGM 100:2008)
- *Evaluation of measurement data — Supplement 1 to the GUM* (JCGM 101:2008) for Monte Carlo approaches
- IEC 60268-5: *Sound system equipment — Part 5: Loudspeakers* (for BA measurement context)

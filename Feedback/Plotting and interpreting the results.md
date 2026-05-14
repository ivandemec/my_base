![[PlotAll.png]]
## 1. Filled area plot (gain margin region)

Show the threshold as a shaded region representing the "safe" gain area below the feedback limit:

```matlab
fill([data.frequency, fliplr(data.frequency)], ...
     [fbtGain, zeros(1, numel(data.frequency))], ...
     'g', 'FaceAlpha', 0.2, 'EdgeColor', 'none');
semilogx(data.frequency, fbtGain, 'LineWidth', 1.5);
```

This makes it immediately obvious where gain headroom is limited.

## 2. Heatmap across conditions

If comparing multiple files/conditions, an `imagesc` or `heatmap` with frequency on x-axis, condition on y-axis, and color = threshold gain:

```matlab
imagesc(data.frequency, 1:nFiles, fbtMatrix);
set(gca, 'XScale', 'log');
colorbar; colormap(turbo);
```

Good for quickly spotting which condition/receiver has the lowest margin at which frequencies.

## 3. Bar chart per Bark or octave band

Aggregate the threshold into perceptually-relevant bands, which aligns with how fitting software typically presents gain limits:

```matlab
bar(bandCenterFreqs, bandAveragedFbt, 'grouped');
set(gca, 'XScale', 'log');
```

## 4. Min-envelope plot with shaded spread

When overlaying multiple measurements, show the minimum threshold as a bold line and the spread (min–max) as a shaded band:

```matlab
fbtMin = min(fbtGain, [], 1);
fbtMax = max(fbtGain, [], 1);
fill([freq, fliplr(freq)], [fbtMax, fliplr(fbtMin)], 'b', 'FaceAlpha', 0.15, 'EdgeColor', 'none');
semilogx(freq, fbtMin, 'b', 'LineWidth', 2, 'DisplayName', 'Worst-case threshold');
```

This highlights the worst-case margin (most relevant for stability) while still showing measurement variability.

---

**Recommendation**: The **filled area / gain margin** approach (option 1 or 4) is most practical — it reframes the data from "here's a line" to "here's where you can safely add gain," which is the actionable interpretation for fitting. If you're comparing many tube/receiver combos, the **heatmap** (option 2) scales better than overlaid lines.
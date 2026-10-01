// The sunburst nests exactly like the dendrogram, but the partition layout writes its own
// coordinates onto the nodes, so it needs a separate hierarchy instance.
function buildSunburstHierarchy(order) {
    return buildRadialHierarchy(order)
        .sum(d => d.children ? 0 : 1)
        .sort((a, b) => b.value - a.value || d3.ascending(a.data.name, b.data.name));
}

var sunburstCenter = { x: 0, y: 0 };
var sunburstFocus = null;

function sunburstFill(d) {
    var owner = d.ancestors().find(a => a.data.node);
    return owner ? nodeColor(owner.data.node) : DEFAULT_COLORS.note;
}

function renderSunburst() {
    var top = document.getElementById("topbar").getBoundingClientRect().bottom;
    var available = Math.max(320, height - top);
    var radius = Math.max(150, Math.min(width, available) / 2 - 16);
    // The hole is left empty so the hovered note's preview can sit in the middle.
    var hole = radius * 0.38;
    var ring = (radius - hole) / Math.max(1, sunburstRoot.height);
    sunburstCenter = { x: width / 2, y: top + available / 2 };

    d3.partition().size([2 * Math.PI, sunburstRoot.height + 1])(sunburstRoot);
    sunburstRoot.each(function (d) {
        d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
    });
    sunburstFocus = sunburstRoot;

    var arcGen = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.004))
        .padRadius(radius)
        .innerRadius(d => hole + Math.max(0, d.y0 - 1) * ring)
        .outerRadius(d => hole + Math.max(0, d.y1 - 1) * ring - 1);

    sunburstLayer
        .attr("transform", "translate(" + sunburstCenter.x + "," + sunburstCenter.y + ")")
        .selectAll("*").remove();

    var arcs = sunburstRoot.descendants().filter(d => d.depth > 0);

    sunburstLayer.append("circle")
        .datum(sunburstRoot)
        .attr("class", "sunburst-center")
        .attr("r", hole)
        .attr("aria-label", "Zoom out")
        .on("click", sunburstZoom);

    var centerLabel = sunburstLayer.append("text")
        .attr("class", "sunburst-center-label")
        .attr("dy", "0.35em");

    sunburstArc = sunburstLayer.append("g").attr("class", "sunburst-arcs")
        .selectAll("path").data(arcs).enter().append("path")
        .attr("class", "sunburst-arc")
        .attr("d", d => arcGen(d.current))
        .attr("fill", sunburstFill)
        .attr("pointer-events", d => sunburstArcVisible(d.current) ? "auto" : "none")
        .on("mouseover", sunburstOver)
        .on("mouseout", sunburstOut)
        .on("click", function (d) {
            if (d.children) sunburstZoom(d);
            else if (d.data.node) nodeClick(d.data.node);
        });

    var labels = sunburstLayer.append("g").attr("class", "sunburst-labels")
        .selectAll("text")
        .data(arcs).enter().append("text")
        .attr("class", "sunburst-label")
        .attr("dy", "0.32em")
        .attr("text-anchor", "middle")
        .attr("opacity", d => sunburstLabelVisible(d.current) ? 1 : 0)
        .attr("transform", d => sunburstLabelTransform(d.current))
        .text(d => sunburstLabelText(d, d.current));

    applySearchHighlight();

    function sunburstZoom(p) {
        if (!p || p === sunburstFocus || (!p.children && p !== sunburstRoot)) return;
        sunburstFocus = p;
        sunburstLayer.select("circle.sunburst-center").datum(p.parent || sunburstRoot);
        centerLabel.text(p === sunburstRoot ? "" : sunburstCenterText(p.data.name));

        sunburstRoot.each(function (d) {
            d.target = {
                x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                y0: Math.max(0, d.y0 - p.depth),
                y1: Math.max(0, d.y1 - p.depth)
            };
        });

        var transition = sunburstLayer.transition().duration(750);
        sunburstArc.transition(transition)
            .tween("data", function (d) {
                var interpolate = d3.interpolate(d.current, d.target);
                return function (t) { d.current = interpolate(t); };
            })
            .attr("pointer-events", d => sunburstArcVisible(d.target) ? "auto" : "none")
            .attrTween("d", d => function () { return arcGen(d.current); });

        labels.transition(transition)
            .attr("opacity", d => sunburstLabelVisible(d.target) ? 1 : 0)
            .attrTween("transform", d => function () { return sunburstLabelTransform(d.current); })
            .on("end", function (d) {
                d3.select(this).text(sunburstLabelText(d, d.current));
            });
    }

    function sunburstArcVisible(d) {
        return d.y1 <= sunburstRoot.height + 1 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function sunburstArcLength(d) {
        var midRadius = hole + ((d.y0 + d.y1) / 2 - 1) * ring;
        return (d.x1 - d.x0) * midRadius;
    }

    function sunburstLabelVisible(d) {
        return sunburstArcVisible(d) && sunburstArcLength(d) > 34;
    }

    function sunburstLabelText(d, position) {
        var limit = Math.floor(sunburstArcLength(position) / 7);
        return d.data.name.length > limit
            ? d.data.name.slice(0, Math.max(1, limit - 1)) + "…"
            : d.data.name;
    }

    function sunburstCenterText(name) {
        var limit = Math.max(8, Math.floor(hole * 2 / 8));
        return name.length > limit ? name.slice(0, limit - 1) + "…" : name;
    }

    function sunburstLabelTransform(d) {
        var angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        var midRadius = hole + ((d.y0 + d.y1) / 2 - 1) * ring;
        return "rotate(" + (angle - 90) + ") translate(" + midRadius + ",0)"
            + " rotate(" + (angle < 180 ? 0 : 180) + ")";
    }
}

function sunburstOver(d) {
    var path = new Set(d.ancestors());
    sunburstArc.attr("opacity", a => path.has(a) ? 1 : 0.25);
    previewEl.classList.add("centered");
    previewEl.style.left = sunburstCenter.x + "px";
    previewEl.style.top = sunburstCenter.y + "px";

    if (d.data.node) {
        nodeOver.call(this, d.data.node);
        return;
    }
    previewTitle.textContent = d.data.name;
    previewBody.innerHTML = "<p>" + d.value + " note(s) in this group.</p>";
    previewHint.style.display = "none";
    showPreview();
}

function sunburstOut() {
    sunburstArc.attr("opacity", null);
    applySearchHighlight();
    previewEl.classList.remove("centered");
    nodeOut.call(this);
}

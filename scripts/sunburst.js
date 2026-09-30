// The sunburst nests exactly like the dendrogram, but the partition layout writes its own
// coordinates onto the nodes, so it needs a separate hierarchy instance.
function buildSunburstHierarchy(order) {
    return buildRadialHierarchy(order)
        .sum(d => d.children ? 0 : 1)
        .sort((a, b) => b.value - a.value || d3.ascending(a.data.name, b.data.name));
}

var sunburstCenter = { x: 0, y: 0 };

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
    var ring = (radius - hole) / 3;
    sunburstCenter = { x: width / 2, y: top + available / 2 };

    d3.partition().size([2 * Math.PI, radius])(sunburstRoot);

    var arcGen = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.004))
        .padRadius(radius)
        .innerRadius(d => hole + (d.depth - 1) * ring)
        .outerRadius(d => hole + d.depth * ring - 1);

    sunburstLayer
        .attr("transform", "translate(" + sunburstCenter.x + "," + sunburstCenter.y + ")")
        .selectAll("*").remove();

    var arcs = sunburstRoot.descendants().filter(d => d.depth > 0 && d.x1 - d.x0 > 0.0015);

    sunburstArc = sunburstLayer.append("g").attr("class", "sunburst-arcs")
        .selectAll("path").data(arcs).enter().append("path")
        .attr("class", "sunburst-arc")
        .attr("d", arcGen)
        .attr("fill", sunburstFill)
        .on("mouseover", sunburstOver)
        .on("mouseout", sunburstOut)
        .on("click", function (d) { if (d.data.node) nodeClick(d.data.node); });

    function midRadius(d) { return hole + (d.depth - 0.5) * ring; }

    sunburstLayer.append("g").attr("class", "sunburst-labels")
        .selectAll("text")
        .data(arcs.filter(d => (d.x1 - d.x0) * midRadius(d) > 34)).enter().append("text")
        .attr("class", "sunburst-label")
        .attr("dy", "0.32em")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) {
            var angle = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            return "rotate(" + (angle - 90) + ") translate(" + midRadius(d) + ",0)"
                + " rotate(" + (angle < 180 ? 0 : 180) + ")";
        })
        .text(function (d) {
            var limit = Math.floor((d.x1 - d.x0) * midRadius(d) / 7);
            var name = d.data.name;
            return name.length > limit ? name.slice(0, limit - 1) + "…" : name;
        });

    applySearchHighlight();
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

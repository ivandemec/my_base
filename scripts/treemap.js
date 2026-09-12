function renderTreemap(tiling) {
    var top = document.getElementById("topbar").getBoundingClientRect().bottom;
    var chartHeight = Math.max(320, height - top);
    var rows = [{ id: "vault", parent: "", value: 0, node: null }].concat(
        nodes.filter(d => d.type === "note").map(d => ({
            id: "vault/" + d.id,
            parent: "vault",
            value: Math.max(1, d.link_count),
            node: d
        }))
    );
    var tile = {
        binary: d3.treemapBinary,
        squarify: d3.treemapSquarify,
        "slice-dice": d3.treemapSliceDice
    }[tiling];
    var root = d3.treemap()
        .tile(tile)
        .size([width, chartHeight])
        .paddingInner(2)
        .round(true)(
            d3.stratify().id(d => d.id).parentId(d => d.parent || null)(rows)
                .sum(d => d.value || 0)
                .sort((a, b) => b.value - a.value)
        );
    var leaves = root.leaves();
    var query = document.getElementById("search").value.trim().toLowerCase();

    treemapLayer.attr("transform", "translate(0," + top + ")").selectAll("*").remove();
    treemapLeaf = treemapLayer.selectAll("rect.treemap-node")
        .data(leaves).enter().append("rect")
        .attr("class", "treemap-node")
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", d => nodeColor(d.data.node))
        .attr("opacity", d => !query || d.data.node.label.toLowerCase().includes(query) ? 1 : 0.12)
        .on("mouseover", function (d) { nodeOver.call(this, d.data.node); })
        .on("mousemove", nodeMove)
        .on("mouseout", function (d) { nodeOut.call(this, d.data.node); })
        .on("click", function (d) { nodeClick(d.data.node); });

    treemapLayer.selectAll("text.treemap-label")
        .data(leaves.filter(d => d.x1 - d.x0 > 38 && d.y1 - d.y0 > 18))
        .enter().append("text")
        .attr("class", "treemap-label")
        .attr("x", d => d.x0 + 5).attr("y", d => d.y0 + 5)
        .text(d => {
            var limit = Math.max(3, Math.floor((d.x1 - d.x0 - 10) / 7));
            var label = d.data.node.label;
            return label.length > limit ? label.slice(0, limit - 1) + "…" : label;
        });
}

function arcSortKey(d, order) {
    if (order === "name") return d.label.toLowerCase();
    if (order === "tag") {
        var tags = connectedNodes(d, "tag").sort((a, b) => d3.ascending(a.label, b.label));
        return (d.type === "tag" ? d.label : tags.length ? tags[0].label : "~untagged").toLowerCase();
    }
    var topics = connectedNodes(d, "note").sort((a, b) =>
        d3.descending(a.link_count, b.link_count) || d3.ascending(a.label, b.label));
    return (d.type === "note" && topics.length ? topics[0].label : d.label).toLowerCase();
}

function renderArc(order, animate) {
    var top = document.getElementById("topbar").getBoundingClientRect().bottom + 20;
    var step = 20;
    var arcX = Math.min(300, Math.max(140, width * 0.3));
    var ordered = nodes.slice().sort((a, b) =>
        d3.ascending(arcSortKey(a, order), arcSortKey(b, order)) ||
        d3.ascending(a.label.toLowerCase(), b.label.toLowerCase()));
    var arcHeight = Math.max(height, top + ordered.length * step + 20);
    ordered.forEach(function (d, index) { d.x = arcX; d.y = top + index * step; });
    svg.style("height", arcHeight + "px");

    var duration = animate ? 600 : 0;
    node.transition().duration(duration)
        .attr("cx", d => d.x).attr("cy", d => d.y)
        .attr("r", d => 3 + Math.min(4, Math.sqrt(d.link_count)));
    text.transition().duration(duration)
        .attr("x", d => d.x - 8).attr("y", d => d.y + 4)
        .attr("text-anchor", "end");
    link.transition().duration(duration).attr("d", function (d) {
        var radius = Math.abs(d.target.y - d.source.y) / 2;
        return "M" + arcX + "," + d.source.y + "A" + radius + "," + radius + " 0 0,0 " + arcX + "," + d.target.y;
    });
}

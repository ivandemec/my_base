function packGroupKey(d, order) {
    if (order === "tag") {
        var tags = connectedNodes(d, "tag").sort((a, b) => d3.ascending(a.label, b.label));
        return tags.length ? tags[0].label : "Untagged";
    }
    var topics = connectedNodes(d, "note").sort((a, b) =>
        d3.descending(a.link_count, b.link_count) || d3.ascending(a.label, b.label));
    return topics.length ? topics[0].label : "Unlinked";
}

function renderPack(order) {
    var top = document.getElementById("topbar").getBoundingClientRect().bottom;
    var packWidth = width;
    var packHeight = Math.max(320, height - top);
    var groups = d3.nest()
        .key(d => packGroupKey(d, order))
        .entries(nodes.filter(d => d.type === "note"))
        .sort((a, b) => d3.ascending(a.key.toLowerCase(), b.key.toLowerCase()));
    var hierarchy = {
        name: "Vault",
        children: groups.map(group => ({
            name: group.key,
            children: group.values.map(item => ({
                name: item.label,
                value: Math.max(1, item.link_count),
                node: item
            }))
        }))
    };
    var root = d3.pack().size([packWidth, packHeight]).padding(4)(
        d3.hierarchy(hierarchy).sum(d => d.value || 0).sort((a, b) => b.value - a.value));
    var descendants = root.descendants().filter(d => d.depth > 0);

    packLayer.attr("transform", "translate(0," + top + ")").selectAll("*").remove();
    packLayer.selectAll("circle.pack-group")
        .data(descendants.filter(d => d.depth === 1)).enter().append("circle")
        .attr("class", "pack-group")
        .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r);

    packLeaf = packLayer.selectAll("circle.pack-node")
        .data(descendants.filter(d => d.depth === 2)).enter().append("circle")
        .attr("class", "pack-node")
        .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r)
        .attr("fill", d => nodeColor(d.data.node))
        .attr("opacity", d => {
            var query = document.getElementById("search").value.trim().toLowerCase();
            return !query || d.data.name.toLowerCase().includes(query) ? 1 : 0.12;
        })
        .on("mouseover", function (d) { nodeOver.call(this, d.data.node); })
        .on("mousemove", nodeMove)
        .on("mouseout", function (d) { nodeOut.call(this, d.data.node); })
        .on("click", function (d) { nodeClick(d.data.node); });

    packLayer.selectAll("text.pack-label")
        .data(descendants.filter(d => d.depth === 1 && d.r > 32)).enter().append("text")
        .attr("class", "pack-label")
        .attr("x", d => d.x).attr("y", d => d.y - d.r + 15)
        .text(d => {
            var limit = Math.max(3, Math.floor((d.r * 2 - 12) / 7));
            return d.data.name.length > limit ? d.data.name.slice(0, limit - 1) + "…" : d.data.name;
        });
    packLayer.selectAll("text.pack-note-label")
        .data(descendants.filter(d => d.depth === 2 && d.r > 13)).enter().append("text")
        .attr("class", "pack-note-label")
        .attr("x", d => d.x).attr("y", d => d.y + 4)
        .style("font-size", d => Math.min(12, Math.max(8, d.r / 3)) + "px")
        .text(d => {
            var limit = Math.max(3, Math.floor(d.r / 4));
            return d.data.name.length > limit ? d.data.name.slice(0, limit - 1) + "…" : d.data.name;
        });
}

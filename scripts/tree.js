function buildTreeHierarchy() {
    var noteNodes = nodes.filter(d => d.type === "note");
    var byId = new Map(nodes.map(d => [d.id, d]));
    var neighbors = new Map(noteNodes.map(d => [d.id, []]));
    var tagNeighbors = new Map(noteNodes.map(d => [d.id, []]));

    links.forEach(function (edge) {
        var source = typeof edge.source === "object" ? edge.source : byId.get(edge.source);
        var target = typeof edge.target === "object" ? edge.target : byId.get(edge.target);
        if (!source || !target) return;
        if (source.type === "note" && target.type === "note") {
            neighbors.get(source.id).push(target);
            neighbors.get(target.id).push(source);
        } else if (source.type === "note" && target.type === "tag") {
            tagNeighbors.get(source.id).push(target);
        } else if (target.type === "note" && source.type === "tag") {
            tagNeighbors.get(target.id).push(source);
        }
    });

    var visitedNotes = new Set();
    var visitedTags = new Set();
    var forest = [];
    noteNodes.slice().sort((a, b) =>
        d3.descending(a.link_count, b.link_count) || d3.ascending(a.label, b.label)
    ).forEach(function (componentRoot) {
        if (visitedNotes.has(componentRoot.id)) return;
        var rootItem = { name: componentRoot.label, node: componentRoot, children: [] };
        var queue = [{ node: componentRoot, item: rootItem }];
        visitedNotes.add(componentRoot.id);
        forest.push(rootItem);

        while (queue.length) {
            var current = queue.shift();
            (neighbors.get(current.node.id) || []).slice()
                .sort((a, b) => d3.ascending(a.label, b.label))
                .forEach(function (next) {
                    if (visitedNotes.has(next.id)) return;
                    visitedNotes.add(next.id);
                    var child = { name: next.label, node: next, children: [] };
                    current.item.children.push(child);
                    queue.push({ node: next, item: child });
                });
            (tagNeighbors.get(current.node.id) || []).slice()
                .sort((a, b) => d3.ascending(a.label, b.label))
                .forEach(function (tag) {
                    if (visitedTags.has(tag.id)) return;
                    visitedTags.add(tag.id);
                    current.item.children.push({ name: tag.label, node: tag });
                });
        }
    });
    var root = d3.hierarchy({ name: "Vault", children: forest });
    root.children.forEach(function (branch) {
        if (!branch.children) return;
        branch._children = branch.children;
        branch.children = null;
    });
    return root;
}

function renderTree() {
    var top = document.getElementById("topbar").getBoundingClientRect().bottom + 20;
    var treeColumnWidth = width < 700 ? 130 : 300;
    var treeLabelLimit = width < 700 ? 24 : 38;
    d3.tree().nodeSize([24, treeColumnWidth])(treeRoot);
    var descendants = treeRoot.descendants();
    var minX = d3.min(descendants, d => d.x) || 0;
    var maxX = d3.max(descendants, d => d.x) || 0;
    var offsetX = top + 20 - minX;

    svg.style("height", Math.max(height, maxX - minX + top + 60) + "px");
    treeLayer.attr("transform", "translate(40," + offsetX + ")");

    var treeLinks = treeLayer.selectAll("path.tree-link")
        .data(treeRoot.links(), d => d.target.data.node ? d.target.data.node.id : "vault");
    treeLinks.exit().transition().duration(250).attr("opacity", 0).remove();
    treeLinks.enter().append("path").attr("class", "tree-link").merge(treeLinks)
        .transition().duration(350)
        .attr("d", d => "M" + d.source.y + "," + d.source.x +
            "C" + (d.source.y + d.target.y) / 2 + "," + d.source.x + " " +
            (d.source.y + d.target.y) / 2 + "," + d.target.x + " " +
            d.target.y + "," + d.target.x);

    treeLeaf = treeLayer.selectAll("g.tree-node")
        .data(descendants, d => d.data.node ? d.data.node.id : "vault");
    treeLeaf.exit().transition().duration(250).attr("opacity", 0).remove();
    var entered = treeLeaf.enter().append("g").attr("class", "tree-node")
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");
    entered.append("circle").attr("r", 5);
    entered.append("text").attr("dy", "0.32em").attr("x", 9);
    treeLeaf = entered.merge(treeLeaf);
    treeLeaf.transition().duration(350)
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");
    treeLeaf.select("circle")
        .attr("fill", d => d.data.node ? nodeColor(d.data.node) : userColors.note)
        .attr("r", d => d.children || d._children ? 6 : 4)
        .attr("stroke-width", d => d._children ? 3 : 1.5)
        .on("click", function (d) {
            if (!d.children && !d._children) return;
            if (d.children) { d._children = d.children; d.children = null; }
            else { d.children = d._children; d._children = null; }
            renderTree();
        });
    treeLeaf.select("text")
        .text(d => d.data.name.length > treeLabelLimit ? d.data.name.slice(0, treeLabelLimit - 1) + "…" : d.data.name)
        .on("mouseover", function (d) { if (d.data.node) nodeOver.call(this, d.data.node); })
        .on("mousemove", nodeMove)
        .on("mouseout", function (d) { if (d.data.node) nodeOut.call(this, d.data.node); })
        .on("click", function (d) { if (d.data.node) nodeClick(d.data.node); });
    applySearchHighlight();
}

function buildTreeHierarchy(order) {
    var noteNodes = nodes.filter(d => d.type === "note");
    var byId = new Map(nodes.map(d => [d.id, d]));
    var groups = new Map();

    function topicGroup(note) {
        var name = note.topics.length ? note.topics[0] : "Uncategorized";
        var id = name.toLowerCase().replace(/\.md$/i, "") + ".md";
        return { name: name, node: byId.get(id), key: "topic:" + name.toLowerCase() };
    }

    function tagGroup(note) {
        var name = note.tags.length ? "#" + note.tags[0] : "Untagged";
        return { name: name, node: byId.get(name), key: "tag:" + name.toLowerCase() };
    }

    noteNodes.forEach(function (note) {
        var topic = topicGroup(note);
        var tag = tagGroup(note);
        var primary = order === "tag" ? tag : topic;

        if (!groups.has(primary.key)) {
            groups.set(primary.key, {
                name: primary.node ? primary.node.label : primary.name,
                node: primary.node,
                key: primary.key,
                children: []
            });
        }
        var group = groups.get(primary.key);
        group.children.push({
            name: note.label,
            node: note,
            key: primary.key + "/note:" + note.id
        });
    });

    var forest = Array.from(groups.values())
        .sort((a, b) => d3.ascending(a.name.toLowerCase(), b.name.toLowerCase()))
        .map(function (group) {
            group.children.sort((a, b) => d3.ascending(a.name.toLowerCase(), b.name.toLowerCase()));
            return group;
        });
    var root = d3.hierarchy({ name: "Vault", key: "vault", children: forest });
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
        .data(treeRoot.links(), d => d.target.data.key);
    treeLinks.exit().transition().duration(250).attr("opacity", 0).remove();
    treeLinks.enter().append("path").attr("class", "tree-link").merge(treeLinks)
        .transition().duration(350)
        .attr("d", d => "M" + d.source.y + "," + d.source.x +
            "C" + (d.source.y + d.target.y) / 2 + "," + d.source.x + " " +
            (d.source.y + d.target.y) / 2 + "," + d.target.x + " " +
            d.target.y + "," + d.target.x);

    treeLeaf = treeLayer.selectAll("g.tree-node")
        .data(descendants, d => d.data.key);
    treeLeaf.exit().transition().duration(250).attr("opacity", 0).remove();
    var entered = treeLeaf.enter().append("g").attr("class", "tree-node")
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");
    entered.append("circle").attr("r", 5);
    entered.append("text").attr("dy", "0.32em").attr("x", 9);
    treeLeaf = entered.merge(treeLeaf);
    treeLeaf.transition().duration(350)
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");
    treeLeaf.select("circle")
        .attr("fill", d => d.data.node ? nodeColor(d.data.node) : DEFAULT_COLORS.note)
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

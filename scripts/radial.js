function buildRadialHierarchy(order) {
    var noteNodes = nodes.filter(d => d.type === "note");
    var byId = new Map(nodes.map(d => [d.id, d]));
    var branches = new Map();

    function topicOf(note) {
        var name = note.topics.length ? note.topics[0] : "Uncategorized";
        var topicNode = byId.get(name.toLowerCase().replace(/\.md$/i, "") + ".md");
        return {
            name: topicNode ? topicNode.label : name,
            node: topicNode,
            key: "topic:" + name.toLowerCase()
        };
    }

    function tagOf(note) {
        var name = note.tags.length ? "#" + note.tags[0] : "Untagged";
        return { name: name, node: byId.get(name), key: "tag:" + name.toLowerCase() };
    }

    noteNodes.forEach(function (note) {
        var topic = topicOf(note);
        var tag = tagOf(note);
        var outer = order === "tag" ? tag : topic;
        var inner = order === "tag" ? topic : tag;

        if (!branches.has(outer.key)) {
            branches.set(outer.key, {
                name: outer.name, node: outer.node, key: outer.key, groups: new Map()
            });
        }
        var branch = branches.get(outer.key);
        var innerKey = outer.key + "/" + inner.key;
        if (!branch.groups.has(innerKey)) {
            branch.groups.set(innerKey, {
                name: inner.name, node: inner.node, key: innerKey, children: []
            });
        }
        branch.groups.get(innerKey).children.push({
            name: note.label,
            node: note,
            key: innerKey + "/note:" + note.id
        });
    });

    var byName = (a, b) => d3.ascending(a.name.toLowerCase(), b.name.toLowerCase());
    var tree = Array.from(branches.values()).sort(byName).map(function (branch) {
        var groups = Array.from(branch.groups.values()).sort(byName);
        groups.forEach(function (group) { group.children.sort(byName); });
        return { name: branch.name, node: branch.node, key: branch.key, children: groups };
    });

    return d3.hierarchy({ name: "Vault", key: "vault", children: tree });
}

// Every label reads outward; inner labels would otherwise overshoot and collide at the centre.
function radialLabelLeading(d) {
    return d.x < Math.PI;
}

var radialLinks = d3.select(null);

function emphasizeRadialSubtree(d) {
    var branch = new Set(d.descendants());
    // The incoming link is kept lit so the branch stays attached to its parent.
    var lit = l => branch.has(l.target);
    // Inline styles, because the .radial-link rule outranks presentation attributes.
    radialLinks
        .style("stroke", l => lit(l) ? "var(--link-emphasis)" : null)
        .style("stroke-opacity", l => lit(l) ? 1 : 0.08)
        .style("stroke-width", l => lit(l) ? 2 : null);
    radialLeaf.attr("opacity", n => branch.has(n) ? 1 : 0.12);
    radialLeaf.select("text").style("font-weight", n => branch.has(n) || n.depth === 1 ? "600" : null);
}

function clearRadialEmphasis() {
    radialLinks.style("stroke", null).style("stroke-opacity", null).style("stroke-width", null);
    radialLeaf.select("text").style("font-weight", n => n.depth === 1 ? "600" : null);
    applySearchHighlight();
}

function radialOver(d) {
    emphasizeRadialSubtree(d);
    if (d.data.node) nodeOver.call(this, d.data.node);
}

function radialOut(d) {
    clearRadialEmphasis();
    if (d.data.node) nodeOut.call(this, d.data.node);
}

function radialDescendantCount(d) {
    var children = d.children || d._children;
    if (!children) return 1;
    return d3.sum(children, radialDescendantCount);
}

function radialClick(d) {
    if (d.children || d._children) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        renderRadial();
        return;
    }
    if (d.data.node) nodeClick(d.data.node);
}

function renderRadial() {
    var top = document.getElementById("topbar").getBoundingClientRect().bottom;
    var available = Math.max(320, height - top);
    var labelLimit = width < 700 ? 18 : 30;
    var labelAllowance = labelLimit * 7;
    var leafCount = Math.max(1, radialDescendantCount(radialRoot));
    // Grow the circle until every leaf label has room, then scale the whole dial to fit.
    var radius = Math.max(120, (leafCount * 12) / (2 * Math.PI));

    d3.cluster()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)(radialRoot);
    radialRoot.each(function (d) {
        d.y = d.depth * radius / Math.max(1, radialRoot.height);
    });

    var fitScale = Math.min(1, Math.min(width, available) / (2 * (radius + labelAllowance)));
    svg.call(zoom.transform, d3.zoomIdentity
        .translate(width / 2, top + available / 2)
        .scale(fitScale));

    radialLayer.attr("transform", null).selectAll("*").remove();

    radialLinks = radialLayer.append("g").attr("class", "radial-links")
        .selectAll("path").data(radialRoot.links()).enter().append("path")
        .attr("class", "radial-link")
        .attr("d", d3.linkRadial().angle(d => d.x).radius(d => d.y));

    radialLeaf = radialLayer.append("g").attr("class", "radial-nodes")
        .selectAll("g.radial-node")
        .data(radialRoot.descendants().filter(d => d.depth > 0)).enter().append("g")
        .attr("class", "radial-node")
        .attr("transform", d => "rotate(" + (d.x * 180 / Math.PI - 90) + ") translate(" + d.y + ",0)");

    radialLeaf.append("circle")
        .attr("r", d => d.children || d._children ? 4.5 : 3)
        .attr("fill", d => d.data.node ? nodeColor(d.data.node) : DEFAULT_COLORS.note)
        .attr("stroke-width", d => d._children ? 2.5 : 1.2)
        .on("mouseover", radialOver)
        .on("mousemove", nodeMove)
        .on("mouseout", radialOut)
        .on("click", radialClick);

    radialLeaf.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => radialLabelLeading(d) ? 8 : -8)
        .attr("text-anchor", d => radialLabelLeading(d) ? "start" : "end")
        .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
        .style("font-weight", d => d.depth === 1 ? "600" : null)
        .text(function (d) {
            // Inner labels must fit the gap before the next ring; leaves can run to the margin.
            var limit = d.children || d._children ? Math.min(labelLimit, 20) : labelLimit;
            var name = d.data.name.length > limit
                ? d.data.name.slice(0, limit - 1) + "…"
                : d.data.name;
            // The same tag can repeat under several parents, so show each group's share.
            return d.children || d._children ? name + " (" + radialDescendantCount(d) + ")" : name;
        })
        .on("mouseover", radialOver)
        .on("mousemove", nodeMove)
        .on("mouseout", radialOut)
        .on("click", radialClick);

    applySearchHighlight();
}

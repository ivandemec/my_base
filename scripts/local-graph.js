(function () {
    var graphContainer = document.getElementById("local-graph");
    var localNodes = JSON.parse(document.getElementById("local-nodes-data").textContent);
    var localLinks = JSON.parse(document.getElementById("local-links-data").textContent);
    var centerId = graphContainer.dataset.centerId;
    var previewEl = document.getElementById("preview");
    var previewTitle = previewEl.querySelector("h3");
    var previewBody = previewEl.querySelector(".body");
    var previewHint = previewEl.querySelector(".hint");
    var previewCache = {};
    var hoverToken = 0;
    var graphWidth = graphContainer.clientWidth;
    var graphHeight = graphContainer.clientHeight;
    var graphSvg = d3.select(graphContainer).append("svg")
        .attr("viewBox", "0 0 " + graphWidth + " " + graphHeight)
        .attr("role", "img")
        .attr("aria-label", "Nodes directly connected to " + graphContainer.dataset.centerTitle);
    var graphLayer = graphSvg.append("g");

    graphSvg.call(d3.zoom().scaleExtent([0.5, 4]).on("zoom", function () {
        graphLayer.attr("transform", d3.event.transform);
    }));

    var localLink = graphLayer.append("g").selectAll("line")
        .data(localLinks).enter().append("line").attr("class", "local-link");
    var localNode = graphLayer.append("g").selectAll("circle")
        .data(localNodes).enter().append("circle")
        .attr("class", function (node) { return "local-node" + (node.id === centerId ? " current" : ""); })
        .attr("r", function (node) { return node.id === centerId ? 10 : 6 + Math.sqrt(node.link_count || 0); })
        .attr("fill", function (node) { return node.color; })
        .on("mouseover", nodeOver)
        .on("mousemove", nodeMove)
        .on("mouseout", nodeOut)
        .on("click", function (node) {
            if (node.type === "tag" && node.id !== centerId) {
                window.location.href = "/tag/" + encodeURIComponent(node.id.slice(1));
            } else if (node.type === "note" && node.id !== centerId) {
                window.location.href = "/note/" + encodeURIComponent(node.id);
            }
        });
    var localLabel = graphLayer.append("g").selectAll("text")
        .data(localNodes).enter().append("text")
        .attr("class", function (node) { return "local-label" + (node.id === centerId ? " current" : ""); })
        .text(function (node) { return node.label; });

    function nodeOver(node) {
        var strokeColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--strong").trim();
        d3.select(this).attr("stroke", strokeColor).attr("stroke-width", 3);
        var token = ++hoverToken;

        if (node.type === "tag") {
            previewTitle.textContent = node.label;
            previewBody.innerHTML = "<p>" + node.link_count + " note(s) tagged with this.</p>";
            previewHint.textContent = "Click to list notes \u2192";
            previewHint.style.display = "block";
            showPreview();
            return;
        }

        previewHint.textContent = "Click to open \u2192";
        previewHint.style.display = "block";
        if (previewCache[node.id]) {
            renderPreview(previewCache[node.id]);
            return;
        }
        previewTitle.textContent = node.label;
        previewBody.innerHTML = "<p style='color:var(--muted)'>Loading...</p>";
        showPreview();

        fetch("/api/preview/" + encodeURIComponent(node.id))
            .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
            .then(function (data) {
                previewCache[node.id] = data;
                if (token === hoverToken) renderPreview(data);
            })
            .catch(function () {
                if (token === hoverToken) {
                    previewBody.innerHTML = "<p style='color:#c66'>No preview.</p>";
                }
            });
    }

    function renderPreview(data) {
        previewTitle.textContent = data.title;
        previewBody.innerHTML = data.html;
        showPreview();
    }

    function showPreview() {
        previewEl.classList.add("visible");
    }

    function nodeMove() {
        var padding = 16;
        var width = previewEl.offsetWidth;
        var height = previewEl.offsetHeight;
        var left = d3.event.clientX + padding;
        var top = d3.event.clientY + padding;
        if (left + width > window.innerWidth) left = d3.event.clientX - width - padding;
        if (top + height > window.innerHeight) top = window.innerHeight - height - padding;
        if (top < 52) top = 52;
        previewEl.style.left = left + "px";
        previewEl.style.top = top + "px";
    }

    function nodeOut() {
        d3.select(this).attr("stroke", null).attr("stroke-width", null);
        hoverToken++;
        previewEl.classList.remove("visible");
    }

    var localSimulation = d3.forceSimulation(localNodes)
        .force("link", d3.forceLink(localLinks).id(function (node) { return node.id; }).distance(100).strength(.7))
        .force("charge", d3.forceManyBody().strength(-260))
        .force("center", d3.forceCenter(graphWidth / 2, graphHeight / 2))
        .force("collision", d3.forceCollide().radius(function (node) { return node.id === centerId ? 34 : 24; }))
        .on("tick", function () {
            localLink
                .attr("x1", function (edge) { return edge.source.x; })
                .attr("y1", function (edge) { return edge.source.y; })
                .attr("x2", function (edge) { return edge.target.x; })
                .attr("y2", function (edge) { return edge.target.y; });
            localNode.attr("cx", function (node) { return node.x; }).attr("cy", function (node) { return node.y; });
            localLabel.attr("x", function (node) { return node.x + 12; }).attr("y", function (node) { return node.y + 4; });
        });

    localNode.call(d3.drag()
        .on("start", function (node) {
            if (!d3.event.active) localSimulation.alphaTarget(.3).restart();
            node.fx = node.x; node.fy = node.y;
        })
        .on("drag", function (node) { node.fx = d3.event.x; node.fy = d3.event.y; })
        .on("end", function (node) {
            if (!d3.event.active) localSimulation.alphaTarget(0);
            node.fx = null; node.fy = null;
        }));
}());

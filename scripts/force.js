function renderForce(restart) {
    svg.style("height", null);
    link.attr("d", d => "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y);
    node.attr("r", d => 5 + Math.sqrt(d.link_count));
    text.attr("text-anchor", null);
    simulation
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("custom", customForce)
        .force("x", null)
        .force("y", null);
    if (restart) simulation.alpha(1).restart();
}

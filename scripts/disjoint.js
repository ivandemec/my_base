function renderDisjoint(restart) {
    svg.style("height", null);
    link.attr("d", d => "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y);
    node.attr("r", d => 5 + Math.sqrt(d.link_count));
    text.attr("text-anchor", null);
    simulation
        .force("center", null)
        .force("custom", null)
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05));
    if (restart) simulation.alpha(1).restart();
}

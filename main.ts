import Sigma from "sigma";
import Graph from "graphology";
import { SerializedGraph } from "graphology-types";
import { scaleLinear } from "d3-scale";
import { nodeExtent } from "graphology-metrics/graph/extent";

import GRAPH_DATA from "./celegans.json";

const graph = Graph.from(GRAPH_DATA as SerializedGraph);

const sizeScale = scaleLinear()
  .domain(nodeExtent(graph, "size"))
  .range([3, 18]);

graph.updateEachNodeAttributes((node, attr) => {
  attr.size = sizeScale(attr.size);
  return attr;
});

const container = document.getElementById("container");

const renderer = new Sigma(graph, container);

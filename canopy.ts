import Sigma from "sigma";
import Graph from "graphology";
import { SerializedGraph } from "graphology-types";
import { scaleLinear } from "d3-scale";
import { nodeExtent } from "graphology-metrics/graph/extent";

import GRAPH_DATA from "./data/celegans.json";

type NodeAttributes = {
  x: number;
  y: number;
  size: number;
  originalSize?: number;
  color: string;
};

const graph: Graph<NodeAttributes> = Graph.from(
  GRAPH_DATA as SerializedGraph<NodeAttributes>
);
const RADIUS = 25;
let ID = 0;

const sizeScale = scaleLinear()
  .domain(nodeExtent(graph, "size"))
  .range([4, 20]);

graph.updateEachNodeAttributes((node, attr) => {
  attr.originalSize = attr.size;
  attr.size = sizeScale(attr.size);
  return attr;
});

const container = document.getElementById("container");

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx ** 2 + dy ** 2);
}

function barycenter(positions) {
  let x = 0;
  let y = 0;

  positions.forEach((pos) => {
    x += pos.x;
    y += pos.y;
  });

  return { x: x / positions.length, y: y / positions.length };
}

const renderer = new Sigma(graph, container);

function canopy() {
  const alreadyDone = new Set<string>();
  const clusters = [];

  graph.forEachNode((node, attr) => {
    if (alreadyDone.has(node)) return;
    const cluster = [node];
    const pos = renderer.graphToViewport(attr);

    graph.forEachNeighbor(node, (neighbor, nattr) => {
      const npos = renderer.graphToViewport(nattr);

      if (distance(pos, npos) <= RADIUS) {
        cluster.push(neighbor);
        alreadyDone.add(neighbor);
      }
    });

    if (cluster.length > 1) clusters.push(cluster);
  });

  clusters.forEach((cluster) => {
    const clusterNode = `cluster_${ID++}`;
    const attributes = cluster.map((node) => {
      return graph.getNodeAttributes(node);
    });
    const clusterPosition = barycenter(attributes);

    const newSize = attributes.reduce((a, b) => a + b.originalSize, 0);

    graph.addNode(clusterNode, {
      ...clusterPosition,
      color: "red",
      size: sizeScale(newSize),
    });
  });
}

canopy();

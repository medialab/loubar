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

const nodeToCommunity = new Map();

function canopy() {
  const alreadyDone = new Set<string>();
  const clusters = [];

  graph.forEachNode((node, attr) => {
    if (alreadyDone.has(node)) return;
    const cluster = [node];
    const pos = renderer.graphToViewport(attr);

    alreadyDone.add(node);

    graph.forEachNeighbor(node, (neighbor, nattr) => {
      if (alreadyDone.has(neighbor)) return;

      const npos = renderer.graphToViewport(nattr);

      if (distance(pos, npos) <= RADIUS) {
        cluster.push(neighbor);
        alreadyDone.add(neighbor);
      }
    });

    if (cluster.length > 1) {
      const clusterName = `cluster_${ID++}`;
      clusters.push({ name: clusterName, nodes: cluster });

      cluster.forEach((clusterNode) => {
        nodeToCommunity.set(clusterNode, clusterName);
      });
    }
  });

  clusters.forEach((cluster) => {
    const { name, nodes } = cluster;

    const attributes = nodes.map((node) => {
      return graph.getNodeAttributes(node);
    });
    const clusterPosition = barycenter(attributes);

    const newSize = attributes.reduce((a, b) => a + b.originalSize, 0);

    const newAttr = {
      ...clusterPosition,
      color: "red",
      size: sizeScale(newSize),
    };

    if (graph.hasNode(name)) {
      graph.replaceNodeAttributes(name, newAttr);
    } else {
      graph.addNode(name, newAttr);
    }

    nodes.forEach((node) => {
      graph.forEachOutEdge(node, (e, a, s, t) => {
        let tc = nodeToCommunity.get(t);

        if (name === tc) return;

        if (tc === undefined) {
          tc = t;
        }

        graph.mergeEdge(name, tc);
        graph.dropEdge(e);
      });
    });
  });

  clusters.forEach(({ nodes }) => {
    nodes.forEach((node) => graph.dropNode(node));
  });
}

canopy();

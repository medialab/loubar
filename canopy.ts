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

const GRAPH: Graph<NodeAttributes> = Graph.from(
  GRAPH_DATA as SerializedGraph<NodeAttributes>
);
let ID = 0;

const sizeScale = scaleLinear()
  .domain(nodeExtent(GRAPH, "size"))
  .range([4, 20]);

GRAPH.updateEachNodeAttributes((node, attr) => {
  attr.originalSize = attr.size;
  attr.size = sizeScale(attr.size);
  return attr;
});

const container = document.getElementById("container");

let currentGraph = GRAPH.copy();

function swapGraph() {
  const rendererGraph = renderer.getGraph();
  rendererGraph.clear();
  rendererGraph.import(currentGraph);
}

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

const renderer = new Sigma(currentGraph, container);

const nodeToCommunity = new Map();

function canopy(graph, radius) {
  const newGraph = graph.nullCopy();

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

      if (distance(pos, npos) <= radius) {
        cluster.push(neighbor);
        alreadyDone.add(neighbor);
      }
    });

    const singleton = cluster.length === 1;
    const clusterName = singleton ? node : `cluster_${ID++}`;

    clusters.push({
      name: clusterName,
      nodes: cluster,
      singleton,
    });

    cluster.forEach((clusterNode) => {
      nodeToCommunity.set(clusterNode, clusterName);
    });
  });

  clusters.forEach((cluster) => {
    const { name, nodes, singleton } = cluster;

    const attributes = nodes.map((node) => {
      return graph.getNodeAttributes(node);
    });
    const clusterPosition = barycenter(attributes);

    const newSize = attributes.reduce((a, b) => a + b.originalSize, 0);

    const newAttr = {
      ...clusterPosition,
      color: singleton ? "#999" : "red",
      size: sizeScale(newSize),
      label: name,
    };

    if (newGraph.hasNode(name)) {
      newGraph.replaceNodeAttributes(name, newAttr);
    } else {
      newGraph.addNode(name, newAttr);
    }

    nodes.forEach((node) => {
      graph.forEachEdge(node, (e, a, s, t) => {
        let tc = nodeToCommunity.get(t);

        if (name === tc) return;

        newGraph.updateEdge(name, tc, (attr) => {
          return {
            size: ((attr as { size: number }).size || 0) + 1,
          };
        });
      });
    });
  });

  console.log(graph.order, newGraph.order);

  return newGraph;
}

currentGraph = canopy(currentGraph, 25);
swapGraph();

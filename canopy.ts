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

GRAPH.updateEachEdgeAttributes((edge, attr) => {
  attr.size = 1;
  return attr;
});

const container = document.getElementById("container");

let baseGraph = GRAPH.copy();

function swapGraph(newGraph) {
  const rendererGraph = renderer.getGraph();
  rendererGraph.clear();
  rendererGraph.import(newGraph);
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

const renderer = new Sigma(baseGraph, container, { stagePadding: 50 });

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
      color: name.startsWith("cluster_") ? "red" : "#999",
      size: sizeScale(newSize),
      originalSize: newSize,
      label: name,
    };

    if (newGraph.hasNode(name)) {
      newGraph.replaceNodeAttributes(name, newAttr);
    } else {
      newGraph.addNode(name, newAttr);
    }

    nodes.forEach((node) => {
      graph.forEachEdge(node, (e, edgeAttr, s, t) => {
        let tc = nodeToCommunity.get(t);

        if (name === tc) return;

        newGraph.updateEdge(name, tc, (attr) => {
          return {
            size: ((attr as { size: number }).size || 0) + edgeAttr.size,
          };
        });
      });
    });
  });

  return newGraph;
}

const levels: Array<{ ratio: number; canopy?: Graph }> = [
  { ratio: 0.07 },
  { ratio: 0.11 },
  { ratio: 0.2 },
  { ratio: 0.34 },
  { ratio: 0.58 },
  { ratio: 1.0 },
];

levels.forEach((level, i) => {
  if (i === 0) {
    level.canopy = baseGraph.copy();
  } else {
    level.canopy = canopy(levels[i - 1].canopy, i * 25);
  }
});

let currentLevel = levels[levels.length - 1];
swapGraph(currentLevel.canopy);

renderer.getCamera().on("updated", (state) => {
  const ratio = state.ratio;
  const targetLevel = levels.find((level) => level.ratio > ratio);

  if (targetLevel === currentLevel) return;

  currentLevel = targetLevel;

  swapGraph(targetLevel.canopy);
});

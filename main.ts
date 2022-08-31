import Sigma from "sigma";
import Graph from "graphology";
import { SerializedGraph } from "graphology-types";
import { scaleLinear } from "d3-scale";
import { nodeExtent } from "graphology-metrics/graph/extent";
import { createRandom } from "pandemonium/random";
import seedrandom from "seedrandom";
import Papa from "papaparse";

import GRAPH_DATA from "./data/celegans.json";

const RNG = seedrandom("loubar");
const RANDOM = createRandom(RNG);

const randomByte = () => RANDOM(0, 255);

function randomColor() {
  const rgb = [randomByte(), randomByte(), randomByte()];

  return "#" + rgb.map((hex) => hex.toString(16)).join("");
}

const graph = Graph.from(GRAPH_DATA as SerializedGraph);

const sizeScale = scaleLinear()
  .domain(nodeExtent(graph, "size"))
  .range([4, 20]);

graph.updateEachNodeAttributes((node, attr) => {
  attr.size = sizeScale(attr.size);
  attr.color = randomColor();
  return attr;
});

const container = document.getElementById("container");

Papa.parse("data/log.csv", {
  header: true,
  download: true,
  delimiter: ",",
  complete: (data) => {
    console.log(data);
  },
});

new Sigma(graph, container);

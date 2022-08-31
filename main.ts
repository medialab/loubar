import Sigma from "sigma";
import Graph from "graphology";
import { SerializedGraph } from "graphology-types";
import { scaleLinear } from "d3-scale";
import { nodeExtent } from "graphology-metrics/graph/extent";
import { createRandom } from "pandemonium/random";
import seedrandom from "seedrandom";
import Papa from "papaparse";
import DefaultMap from "mnemonist/default-map";

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
  attr.color = "#999";
  return attr;
});

const container = document.getElementById("container");

const communityColors = new DefaultMap<string, string>(() => randomColor());

Papa.parse("data/log.csv", {
  header: true,
  download: true,
  delimiter: ",",
  complete: (result) => {
    const steps = result.data as Array<{
      nodes: string;
      "move-to-group": string;
      iteration: string;
    }>;
    let i = 0;

    function drawOneStep() {
      if (i === steps.length - 1) return;

      const step = steps[i++];

      const nodes = step.nodes.split("|");
      const community = step["move-to-group"];
      const iteration = step.iteration;

      const color = communityColors.get(community);

      nodes.forEach((node) => {
        graph.setNodeAttribute(node, "color", color);
      });

      if (iteration === "0") return drawOneStep();

      requestAnimationFrame(drawOneStep);
    }

    drawOneStep();
  },
});

new Sigma(graph, container);

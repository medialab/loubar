import Sigma from "sigma";
import Graph from "graphology";
import { SerializedGraph } from "graphology-types";
import { scaleLinear } from "d3-scale";
import { nodeExtent } from "graphology-metrics/graph/extent";
// import { createRandom } from "pandemonium/random";
// import seedrandom from "seedrandom";
import Papa from "papaparse";
import chroma from "chroma-js";

import GRAPH_DATA from "./data/celegans.json";

// const RNG = seedrandom("loubar");
// const RANDOM = createRandom(RNG);

// const randomByte = () => RANDOM(0, 255);

// function randomColor() {
//   const rgb = [randomByte(), randomByte(), randomByte()];

//   return "#" + rgb.map((hex) => hex.toString(16)).join("");
// }

const graph = Graph.from(GRAPH_DATA as SerializedGraph);

const sizeScale = scaleLinear()
  .domain(nodeExtent(graph, "size"))
  .range([4, 20]);

const xColorScale = scaleLinear()
  .domain(nodeExtent(graph, "x"))
  .range([-128, 128]);

const yColorScale = scaleLinear()
  .domain(nodeExtent(graph, "y"))
  .range([-128, 128]);

graph.updateEachNodeAttributes((node, attr) => {
  attr.size = sizeScale(attr.size);
  // attr.color = "#999";
  attr.color = chroma.lab(65, xColorScale(attr.x), yColorScale(attr.y)).hex();
  return attr;
});

const container = document.getElementById("container");
const overlay = document.getElementById("overlay");

const communities = new Map<string, { color: string; size: number }>();
const nodeToCommunity = new Map<string, string>();

Papa.parse("data/log.csv", {
  header: true,
  download: true,
  delimiter: ",",
  complete: (result) => {
    const steps = result.data as Array<{
      nodes: string;
      "target-group": string;
      iteration: string;
    }>;

    let i = 0;

    function drawOneStep() {
      if (i === steps.length - 1) return;

      const step = steps[i++];

      const nodes = step.nodes.split("|");
      const community = step["target-group"];
      const iteration = step.iteration;

      overlay.textContent = iteration;

      if (iteration === "0") {
        communities.set(community, {
          color: graph.getNodeAttribute(nodes[0], "color"),
          size: 1,
        });
        nodeToCommunity.set(nodes[0], community);

        return drawOneStep();
      }

      const fromCommunity = communities.get(nodeToCommunity.get(nodes[0]));
      const toCommunity = communities.get(community);

      let newColor: string;

      if (fromCommunity.size < toCommunity.size) {
        // newColor = chroma
        //   .mix(
        //     toCommunity.color,
        //     fromCommunity.color,
        //     fromCommunity.size / toCommunity.size
        //   )
        //   .hex();
        newColor = toCommunity.color;
      } else {
        // newColor = chroma
        //   .mix(
        //     fromCommunity.color,
        //     toCommunity.color,
        //     toCommunity.size / fromCommunity.size
        //   )
        //   .hex();
        newColor = fromCommunity.color;
      }

      fromCommunity.size -= nodes.length;
      toCommunity.size += nodes.length;

      // fromCommunity.color = newColor;
      // toCommunity.color = newColor;

      nodes.forEach((node) => {
        graph.setNodeAttribute(node, "color", newColor);
        nodeToCommunity.set(node, community);
      });

      requestAnimationFrame(drawOneStep);
    }

    drawOneStep();
  },
});

new Sigma(graph, container);

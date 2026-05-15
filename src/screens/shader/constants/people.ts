import { Shape, type Person } from "../types";

export const people: Person[] = [
  {
    name: "Sam Altman",
    company: "OpenAI",
    images: [
      {
        source: require("../images/sam1.webp"),
        shape: Shape.Circle,
        seed: 1013,
      },
      {
        source: require("../images/sam2.webp"),
        shape: Shape.Triangle,
        seed: 2027,
      },
      {
        source: require("../images/sam3.webp"),
        shape: Shape.Quadrilateral,
        seed: 3041,
      },
    ],
  },
  {
    name: "Dario Amodei",
    company: "Anthropic",
    images: [
      {
        source: require("../images/amodei1.webp"),
        shape: Shape.Parallelogram,
        seed: 4057,
      },
      {
        source: require("../images/amodei2.webp"),
        shape: Shape.Circle,
        seed: 5077,
      },
      {
        source: require("../images/amodei3.webp"),
        shape: Shape.Triangle,
        seed: 6089,
      },
    ],
  },
  {
    name: "Sundar Pichai",
    company: "Google",
    images: [
      {
        source: require("../images/pichai1.webp"),
        shape: Shape.Quadrilateral,
        seed: 7103,
      },
      {
        source: require("../images/pichai2.webp"),
        shape: Shape.Parallelogram,
        seed: 8117,
      },
      {
        source: require("../images/pichai3.webp"),
        shape: Shape.Circle,
        seed: 9127,
      },
    ],
  },
  {
    name: "Demis Hassabis",
    company: "Google DeepMind",
    images: [
      {
        source: require("../images/hassabis1.webp"),
        shape: Shape.Triangle,
        seed: 10139,
      },
      {
        source: require("../images/hassabis2.webp"),
        shape: Shape.Quadrilateral,
        seed: 11149,
      },
      {
        source: require("../images/hassabis3.webp"),
        shape: Shape.Parallelogram,
        seed: 12157,
      },
    ],
  },
];

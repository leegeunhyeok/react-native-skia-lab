export enum Shape {
  Circle = 0,
  Triangle = 1,
  Quadrilateral = 2,
  Parallelogram = 3,
}

type PersonImage = {
  source: number;
  shape: Shape;
  seed: number;
};

export type Person = {
  name: string;
  company: string;
  images: [PersonImage, PersonImage, PersonImage];
};

export type ShaderFrameDefinition = PersonImage & {
  personIndex: number;
};

import {
  DOMMatrix,
  ImageData,
  Path2D,
} from "@napi-rs/canvas";

const graphicsGlobals = globalThis as unknown as {
  DOMMatrix?: unknown;
  ImageData?: unknown;
  Path2D?: unknown;
};

graphicsGlobals.DOMMatrix ??= DOMMatrix;
graphicsGlobals.ImageData ??= ImageData;
graphicsGlobals.Path2D ??= Path2D;

import "./pdf-runtime-globals";

import {
  getDocument,
  OPS,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  WorkerMessageHandler,
} from "pdfjs-dist/legacy/build/pdf.worker.mjs";

const workerGlobal = globalThis as unknown as {
  pdfjsWorker?: { readonly WorkerMessageHandler: typeof WorkerMessageHandler };
};

workerGlobal.pdfjsWorker ??= { WorkerMessageHandler };

export {
  getDocument,
  OPS,
};

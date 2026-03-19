import { dataUrlToImage, readFileAsDataUrl } from "./file-utils";

let pdfRuntimePromise;

async function loadPdfRuntime() {
  if (!pdfRuntimePromise) {
    pdfRuntimePromise = Promise.all([
      import("pdf-lib"),
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfLib, pdfjs, workerModule]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

      return {
        PDFDocument: pdfLib.PDFDocument,
        degrees: pdfLib.degrees,
        pdfjs,
      };
    });
  }

  return pdfRuntimePromise;
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderPageToCanvas(viewport) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  if (!context) {
    throw new Error("Could not create a canvas for PDF preview.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  return {
    canvas,
    context,
  };
}

export function isPdfFile(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function loadPreviewImageFromFile(file) {
  if (!isPdfFile(file)) {
    const imageDataUrl = await readFileAsDataUrl(file);
    return dataUrlToImage(imageDataUrl);
  }

  const { pdfjs } = await loadPdfRuntime();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const documentProxy = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await documentProxy.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.max(1.8, 1400 / baseViewport.width);
  const viewport = page.getViewport({ scale });
  const { canvas, context } = renderPageToCanvas(viewport);

  await page.render({ canvasContext: context, viewport }).promise;

  if (typeof page.cleanup === "function") {
    page.cleanup();
  }

  if (typeof documentProxy.cleanup === "function") {
    documentProxy.cleanup();
  }

  return dataUrlToImage(canvas.toDataURL("image/png"));
}

export async function loadPdfProject(files) {
  const { pdfjs } = await loadPdfRuntime();
  const loadedFiles = [];
  const loadedPages = [];

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const documentProxy = await pdfjs.getDocument({ data: bytes }).promise;
    const fileId = createId(file.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase());

    loadedFiles.push({
      id: fileId,
      name: file.name,
      bytes,
      pageCount: documentProxy.numPages,
    });

    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      const page = await documentProxy.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(240 / baseViewport.width, 320 / baseViewport.height);
      const viewport = page.getViewport({ scale: Math.max(scale, 0.3) });
      const { canvas, context } = renderPageToCanvas(viewport);

      await page.render({ canvasContext: context, viewport }).promise;

      loadedPages.push({
        id: `${fileId}-page-${pageNumber}`,
        fileId,
        fileName: file.name,
        pageIndex: pageNumber - 1,
        rotation: 0,
        thumbnail: canvas.toDataURL("image/jpeg", 0.82),
      });

      if (typeof page.cleanup === "function") {
        page.cleanup();
      }
    }

    if (typeof documentProxy.cleanup === "function") {
      documentProxy.cleanup();
    }
  }

  return {
    files: loadedFiles,
    pages: loadedPages,
  };
}

export function parsePageRanges(input, maxPages) {
  const cleanedInput = input.trim();

  if (!cleanedInput) {
    return [];
  }

  const pages = new Set();

  cleanedInput.split(",").forEach((chunk) => {
    const trimmedChunk = chunk.trim();

    if (!trimmedChunk) {
      return;
    }

    if (trimmedChunk.includes("-")) {
      const [startRaw, endRaw] = trimmedChunk
        .split("-")
        .map((value) => Number.parseInt(value.trim(), 10));

      if (Number.isNaN(startRaw) || Number.isNaN(endRaw)) {
        return;
      }

      const start = Math.max(1, Math.min(startRaw, endRaw));
      const end = Math.min(maxPages, Math.max(startRaw, endRaw));

      for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        pages.add(pageNumber);
      }

      return;
    }

    const pageNumber = Number.parseInt(trimmedChunk, 10);

    if (!Number.isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= maxPages) {
      pages.add(pageNumber);
    }
  });

  return [...pages].sort((left, right) => left - right);
}

export async function buildPdfBytesFromPages(pages, pdfFileMap) {
  if (!pages.length) {
    throw new Error("There are no pages to export.");
  }

  const { PDFDocument, degrees } = await loadPdfRuntime();
  const outputDocument = await PDFDocument.create();
  const sourceCache = new Map();

  for (const page of pages) {
    const sourceFile = pdfFileMap.get(page.fileId);

    if (!sourceFile) {
      throw new Error(`Source PDF is missing for ${page.fileName}.`);
    }

    let sourceDocument = sourceCache.get(page.fileId);

    if (!sourceDocument) {
      sourceDocument = await PDFDocument.load(sourceFile.bytes);
      sourceCache.set(page.fileId, sourceDocument);
    }

    const [copiedPage] = await outputDocument.copyPages(sourceDocument, [page.pageIndex]);

    copiedPage.setRotation(degrees(page.rotation || 0));
    outputDocument.addPage(copiedPage);
  }

  return outputDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
}

export async function buildSplitExports(sourceFile, targetPages) {
  const { PDFDocument } = await loadPdfRuntime();
  const sourceDocument = await PDFDocument.load(sourceFile.bytes);
  const exports = [];

  for (const pageNumber of targetPages) {
    const outputDocument = await PDFDocument.create();
    const [copiedPage] = await outputDocument.copyPages(sourceDocument, [pageNumber - 1]);

    outputDocument.addPage(copiedPage);

    exports.push({
      filename: `${sourceFile.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.pdf`,
      bytes: await outputDocument.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      }),
    });
  }

  return exports;
}

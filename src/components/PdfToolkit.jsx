import { useState } from "react";
import Panel from "./Panel";
import { downloadBytes } from "../lib/file-utils";
import {
  buildPdfBytesFromPages,
  buildSplitExports,
  isPdfFile,
  loadPdfProject,
  parsePageRanges,
} from "../lib/pdf-utils";

const actions = [
  { value: "merge", label: "Download merged PDF" },
  { value: "split", label: "Split first uploaded PDF" },
  { value: "rotate", label: "Rotate selected pages" },
  { value: "move-up", label: "Move selected pages up" },
  { value: "move-down", label: "Move selected pages down" },
  { value: "move-top", label: "Move selected pages to top" },
  { value: "move-bottom", label: "Move selected pages to bottom" },
  { value: "extract", label: "Extract selected pages" },
  { value: "remove", label: "Remove selected pages" },
];

function createFileMap(pdfFiles) {
  return new Map(pdfFiles.map((file) => [file.id, file]));
}

export default function PdfToolkit() {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfPages, setPdfPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [action, setAction] = useState("merge");
  const [splitRange, setSplitRange] = useState("");
  const [rotateDegrees, setRotateDegrees] = useState(90);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({
    tone: "info",
    text: "Upload one or more PDFs to build the working page list.",
  });

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []).filter((file) => isPdfFile(file));

    if (!files.length) {
      setNotice({
        tone: "error",
        text: "Please choose one or more PDF files.",
      });
      event.target.value = "";
      return;
    }

    setBusy(true);
    setNotice({
      tone: "info",
      text: "Reading PDFs and generating thumbnails...",
    });

    try {
      const loadedProject = await loadPdfProject(files);

      setPdfFiles((current) => [...current, ...loadedProject.files]);
      setPdfPages((current) => [...current, ...loadedProject.pages]);
      setNotice({
        tone: "success",
        text: `Loaded ${loadedProject.files.length} file(s) and ${loadedProject.pages.length} page(s).`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message || "Could not read one or more PDFs.",
      });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function togglePageSelection(id) {
    setSelectedPages((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function ensureSelection(message) {
    if (selectedPages.length) {
      return true;
    }

    setNotice({
      tone: "error",
      text: message,
    });
    return false;
  }

  function ensurePages(message) {
    if (pdfPages.length) {
      return true;
    }

    setNotice({
      tone: "error",
      text: message,
    });
    return false;
  }

  function selectAllPages() {
    if (!ensurePages("Upload a PDF first.")) {
      return;
    }

    setSelectedPages(pdfPages.map((page) => page.id));
    setNotice({
      tone: "success",
      text: `Selected ${pdfPages.length} page(s).`,
    });
  }

  function clearSelection() {
    setSelectedPages([]);
    setNotice({
      tone: "info",
      text: "Selection cleared.",
    });
  }

  function clearProject() {
    setPdfFiles([]);
    setPdfPages([]);
    setSelectedPages([]);
    setSplitRange("");
    setNotice({
      tone: "info",
      text: "PDF workspace cleared.",
    });
  }

  function moveSelected(direction) {
    if (!ensureSelection("Select at least one page first.")) {
      return;
    }

    setPdfPages((current) => {
      const nextPages = [...current];

      if (direction === "up") {
        for (let index = 1; index < nextPages.length; index += 1) {
          if (
            selectedPages.includes(nextPages[index].id) &&
            !selectedPages.includes(nextPages[index - 1].id)
          ) {
            [nextPages[index - 1], nextPages[index]] = [
              nextPages[index],
              nextPages[index - 1],
            ];
          }
        }
      } else {
        for (let index = nextPages.length - 2; index >= 0; index -= 1) {
          if (
            selectedPages.includes(nextPages[index].id) &&
            !selectedPages.includes(nextPages[index + 1].id)
          ) {
            [nextPages[index], nextPages[index + 1]] = [
              nextPages[index + 1],
              nextPages[index],
            ];
          }
        }
      }

      return nextPages;
    });

    setNotice({
      tone: "success",
      text: direction === "up" ? "Selected pages moved up." : "Selected pages moved down.",
    });
  }

  function moveSelectedToEdge(edge) {
    if (!ensureSelection("Select at least one page first.")) {
      return;
    }

    setPdfPages((current) => {
      const selected = current.filter((page) => selectedPages.includes(page.id));
      const remaining = current.filter((page) => !selectedPages.includes(page.id));

      return edge === "top" ? [...selected, ...remaining] : [...remaining, ...selected];
    });

    setNotice({
      tone: "success",
      text: edge === "top" ? "Selected pages moved to top." : "Selected pages moved to bottom.",
    });
  }

  function rotateSelected() {
    if (!ensureSelection("Select at least one page first.")) {
      return;
    }

    const normalizedRotation = (((Number(rotateDegrees) || 0) % 360) + 360) % 360;

    setPdfPages((current) =>
      current.map((page) =>
        selectedPages.includes(page.id)
          ? {
              ...page,
              rotation: (((page.rotation || 0) + normalizedRotation) % 360 + 360) % 360,
            }
          : page,
      ),
    );

    setNotice({
      tone: "success",
      text: `Applied ${normalizedRotation} deg rotation to ${selectedPages.length} page(s).`,
    });
  }

  function reversePageOrder() {
    if (!ensurePages("Upload a PDF first.")) {
      return;
    }

    setPdfPages((current) => [...current].reverse());
    setNotice({
      tone: "success",
      text: "Page order reversed.",
    });
  }

  function removeSelected() {
    if (!ensureSelection("Select at least one page first.")) {
      return;
    }

    setPdfPages((current) => current.filter((page) => !selectedPages.includes(page.id)));
    setSelectedPages([]);
    setNotice({
      tone: "success",
      text: "Selected pages removed from the export list.",
    });
  }

  async function exportMergedPdf() {
    if (!ensurePages("Upload a PDF first.")) {
      return;
    }

    setBusy(true);
    setNotice({
      tone: "info",
      text: "Building merged PDF...",
    });

    try {
      const bytes = await buildPdfBytesFromPages(pdfPages, createFileMap(pdfFiles));
      downloadBytes(bytes, "pdf-merged.pdf");
      setNotice({
        tone: "success",
        text: `Merged ${pdfPages.length} page(s) into one PDF.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message || "Could not export the merged PDF.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function exportSelectedPages() {
    if (!ensureSelection("Select at least one page first.")) {
      return;
    }

    setBusy(true);
    setNotice({
      tone: "info",
      text: "Extracting selected pages...",
    });

    try {
      const selectedSet = new Set(selectedPages);
      const orderedPages = pdfPages.filter((page) => selectedSet.has(page.id));
      const bytes = await buildPdfBytesFromPages(orderedPages, createFileMap(pdfFiles));
      downloadBytes(bytes, "pdf-extracted-pages.pdf");
      setNotice({
        tone: "success",
        text: `Downloaded ${orderedPages.length} selected page(s).`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message || "Could not export selected pages.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function splitPdf() {
    const source = pdfFiles[0];

    if (!source) {
      setNotice({
        tone: "error",
        text: "Upload at least one PDF before using split.",
      });
      return;
    }

    const hasCustomRange = splitRange.trim().length > 0;
    const requestedPages = parsePageRanges(splitRange, source.pageCount);

    if (hasCustomRange && !requestedPages.length) {
      setNotice({
        tone: "error",
        text: "Split range is invalid. Try something like 1,3,5-7.",
      });
      return;
    }

    setBusy(true);
    setNotice({
      tone: "info",
      text: "Creating split exports. Your browser may ask to allow multiple downloads.",
    });

    try {
      const targetPages = requestedPages.length
        ? requestedPages
        : Array.from({ length: source.pageCount }, (_, index) => index + 1);
      const splitFiles = await buildSplitExports(source, targetPages);

      splitFiles.forEach((item) => downloadBytes(item.bytes, item.filename));
      setNotice({
        tone: "success",
        text: `Prepared ${splitFiles.length} split PDF download(s).`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message || "Could not split the PDF.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runAction() {
    switch (action) {
      case "merge":
        await exportMergedPdf();
        break;
      case "split":
        await splitPdf();
        break;
      case "rotate":
        rotateSelected();
        break;
      case "move-up":
        moveSelected("up");
        break;
      case "move-down":
        moveSelected("down");
        break;
      case "move-top":
        moveSelectedToEdge("top");
        break;
      case "move-bottom":
        moveSelectedToEdge("bottom");
        break;
      case "extract":
        await exportSelectedPages();
        break;
      case "remove":
        removeSelected();
        break;
      default:
        break;
    }
  }

  return (
    <section className="section-grid">
      <Panel
        eyebrow="Tool 02"
        title="PDF Toolkit"
        description="Upload PDF files, organize the working page list, and export the result entirely in the browser."
        actions={
          <button type="button" className="button ghost" onClick={clearProject}>
            Clear workspace
          </button>
        }
      >
        <div className="stack-lg">
          <div className="field">
            <label htmlFor="pdf-upload">PDF files</label>
            <div className="inline-actions">
              <label className="button secondary" htmlFor="pdf-upload">
                Choose PDFs
              </label>
              <input
                id="pdf-upload"
                className="sr-only"
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleUpload}
              />
              <span className="hint">Upload one or many files</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="pdf-action">Action</label>
            <select
              id="pdf-action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              {actions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="split-range">Split range</label>
            <input
              id="split-range"
              value={splitRange}
              placeholder="1,3,5-7"
              onChange={(event) => setSplitRange(event.target.value)}
            />
            <div className="meta-line">Split uses the first uploaded PDF.</div>
          </div>

          <div className="field">
            <label htmlFor="rotate-degrees">Rotate selected pages</label>
            <input
              id="rotate-degrees"
              type="number"
              value={rotateDegrees}
              onChange={(event) => setRotateDegrees(event.target.value)}
            />
          </div>

          <div className="button-row wrap">
            <button type="button" className="button" onClick={runAction}>
              Run selected action
            </button>
            <button type="button" className="button secondary" onClick={selectAllPages}>
              Select all
            </button>
            <button type="button" className="button ghost" onClick={clearSelection}>
              Clear selection
            </button>
            <button type="button" className="button ghost" onClick={reversePageOrder}>
              Reverse order
            </button>
          </div>

          <div className={`notice ${notice.tone}`} aria-live="polite">
            <strong>{busy ? "Working" : "Status"}</strong>
            <span>{busy ? "Processing PDFs..." : notice.text}</span>
          </div>

          <div className="chip-grid">
            <article className="chip-card">
              <strong>Loaded files</strong>
              <span>{pdfFiles.length}</span>
            </article>
            <article className="chip-card">
              <strong>Total pages</strong>
              <span>{pdfPages.length}</span>
            </article>
            <article className="chip-card">
              <strong>Selected</strong>
              <span>{selectedPages.length}</span>
            </article>
          </div>
        </div>
      </Panel>

      <Panel
        eyebrow="Preview"
        title="Working page order"
        description="Every card below represents one page in the current output order. Click cards to select or unselect them."
      >
        {!pdfPages.length ? (
          <div className="empty-state">
            <strong>No PDF pages loaded yet.</strong>
            <span>Upload one or more PDFs to populate this workspace.</span>
          </div>
        ) : (
          <div className="page-grid">
            {pdfPages.map((page, index) => {
              const isSelected = selectedPages.includes(page.id);

              return (
                <button
                  key={page.id}
                  type="button"
                  className={`page-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => togglePageSelection(page.id)}
                  aria-pressed={isSelected}
                >
                  <div className="page-thumb">
                    {page.thumbnail ? (
                      <img src={page.thumbnail} alt={`${page.fileName} page ${page.pageIndex + 1}`} />
                    ) : (
                      <div className="page-thumb-fallback">Preview unavailable</div>
                    )}
                  </div>

                  <div className="page-meta">
                    <div className="page-order-row">
                      <strong>#{index + 1}</strong>
                      <span>{page.rotation || 0} deg</span>
                    </div>
                    <h3>{page.fileName}</h3>
                    <p>Original page {page.pageIndex + 1}</p>
                    <small>{isSelected ? "Selected" : "Click to select"}</small>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </section>
  );
}

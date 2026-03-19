import { useEffect, useRef, useState } from "react";
import Panel from "./Panel";
import { downloadBlob } from "../lib/file-utils";
import {
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  clamp,
  defaultQrDetails,
  getCenteredCrop,
  normalizeCropPosition,
  renderQrLayout,
} from "../lib/qr-utils";
import { loadPreviewImageFromFile } from "../lib/pdf-utils";

const textFields = [
  { id: "accountName", label: "Account name" },
  { id: "accountNumber", label: "Account number" },
  { id: "currencyLabel", label: "Currency text" },
  { id: "badgeText", label: "Center badge", placeholder: "Leave blank to hide" },
];

function createEmptyPreviewMessage(sourceImage) {
  return sourceImage
    ? "Drag inside the preview frame to fine-tune the crop."
    : "Upload an image or PDF to generate the QR layout preview.";
}

export default function QrStudio() {
  const previewRef = useRef(null);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    scale: 1,
  });

  const [sourceImage, setSourceImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [details, setDetails] = useState(defaultQrDetails);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({
    tone: "info",
    text: createEmptyPreviewMessage(null),
  });

  useEffect(() => {
    if (!previewRef.current) {
      return;
    }

    renderQrLayout(
      previewRef.current,
      {
        sourceImage,
        zoom,
        rotation,
        crop,
        ...details,
      },
      { showGuide: true },
    );
  }, [sourceImage, zoom, rotation, crop, details]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusy(true);
    setNotice({ tone: "info", text: "Preparing preview..." });

    try {
      const nextImage = await loadPreviewImageFromFile(file);
      const nextCrop = getCenteredCrop(nextImage, 1);

      setSourceImage(nextImage);
      setFileName(file.name);
      setZoom(1);
      setRotation(0);
      setCrop(nextCrop);
      setNotice({
        tone: "success",
        text: `${file.name} loaded. Adjust the crop, then export the PNG.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message || "Could not open that file. Try PNG, JPG, WEBP, or PDF.",
      });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function updateDetail(field, value) {
    setDetails((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleZoomChange(rawValue) {
    const nextZoom = clamp(Number(rawValue) || 1, 1, 3);
    const nextCrop = normalizeCropPosition(sourceImage, crop, nextZoom);

    setZoom(nextZoom);
    setCrop(nextCrop);
  }

  function handleRotationChange(rawValue) {
    setRotation(clamp(Number(rawValue) || 0, -180, 180));
  }

  function resetView() {
    if (!sourceImage) {
      return;
    }

    setZoom(1);
    setRotation(0);
    setCrop(getCenteredCrop(sourceImage, 1));
    setNotice({
      tone: "info",
      text: "Preview reset to the centered default framing.",
    });
  }

  async function exportPng() {
    if (!sourceImage) {
      return;
    }

    const exportCanvas = document.createElement("canvas");

    renderQrLayout(
      exportCanvas,
      {
        sourceImage,
        zoom,
        rotation,
        crop,
        ...details,
      },
      { showGuide: false },
    );

    const blob = await new Promise((resolve) => {
      exportCanvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      setNotice({
        tone: "error",
        text: "Could not create the PNG export.",
      });
      return;
    }

    downloadBlob(
      blob,
      `${fileName ? fileName.replace(/\.[^.]+$/, "") : "qr-layout"}.png`,
    );
    setNotice({
      tone: "success",
      text: "PNG export downloaded.",
    });
  }

  function handlePointerDown(event) {
    if (!sourceImage) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = OUTPUT_WIDTH / bounds.width;

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: crop.x,
      originY: crop.y,
      scale,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - dragRef.current.startX) * dragRef.current.scale;
    const deltaY = (event.clientY - dragRef.current.startY) * dragRef.current.scale;
    const nextCrop = normalizeCropPosition(
      sourceImage,
      {
        x: dragRef.current.originX + deltaX,
        y: dragRef.current.originY + deltaY,
      },
      zoom,
    );

    setCrop(nextCrop);
  }

  function handlePointerUp(event) {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current.active = false;
    dragRef.current.pointerId = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="section-grid">
      <Panel
        eyebrow="Tool 01"
        title="QR Layout Studio"
        description="Upload a QR image or PDF page, adjust the framing, and export the final branded card as PNG."
      >
        <div className="stack-lg">
          <div className="notice info">
            <strong>Tip</strong>
            <span>PDF uploads use the first page automatically.</span>
          </div>

          <div className="field">
            <label htmlFor="qr-upload">Source file</label>
            <div className="inline-actions">
              <label className="button secondary" htmlFor="qr-upload">
                Choose file
              </label>
              <input
                id="qr-upload"
                className="sr-only"
                type="file"
                accept="image/*,.pdf"
                onChange={handleUpload}
              />
              <span className="hint">PNG, JPG, WEBP, PDF</span>
            </div>
            {fileName ? <div className="meta-line">Loaded: {fileName}</div> : null}
          </div>

          <div className="form-grid">
            {textFields.map((field) => (
              <div className="field" key={field.id}>
                <label htmlFor={field.id}>{field.label}</label>
                <input
                  id={field.id}
                  value={details[field.id]}
                  placeholder={field.placeholder}
                  onChange={(event) => updateDetail(field.id, event.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="range-stack">
            <div className="range-row">
              <label htmlFor="zoom-range">Zoom</label>
              <span>{zoom.toFixed(2)}x</span>
            </div>
            <input
              id="zoom-range"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => handleZoomChange(event.target.value)}
            />
            <input
              type="number"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => handleZoomChange(event.target.value)}
            />
          </div>

          <div className="range-stack">
            <div className="range-row">
              <label htmlFor="rotation-range">Rotation</label>
              <span>{rotation} deg</span>
            </div>
            <input
              id="rotation-range"
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(event) => handleRotationChange(event.target.value)}
            />
            <input
              type="number"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(event) => handleRotationChange(event.target.value)}
            />
          </div>

          <div className="button-row">
            <button type="button" className="button ghost" onClick={resetView}>
              Reset view
            </button>
            <button
              type="button"
              className="button"
              onClick={exportPng}
              disabled={!sourceImage}
            >
              Export PNG
            </button>
          </div>

          <div className={`notice ${notice.tone}`} aria-live="polite">
            <strong>{busy ? "Working" : "Status"}</strong>
            <span>{busy ? "Loading source file..." : notice.text}</span>
          </div>
        </div>
      </Panel>

      <div className="stack-lg">
        <Panel
          eyebrow="Preview"
          title="Live output"
          description="The exported canvas is locked to the final production size."
        >
          <div
            className={`canvas-surface${sourceImage ? " is-loaded" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <canvas ref={previewRef} className="preview-canvas" />
          </div>

          <div className="canvas-footnote">
            Output size: {OUTPUT_WIDTH} x {OUTPUT_HEIGHT}px
          </div>
        </Panel>

        <Panel
          eyebrow="Specs"
          title="Production notes"
          description="A few quick details to keep the final asset consistent."
        >
          <div className="chip-grid">
            <article className="chip-card">
              <strong>Export format</strong>
              <span>PNG download from the browser</span>
            </article>
            <article className="chip-card">
              <strong>Crop behavior</strong>
              <span>Drag directly inside the preview frame</span>
            </article>
            <article className="chip-card">
              <strong>Current state</strong>
              <span>{createEmptyPreviewMessage(sourceImage)}</span>
            </article>
          </div>
        </Panel>
      </div>
    </section>
  );
}

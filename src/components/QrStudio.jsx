import { useEffect, useRef, useState } from "react";
import Panel from "./Panel";
import { dataUrlToImage, downloadBlob, readFileAsDataUrl } from "../lib/file-utils";
import {
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
  clamp,
  defaultQrDetails,
  getCenteredCrop,
  normalizeCropPosition,
  renderQrLayout,
} from "../lib/qr-utils";

const textFields = [
  { id: "accountName", label: "Account name" },
  { id: "accountNumber", label: "Account number" },
];

const currencyOptions = [
  { value: "USD $", label: "USD $" },
  { value: "KHR ៛", label: "KHR ៛" },
];

const badgeOptions = [
  { value: "", label: "None" },
  { value: "$", label: "$" },
  { value: "៛", label: "៛" },
];

function formatAccountNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const groups = [3, 4, 3, 3];
  const parts = [];
  let cursor = 0;

  for (const size of groups) {
    if (cursor >= digits.length) {
      break;
    }

    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  return parts.join(" ");
}

function createEmptyPreviewMessage(sourceImage) {
  return sourceImage
    ? "Drag inside the preview frame to fine-tune the crop."
    : "Upload an image to generate the QR layout preview.";
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

    let active = true;

    const renderPreview = () => {
      if (!previewRef.current || !active) {
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
    };

    renderPreview();

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        renderPreview();
      });
    }

    return () => {
      active = false;
    };
  }, [sourceImage, zoom, rotation, crop, details]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusy(true);
    setNotice({ tone: "info", text: "Preparing preview..." });

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const nextImage = await dataUrlToImage(imageDataUrl);
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
        text: error.message || "Could not open that file. Try PNG, JPG, or WEBP.",
      });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function updateDetail(field, value) {
    setDetails((current) => ({
      ...current,
      [field]: field === "accountNumber" ? formatAccountNumber(value) : value,
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
        description="Upload a QR image, adjust the framing, and export the final branded card as PNG."
      >
        <div className="stack-lg">
          <div className="notice info">
            <strong>Tip</strong>
            <span>Use a clean QR image for the sharpest final export.</span>
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
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUpload}
              />
              <span className="hint">PNG, JPG, WEBP</span>
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
                  inputMode={field.id === "accountNumber" ? "numeric" : undefined}
                  maxLength={field.id === "accountNumber" ? 16 : undefined}
                  onChange={(event) => updateDetail(field.id, event.target.value)}
                />
              </div>
            ))}

            <div className="field">
              <label htmlFor="currencyLabel">Currency text</label>
              <select
                id="currencyLabel"
                value={details.currencyLabel}
                onChange={(event) => updateDetail("currencyLabel", event.target.value)}
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="badgeText">Center badge</label>
              <select
                id="badgeText"
                value={details.badgeText}
                onChange={(event) => updateDetail("badgeText", event.target.value)}
              >
                {badgeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="adjust-grid">
            <div className="range-stack">
              <div className="range-row range-row--control">
                <label htmlFor="zoom-range">Zoom</label>
                <div className="range-inline">
                  <span>{zoom.toFixed(2)}x</span>
                  <input
                    className="range-number"
                    type="number"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) => handleZoomChange(event.target.value)}
                  />
                </div>
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
            </div>

            <div className="range-stack">
              <div className="range-row range-row--control">
                <label htmlFor="rotation-range">Rotation</label>
                <div className="range-inline">
                  <span>{rotation} deg</span>
                  <input
                    className="range-number"
                    type="number"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotation}
                    onChange={(event) => handleRotationChange(event.target.value)}
                  />
                </div>
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
            </div>
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
      </div>
    </section>
  );
}

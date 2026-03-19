export const OUTPUT_WIDTH = 631;
export const OUTPUT_HEIGHT = 892;
export const QR_FRAME = { x: 35, y: 20, width: 561, height: 561 };

const CORNER_SIZE = 58;
const CORNER_THICKNESS = 10;
const BADGE_RADIUS = 39;

export const defaultQrDetails = {
  accountName: "PHSAR REATREY KPC USD",
  accountNumber: "005 0000 050 544",
  currencyLabel: "USD $",
  badgeText: "$",
};

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function drawCorner(context, x, y, horizontalDirection, verticalDirection) {
  context.fillRect(
    x,
    y,
    horizontalDirection * CORNER_SIZE,
    verticalDirection * CORNER_THICKNESS,
  );
  context.fillRect(
    x,
    y,
    horizontalDirection * CORNER_THICKNESS,
    verticalDirection * CORNER_SIZE,
  );
}

function drawFittedText(
  context,
  text,
  x,
  y,
  { maxWidth, fontSize, minFontSize, weight, family, color },
) {
  let size = fontSize;

  while (size > minFontSize) {
    context.font = `${weight} ${size}px ${family}`;

    if (context.measureText(text).width <= maxWidth) {
      break;
    }

    size -= 1;
  }

  context.fillStyle = color;
  context.fillText(text, x, y);
}

function drawCurrencyText(context, currencyLabel, centerX, baselineY) {
  const normalizedLabel = (currencyLabel || "USD $").trim();

  if (normalizedLabel === "KHR ៛") {
    const code = "KHR";
    const symbol = "៛";
    const gap = 16;

    context.textAlign = "left";
    context.textBaseline = "alphabetic";

    context.font = "700 82px Georgia";
    const codeWidth = context.measureText(code).width;

    context.font = "700 96px 'Noto Sans Khmer', 'Khmer OS Battambang', Arial";
    const symbolWidth = context.measureText(symbol).width;

    const startX = centerX - (codeWidth + gap + symbolWidth) / 2;

    context.fillStyle = "#e0332f";
    context.font = "700 82px Georgia";
    context.fillText(code, startX, baselineY);

    context.font = "700 96px 'Noto Sans Khmer', 'Khmer OS Battambang', Arial";
    context.fillText(symbol, startX + codeWidth + gap, baselineY + 4);
    return;
  }

  drawFittedText(context, normalizedLabel, centerX, baselineY, {
    maxWidth: OUTPUT_WIDTH - 80,
    fontSize: 84,
    minFontSize: 52,
    weight: 700,
    family: "Georgia",
    color: "#e0332f",
  });
}

function drawBadgeSymbol(context, badgeText, centerX, centerY) {
  const normalizedBadge = (badgeText || "$").trim();

  if (!normalizedBadge) {
    return;
  }

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (normalizedBadge === "៛") {
    context.font = "700 74px 'Noto Sans Khmer', 'Khmer OS Battambang', Arial";
    context.fillText(normalizedBadge, centerX, centerY + 4);
    return;
  }

  context.font = "700 64px Arial";
  context.fillText(normalizedBadge, centerX, centerY + 2);
}

function getBaseDraw(sourceImage) {
  if (!sourceImage) {
    return null;
  }

  const sourceAspect = sourceImage.width / sourceImage.height;
  const frameAspect = QR_FRAME.width / QR_FRAME.height;

  if (sourceAspect > frameAspect) {
    const height = QR_FRAME.height;

    return {
      width: height * sourceAspect,
      height,
    };
  }

  const width = QR_FRAME.width;

  return {
    width,
    height: width / sourceAspect,
  };
}

export function normalizeCropPosition(sourceImage, nextCrop, zoom = 1) {
  const baseDraw = getBaseDraw(sourceImage);

  if (!baseDraw) {
    return { x: 0, y: 0 };
  }

  const scaledWidth = baseDraw.width * zoom;
  const scaledHeight = baseDraw.height * zoom;
  const minX = Math.min(0, QR_FRAME.width - scaledWidth);
  const minY = Math.min(0, QR_FRAME.height - scaledHeight);

  return {
    x: clamp(nextCrop.x, minX, 0),
    y: clamp(nextCrop.y, minY, 0),
  };
}

export function getCenteredCrop(sourceImage, zoom = 1) {
  const baseDraw = getBaseDraw(sourceImage);

  if (!baseDraw) {
    return { x: 0, y: 0 };
  }

  return normalizeCropPosition(
    sourceImage,
    {
      x: (QR_FRAME.width - baseDraw.width * zoom) / 2,
      y: (QR_FRAME.height - baseDraw.height * zoom) / 2,
    },
    zoom,
  );
}

export function renderQrLayout(canvas, settings, options = {}) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const {
    sourceImage,
    crop = { x: 0, y: 0 },
    zoom = 1,
    rotation = 0,
    accountName,
    accountNumber,
    currencyLabel,
    badgeText,
  } = settings;

  const { showGuide = true } = options;

  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;

  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  context.fillStyle = "#ffffff";
  context.fillRect(QR_FRAME.x, QR_FRAME.y, QR_FRAME.width, QR_FRAME.height);

  if (sourceImage) {
    const baseDraw = getBaseDraw(sourceImage);

    if (baseDraw) {
      const drawWidth = baseDraw.width * zoom;
      const drawHeight = baseDraw.height * zoom;
      const centerX = QR_FRAME.x + crop.x + drawWidth / 2;
      const centerY = QR_FRAME.y + crop.y + drawHeight / 2;

      context.save();
      context.beginPath();
      context.rect(QR_FRAME.x, QR_FRAME.y, QR_FRAME.width, QR_FRAME.height);
      context.clip();
      context.translate(centerX, centerY);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(sourceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      context.restore();
    }
  } else {
    context.strokeStyle = "#d8d8d8";
    context.setLineDash([12, 8]);
    context.strokeRect(QR_FRAME.x + 18, QR_FRAME.y + 18, QR_FRAME.width - 36, QR_FRAME.height - 36);
    context.setLineDash([]);
    context.fillStyle = "#9a907f";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "600 26px Arial";
    context.fillText("Upload QR artwork", OUTPUT_WIDTH / 2, QR_FRAME.y + QR_FRAME.height / 2 - 12);
    context.font = "500 18px Arial";
    context.fillText("PNG, JPG, or WEBP image", OUTPUT_WIDTH / 2, QR_FRAME.y + QR_FRAME.height / 2 + 24);
  }

  context.fillStyle = "#d43d2e";
  const cornerOffset = 8;
  drawCorner(context, QR_FRAME.x - cornerOffset, QR_FRAME.y - cornerOffset, 1, 1);
  drawCorner(
    context,
    QR_FRAME.x + QR_FRAME.width + cornerOffset,
    QR_FRAME.y - cornerOffset,
    -1,
    1,
  );
  drawCorner(
    context,
    QR_FRAME.x - cornerOffset,
    QR_FRAME.y + QR_FRAME.height + cornerOffset,
    1,
    -1,
  );
  drawCorner(
    context,
    QR_FRAME.x + QR_FRAME.width + cornerOffset,
    QR_FRAME.y + QR_FRAME.height + cornerOffset,
    -1,
    -1,
  );

  if (badgeText?.trim()) {
    const badgeCenterX = OUTPUT_WIDTH / 2;
    const badgeCenterY = QR_FRAME.y + QR_FRAME.height / 2 + 12;

    context.beginPath();
    context.arc(
      badgeCenterX,
      badgeCenterY,
      BADGE_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fillStyle = "#c93f32";
    context.fill();
    drawBadgeSymbol(context, badgeText, badgeCenterX, badgeCenterY);
  }

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  drawFittedText(context, accountName || "ACCOUNT NAME", OUTPUT_WIDTH / 2, 664, {
    maxWidth: OUTPUT_WIDTH - 70,
    fontSize: 32,
    minFontSize: 22,
    weight: 700,
    family: "Arial",
    color: "#1a1a1a",
  });

  drawFittedText(context, accountNumber || "000 0000 000 000", OUTPUT_WIDTH / 2, 736, {
    maxWidth: OUTPUT_WIDTH - 60,
    fontSize: 56,
    minFontSize: 34,
    weight: 700,
    family: "Arial",
    color: "#111111",
  });

  drawCurrencyText(context, currencyLabel, OUTPUT_WIDTH / 2, 846);

  if (showGuide) {
    context.strokeStyle = "rgba(150, 150, 150, 0.28)";
    context.lineWidth = 2;
    context.setLineDash([10, 6]);
    context.strokeRect(QR_FRAME.x, QR_FRAME.y, QR_FRAME.width, QR_FRAME.height);
    context.setLineDash([]);
  }
}

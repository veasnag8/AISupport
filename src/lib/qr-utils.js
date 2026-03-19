export const OUTPUT_WIDTH = 631;
export const OUTPUT_HEIGHT = 892;
export const QR_FRAME = { x: 67, y: 40, width: 497, height: 515 };

const CORNER_SIZE = 65;
const CORNER_THICKNESS = 12;
const BADGE_RADIUS = 47;

export const defaultQrDetails = {
  accountName: "KPC NIGHT MARKET USD",
  accountNumber: "001 0001 050 864",
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
  context.fillRect(28, 30, OUTPUT_WIDTH - 56, OUTPUT_HEIGHT - 60);
  context.strokeStyle = "#e7e2d9";
  context.lineWidth = 2;
  context.strokeRect(28, 30, OUTPUT_WIDTH - 56, OUTPUT_HEIGHT - 60);

  context.fillStyle = "#fcfaf7";
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
    context.strokeStyle = "#d9d1c4";
    context.setLineDash([12, 8]);
    context.strokeRect(QR_FRAME.x + 18, QR_FRAME.y + 18, QR_FRAME.width - 36, QR_FRAME.height - 36);
    context.setLineDash([]);
    context.fillStyle = "#8b7d6a";
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
    context.beginPath();
    context.arc(
      OUTPUT_WIDTH / 2,
      QR_FRAME.y + QR_FRAME.height / 2 + 18,
      BADGE_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fillStyle = "#c93f32";
    context.fill();
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 74px Georgia";
    context.fillText(badgeText.trim(), OUTPUT_WIDTH / 2, QR_FRAME.y + QR_FRAME.height / 2 + 20);
  }

  context.fillStyle = "#173449";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.font = "700 42px Georgia";
  context.fillText(accountName || "ACCOUNT NAME", OUTPUT_WIDTH / 2, 662);

  context.font = "700 56px Arial";
  context.fillText(accountNumber || "000 0000 000 000", OUTPUT_WIDTH / 2, 726);

  context.fillStyle = "#c63b2f";
  context.font = "700 92px Georgia";
  context.fillText(currencyLabel || "USD $", OUTPUT_WIDTH / 2, 828);

  if (showGuide) {
    context.strokeStyle = "rgba(125, 116, 102, 0.3)";
    context.lineWidth = 2;
    context.setLineDash([10, 6]);
    context.strokeRect(QR_FRAME.x, QR_FRAME.y, QR_FRAME.width, QR_FRAME.height);
    context.setLineDash([]);
  }
}

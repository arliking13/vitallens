export type PpgSample = {
  t: number;
  red: number;
  green: number;
  blue: number;
  brightness: number;
};

const SAMPLE_CANVAS_SIZE = 40;
const CENTRAL_REGION_RATIO = 0.45;

function getCanvasContext(canvas: HTMLCanvasElement) {
  return canvas.getContext("2d", { willReadFrequently: true });
}

function getCentralRegion(video: HTMLVideoElement) {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const regionSize = Math.max(
    1,
    Math.floor(Math.min(videoWidth, videoHeight) * CENTRAL_REGION_RATIO),
  );

  return {
    sourceX: Math.floor((videoWidth - regionSize) / 2),
    sourceY: Math.floor((videoHeight - regionSize) / 2),
    sourceSize: regionSize,
  };
}

function averageFrameData(data: Uint8ClampedArray): Omit<PpgSample, "t"> {
  let red = 0;
  let green = 0;
  let blue = 0;
  const pixelCount = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
  }

  const averageRed = red / pixelCount;
  const averageGreen = green / pixelCount;
  const averageBlue = blue / pixelCount;

  return {
    red: averageRed,
    green: averageGreen,
    blue: averageBlue,
    brightness: averageRed * 0.299 + averageGreen * 0.587 + averageBlue * 0.114,
  };
}

export function readPpgSample(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  t = performance.now(),
): PpgSample | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const context = getCanvasContext(canvas);
  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  const { sourceX, sourceY, sourceSize } = getCentralRegion(video);
  canvas.width = SAMPLE_CANVAS_SIZE;
  canvas.height = SAMPLE_CANVAS_SIZE;

  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    SAMPLE_CANVAS_SIZE,
    SAMPLE_CANVAS_SIZE,
  );

  const imageData = context.getImageData(
    0,
    0,
    SAMPLE_CANVAS_SIZE,
    SAMPLE_CANVAS_SIZE,
  );
  const averages = averageFrameData(imageData.data);

  return {
    t,
    ...averages,
  };
}

export function buildLiveSignal(samples: PpgSample[], maxPoints = 64) {
  const values = samples.slice(-maxPoints).map((sample) => sample.green);

  if (values.length === 0) {
    return [];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  if (range < 0.001) {
    return values.map(() => 0.5);
  }

  return values.map((value) => (value - minValue) / range);
}


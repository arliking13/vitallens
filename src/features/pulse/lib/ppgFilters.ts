function clampWindowSize(windowSize: number) {
  return Math.max(1, Math.floor(windowSize));
}

export function movingAverage(values: number[], windowSize = 5) {
  const size = clampWindowSize(windowSize);

  if (values.length === 0 || size === 1) {
    return values;
  }

  return values.map((_, index) => {
    const startIndex = Math.max(0, index - size + 1);
    const windowValues = values.slice(startIndex, index + 1);
    const total = windowValues.reduce((sum, value) => sum + value, 0);

    return total / windowValues.length;
  });
}


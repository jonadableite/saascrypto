// src/services/indicators/volume.ts
export function calculateAverageVolume(
  volumes: number[],
  period: number,
): number {
  if (volumes.length < period) return 0;
  const sum = volumes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

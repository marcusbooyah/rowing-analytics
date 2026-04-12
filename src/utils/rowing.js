export function speedToSplit(metersPerSec) {
  if (!metersPerSec || metersPerSec < 0.1) return 600;
  const split = 500 / metersPerSec;
  return Math.min(split, 600);
}

export function formatSplit(totalSeconds) {
  if (totalSeconds >= 600) return '--:--';
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds - minutes * 60;
  return `${minutes}:${secs.toFixed(1).padStart(4, '0')}`;
}

export function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseTimestamp(isoString) {
  return new Date(isoString).getTime();
}

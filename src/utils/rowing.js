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
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseTimestamp(isoString) {
  return new Date(isoString).getTime();
}

/**
 * Parse a mm:ss time string into total seconds. Returns null if invalid.
 */
export function parseElapsed(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  // h:mm:ss(.sss)
  const hms = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (hms) {
    const h = parseInt(hms[1], 10);
    const m = parseInt(hms[2], 10);
    const s = parseFloat(hms[3]);
    if (m >= 60 || s >= 60) return null;
    return h * 3600 + m * 60 + s;
  }
  // m:ss(.sss)
  const ms = trimmed.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (ms) {
    const m = parseInt(ms[1], 10);
    const s = parseFloat(ms[2]);
    if (s >= 60) return null;
    return m * 60 + s;
  }
  // Raw seconds
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num;
  return null;
}

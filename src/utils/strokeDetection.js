/**
 * Detect rowing strokes from GForceX oscillation pattern.
 * Each stroke cycle produces a characteristic acceleration peak during the drive
 * and a deceleration trough during the recovery.
 *
 * We detect strokes by finding peaks in GForceX after smoothing.
 */

function smooth(data, windowSize) {
  const half = Math.floor(windowSize / 2);
  return data.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(data.length - 1, i + half); j++) {
      sum += data[j];
      count++;
    }
    return sum / count;
  });
}

function findPeaks(data, minDistance, minProminence) {
  const peaks = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      // Check prominence: peak must be significantly above nearby valleys
      let leftMin = data[i];
      let rightMin = data[i];
      for (let j = i - 1; j >= Math.max(0, i - minDistance); j--) {
        leftMin = Math.min(leftMin, data[j]);
      }
      for (let j = i + 1; j <= Math.min(data.length - 1, i + minDistance); j++) {
        rightMin = Math.min(rightMin, data[j]);
      }
      const prominence = data[i] - Math.max(leftMin, rightMin);
      if (prominence >= minProminence) {
        // Check minimum distance from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
          peaks.push(i);
        }
      }
    }
  }
  return peaks;
}

/**
 * Detect strokes from rowing data.
 * @param {Array} data - Array of row objects with GForceX and elapsedSec
 * @param {number} sampleRate - Samples per second (default 10 for 10Hz)
 * @returns {Object} { strokes, strokeRates, driveRecovery }
 *   strokes: array of { peakIdx, catchIdx, finishIdx, elapsedSec }
 *   strokeRates: array of { elapsedSec, spm } at each stroke
 *   driveRecovery: array of { elapsedSec, driveTime, recoveryTime, ratio }
 */
export function detectStrokes(data, sampleRate = 10) {
  if (data.length < sampleRate * 2) return { strokes: [], strokeRates: [], driveRecovery: [] };

  const gforceX = data.map(r => r.GForceX);

  // Smooth with a window of ~0.3s to remove noise
  const smoothWindow = Math.max(3, Math.round(sampleRate * 0.3));
  const smoothed = smooth(gforceX, smoothWindow);

  // At typical rowing rates (15-40 SPM), stroke period is 1.5-4 seconds
  // Min distance between peaks: ~1 second worth of samples
  const minDistance = Math.round(sampleRate * 1.0);

  // Compute a reasonable prominence threshold from the data
  const sorted = [...smoothed].sort((a, b) => a - b);
  const range = sorted[Math.floor(sorted.length * 0.95)] - sorted[Math.floor(sorted.length * 0.05)];
  const minProminence = range * 0.15;

  const peakIndices = findPeaks(smoothed, minDistance, minProminence);

  if (peakIndices.length < 2) return { strokes: [], strokeRates: [], driveRecovery: [] };

  // For each peak, find the preceding valley (catch) and following valley (finish)
  const strokes = [];
  const strokeRates = [];
  const driveRecoveryData = [];

  for (let i = 0; i < peakIndices.length; i++) {
    const peakIdx = peakIndices[i];
    const prevBound = i > 0 ? peakIndices[i - 1] : Math.max(0, peakIdx - minDistance);
    const nextBound = i < peakIndices.length - 1 ? peakIndices[i + 1] : Math.min(data.length - 1, peakIdx + minDistance);

    // Find catch (valley before peak)
    let catchIdx = prevBound;
    let catchVal = smoothed[prevBound];
    for (let j = prevBound; j < peakIdx; j++) {
      if (smoothed[j] < catchVal) {
        catchVal = smoothed[j];
        catchIdx = j;
      }
    }

    // Find finish (valley after peak)
    let finishIdx = nextBound;
    let finishVal = smoothed[nextBound];
    for (let j = peakIdx + 1; j <= nextBound; j++) {
      if (smoothed[j] < finishVal) {
        finishVal = smoothed[j];
        finishIdx = j;
      }
    }

    strokes.push({
      peakIdx,
      catchIdx,
      finishIdx,
      elapsedSec: data[peakIdx].elapsedSec,
    });

    // Stroke rate: based on time between consecutive peaks
    if (i > 0) {
      const dt = data[peakIdx].elapsedSec - data[peakIndices[i - 1]].elapsedSec;
      if (dt > 0) {
        const spm = 60 / dt;
        strokeRates.push({
          elapsedSec: data[peakIdx].elapsedSec,
          spm: Math.min(spm, 60), // cap at 60 SPM
          idx: peakIdx,
        });
      }
    }

    // Drive/recovery: drive = catch to peak, recovery = peak to next catch
    const driveTime = (data[peakIdx].elapsedSec - data[catchIdx].elapsedSec);
    if (i < peakIndices.length - 1) {
      // Recovery = peak to next stroke's catch
      const nextPeakIdx = peakIndices[i + 1];
      let nextCatchIdx = peakIdx;
      let nextCatchVal = smoothed[peakIdx];
      for (let j = peakIdx + 1; j < nextPeakIdx; j++) {
        if (smoothed[j] < nextCatchVal) {
          nextCatchVal = smoothed[j];
          nextCatchIdx = j;
        }
      }
      const recoveryTime = data[nextCatchIdx].elapsedSec - data[peakIdx].elapsedSec;
      if (driveTime > 0 && recoveryTime > 0) {
        driveRecoveryData.push({
          elapsedSec: data[peakIdx].elapsedSec,
          driveTime,
          recoveryTime,
          ratio: driveTime / recoveryTime,
          idx: peakIdx,
        });
      }
    }
  }

  return { strokes, strokeRates, driveRecovery: driveRecoveryData };
}

/**
 * Compute a stability/balance score for each stroke from gyro data.
 * Lower score = more stable boat.
 * Score is the RMS of GyroX (roll rate) during each stroke cycle.
 */
export function computeBalanceScores(data, strokes) {
  if (strokes.length < 2) return [];

  return strokes.slice(0, -1).map((stroke, i) => {
    const nextStroke = strokes[i + 1];
    const startIdx = stroke.catchIdx;
    const endIdx = nextStroke.catchIdx;
    const slice = data.slice(startIdx, endIdx);

    if (slice.length === 0) return null;

    // RMS of GyroX (roll) — lower = more stable
    const sumSq = slice.reduce((s, r) => s + (r.GyroX * r.GyroX), 0);
    const rms = Math.sqrt(sumSq / slice.length);

    // Also compute max lean angle deviation
    const maxLean = Math.max(...slice.map(r => Math.abs(r.LeanAngle || 0)));

    return {
      elapsedSec: stroke.elapsedSec,
      rollRMS: rms,
      maxLean,
      idx: stroke.peakIdx,
    };
  }).filter(Boolean);
}

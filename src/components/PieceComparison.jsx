import { useState, useMemo } from 'react';
import { useTimeRange } from './TimeRangeContext';
import { formatElapsed, formatSplit, parseElapsed, speedToSplit } from '../utils/rowing';

function formatElapsedDecimal(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds - h * 3600 - m * 60;
  const sStr = s.toFixed(2).padStart(5, '0');
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

function computePieceStats(data, strokeData, startSec, endSec) {
  const slice = data.filter(r => r.elapsedSec >= startSec && r.elapsedSec <= endSec);
  if (slice.length === 0) return null;

  const moving = slice.filter(r => r.Speed > 0.5);
  const avgSpeed = moving.length > 0
    ? moving.reduce((s, r) => s + r.Speed, 0) / moving.length
    : 0;
  const maxSpeed = slice.reduce((m, r) => Math.max(m, r.Speed), 0);
  // Distance via trapezoid rule (samples at ~10Hz, but use dt between samples)
  let distance = 0;
  for (let i = 1; i < slice.length; i++) {
    const dt = slice[i].elapsedSec - slice[i - 1].elapsedSec;
    if (dt > 0 && dt < 1) {
      distance += ((slice[i].Speed + slice[i - 1].Speed) / 2) * dt;
    }
  }
  const duration = slice[slice.length - 1].elapsedSec - slice[0].elapsedSec;

  // Stroke-based metrics within range
  const rates = strokeData?.strokeRates?.filter(r => r.elapsedSec >= startSec && r.elapsedSec <= endSec) ?? [];
  const avgSpm = rates.length > 0 ? rates.reduce((s, r) => s + r.spm, 0) / rates.length : 0;

  const checks = strokeData?.boatCheck?.filter(r => r.elapsedSec >= startSec && r.elapsedSec <= endSec) ?? [];
  const avgCheck = checks.length > 0 ? checks.reduce((s, r) => s + r.checkMilliG, 0) / checks.length : 0;

  const balances = strokeData?.balanceScores?.filter(r => r.elapsedSec >= startSec && r.elapsedSec <= endSec) ?? [];
  const avgBalance = balances.length > 0 ? balances.reduce((s, r) => s + r.rollRMS, 0) / balances.length : 0;

  const dr = strokeData?.driveRecovery?.filter(r => r.elapsedSec >= startSec && r.elapsedSec <= endSec) ?? [];
  const avgRatio = dr.length > 0 ? dr.reduce((s, r) => s + r.ratio, 0) / dr.length : 0;

  return {
    duration,
    distance,
    avgSplit: speedToSplit(avgSpeed),
    maxSpeed,
    avgSpm,
    avgCheck,
    avgBalance,
    avgRatio,
    strokeCount: rates.length,
  };
}

export default function PieceComparison({ data, strokeData }) {
  const { timeRange } = useTimeRange();
  const [pieces, setPieces] = useState([]);
  const [name, setName] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [err, setErr] = useState('');

  const totalDuration = data.length > 0 ? data[data.length - 1].elapsedSec : 0;

  const addPiece = () => {
    setErr('');
    const startSec = parseElapsed(startStr);
    const endSec = parseElapsed(endStr);
    if (startSec === null || endSec === null) {
      setErr('Invalid time format. Use mm:ss (e.g., 2:30).');
      return;
    }
    if (endSec <= startSec) {
      setErr('End time must be after start time.');
      return;
    }
    if (startSec < 0 || endSec > totalDuration + 1) {
      setErr(`Times must be within 0:00 – ${formatElapsed(totalDuration)}.`);
      return;
    }
    const label = name.trim() || `Piece ${pieces.length + 1}`;
    setPieces(prev => [...prev, { id: Date.now(), name: label, startSec, endSec }]);
    setName('');
    setStartStr('');
    setEndStr('');
  };

  const useCurrentZoom = () => {
    setErr('');
    const startSec = (timeRange.start / 100) * totalDuration;
    const endSec = (timeRange.end / 100) * totalDuration;
    setStartStr(formatElapsedDecimal(startSec));
    setEndStr(formatElapsedDecimal(endSec));
  };

  const removePiece = (id) => setPieces(prev => prev.filter(p => p.id !== id));
  const clearAll = () => setPieces([]);

  const rows = useMemo(() => {
    return pieces.map(p => ({
      ...p,
      stats: computePieceStats(data, strokeData, p.startSec, p.endSec),
    })).filter(r => r.stats);
  }, [pieces, data, strokeData]);

  // Find best/worst per numeric column for highlighting
  const extremes = useMemo(() => {
    if (rows.length < 2) return {};
    const cols = {
      avgSplit: { best: 'min', values: rows.map(r => r.stats.avgSplit) },
      maxSpeed: { best: 'max', values: rows.map(r => r.stats.maxSpeed) },
      avgSpm: { best: 'max', values: rows.map(r => r.stats.avgSpm) },
      avgCheck: { best: 'min', values: rows.map(r => r.stats.avgCheck) },
      avgBalance: { best: 'min', values: rows.map(r => r.stats.avgBalance) },
    };
    const result = {};
    for (const [k, { best, values }] of Object.entries(cols)) {
      result[k] = {
        best: best === 'min' ? Math.min(...values) : Math.max(...values),
        worst: best === 'min' ? Math.max(...values) : Math.min(...values),
      };
    }
    return result;
  }, [rows]);

  const cellClass = (key, val) => {
    const ex = extremes[key];
    if (!ex || rows.length < 2) return '';
    if (val === ex.best) return 'text-green-600 dark:text-green-400 font-semibold';
    if (val === ex.worst) return 'text-red-500 dark:text-red-400';
    return '';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Piece Comparison
      </h3>

      {/* Input row */}
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Piece 1"
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-28"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start (mm:ss.ss)</label>
          <input
            type="text"
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            placeholder="2:00.00"
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End (mm:ss.ss)</label>
          <input
            type="text"
            value={endStr}
            onChange={(e) => setEndStr(e.target.value)}
            placeholder="4:30.00"
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 w-20"
          />
        </div>
        <button
          onClick={addPiece}
          className="px-3 py-1 bg-deep-purple hover:bg-primary-orange text-white text-sm font-medium rounded transition-colors"
        >
          Add Piece
        </button>
        <button
          onClick={useCurrentZoom}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded transition-colors"
          title="Fill times from the currently zoomed chart range"
        >
          Use Current Zoom
        </button>
        {pieces.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1 text-gray-500 hover:text-red-500 text-sm font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {err && <div className="text-xs text-red-500 mb-2">{err}</div>}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4">
          Add at least one piece to compare segments of your session. Times are relative to the start of the file.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-left py-2 px-2">Piece</th>
                <th className="text-left py-2 px-2">Range</th>
                <th className="text-right py-2 px-2">Duration</th>
                <th className="text-right py-2 px-2">Distance</th>
                <th className="text-right py-2 px-2">Avg Split</th>
                <th className="text-right py-2 px-2">Max Speed</th>
                <th className="text-right py-2 px-2">Avg SPM</th>
                <th className="text-right py-2 px-2">Strokes</th>
                <th className="text-right py-2 px-2">Avg Check</th>
                <th className="text-right py-2 px-2">Balance</th>
                <th className="text-right py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                  <td className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="py-2 px-2 text-xs text-gray-500 dark:text-gray-400">
                    {formatElapsedDecimal(r.startSec)} – {formatElapsedDecimal(r.endSec)}
                  </td>
                  <td className="py-2 px-2 text-right">{formatElapsed(r.stats.duration)}</td>
                  <td className="py-2 px-2 text-right">{r.stats.distance.toFixed(0)} m</td>
                  <td className={`py-2 px-2 text-right ${cellClass('avgSplit', r.stats.avgSplit)}`}>
                    {formatSplit(r.stats.avgSplit)}
                  </td>
                  <td className={`py-2 px-2 text-right ${cellClass('maxSpeed', r.stats.maxSpeed)}`}>
                    {r.stats.maxSpeed.toFixed(2)} m/s
                  </td>
                  <td className={`py-2 px-2 text-right ${cellClass('avgSpm', r.stats.avgSpm)}`}>
                    {r.stats.avgSpm.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right">{r.stats.strokeCount}</td>
                  <td className={`py-2 px-2 text-right ${cellClass('avgCheck', r.stats.avgCheck)}`}>
                    {r.stats.avgCheck.toFixed(0)} mg
                  </td>
                  <td className={`py-2 px-2 text-right ${cellClass('avgBalance', r.stats.avgBalance)}`}>
                    {r.stats.avgBalance.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => removePiece(r.id)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none"
                      title="Remove piece"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length >= 2 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              <span className="text-green-600">green</span> = best in column · <span className="text-red-500">red</span> = worst in column
            </p>
          )}
        </div>
      )}
    </div>
  );
}

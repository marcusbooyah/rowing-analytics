import { useMemo } from 'react';
import { useTimeRange } from './TimeRangeContext';
import { speedToSplit, formatSplit, formatElapsed } from '../utils/rowing';

export default function SessionStats({ data }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();

  const stats = useMemo(() => {
    const slice = data.slice(startIdx, endIdx + 1);
    if (slice.length === 0) return null;

    const movingRows = slice.filter(r => r.Speed > 1.0);
    if (movingRows.length === 0) {
      return {
        avgSplit: '--:--',
        maxSpeed: 0,
        maxSpeedSplit: '--:--',
        duration: formatElapsed(slice[slice.length - 1].elapsedSec - slice[0].elapsedSec),
        distance: 0,
      };
    }

    const avgSpeed = movingRows.reduce((s, r) => s + r.Speed, 0) / movingRows.length;
    const maxSpeed = Math.max(...movingRows.map(r => r.Speed));
    const distance = slice.reduce((d, r) => d + r.Speed * 0.1, 0);

    return {
      avgSplit: formatSplit(speedToSplit(avgSpeed)),
      maxSpeed: maxSpeed.toFixed(2),
      maxSpeedSplit: formatSplit(speedToSplit(maxSpeed)),
      duration: formatElapsed(slice[slice.length - 1].elapsedSec - slice[0].elapsedSec),
      distance: (distance / 1000).toFixed(2),
    };
  }, [data, startIdx, endIdx]);

  if (!stats) return null;

  const cards = [
    { label: 'Avg Split', value: stats.avgSplit, unit: '/500m' },
    { label: 'Max Speed', value: `${stats.maxSpeed} m/s`, unit: `(${stats.maxSpeedSplit})` },
    { label: 'Duration', value: stats.duration, unit: '' },
    { label: 'Distance', value: `${stats.distance} km`, unit: '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{card.label}</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{card.value}</div>
          {card.unit && <div className="text-xs text-gray-400 dark:text-gray-500">{card.unit}</div>}
        </div>
      ))}
    </div>
  );
}

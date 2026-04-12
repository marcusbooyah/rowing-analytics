import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { useTimeRange } from './TimeRangeContext';
import { formatSplit } from '../utils/rowing';
import 'leaflet/dist/leaflet.css';

function speedToColor(speed, minSpeed, maxSpeed) {
  const t = maxSpeed > minSpeed ? (speed - minSpeed) / (maxSpeed - minSpeed) : 0.5;
  const r = Math.round(255 * (1 - t));
  const g = Math.round(255 * t);
  return `rgb(${r}, ${g}, 40)`;
}

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, bounds]);
  return null;
}

function buildSegments(rows, minSpeed, maxSpeed, step) {
  const segs = [];
  for (let i = 0; i < rows.length - step; i += step) {
    const r1 = rows[i];
    const r2 = rows[Math.min(i + step, rows.length - 1)];
    if (r1.Latitude && r1.Longitude && r2.Latitude && r2.Longitude) {
      segs.push({
        positions: [[r1.Latitude, r1.Longitude], [r2.Latitude, r2.Longitude]],
        color: speedToColor(r1.Speed, minSpeed, maxSpeed),
      });
    }
  }
  return segs;
}

export default function GpsMap({ data }) {
  const { getIndices, timeRange } = useTimeRange();
  const { startIdx, endIdx } = getIndices();

  const isFullRange = timeRange.start <= 0.1 && timeRange.end >= 99.9;

  // Full track data (always shown)
  const allGps = useMemo(
    () => data.filter(r => r.Latitude && r.Longitude),
    [data]
  );

  // Global speed range from all data
  const { minSpeed, maxSpeed } = useMemo(() => {
    const moving = allGps.filter(r => r.Speed > 0.5);
    return {
      minSpeed: moving.length > 0 ? Math.min(...moving.map(r => r.Speed)) : 0,
      maxSpeed: moving.length > 0 ? Math.max(...moving.map(r => r.Speed)) : 1,
    };
  }, [allGps]);

  // Dimmed full-track segments (shown when zoomed in)
  const bgSegments = useMemo(() => {
    if (isFullRange || allGps.length < 2) return [];
    const step = Math.max(1, Math.floor(allGps.length / 1500));
    const segs = [];
    for (let i = 0; i < allGps.length - step; i += step) {
      const r1 = allGps[i];
      const r2 = allGps[Math.min(i + step, allGps.length - 1)];
      segs.push({
        positions: [[r1.Latitude, r1.Longitude], [r2.Latitude, r2.Longitude]],
      });
    }
    return segs;
  }, [allGps, isFullRange]);

  // Selected range segments (color-coded)
  const selectedGps = useMemo(
    () => data.slice(startIdx, endIdx + 1).filter(r => r.Latitude && r.Longitude),
    [data, startIdx, endIdx]
  );

  const selectedSegments = useMemo(() => {
    if (selectedGps.length < 2) return [];
    const step = Math.max(1, Math.floor(selectedGps.length / 2000));
    return buildSegments(selectedGps, minSpeed, maxSpeed, step);
  }, [selectedGps, minSpeed, maxSpeed]);

  // Bounds: fit to full track initially, selected range when zoomed
  const bounds = useMemo(() => {
    const src = allGps.length > 0 ? allGps : [];
    if (src.length < 2) return [];
    const lats = src.map(r => r.Latitude);
    const lngs = src.map(r => r.Longitude);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [allGps]);

  if (allGps.length < 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400 dark:text-gray-500">
        No GPS data available
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          GPS Track {!isFullRange && <span className="text-primary-orange ml-1">(showing selection)</span>}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatSplit(500 / maxSpeed)}</span>
          <div className="w-24 h-3 rounded" style={{
            background: 'linear-gradient(to right, rgb(255,0,40), rgb(255,255,40), rgb(0,255,40))'
          }} />
          <span>{formatSplit(500 / minSpeed)}</span>
          <span className="ml-1 text-gray-400">(split/500m)</span>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ height: 400 }}>
        <MapContainer
          center={[allGps[0].Latitude, allGps[0].Longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds bounds={bounds} />
          {/* Dimmed background track when zoomed */}
          {!isFullRange && bgSegments.map((seg, i) => (
            <Polyline
              key={`bg-${i}`}
              positions={seg.positions}
              pathOptions={{ color: '#9ca3af', weight: 3, opacity: 0.3 }}
            />
          ))}
          {/* Selected / active segments color-coded by speed */}
          {selectedSegments.map((seg, i) => (
            <Polyline
              key={`sel-${i}`}
              positions={seg.positions}
              pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

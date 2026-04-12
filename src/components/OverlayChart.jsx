import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatSplit, formatElapsed } from '../utils/rowing';

const SENSORS = [
  { key: 'GForceX', label: 'G-Force X', color: '#f97316', unit: 'G' },
  { key: 'GForceZ', label: 'G-Force Z', color: '#ef4444', unit: 'G' },
  { key: 'GyroX', label: 'Gyro X', color: '#10b981', unit: '°/s' },
  { key: 'GyroY', label: 'Gyro Y', color: '#8b5cf6', unit: '°/s' },
  { key: 'GyroZ', label: 'Gyro Z', color: '#ec4899', unit: '°/s' },
  { key: 'LeanAngle', label: 'Lean Angle', color: '#06b6d4', unit: '°' },
];

export default function OverlayChart({ data }) {
  const [activeSensors, setActiveSensors] = useState(['GForceX']);
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const slice = useMemo(
    () => data.slice(startIdx, endIdx + 1),
    [data, startIdx, endIdx]
  );

  const toggleSensor = (key) => {
    setActiveSensors(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const option = useMemo(() => {
    const sensorSeries = activeSensors.map(key => {
      const sensor = SENSORS.find(s => s.key === key);
      return {
        type: 'line',
        name: sensor.label,
        data: slice.map(r => r[key]),
        yAxisIndex: 1,
        sampling: 'lttb',
        symbol: 'none',
        lineStyle: { width: 1.5, color: sensor.color },
        itemStyle: { color: sensor.color },
      };
    });

    const activeSensorInfo = activeSensors.map(k => SENSORS.find(s => s.key === k));
    const sensorUnit = activeSensorInfo.length > 0 ? activeSensorInfo[0].unit : '';

    return {
      title: {
        text: 'Speed + Sensor Overlay',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 500, color: c.text },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        textStyle: { color: c.tooltipText },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const row = slice[idx];
          if (!row) return '';
          let html = `<strong>${formatElapsed(row.elapsedSec)}</strong><br/>`;
          html += `Speed: ${row.Speed.toFixed(2)} m/s (${formatSplit(row.splitSec)})<br/>`;
          activeSensors.forEach(key => {
            const sensor = SENSORS.find(s => s.key === key);
            html += `${sensor.label}: ${row[key]?.toFixed(3)} ${sensor.unit}<br/>`;
          });
          return html;
        },
      },
      legend: { show: false },
      grid: { left: 60, right: 60, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: slice.map(r => r.elapsedSec),
        axisLabel: {
          formatter: (val) => formatElapsed(Number(val)),
          interval: Math.floor(slice.length / 8),
          color: c.subText,
        },
        axisLine: { lineStyle: { color: c.splitLine } },
        boundaryGap: false,
      },
      yAxis: [
        {
          type: 'value',
          name: 'Speed (m/s)',
          nameTextStyle: { fontSize: 11, color: c.primary },
          axisLabel: { color: c.primary },
          splitLine: { lineStyle: { color: c.splitLine } },
        },
        {
          type: 'value',
          name: sensorUnit,
          nameTextStyle: { fontSize: 11, color: activeSensorInfo[0]?.color ?? c.subText },
          axisLabel: { color: activeSensorInfo[0]?.color ?? c.subText },
          splitLine: { show: false },
        },
      ],
      dataZoom: [{ type: 'inside' }],
      series: [
        {
          type: 'line',
          name: 'Speed',
          data: slice.map(r => r.Speed),
          sampling: 'lttb',
          symbol: 'none',
          lineStyle: { width: 1.5, color: c.primary },
          itemStyle: { color: c.primary },
        },
        ...sensorSeries,
      ],
      animation: false,
    };
  }, [slice, activeSensors, c]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {SENSORS.map(sensor => (
          <button
            key={sensor.key}
            onClick={() => toggleSensor(sensor.key)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeSensors.includes(sensor.key)
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            style={
              activeSensors.includes(sensor.key)
                ? { backgroundColor: sensor.color }
                : {}
            }
          >
            {sensor.label}
          </button>
        ))}
      </div>
      <ReactECharts option={option} style={{ height: 320 }} notMerge={true} />
    </div>
  );
}

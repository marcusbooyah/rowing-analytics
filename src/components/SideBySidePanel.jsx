import { useMemo, useState, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
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

export default function SideBySidePanel({ data }) {
  const [selectedSensor, setSelectedSensor] = useState('GForceX');
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);
  const speedRef = useRef(null);
  const sensorRef = useRef(null);

  const slice = useMemo(
    () => data.slice(startIdx, endIdx + 1),
    [data, startIdx, endIdx]
  );

  const sensor = SENSORS.find(s => s.key === selectedSensor);

  useEffect(() => {
    const timer = setTimeout(() => {
      const speedInstance = speedRef.current?.getEchartsInstance();
      const sensorInstance = sensorRef.current?.getEchartsInstance();
      if (speedInstance && sensorInstance) {
        speedInstance.group = 'sidebyside';
        sensorInstance.group = 'sidebyside';
        echarts.connect('sidebyside');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const xData = useMemo(() => slice.map(r => r.elapsedSec), [slice]);

  const speedOption = useMemo(() => ({
    title: {
      text: 'Speed',
      left: 'center',
      textStyle: { fontSize: 13, fontWeight: 500, color: c.text },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
      formatter: (params) => {
        const p = params[0];
        if (!p) return '';
        const row = slice[p.dataIndex];
        return `${formatElapsed(row.elapsedSec)}<br/>Speed: ${row.Speed.toFixed(2)} m/s<br/>Split: ${formatSplit(row.splitSec)}`;
      },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: { left: 50, right: 20, top: 35, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        formatter: (val) => formatElapsed(Number(val)),
        interval: Math.floor(slice.length / 6),
        color: c.subText,
      },
      axisLine: { lineStyle: { color: c.splitLine } },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: 'm/s',
      nameTextStyle: { fontSize: 10, color: c.subText },
      axisLabel: { color: c.subText },
      splitLine: { lineStyle: { color: c.splitLine } },
    },
    series: [{
      type: 'line',
      data: slice.map(r => r.Speed),
      sampling: 'lttb',
      symbol: 'none',
      lineStyle: { width: 1.5, color: c.primary },
      itemStyle: { color: c.primary },
    }],
    animation: false,
  }), [slice, xData, c]);

  const sensorOption = useMemo(() => ({
    title: {
      text: sensor.label,
      left: 'center',
      textStyle: { fontSize: 13, fontWeight: 500, color: c.text },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
      formatter: (params) => {
        const p = params[0];
        if (!p) return '';
        const row = slice[p.dataIndex];
        return `${formatElapsed(row.elapsedSec)}<br/>${sensor.label}: ${row[selectedSensor]?.toFixed(3)} ${sensor.unit}`;
      },
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: { left: 50, right: 20, top: 35, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        formatter: (val) => formatElapsed(Number(val)),
        interval: Math.floor(slice.length / 6),
        color: c.subText,
      },
      axisLine: { lineStyle: { color: c.splitLine } },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: sensor.unit,
      nameTextStyle: { fontSize: 10, color: c.subText },
      axisLabel: { color: c.subText },
      splitLine: { lineStyle: { color: c.splitLine } },
    },
    series: [{
      type: 'line',
      data: slice.map(r => r[selectedSensor]),
      sampling: 'lttb',
      symbol: 'none',
      lineStyle: { width: 1.5, color: sensor.color },
      itemStyle: { color: sensor.color },
    }],
    animation: false,
  }), [slice, xData, selectedSensor, sensor, c]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Side-by-Side:</span>
        <select
          value={selectedSensor}
          onChange={(e) => setSelectedSensor(e.target.value)}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
        >
          {SENSORS.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReactECharts ref={speedRef} option={speedOption} style={{ height: 280 }} notMerge={true} />
        <ReactECharts ref={sensorRef} option={sensorOption} style={{ height: 280 }} notMerge={true} />
      </div>
    </div>
  );
}

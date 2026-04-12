import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatElapsed } from '../utils/rowing';

export default function DriveRecoveryChart({ data, strokeData }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const filtered = useMemo(() => {
    if (!strokeData?.driveRecovery) return [];
    const startSec = data[startIdx]?.elapsedSec ?? 0;
    const endSec = data[endIdx]?.elapsedSec ?? Infinity;
    return strokeData.driveRecovery.filter(
      r => r.elapsedSec >= startSec && r.elapsedSec <= endSec
    );
  }, [data, strokeData, startIdx, endIdx]);

  const option = useMemo(() => ({
    title: {
      text: 'Drive / Recovery Ratio',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: c.text },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
      formatter: (params) => {
        const idx = params[0]?.dataIndex;
        if (idx === undefined || !filtered[idx]) return '';
        const r = filtered[idx];
        return `
          <strong>${formatElapsed(r.elapsedSec)}</strong><br/>
          Drive: ${r.driveTime.toFixed(2)}s<br/>
          Recovery: ${r.recoveryTime.toFixed(2)}s<br/>
          Ratio: ${r.ratio.toFixed(2)}
        `;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: c.subText },
    },
    grid: { left: 60, right: 40, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: filtered.map(r => formatElapsed(r.elapsedSec)),
      axisLabel: {
        interval: Math.max(0, Math.floor(filtered.length / 8)),
        color: c.subText,
      },
      axisLine: { lineStyle: { color: c.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: 'Seconds',
      nameTextStyle: { fontSize: 11, color: c.subText },
      axisLabel: { color: c.subText },
      splitLine: { lineStyle: { color: c.splitLine } },
    },
    series: [
      {
        type: 'bar',
        name: 'Drive',
        stack: 'stroke',
        data: filtered.map(r => r.driveTime),
        itemStyle: { color: '#3b82f6' },
        barMaxWidth: 12,
      },
      {
        type: 'bar',
        name: 'Recovery',
        stack: 'stroke',
        data: filtered.map(r => r.recoveryTime),
        itemStyle: { color: '#93c5fd' },
        barMaxWidth: 12,
      },
    ],
    dataZoom: [{ type: 'inside' }],
    animation: false,
  }), [filtered, c]);

  if (!filtered.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400 dark:text-gray-500">
        No drive/recovery data detected
      </div>
    );
  }

  const avgRatio = filtered.reduce((s, r) => s + r.ratio, 0) / filtered.length;
  const avgDrive = filtered.reduce((s, r) => s + r.driveTime, 0) / filtered.length;
  const avgRecovery = filtered.reduce((s, r) => s + r.recoveryTime, 0) / filtered.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex gap-6 mb-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Avg Drive: <strong className="text-gray-900 dark:text-gray-100">{avgDrive.toFixed(2)}s</strong>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Avg Recovery: <strong className="text-gray-900 dark:text-gray-100">{avgRecovery.toFixed(2)}s</strong>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Avg Ratio: <strong className="text-gray-900 dark:text-gray-100">{avgRatio.toFixed(2)}</strong>
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge={true} />
    </div>
  );
}

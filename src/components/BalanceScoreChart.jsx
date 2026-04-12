import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatElapsed } from '../utils/rowing';

export default function BalanceScoreChart({ data, strokeData }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const filtered = useMemo(() => {
    if (!strokeData?.balanceScores) return [];
    const startSec = data[startIdx]?.elapsedSec ?? 0;
    const endSec = data[endIdx]?.elapsedSec ?? Infinity;
    return strokeData.balanceScores.filter(
      r => r.elapsedSec >= startSec && r.elapsedSec <= endSec
    );
  }, [data, strokeData, startIdx, endIdx]);

  const option = useMemo(() => {
    if (filtered.length === 0) return {};

    const avgRoll = filtered.reduce((s, r) => s + r.rollRMS, 0) / filtered.length;

    return {
      title: {
        text: 'Balance Score per Stroke',
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
            Roll RMS: ${r.rollRMS.toFixed(2)} °/s<br/>
            Max Lean: ${r.maxLean.toFixed(1)}°
          `;
        },
      },
      grid: { left: 60, right: 40, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: filtered.map(r => formatElapsed(r.elapsedSec)),
        axisLabel: {
          interval: Math.max(0, Math.floor(filtered.length / 8)),
          color: c.subText,
        },
        axisLine: { lineStyle: { color: c.splitLine } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Roll RMS (°/s)',
          nameTextStyle: { fontSize: 11, color: '#8b5cf6' },
          axisLabel: { color: '#8b5cf6' },
          splitLine: { lineStyle: { color: c.splitLine } },
        },
        {
          type: 'value',
          name: 'Max Lean (°)',
          nameTextStyle: { fontSize: 11, color: '#06b6d4' },
          axisLabel: { color: '#06b6d4' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: 'bar',
          name: 'Roll RMS',
          data: filtered.map(r => ({
            value: Math.round(r.rollRMS * 100) / 100,
            itemStyle: {
              color: r.rollRMS > avgRoll * 1.3 ? '#ef4444' :
                r.rollRMS < avgRoll * 0.7 ? '#10b981' : '#8b5cf6',
            },
          })),
          barMaxWidth: 10,
        },
        {
          type: 'line',
          name: 'Max Lean',
          yAxisIndex: 1,
          data: filtered.map(r => Math.round(r.maxLean * 10) / 10),
          symbol: 'none',
          lineStyle: { width: 1.5, color: '#06b6d4' },
          itemStyle: { color: '#06b6d4' },
        },
      ],
      dataZoom: [{ type: 'inside' }],
      animation: false,
    };
  }, [filtered, c]);

  if (filtered.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400">
        No balance data available
      </div>
    );
  }

  const avgRoll = filtered.reduce((s, r) => s + r.rollRMS, 0) / filtered.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex gap-6 mb-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Avg Roll RMS: <strong className="text-gray-900 dark:text-gray-100">{avgRoll.toFixed(2)} °/s</strong>
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          (lower = more stable · <span className="text-green-600">green</span> = stable · <span className="text-red-500">red</span> = unstable)
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge={true} />
    </div>
  );
}

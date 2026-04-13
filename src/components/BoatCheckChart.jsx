import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatElapsed } from '../utils/rowing';

export default function BoatCheckChart({ data, strokeData }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const filtered = useMemo(() => {
    if (!strokeData?.boatCheck) return [];
    const startSec = data[startIdx]?.elapsedSec ?? 0;
    const endSec = data[endIdx]?.elapsedSec ?? Infinity;
    return strokeData.boatCheck.filter(
      r => r.elapsedSec >= startSec && r.elapsedSec <= endSec
    );
  }, [data, strokeData, startIdx, endIdx]);

  const avgCheck = useMemo(() => {
    if (filtered.length === 0) return 0;
    return filtered.reduce((s, r) => s + r.checkMilliG, 0) / filtered.length;
  }, [filtered]);

  const option = useMemo(() => {
    if (filtered.length === 0) return {};

    return {
      title: {
        text: 'Boat Check per Stroke',
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
            Check: ${r.checkMilliG.toFixed(0)} mg<br/>
            Avg Speed: ${r.avgSpeed.toFixed(2)} m/s
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
      yAxis: {
        type: 'value',
        name: 'Deceleration (mg)',
        nameTextStyle: { fontSize: 11, color: c.subText },
        axisLabel: { color: c.subText },
        splitLine: { lineStyle: { color: c.splitLine } },
      },
      series: [
        {
          type: 'bar',
          name: 'Boat Check',
          data: filtered.map(r => ({
            value: Math.round(r.checkMilliG),
            itemStyle: {
              color: r.checkMilliG > avgCheck * 1.3 ? '#ef4444' :
                r.checkMilliG < avgCheck * 0.7 ? '#10b981' : '#f97316',
            },
          })),
          barMaxWidth: 10,
          markLine: {
            silent: true,
            symbol: 'none',
            label: {
              formatter: (p) => `Avg ${p.value.toFixed(0)} mg`,
              color: c.text,
              fontSize: 11,
              position: 'insideEndTop',
            },
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
            data: [{ type: 'average' }],
          },
        },
      ],
      dataZoom: [{ type: 'inside' }],
      animation: false,
    };
  }, [filtered, avgCheck, c]);

  if (filtered.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400">
        No boat check data available
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex gap-6 mb-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Avg Check: <strong className="text-gray-900 dark:text-gray-100">{avgCheck.toFixed(0)} mg</strong>
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          (lower = better run · <span className="text-green-600">green</span> = clean catch · <span className="text-red-500">red</span> = heavy check)
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge={true} />
    </div>
  );
}

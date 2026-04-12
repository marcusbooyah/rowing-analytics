import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatElapsed } from '../utils/rowing';

export default function StabilityHeatmap({ data }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const windows = useMemo(() => {
    const slice = data.slice(startIdx, endIdx + 1).filter(r => r.Speed > 1.0);
    if (slice.length < 100) return [];

    const windowSec = 10;
    const windowSize = windowSec * 10; // 10Hz
    const numWindows = Math.floor(slice.length / windowSize);
    if (numWindows < 2) return [];

    const result = [];
    for (let w = 0; w < numWindows; w++) {
      const ws = slice.slice(w * windowSize, (w + 1) * windowSize);
      const vals = ws.map(r => r.GyroX || 0);
      const rms = Math.sqrt(vals.reduce((s, v) => s + v * v, 0) / vals.length);
      result.push({
        time: formatElapsed(ws[0].elapsedSec),
        rms: Math.round(rms * 100) / 100,
      });
    }
    return result;
  }, [data, startIdx, endIdx]);

  const avgRms = windows.length > 0
    ? windows.reduce((s, w) => s + w.rms, 0) / windows.length
    : 0;

  const option = useMemo(() => {
    if (windows.length === 0) return {};

    return {
      title: {
        text: 'Boat Stability — Roll (GyroX RMS per 10s)',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 500, color: c.text },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.tooltipBg,
        borderColor: c.tooltipBorder,
        textStyle: { color: c.tooltipText },
        formatter: (params) => {
          const p = params[0];
          if (!p) return '';
          return `${p.name}<br/>Roll RMS: ${p.value.toFixed(2)} °/s`;
        },
      },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: windows.map(w => w.time),
        axisLabel: {
          interval: Math.max(0, Math.floor(windows.length / 10)),
          color: c.subText,
        },
        axisLine: { lineStyle: { color: c.splitLine } },
      },
      yAxis: {
        type: 'value',
        name: 'Roll RMS (°/s)',
        nameTextStyle: { fontSize: 11, color: c.subText },
        axisLabel: { color: c.subText },
        splitLine: { lineStyle: { color: c.splitLine } },
      },
      series: [{
        type: 'bar',
        data: windows.map(w => ({
          value: w.rms,
          itemStyle: {
            color: w.rms > avgRms * 1.3 ? '#ef4444' :
              w.rms < avgRms * 0.7 ? '#10b981' : '#8b5cf6',
          },
        })),
        barMaxWidth: 16,
      }],
      dataZoom: [{ type: 'inside' }],
      animation: false,
    };
  }, [windows, avgRms, c]);

  if (windows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400">
        Not enough data for stability chart
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex gap-6 mb-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Avg Roll RMS: <strong className="text-gray-900 dark:text-gray-100">{avgRms.toFixed(2)} °/s</strong>
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          (<span className="text-green-600">green</span> = stable · <span className="text-purple-500">purple</span> = avg · <span className="text-red-500">red</span> = unstable)
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 280 }} notMerge={true} />
    </div>
  );
}

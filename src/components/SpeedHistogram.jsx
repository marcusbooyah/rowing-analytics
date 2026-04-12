import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatSplit, speedToSplit } from '../utils/rowing';

export default function SpeedHistogram({ data }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const { bins, labels } = useMemo(() => {
    const slice = data.slice(startIdx, endIdx + 1).filter(r => r.Speed > 1.0);
    if (slice.length === 0) return { bins: [], labels: [] };

    // Create split-based bins (every 5 seconds of split time)
    const splits = slice.map(r => speedToSplit(r.Speed));
    const minSplit = Math.floor(Math.min(...splits) / 5) * 5;
    const maxSplit = Math.ceil(Math.max(...splits) / 5) * 5;

    const binEdges = [];
    for (let s = minSplit; s <= maxSplit; s += 5) {
      binEdges.push(s);
    }

    const binCounts = new Array(binEdges.length - 1).fill(0);
    const binLabels = [];

    for (let i = 0; i < binEdges.length - 1; i++) {
      binLabels.push(`${formatSplit(binEdges[i])}-${formatSplit(binEdges[i + 1])}`);
      for (const split of splits) {
        if (split >= binEdges[i] && split < binEdges[i + 1]) {
          binCounts[i]++;
        }
      }
    }

    // Convert counts to time (each sample = 0.1s)
    const binTimes = binCounts.map(count => (count * 0.1).toFixed(1));

    return { bins: binTimes, labels: binLabels };
  }, [data, startIdx, endIdx]);

  const option = useMemo(() => ({
    title: {
      text: 'Time at Split',
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
        return `${p.name}/500m<br/>Time: ${p.value}s`;
      },
    },
    grid: { left: 60, right: 20, top: 40, bottom: 50 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        rotate: 45,
        color: c.subText,
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: c.splitLine } },
      name: 'Split (/500m)',
      nameLocation: 'center',
      nameGap: 40,
      nameTextStyle: { color: c.subText, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Time (seconds)',
      nameTextStyle: { fontSize: 11, color: c.subText },
      axisLabel: { color: c.subText },
      splitLine: { lineStyle: { color: c.splitLine } },
    },
    series: [{
      type: 'bar',
      data: bins.map(v => Number(v)),
      itemStyle: {
        color: c.primary,
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 40,
    }],
    animation: false,
  }), [bins, labels, c]);

  if (bins.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400">
        No moving data for histogram
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <ReactECharts option={option} style={{ height: 300 }} notMerge={true} />
    </div>
  );
}

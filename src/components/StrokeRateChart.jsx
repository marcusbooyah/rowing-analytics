import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatSplit, formatElapsed } from '../utils/rowing';

export default function StrokeRateChart({ data, strokeData }) {
  const { getIndices } = useTimeRange();
  const { startIdx, endIdx } = getIndices();
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const { filteredRates, filteredData } = useMemo(() => {
    if (!strokeData?.strokeRates) return { filteredRates: [], filteredData: [] };
    const slice = data.slice(startIdx, endIdx + 1);
    const startSec = slice[0]?.elapsedSec ?? 0;
    const endSec = slice[slice.length - 1]?.elapsedSec ?? Infinity;
    const rates = strokeData.strokeRates.filter(
      r => r.elapsedSec >= startSec && r.elapsedSec <= endSec
    );
    return { filteredRates: rates, filteredData: slice };
  }, [data, strokeData, startIdx, endIdx]);

  const option = useMemo(() => ({
    title: {
      text: 'Stroke Rate & Speed',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500, color: c.text },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
    },
    legend: {
      bottom: 0,
      textStyle: { color: c.subText },
    },
    grid: { left: 60, right: 60, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: filteredData.map(r => r.elapsedSec),
      axisLabel: {
        formatter: (val) => formatElapsed(Number(val)),
        interval: Math.floor(filteredData.length / 8),
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
        name: 'SPM',
        nameTextStyle: { fontSize: 11, color: '#ef4444' },
        axisLabel: { color: '#ef4444' },
        splitLine: { show: false },
        min: 10,
        max: 45,
      },
    ],
    series: [
      {
        type: 'line',
        name: 'Speed',
        data: filteredData.map(r => r.Speed),
        sampling: 'lttb',
        symbol: 'none',
        lineStyle: { width: 1.5, color: c.primary },
        itemStyle: { color: c.primary },
      },
      {
        type: 'line',
        name: 'Stroke Rate',
        yAxisIndex: 1,
        data: (() => {
          // Place stroke rate values at their corresponding data indices,
          // linearly interpolate between strokes to avoid drops to zero
          if (filteredRates.length === 0) return [];

          const result = new Array(filteredData.length).fill(null);
          const ratePoints = [];

          filteredRates.forEach(r => {
            const idx = filteredData.findIndex(d => d.elapsedSec >= r.elapsedSec);
            if (idx >= 0) ratePoints.push({ idx, spm: Math.round(r.spm * 10) / 10 });
          });

          // Linearly interpolate between each pair of stroke rate points
          for (let p = 0; p < ratePoints.length; p++) {
            result[ratePoints[p].idx] = ratePoints[p].spm;
            if (p < ratePoints.length - 1) {
              const curr = ratePoints[p];
              const next = ratePoints[p + 1];
              const span = next.idx - curr.idx;
              for (let i = curr.idx + 1; i < next.idx; i++) {
                const t = (i - curr.idx) / span;
                result[i] = Math.round((curr.spm + t * (next.spm - curr.spm)) * 10) / 10;
              }
            }
          }

          // Fill edges: extend first/last value to the boundaries
          if (ratePoints.length > 0) {
            const first = ratePoints[0];
            for (let i = 0; i < first.idx; i++) result[i] = first.spm;
            const last = ratePoints[ratePoints.length - 1];
            for (let i = last.idx + 1; i < result.length; i++) result[i] = last.spm;
          }

          return result;
        })(),
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
        smooth: 0.3,
        sampling: 'lttb',
      },
    ],
    dataZoom: [{ type: 'inside' }],
    animation: false,
  }), [filteredData, filteredRates, c]);

  if (!strokeData?.strokeRates?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400 dark:text-gray-500">
        No stroke data detected
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <ReactECharts option={option} style={{ height: 320 }} notMerge={true} />
    </div>
  );
}

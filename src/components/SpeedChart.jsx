import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTimeRange } from './TimeRangeContext';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatSplit, formatElapsed } from '../utils/rowing';

export default function SpeedChart({ data }) {
  const { timeRange, setTimeRange } = useTimeRange();
  const { dark } = useTheme();
  const c = getChartColors(dark);
  const speed = c.primary;

  const option = useMemo(() => ({
    title: {
      text: 'Speed Over Time',
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
        const row = data[p.dataIndex];
        return `
          <strong>${formatElapsed(row.elapsedSec)}</strong><br/>
          Speed: ${row.Speed.toFixed(2)} m/s<br/>
          Split: ${formatSplit(row.splitSec)}/500m
        `;
      },
    },
    grid: { left: 60, right: 60, top: 40, bottom: 80 },
    xAxis: {
      type: 'category',
      data: data.map(r => r.elapsedSec),
      axisLabel: {
        formatter: (val) => formatElapsed(Number(val)),
        interval: Math.floor(data.length / 10),
        color: c.subText,
      },
      axisLine: { lineStyle: { color: c.splitLine } },
      boundaryGap: false,
    },
    yAxis: [
      {
        type: 'value',
        name: 'Speed (m/s)',
        nameTextStyle: { fontSize: 11, color: c.subText },
        axisLabel: { color: c.subText },
        splitLine: { lineStyle: { color: c.splitLine } },
      },
      {
        type: 'value',
        name: 'Split (/500m)',
        inverse: true,
        nameTextStyle: { fontSize: 11, color: c.subText },
        min: 80,
        max: 300,
        axisLabel: {
          formatter: (val) => formatSplit(val),
          color: c.subText,
        },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: 'slider',
        start: timeRange.start,
        end: timeRange.end,
        height: 24,
        bottom: 10,
        borderColor: c.dataZoomBorder,
        fillerColor: c.dataZoomFill,
        handleStyle: { color: speed },
        dataBackground: { lineStyle: { color: c.subText }, areaStyle: { color: c.dataZoomFill } },
        textStyle: { color: c.subText },
      },
      {
        type: 'inside',
        start: timeRange.start,
        end: timeRange.end,
      },
    ],
    series: [
      {
        type: 'line',
        data: data.map(r => r.Speed),
        sampling: 'lttb',
        symbol: 'none',
        lineStyle: { width: 1.5, color: speed },
        areaStyle: { opacity: 0.08, color: speed },
        itemStyle: { color: speed },
      },
      {
        type: 'line',
        data: data.map(r => r.splitSec),
        yAxisIndex: 1,
        sampling: 'lttb',
        symbol: 'none',
        lineStyle: { width: 0 },
        itemStyle: { color: 'transparent' },
        silent: true,
      },
    ],
    animation: false,
  }), [data, timeRange, c]);

  const onEvents = useMemo(() => ({
    datazoom: (params) => {
      const start = params.start ?? params.batch?.[0]?.start;
      const end = params.end ?? params.batch?.[0]?.end;
      if (start !== undefined && end !== undefined) {
        setTimeRange(start, end);
      }
    },
  }), [setTimeRange]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <ReactECharts
        option={option}
        style={{ height: 350 }}
        onEvents={onEvents}
        notMerge={true}
      />
    </div>
  );
}

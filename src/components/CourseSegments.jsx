import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatSplit, speedToSplit, formatElapsed } from '../utils/rowing';

export default function CourseSegments({ data }) {
  const { dark } = useTheme();
  const c = getChartColors(dark);
  const [segmentCount, setSegmentCount] = useState(4);

  const segments = useMemo(() => {
    // Filter to moving data only
    const moving = data.filter(r => r.Speed > 1.0);
    if (moving.length < 10) return [];

    const totalDistance = moving.reduce((d, r) => d + r.Speed * 0.1, 0);
    const segmentDistance = totalDistance / segmentCount;

    const segs = [];
    let cumDist = 0;
    let segStart = 0;
    let segIdx = 0;

    for (let i = 0; i < moving.length; i++) {
      cumDist += moving[i].Speed * 0.1;
      if (cumDist >= segmentDistance * (segIdx + 1) || i === moving.length - 1) {
        const segSlice = moving.slice(segStart, i + 1);
        const avgSpeed = segSlice.reduce((s, r) => s + r.Speed, 0) / segSlice.length;
        const dist = segSlice.reduce((d, r) => d + r.Speed * 0.1, 0);
        segs.push({
          label: `Seg ${segIdx + 1}`,
          avgSpeed,
          avgSplit: speedToSplit(avgSpeed),
          distance: dist,
          duration: segSlice[segSlice.length - 1].elapsedSec - segSlice[0].elapsedSec,
          startTime: segSlice[0].elapsedSec,
          endTime: segSlice[segSlice.length - 1].elapsedSec,
        });
        segStart = i + 1;
        segIdx++;
      }
    }

    return segs;
  }, [data, segmentCount]);

  const option = useMemo(() => {
    if (segments.length === 0) return {};

    const isNegativeSplit = segments.length >= 2 &&
      segments[segments.length - 1].avgSplit < segments[0].avgSplit;

    return {
      title: {
        text: 'Course Segments',
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
          if (idx === undefined || !segments[idx]) return '';
          const s = segments[idx];
          return `
            <strong>${s.label}</strong><br/>
            Split: ${formatSplit(s.avgSplit)}/500m<br/>
            Speed: ${s.avgSpeed.toFixed(2)} m/s<br/>
            Distance: ${(s.distance).toFixed(0)}m<br/>
            Duration: ${formatElapsed(s.duration)}<br/>
            ${formatElapsed(s.startTime)} → ${formatElapsed(s.endTime)}
          `;
        },
      },
      grid: { left: 60, right: 40, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: segments.map(s => s.label),
        axisLabel: { color: c.subText },
        axisLine: { lineStyle: { color: c.splitLine } },
      },
      yAxis: {
        type: 'value',
        name: 'Split (s/500m)',
        inverse: true,
        nameTextStyle: { fontSize: 11, color: c.subText },
        axisLabel: {
          formatter: (val) => formatSplit(val),
          color: c.subText,
        },
        splitLine: { lineStyle: { color: c.splitLine } },
      },
      series: [{
        type: 'bar',
        data: segments.map((s, i) => ({
          value: s.avgSplit,
          itemStyle: {
            color: i === 0 ? c.primary :
              s.avgSplit < segments[0].avgSplit ? '#10b981' : '#ef4444',
          },
        })),
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'inside',
          formatter: (p) => formatSplit(p.value),
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
        },
      }],
      animation: false,
    };
  }, [segments, c]);

  if (segments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400">
        Not enough moving data for segments
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">Segments:</span>
        {[2, 4, 6, 8].map(n => (
          <button
            key={n}
            onClick={() => setSegmentCount(n)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              segmentCount === n
                ? 'bg-deep-purple text-white dark:bg-dark-purple'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge={true} />
    </div>
  );
}

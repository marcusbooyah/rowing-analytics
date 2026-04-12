import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { formatSplit, speedToSplit, formatElapsed } from '../utils/rowing';

export default function NegativeSplitChart({ data }) {
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const analysis = useMemo(() => {
    const moving = data.filter(r => r.Speed > 1.0);
    if (moving.length < 20) return null;

    const mid = Math.floor(moving.length / 2);
    const firstHalf = moving.slice(0, mid);
    const secondHalf = moving.slice(mid);

    const avgSpeed1 = firstHalf.reduce((s, r) => s + r.Speed, 0) / firstHalf.length;
    const avgSpeed2 = secondHalf.reduce((s, r) => s + r.Speed, 0) / secondHalf.length;
    const dist1 = firstHalf.reduce((d, r) => d + r.Speed * 0.1, 0);
    const dist2 = secondHalf.reduce((d, r) => d + r.Speed * 0.1, 0);
    const dur1 = firstHalf[firstHalf.length - 1].elapsedSec - firstHalf[0].elapsedSec;
    const dur2 = secondHalf[secondHalf.length - 1].elapsedSec - secondHalf[0].elapsedSec;

    // Also break into quarters
    const q1 = moving.slice(0, Math.floor(moving.length / 4));
    const q2 = moving.slice(Math.floor(moving.length / 4), Math.floor(moving.length / 2));
    const q3 = moving.slice(Math.floor(moving.length / 2), Math.floor(moving.length * 3 / 4));
    const q4 = moving.slice(Math.floor(moving.length * 3 / 4));

    const quarters = [q1, q2, q3, q4].map((q, i) => {
      const avg = q.reduce((s, r) => s + r.Speed, 0) / q.length;
      return {
        label: `Q${i + 1}`,
        avgSpeed: avg,
        split: speedToSplit(avg),
        distance: q.reduce((d, r) => d + r.Speed * 0.1, 0),
        duration: q[q.length - 1].elapsedSec - q[0].elapsedSec,
      };
    });

    return {
      firstHalf: { avgSpeed: avgSpeed1, split: speedToSplit(avgSpeed1), distance: dist1, duration: dur1 },
      secondHalf: { avgSpeed: avgSpeed2, split: speedToSplit(avgSpeed2), distance: dist2, duration: dur2 },
      isNegativeSplit: avgSpeed2 > avgSpeed1,
      splitDiff: speedToSplit(avgSpeed1) - speedToSplit(avgSpeed2),
      quarters,
    };
  }, [data]);

  if (!analysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center text-gray-400">
        Not enough moving data for split analysis
      </div>
    );
  }

  const option = useMemo(() => ({
    title: {
      text: 'Split Analysis by Quarter',
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
        if (idx === undefined) return '';
        const q = analysis.quarters[idx];
        return `
          <strong>${q.label}</strong><br/>
          Split: ${formatSplit(q.split)}/500m<br/>
          Speed: ${q.avgSpeed.toFixed(2)} m/s<br/>
          Distance: ${q.distance.toFixed(0)}m<br/>
          Duration: ${formatElapsed(q.duration)}
        `;
      },
    },
    grid: { left: 60, right: 40, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: analysis.quarters.map(q => q.label),
      axisLabel: { color: c.subText, fontSize: 13 },
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
      data: analysis.quarters.map((q, i) => ({
        value: q.split,
        itemStyle: {
          color: i < 2 ? c.primary : (
            q.split < analysis.quarters[0].split ? '#10b981' : '#ef4444'
          ),
        },
      })),
      barMaxWidth: 80,
      label: {
        show: true,
        position: 'inside',
        formatter: (p) => formatSplit(p.value),
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
      },
    }],
    animation: false,
  }), [analysis, c]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-4 mb-3 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          1st Half: <strong className="text-gray-900 dark:text-gray-100">{formatSplit(analysis.firstHalf.split)}</strong>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          2nd Half: <strong className="text-gray-900 dark:text-gray-100">{formatSplit(analysis.secondHalf.split)}</strong>
        </span>
        <span className={`font-semibold ${analysis.isNegativeSplit ? 'text-green-600' : 'text-red-500'}`}>
          {analysis.isNegativeSplit ? '✓ Negative Split' : '✗ Positive Split'}
          {' '}({analysis.splitDiff > 0 ? '-' : '+'}{Math.abs(analysis.splitDiff).toFixed(1)}s)
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 280 }} notMerge={true} />
    </div>
  );
}

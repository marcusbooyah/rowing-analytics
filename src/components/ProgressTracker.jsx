import { useState, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { speedToSplit, formatSplit } from '../utils/rowing';

export default function ProgressTracker({ data }) {
  const [historicalSessions, setHistoricalSessions] = useState([]);
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const addSessions = useCallback((files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = Papa.parse(e.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        const rows = result.data.filter(r => r.Speed > 1.0);
        if (rows.length === 0) return;

        const avgSpeed = rows.reduce((s, r) => s + r.Speed, 0) / rows.length;
        const maxSpeed = Math.max(...rows.map(r => r.Speed));
        const distance = rows.reduce((d, r) => d + r.Speed * 0.1, 0);
        const date = new Date(rows[0].Time);

        setHistoricalSessions(prev => [...prev, {
          name: file.name,
          date,
          dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avgSplit: speedToSplit(avgSpeed),
          maxSpeed,
          distance,
        }].sort((a, b) => a.date - b.date));
      };
      reader.readAsText(file);
    });
  }, []);

  // Include current session
  const allSessions = useMemo(() => {
    const moving = data.filter(r => r.Speed > 1.0);
    if (moving.length === 0) return historicalSessions;

    const avgSpeed = moving.reduce((s, r) => s + r.Speed, 0) / moving.length;
    const maxSpeed = Math.max(...moving.map(r => r.Speed));
    const distance = moving.reduce((d, r) => d + r.Speed * 0.1, 0);
    const date = new Date(data[0].Time);

    const current = {
      name: 'Current',
      date,
      dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgSplit: speedToSplit(avgSpeed),
      maxSpeed,
      distance,
    };

    return [...historicalSessions, current].sort((a, b) => a.date - b.date);
  }, [data, historicalSessions]);

  const option = useMemo(() => {
    if (allSessions.length === 0) return {};

    return {
      title: {
        text: 'Progress Over Time',
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
          if (idx === undefined || !allSessions[idx]) return '';
          const s = allSessions[idx];
          return `
            <strong>${s.name}</strong><br/>
            ${s.dateStr}<br/>
            Avg Split: ${formatSplit(s.avgSplit)}/500m<br/>
            Distance: ${(s.distance / 1000).toFixed(2)} km
          `;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: c.subText },
      },
      grid: { left: 60, right: 60, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: allSessions.map(s => s.dateStr),
        axisLabel: { color: c.subText },
        axisLine: { lineStyle: { color: c.splitLine } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Avg Split (s/500m)',
          inverse: true,
          nameTextStyle: { fontSize: 11, color: c.primary },
          axisLabel: {
            formatter: (val) => formatSplit(val),
            color: c.primary,
          },
          splitLine: { lineStyle: { color: c.splitLine } },
        },
        {
          type: 'value',
          name: 'Distance (m)',
          nameTextStyle: { fontSize: 11, color: '#10b981' },
          axisLabel: { color: '#10b981' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: 'line',
          name: 'Avg Split',
          data: allSessions.map(s => Math.round(s.avgSplit * 10) / 10),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2, color: c.primary },
          itemStyle: { color: c.primary },
        },
        {
          type: 'bar',
          name: 'Distance',
          yAxisIndex: 1,
          data: allSessions.map(s => Math.round(s.distance)),
          itemStyle: { color: '#10b981', opacity: 0.6 },
          barMaxWidth: 30,
        },
      ],
      animation: false,
    };
  }, [allSessions, c]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3">
        <label className="px-3 py-1 bg-deep-purple dark:bg-dark-purple hover:bg-primary-orange rounded text-white text-sm font-medium cursor-pointer transition-colors">
          + Add Past Sessions
          <input
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files.length > 0) addSessions(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Upload multiple CSVs to track progress
        </span>
      </div>
      {allSessions.length > 0 ? (
        <ReactECharts option={option} style={{ height: 320 }} notMerge={true} />
      ) : (
        <div className="text-center text-gray-400 py-8">Add sessions to see progress</div>
      )}
    </div>
  );
}

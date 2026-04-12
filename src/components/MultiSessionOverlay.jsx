import { useState, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';
import { useTheme } from './ThemeContext';
import { getChartColors } from '../utils/chartTheme';
import { speedToSplit, formatSplit, formatElapsed } from '../utils/rowing';

const SESSION_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#ec4899'];

export default function MultiSessionOverlay({ data }) {
  const [sessions, setSessions] = useState([]);
  const { dark } = useTheme();
  const c = getChartColors(dark);

  const addSession = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = Papa.parse(e.target.result, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      const rows = result.data;
      if (rows.length === 0) return;
      const baseTime = new Date(rows[0].Time).getTime();
      const processed = rows.map(row => {
        const t = new Date(row.Time).getTime();
        return { ...row, elapsedSec: (t - baseTime) / 1000, splitSec: speedToSplit(row.Speed) };
      });
      setSessions(prev => [...prev, { name: file.name, data: processed }]);
    };
    reader.readAsText(file);
  }, []);

  const removeSession = (idx) => {
    setSessions(prev => prev.filter((_, i) => i !== idx));
  };

  // Current session as first entry
  const allSessions = useMemo(() => {
    const current = { name: 'Current', data: data };
    return [current, ...sessions];
  }, [data, sessions]);

  const option = useMemo(() => {
    // Find the max elapsed time across all sessions
    const maxTime = Math.max(...allSessions.map(s =>
      s.data[s.data.length - 1]?.elapsedSec ?? 0
    ));

    return {
      title: {
        text: 'Session Comparison',
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
        type: 'value',
        name: 'Elapsed Time',
        axisLabel: {
          formatter: (val) => formatElapsed(val),
          color: c.subText,
        },
        axisLine: { lineStyle: { color: c.splitLine } },
        max: maxTime,
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
          min: 80,
          max: 300,
          nameTextStyle: { fontSize: 11, color: c.subText },
          axisLabel: {
            formatter: (val) => formatSplit(val),
            color: c.subText,
          },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        { type: 'slider', height: 20, bottom: 30 },
        { type: 'inside' },
      ],
      series: allSessions.map((session, i) => {
        // Downsample to ~1000 points for overlay perf
        const step = Math.max(1, Math.floor(session.data.length / 1000));
        const sampled = session.data.filter((_, idx) => idx % step === 0);
        return {
          type: 'line',
          name: session.name,
          data: sampled.map(r => [r.elapsedSec, r.Speed]),
          symbol: 'none',
          lineStyle: { width: 1.5, color: SESSION_COLORS[i % SESSION_COLORS.length] },
          itemStyle: { color: SESSION_COLORS[i % SESSION_COLORS.length] },
          sampling: 'lttb',
        };
      }),
      animation: false,
    };
  }, [allSessions, c]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="px-3 py-1 bg-deep-purple dark:bg-dark-purple hover:bg-primary-orange rounded text-white text-sm font-medium cursor-pointer transition-colors">
          + Add Session
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) addSession(file);
              e.target.value = '';
            }}
          />
        </label>
        {sessions.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SESSION_COLORS[(i + 1) % SESSION_COLORS.length] }} />
            {s.name}
            <button
              onClick={() => removeSession(i)}
              className="ml-1 text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <ReactECharts option={option} style={{ height: 350 }} notMerge={true} />
    </div>
  );
}

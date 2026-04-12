import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { speedToSplit } from '../utils/rowing';
import { detectStrokes, computeBalanceScores } from '../utils/strokeDetection';

export function useRowingData() {
  const [data, setData] = useState([]);
  const [strokeData, setStrokeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);

  const loadFile = useCallback((file) => {
    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const result = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      const rows = result.data;
      if (rows.length === 0) {
        setError('No data found in file');
        setIsLoading(false);
        return;
      }

      const baseTime = new Date(rows[0].Time).getTime();

      const processed = rows.map((row) => {
        const t = new Date(row.Time).getTime();
        const elapsedSec = (t - baseTime) / 1000;
        const splitSec = speedToSplit(row.Speed);
        return { ...row, elapsedSec, splitSec };
      });

      // Detect strokes and compute derived metrics
      const { strokes, strokeRates, driveRecovery } = detectStrokes(processed);
      const balanceScores = computeBalanceScores(processed, strokes);
      setStrokeData({ strokes, strokeRates, driveRecovery, balanceScores });

      const lastRow = processed[processed.length - 1];
      setSessionInfo({
        startTime: rows[0].Time,
        endTime: lastRow.Time,
        durationSec: lastRow.elapsedSec,
        rowCount: processed.length,
        fileName: file.name,
        date: new Date(rows[0].Time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });

      setData(processed);
      setIsLoading(false);
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    };

    reader.readAsText(file);
  }, []);

  return { data, strokeData, isLoading, error, sessionInfo, loadFile };
}

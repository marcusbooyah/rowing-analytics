import { createContext, useContext, useState, useCallback } from 'react';

const TimeRangeContext = createContext();

export function TimeRangeProvider({ dataLength, children }) {
  const [timeRange, setTimeRangeState] = useState({ start: 0, end: 100 });

  const setTimeRange = useCallback((start, end) => {
    setTimeRangeState({ start, end });
  }, []);

  const getIndices = useCallback(() => {
    const startIdx = Math.floor((timeRange.start / 100) * (dataLength - 1));
    const endIdx = Math.floor((timeRange.end / 100) * (dataLength - 1));
    return { startIdx, endIdx };
  }, [timeRange, dataLength]);

  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange, getIndices }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}

import { useCallback } from 'react';
import { useRowingData } from './hooks/useRowingData';
import { ThemeProvider } from './components/ThemeContext';
import { TimeRangeProvider } from './components/TimeRangeContext';
import Header from './components/Header';
import SessionStats from './components/SessionStats';
import SpeedChart from './components/SpeedChart';
import OverlayChart from './components/OverlayChart';
import SideBySidePanel from './components/SideBySidePanel';
import StrokeRateChart from './components/StrokeRateChart';
import DriveRecoveryChart from './components/DriveRecoveryChart';
import GpsMap from './components/GpsMap';
import SpeedHistogram from './components/SpeedHistogram';
import StabilityHeatmap from './components/StabilityHeatmap';
import BalanceScoreChart from './components/BalanceScoreChart';
import BoatCheckChart from './components/BoatCheckChart';
import PieceComparison from './components/PieceComparison';

function SectionHeading({ children }) {
  return (
    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
      {children}
    </h2>
  );
}

function FileUpload({ onFileLoad, isLoading }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileLoad(file);
  }, [onFileLoad]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="max-w-lg w-full border-2 border-dashed border-primary-orange/50 dark:border-primary-orange/30 rounded-xl p-12 text-center bg-white dark:bg-gray-800 hover:border-primary-orange transition-colors"
      >
        <div className="text-4xl mb-4">🚣</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Rowing Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Upload a RaceBox CSV file to analyze your session
        </p>
        {isLoading ? (
          <div className="text-primary-orange font-medium">Loading...</div>
        ) : (
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary-orange text-white font-medium rounded-lg cursor-pointer hover:bg-dark-orange transition-colors">
            Choose CSV File
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onFileLoad(file);
              }}
            />
          </label>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">or drag and drop a file here</p>
      </div>
    </div>
  );
}

function App() {
  const { data, strokeData, isLoading, error, sessionInfo, loadFile } = useRowingData();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-lg">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-orange text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return <FileUpload onFileLoad={loadFile} isLoading={isLoading} />;
  }

  return (
    <TimeRangeProvider dataLength={data.length}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header sessionInfo={sessionInfo} onNewFile={loadFile} />
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Overview */}
          <SessionStats data={data} />
          <GpsMap data={data} />
          <SpeedChart data={data} />

          {/* Piece Comparison */}
          <SectionHeading>Piece Comparison</SectionHeading>
          <PieceComparison data={data} strokeData={strokeData} />

          {/* Speed & Sensor Analysis */}
          <SectionHeading>Speed &amp; Sensor Analysis</SectionHeading>
          <OverlayChart data={data} />
          <SideBySidePanel data={data} />

          {/* Stroke Analysis */}
          <SectionHeading>Stroke Analysis</SectionHeading>
          <StrokeRateChart data={data} strokeData={strokeData} />
          <BoatCheckChart data={data} strokeData={strokeData} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DriveRecoveryChart data={data} strokeData={strokeData} />
            <BalanceScoreChart data={data} strokeData={strokeData} />
          </div>

          {/* Boat Stability */}
          <SectionHeading>Boat Stability</SectionHeading>
          <StabilityHeatmap data={data} />

          {/* Performance */}
          <SectionHeading>Performance</SectionHeading>
          <SpeedHistogram data={data} />
        </main>
      </div>
    </TimeRangeProvider>
  );
}

export default function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

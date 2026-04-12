import { formatElapsed } from '../utils/rowing';
import { useTheme } from './ThemeContext';

export default function Header({ sessionInfo, onNewFile }) {
  const { dark, toggle } = useTheme();

  return (
    <header className="bg-deep-purple dark:bg-dark-purple text-white py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Rowing Analytics</h1>
        <div className="flex items-center gap-6 text-warm-cream/70 dark:text-warm-gray/70 text-sm">
          {sessionInfo && (
            <>
              <span className="text-white font-medium">{sessionInfo.fileName}</span>
              <span>{sessionInfo.date}</span>
              <span>{formatElapsed(sessionInfo.durationSec)} duration</span>
              <span>{sessionInfo.rowCount.toLocaleString()} samples</span>
              <label className="px-3 py-1 bg-dark-purple dark:bg-dark-charcoal hover:bg-primary-orange rounded text-white text-xs font-medium cursor-pointer transition-colors">
                Load New File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) onNewFile(file);
                  }}
                />
              </label>
            </>
          )}
          <button
            onClick={toggle}
            className="px-3 py-1 bg-dark-purple dark:bg-dark-charcoal hover:bg-primary-orange rounded text-white text-xs font-medium transition-colors"
          >
            {dark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>
    </header>
  );
}

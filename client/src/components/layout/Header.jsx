import React, { useEffect, useState } from 'react';
import { Download, Moon, Sun, RefreshCw } from 'lucide-react';

export function Header({ lastUpdated, onRefresh, onExport, loading }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('terminal_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('terminal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('terminal_theme', 'light');
    }
  }, [isDark]);

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toISOString().slice(11, 19) + ' UTC'
    : '--:--:-- UTC';

  return (
    <header className="h-12 hairline-b bg-[var(--bg-surface)] px-4 sm:px-6 flex items-center justify-between text-[13px] select-none flex-shrink-0 relative overflow-hidden">
      {/* Background sync hairline pulse: subtle top indicator */}
      {loading && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent animate-pulse z-50 pointer-events-none"
        />
      )}

      {/* Left: Product Name + sub-label */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold tracking-tight text-[14px] sm:text-[15px] text-[var(--text-primary)] uppercase truncate">
          Wind Forecast Terminal
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-mono ml-1 hidden md:inline flex-shrink-0">
          UK Day-Ahead
        </span>
      </div>

      {/* Right cluster: sync pulse + timestamp + actions */}
      <div className="flex items-center gap-2 sm:gap-3 text-[var(--text-secondary)] flex-shrink-0">
        {/* Sync pulse dot + timestamp */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]" title="Last data synchronization">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]" />
          </span>
          <span className="tabular-nums hidden sm:inline">{formattedTime}</span>
        </div>

        {/* Refresh */}
        <button
          type="button"
          id="header-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh data feed"
          aria-label="Refresh Elexon data feed"
          className="p-1.5 rounded-[var(--radius-ctrl)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Export CSV */}
        <button
          type="button"
          id="header-export-btn"
          onClick={onExport}
          title="Export matched dataset as CSV"
          aria-label="Export data as CSV file"
          className="p-1.5 rounded-[var(--radius-ctrl)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          id="header-theme-toggle"
          onClick={() => setIsDark(!isDark)}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-pressed={isDark}
          className="p-1.5 rounded-[var(--radius-ctrl)] hover:bg-[var(--bg-page)] text-[var(--text-primary)] cursor-pointer"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}

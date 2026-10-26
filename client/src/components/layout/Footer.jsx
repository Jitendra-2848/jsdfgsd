import React from 'react';

export function Footer({ lastUpdated, source = 'Elexon BMRS (FUELHH / WINDFOR)' }) {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toISOString().slice(11, 19)
    : '--:--:--';

  return (
    <footer className="h-9 px-6 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none font-mono hairline-t bg-[var(--bg-surface)]">
      <div>
        Last updated <span className="text-[var(--text-secondary)] tabular-nums">{formattedTime} UTC</span> &middot; source: <span className="text-[var(--text-secondary)]">{source}</span>
      </div>
      <div className="hidden sm:inline text-[10px]">
        UK Wholesale Electricity Market &middot; Terminal v2.1
      </div>
    </footer>
  );
}

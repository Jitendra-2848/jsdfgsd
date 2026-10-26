import React from 'react';
import { Badge } from '../ui/Badge';

export function KPICard({
  title,
  value,
  unit = '',
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  accentColor = 'var(--text-primary)',
  icon: Icon,
}) {
  return (
    <div className="card-panel p-4 flex flex-col justify-between hover:border-[#96732D]/40 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-[#66665D] tracking-wide flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#66665D]" />}
          {title}
        </span>
        {badgeText && (
          <Badge variant={badgeVariant}>{badgeText}</Badge>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className="text-2xl font-bold tracking-tight tabular-nums"
          style={{ color: accentColor }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-[#66665D]">
            {unit}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-[#66665D] mt-1 border-t border-[#D9D6CC]/40 pt-2 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

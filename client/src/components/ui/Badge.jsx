import React from 'react';

export function Badge({ children, variant = 'neutral', className = '' }) {
  const variantStyles = {
    neutral: 'bg-[#F2F2F2] text-[#66665D] border-[#D9D6CC]',
    actual: 'bg-[#527D68]/10 text-[#527D68] border-[#527D68]/30',
    forecast: 'bg-[#96732D]/10 text-[#96732D] border-[#96732D]/30',
    error: 'bg-[#B84F49]/10 text-[#B84F49] border-[#B84F49]/30',
    surplus: 'bg-[#416F9C]/10 text-[#416F9C] border-[#416F9C]/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border tabular-nums ${variantStyles[variant] || variantStyles.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

import React from 'react';

export function SkeletonLoader({ className = '', height = 'h-4', width = 'w-full' }) {
  return (
    <div
      className={`animate-pulse bg-[#D9D6CC]/40 rounded ${height} ${width} ${className}`}
    />
  );
}

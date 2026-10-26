import { useState, useEffect, useRef } from 'react';

/**
 * Hook to animate numeric values smoothly over a specified duration (e.g. 300ms).
 */
export function useAnimatedNumber(targetValue, duration = 300, isFloat = false) {
  const [displayValue, setDisplayValue] = useState(targetValue || 0);
  const startValueRef = useRef(targetValue || 0);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const startVal = startValueRef.current;
    const endVal = Number(targetValue) || 0;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;

      setDisplayValue(isFloat ? Number(current.toFixed(1)) : Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, duration, isFloat]);

  return displayValue;
}

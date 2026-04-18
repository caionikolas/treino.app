import { useEffect, useRef } from 'react';

/**
 * Calls onTick(Date.now()) every tickMs while enabled.
 * Uses Date.now() so consumers can compute elapsed/remaining without drift.
 */
export function useIntervalTimer(
  tickMs: number,
  onTick: (now: number) => void,
  enabled: boolean = true,
): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return;
    const handle = setInterval(() => onTickRef.current(Date.now()), tickMs);
    return () => clearInterval(handle);
  }, [enabled, tickMs]);
}

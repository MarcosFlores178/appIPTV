import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseWatchdogOptions {
  isBuffering: boolean;
  hasPlaybackStarted: boolean;
  onStall: () => void;
  bufferingTimeoutMs?: number;
  enabled?: boolean;
  streamKey?: string | number;
}

export interface UseWatchdogResult {
  isStalled: boolean;
  reset: () => void;
}

const DEFAULT_BUFFERING_TIMEOUT_MS = 8000;

export function useWatchdog({
  isBuffering,
  hasPlaybackStarted,
  onStall,
  bufferingTimeoutMs = DEFAULT_BUFFERING_TIMEOUT_MS,
  enabled = true,
  streamKey,
}: UseWatchdogOptions): UseWatchdogResult {
  const [isStalled, setIsStalled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallReportedRef = useRef(false);
  const onStallRef = useRef(onStall);

  useEffect(() => {
    onStallRef.current = onStall;
  }, [onStall]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stallReportedRef.current = false;
    setIsStalled(false);
  }, [clearTimer]);

  useEffect(() => {
    reset();
  }, [reset, streamKey]);

  useEffect(() => {
    clearTimer();

    if (!enabled || !hasPlaybackStarted || !isBuffering || stallReportedRef.current) {
      if (!isBuffering) {
        stallReportedRef.current = false;
        setIsStalled(false);
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      stallReportedRef.current = true;
      setIsStalled(true);
      onStallRef.current();
    }, bufferingTimeoutMs);

    return clearTimer;
  }, [
    bufferingTimeoutMs,
    clearTimer,
    enabled,
    hasPlaybackStarted,
    isBuffering,
    streamKey,
  ]);

  useEffect(() => clearTimer, [clearTimer]);

  return { isStalled, reset };
}

export default useWatchdog;
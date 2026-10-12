import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseWatchdogOptions {
  isBuffering: boolean;
  hasPlaybackStarted: boolean;
  onStall: () => void;
  // NUEVO: referencia a currentTime del player. Si se pasa, el watchdog
  // usa avance de currentTime como criterio en lugar de solo isBuffering.
  currentTimeRef?: React.MutableRefObject<number>;
  // Umbral cuando el video está en buffering y currentTime no avanza.
  bufferingTimeoutMs?: number;
  // Umbral cuando el video NO está en buffering pero currentTime no avanza.
  frozenTimeoutMs?: number;
  enabled?: boolean;
  streamKey?: string | number;
}

export interface UseWatchdogResult {
  isStalled: boolean;
  reset: () => void;
}

const DEFAULT_BUFFERING_TIMEOUT_MS = 15000; // antes 8000
const DEFAULT_FROZEN_TIMEOUT_MS = 20000;

export function useWatchdog({
  isBuffering,
  hasPlaybackStarted,
  onStall,
  currentTimeRef,
  bufferingTimeoutMs = DEFAULT_BUFFERING_TIMEOUT_MS,
  frozenTimeoutMs = DEFAULT_FROZEN_TIMEOUT_MS,
  enabled = true,
  streamKey,
}: UseWatchdogOptions): UseWatchdogResult {
  const [isStalled, setIsStalled] = useState(false);
  const stallReportedRef = useRef(false);
  const onStallRef = useRef(onStall);

  // Refs para la lógica basada en currentTime
  const lastTimeRef = useRef<number>(0);
  const frozenSinceRef = useRef<number | null>(null);

  useEffect(() => {
    onStallRef.current = onStall;
  }, [onStall]);

  const reset = useCallback(() => {
    stallReportedRef.current = false;
    frozenSinceRef.current = null;
    lastTimeRef.current = 0;
    setIsStalled(false);
  }, []);

  useEffect(() => {
    reset();
  }, [reset, streamKey]);

  useEffect(() => {
    if (!enabled || !hasPlaybackStarted || stallReportedRef.current) {
      return;
    }

    // MODO 1: sin currentTimeRef → comportamiento clásico (basado en isBuffering)
    if (!currentTimeRef) {
      if (!isBuffering) return;
      const t = setTimeout(() => {
        stallReportedRef.current = true;
        setIsStalled(true);
        onStallRef.current();
      }, bufferingTimeoutMs);
      return () => clearTimeout(t);
    }

    // MODO 2: con currentTimeRef → basado en avance real de currentTime
    const interval = setInterval(() => {
      const now = Date.now();
      const currentTime = currentTimeRef.current;

      // 👇 FIX CRÍTICO: ignorar valores no positivos (fase de inicialización)
      if (currentTime <= 0) {
        // El reproductor no ha empezado a reproducir (o se reinició).
        // No contar congelamiento. Resetear cualquier conteo previo.
        lastTimeRef.current = currentTime;
        frozenSinceRef.current = null;
        return;
      }

      if (currentTime !== lastTimeRef.current) {
        lastTimeRef.current = currentTime;
        frozenSinceRef.current = null;
        return;
      }

      if (frozenSinceRef.current === null) {
        frozenSinceRef.current = now;
        console.log(
          `[Watchdog] Congelamiento detectado. currentTime=${currentTime.toFixed(
            2,
          )} threshold=${isBuffering ? bufferingTimeoutMs : frozenTimeoutMs}ms`,
        );
        return;
      }

      const frozenFor = now - frozenSinceRef.current;
      const threshold = isBuffering ? bufferingTimeoutMs : frozenTimeoutMs;

      if (frozenFor >= threshold) {
        console.warn(
          `[Watchdog] STALL CONFIRMADO. currentTime=${currentTime.toFixed(
            2,
          )} congelado por ${frozenFor}ms`,
        );
        stallReportedRef.current = true;
        setIsStalled(true);
        onStallRef.current();
        frozenSinceRef.current = null;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [
    bufferingTimeoutMs,
    currentTimeRef,
    enabled,
    frozenTimeoutMs,
    hasPlaybackStarted,
    isBuffering,
    streamKey,
  ]);

  return { isStalled, reset };
}

export default useWatchdog;

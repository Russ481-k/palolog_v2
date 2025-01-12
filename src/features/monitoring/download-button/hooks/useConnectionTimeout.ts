import { useCallback, useEffect, useRef } from 'react';

interface UseConnectionTimeoutProps {
  timeout?: number;
  onTimeout: () => void;
}

export const useConnectionTimeout = ({
  timeout = 10000,
  onTimeout,
}: UseConnectionTimeoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) {
      global.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = global.setTimeout(() => {
      if (!mountedRef.current) return;
      onTimeout();
    }, timeout) as NodeJS.Timeout;
  }, [timeout, onTimeout]);

  const clearConnectionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      global.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearConnectionTimeout();
    };
  }, [clearConnectionTimeout]);

  return {
    startTimeout,
    clearTimeout: clearConnectionTimeout,
  };
};

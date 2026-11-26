import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast(durationMs = 3200) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setToastMessage(msg);
      timeoutRef.current = setTimeout(() => {
        setToastMessage(null);
        timeoutRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { toastMessage, showToast };
}

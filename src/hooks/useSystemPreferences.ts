import { useEffect, useState } from 'react';

export function useSystemPreferences(
  theme: 'auto' | 'dark' | 'light',
  themePreviewOverride: 'auto' | 'dark' | 'light' | null
): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const activeTheme = themePreviewOverride ?? theme;
    const applyResolvedTheme = (prefersDark: boolean) => {
      const isDark =
        activeTheme === 'dark' || (activeTheme === 'auto' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyResolvedTheme(mq.matches);
      if (activeTheme === 'auto') {
        const listener = (e: MediaQueryListEvent) => applyResolvedTheme(e.matches);
        mq.addEventListener('change', listener);
        return () => mq.removeEventListener('change', listener);
      }
      return;
    }

    applyResolvedTheme(activeTheme !== 'light');
  }, [theme, themePreviewOverride]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  return prefersReducedMotion;
}

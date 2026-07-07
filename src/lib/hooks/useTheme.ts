'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  // Default false matches the light <html> rendered server-side,
  // so there's no hydration mismatch. The inline script in layout.tsx
  // applies a stored dark preference before first paint.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark = stored === 'dark'; // light is the default
    setIsDark(dark);
    applyTheme(dark);
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  return { isDark, toggle };
}

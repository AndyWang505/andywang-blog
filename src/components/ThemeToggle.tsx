import React, { useEffect, useState } from 'react';
import { IoSunny, IoMoon } from 'react-icons/io5';

const themes = ['light', 'dark'];

export default function ThemeToggle() {
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (import.meta.env.SSR) {
      return undefined;
    }
    // 使用 inline script 設置的全域變數
    return (window as any).__theme || 'light';
  });

  const toggleTheme = () => {
    const t = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', t);
    setTheme(t);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted ? (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="切換深色模式"
      className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors duration-fast hover:bg-bg-muted lg:h-10 lg:w-10"
    >
      {theme === 'light' ? (
        <IoSunny className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <IoMoon className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
    </button>
  ) : (
    <div className="h-11 w-11 lg:h-10 lg:w-10" />
  );
}

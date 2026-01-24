'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'griddy-icons';

interface ThemeToggleProps {
  /** Variant style */
  variant?: 'dropdown' | 'button' | 'switch';
  /** Additional class names */
  className?: string;
}

/**
 * Theme toggle component for switching between light and dark mode.
 * Supports dropdown item, button, and switch variants.
 */
export function ThemeToggle({ variant = 'dropdown', className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder with same dimensions to prevent layout shift
    if (variant === 'dropdown') {
      return (
        <div className="w-full flex items-center justify-between px-4 py-3 text-polar-night dark:text-snow-stormLightest">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-bg-secondary dark:bg-polar-nightMedium animate-pulse" />
            <span className="font-medium">Theme</span>
          </div>
        </div>
      );
    }
    if (variant === 'button') {
      return (
        <button className="p-2 rounded-lg bg-bg-secondary dark:bg-polar-nightMedium" disabled>
          <div className="w-5 h-5" />
        </button>
      );
    }
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Dropdown item variant (for user menu)
  if (variant === 'dropdown') {
    return (
      <button
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-bg-elevated dark:hover:bg-polar-nightMedium transition-colors ${className || ''}`}
      >
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="w-5 h-5 text-frost-polar" />
          ) : (
            <Sun className="w-5 h-5 text-aurora-orange" />
          )}
          <span className="text-polar-night dark:text-snow-stormLightest font-medium">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
        <span className="text-xs text-text-muted dark:text-snow-storm">
          {isDark ? 'On' : 'Off'}
        </span>
      </button>
    );
  }

  // Button variant (standalone toggle)
  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg hover:bg-bg-secondary dark:hover:bg-polar-nightLight transition-colors ${className || ''}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-aurora-orange" />
        ) : (
          <Moon className="w-5 h-5 text-frost-polar" />
        )}
      </button>
    );
  }

  // Switch variant (toggle switch)
  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isDark ? 'bg-frost-ice' : 'bg-border'
      } ${className || ''}`}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-snow-white transition-transform ${
          isDark ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

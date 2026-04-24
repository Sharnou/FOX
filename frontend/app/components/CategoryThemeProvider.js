'use client';
import { useEffect } from 'react';
import { getCategoryTheme } from '../lib/categoryThemes';

export default function CategoryThemeProvider({ category }) {
  useEffect(() => {
    const theme = getCategoryTheme(category);
    const root = document.documentElement;

    // Add switching class for icon animation
    document.body.classList.add('theme-switching');

    Object.entries(theme.vars).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });

    // Set category icon in any .category-icon elements
    document.querySelectorAll('.category-icon').forEach(el => {
      el.textContent = theme.icon;
    });

    // Remove switching class after animation
    const t = setTimeout(() => document.body.classList.remove('theme-switching'), 300);
    return () => clearTimeout(t);
  }, [category]);

  return null; // purely side-effect component
}

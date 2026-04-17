'use client';
// Re-exports LanguageProvider and useLanguage from the central context.
// layout.js imports `default` (LanguageProvider) from this file.
export { LanguageProvider as default, useLanguage } from '../context/LanguageContext';

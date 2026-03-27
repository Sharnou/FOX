import { callWithFailover } from './keyPool.js';
import fetch from 'node-fetch';

const categoryWarnings = {
  'Electronics > Mobiles': 'Check battery health and screen condition before buying.',
  'Electronics > Computers': 'Verify specs and test power-on before purchase.',
  'Vehicles > Cars': 'Always check vehicle history and test drive before buying.',
  'Real Estate > Apartments': 'Visit in person and verify legal documents.',
  'Pharmacy > Medicine': 'Check expiry date and storage conditions.',
  'Fast Food > Restaurant': 'Check hygiene rating and delivery time.',
  'Jobs > General': 'Never pay fees to apply for a job.',
  'Services > Workers': 'Agree on price before work begins.',
};

export function getWarning(category, sub) {
  const key = `${category} > ${sub}`;
  return categoryWarnings[key] || 'Always be careful when buying online.';
}

export async function generateCategoryArtPrompt(category, subcategory) {
  return `Flat design illustration of ${subcategory} for ${category} marketplace category. Clean, minimal, modern, colorful, white background, suitable for app icon.`;
}

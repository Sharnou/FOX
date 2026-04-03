// In-memory store for reviews and favorites (fallback when DB unavailable)
import { randomBytes } from 'crypto';

export function makeId() {
  return randomBytes(8).toString('hex');
}

const store = {
  reviews: [],
  favorites: []
};

export const db = store;
export default store;

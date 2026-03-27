import Ad from '../models/Ad.js';
export async function checkDuplicate(title, category, city, userId) {
  return !!(await Ad.findOne({ userId, title, category, city, isExpired: false, isDeleted: false }));
}

import User from '../models/User.js';
export async function detectFraud(ip) {
  const count = await User.countDocuments({ registrationIp: ip });
  return count >= 3 ? { isFraud: true, reason: 'Multiple accounts from same IP' } : { isFraud: false };
}

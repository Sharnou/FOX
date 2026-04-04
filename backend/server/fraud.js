import User from '../models/User.js';
import { dbState, MemUser } from './memoryStore.js';
function getUserModel() { return dbState.usingMemoryStore ? MemUser : User; }
export async function detectFraud(ip) {
  const count = await getUserModel().countDocuments({ registrationIp: ip });
  return count >= 3 ? { isFraud: true, reason: 'Multiple accounts from same IP' } : { isFraud: false };
}

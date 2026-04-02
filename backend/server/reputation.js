export function calcReputation(user) {
  return Math.max(0, Math.min(100, (user.goodActions || 0) * 2 - (user.reports || 0) * 3 + 50));
}

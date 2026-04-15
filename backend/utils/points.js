/**
 * Points utility — centralised reputation point management.
 * All point awards/deductions go through addPointsToUser() so every event
 * is automatically recorded in pointsHistory (capped at 20 entries).
 */

/**
 * Award (or deduct) points to a user and log the event.
 * @param {Object} user      - Mongoose User document (must be saveable)
 * @param {number} points    - Positive to award, negative to deduct
 * @param {string} reason    - Human-readable description logged in pointsHistory
 */
export async function addPointsToUser(user, points, reason) {
  // reputationPoints CAN go negative — clamp at -999 to prevent runaway
  user.reputationPoints = Math.max(-999, (user.reputationPoints || 0) + points);
  // monthlyPoints never goes negative (used for leaderboard)
  user.monthlyPoints    = Math.max(0, (user.monthlyPoints    || 0) + points);

  // Append to pointsHistory, keep only last 20 entries
  const entry = { reason, points, date: new Date() };
  user.pointsHistory = [...(user.pointsHistory || []), entry].slice(-20);

  await user.save();
}

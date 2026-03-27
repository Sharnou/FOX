import mongoose from 'mongoose';
const AILogSchema = new mongoose.Schema({
  type: String, problem: String, solution: String, error: String,
  requestedBy: String, status: { type: String, default: 'pending_approval' },
  executedOnce: Boolean, startedAt: Date, completedAt: Date,
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('AILog', AILogSchema);

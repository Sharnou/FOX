import mongoose from 'mongoose';
const ReportSchema = new mongoose.Schema({ reporterId: String, targetId: String, type: String, reason: String, resolved: Boolean, createdAt: { type: Date, default: Date.now } });
export default mongoose.model('Report', ReportSchema);

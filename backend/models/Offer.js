import mongoose from 'mongoose';

const OfferSchema = new mongoose.Schema({
  ad:            { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  buyer:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:        { type: Number, required: true, min: 0 },
  counterAmount: { type: Number, min: 0 },
  message:       { type: String, maxlength: 200, default: '' },
  status:        {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model('Offer', OfferSchema);

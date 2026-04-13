'use strict';
import mongoose from 'mongoose';

const SubsubOptionSchema = new mongoose.Schema({
  category:    { type: String, required: true },
  subcategory: { type: String, required: true },
  options:     [{ ar: String, en: String }],
  updatedAt:   { type: Date, default: Date.now },
});

SubsubOptionSchema.index({ category: 1, subcategory: 1 }, { unique: true });

const SubsubOption = mongoose.models.SubsubOption || mongoose.model('SubsubOption', SubsubOptionSchema);
export default SubsubOption;

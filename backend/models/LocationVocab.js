'use strict';
import mongoose from 'mongoose';

const TermSchema = new mongoose.Schema({
  word:       { type: String, required: true },
  frequency:  { type: Number, default: 1 },
  categories: [String],
  subsubs:    [String],
  lastSeen:   { type: Date, default: Date.now }
}, { _id: false });

const LocationVocabSchema = new mongoose.Schema({
  country:   { type: String, required: true, unique: true }, // e.g. 'EG', 'SA', 'FR', 'US'
  language:  { type: String, default: '' },                  // auto-detected: 'ar', 'fr', 'en', etc.
  dialect:   { type: String, default: '' },                  // e.g. 'Egyptian Arabic', 'Gulf Arabic'
  terms:     [TermSchema],
  topWords:  [String],                                       // top 50 most frequent words
  sampleAds: [String],                                       // last 5 ad titles for AI prompts
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
LocationVocabSchema.index({ country: 1 }, { unique: true });
LocationVocabSchema.index({ country: 1, 'terms.word': 1 });

export default mongoose.model('LocationVocab', LocationVocabSchema);

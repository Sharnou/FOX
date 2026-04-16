import express from 'express';
import LocalWord from '../models/LocalWord.js';
import { translateWord, learnWord, getLocalDictionary, seedCoreDictionary } from '../server/languageLearner.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Translate a word or phrase
router.post('/translate', async (req, res) => {
  try {
    const { word, country } = req.body;
    const meaning = await translateWord(word, country || 'EG');
    res.json({ word, meaning });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Submit a new word to learn
router.post('/learn', async (req, res) => {
  try {
    const { word, meaning, category, country, dialect } = req.body;
    const result = await learnWord(word, meaning, category, country, dialect);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Manually teach a word (admin)
router.post('/teach', adminAuth, async (req, res) => {
  try {
    const { word, meaning, category, subcategory, country = 'EG', dialect } = req.body;
    if (!word || !category) return res.status(400).json({ error: 'word and category required' });
    const result = await LocalWord.findOneAndUpdate(
      { word, country },
      { word, meaning, english: meaning, category, subcategory, country, dialect: dialect || 'Egyptian', confidence: 1.0, aiConfidence: 1.0, aiLearned: false, confirmed: true, approved: true },
      { upsert: true, returnDocument: 'after' }
    );
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get dictionary
router.get('/dictionary', async (req, res) => {
  try {
    const { country = 'EG', limit = 100 } = req.query;
    const words = await getLocalDictionary(country, parseInt(limit));
    res.json({ country, count: words.length, words });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all words (admin)
router.get('/', async (req, res) => {
  try {
    const { country = 'EG', limit = 100, search } = req.query;
    const filter = { country };
    if (search) filter.word = { $regex: search, $options: 'i' };
    const words = await LocalWord.find(filter).sort({ frequency: -1 }).limit(parseInt(limit));
    const total = await LocalWord.countDocuments(filter);
    res.json({ words, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stats (admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const total = await LocalWord.countDocuments();
    const pending = await LocalWord.countDocuments({ confirmedByAdmin: false });
    const byCountry = await LocalWord.aggregate([{ $group: { _id: '$country', count: { $sum: 1 } } }]);
    const topWords = await LocalWord.find().sort({ frequency: -1 }).limit(10);
    res.json({ total, pending, byCountry, topWords });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pending approval (admin)
router.get('/pending', adminAuth, async (req, res) => {
  try {
    const words = await LocalWord.find({ confirmedByAdmin: false, approved: true }).sort({ frequency: -1 }).limit(50);
    res.json(words);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve word (admin)
router.patch('/:id/approve', adminAuth, async (req, res) => {
  try {
    const word = await LocalWord.findByIdAndUpdate(req.params.id, { confirmedByAdmin: true, approved: req.body.approved !== false }, { returnDocument: 'after' });
    res.json(word);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Edit word (admin)
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const { meaning, category, subcategory, confidence } = req.body;
    const word = await LocalWord.findByIdAndUpdate(req.params.id, { meaning, english: meaning, category, subcategory, confidence, aiConfidence: confidence, updatedAt: new Date() }, { returnDocument: 'after' });
    res.json(word);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete word (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await LocalWord.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health
router.get('/health', async (req, res) => {
  try {
    const wordCount = await LocalWord.countDocuments();
    res.json({ status: 'ok', dictionary: { total: wordCount } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;

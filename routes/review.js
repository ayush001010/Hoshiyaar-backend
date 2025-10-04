import express from 'express';
import UserIncorrectQuestion from '../models/UserIncorrectQuestion.js';
import mongoose from 'mongoose';

const router = express.Router();

// POST /api/review/incorrect - save one incorrect question
router.post('/incorrect', async (req, res) => {
	try {
		const { userId, questionId, moduleId, chapterId } = req.body;
		if (!userId || !questionId) {
			return res.status(400).json({ message: 'userId and questionId are required' });
		}
    const now = new Date();
    console.log('[review] save incorrect', { userId, questionId, moduleId, chapterId });
    const filter = { userId: new mongoose.Types.ObjectId(String(userId)), questionId: String(questionId) };
    // Use $set only for moduleId/chapterId to avoid path conflict
    const update = { $setOnInsert: { firstSeenAt: now }, $set: { lastSeenAt: now }, $inc: { count: 1 } };
    if (moduleId) { update.$set.moduleId = String(moduleId); }
    if (chapterId) { update.$set.chapterId = String(chapterId); }
    const updated = await UserIncorrectQuestion.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    return res.status(201).json(updated);
	} catch (err) {
    console.error('Error saving incorrect question', err?.message || err);
    return res.status(500).json({ message: 'Internal server error', error: String(err?.message || err) });
	}
});

// GET /api/review/incorrect?userId=... - list incorrect questionIds for user
router.get('/incorrect', async (req, res) => {
	try {
		const { userId, moduleId, chapterId } = req.query;
		if (!userId) return res.status(400).json({ message: 'userId is required' });
		const query = { userId };
		if (moduleId) query.moduleId = moduleId;
		if (chapterId) query.chapterId = chapterId;
		const rows = await UserIncorrectQuestion.find(query).sort({ lastSeenAt: -1 }).limit(200);
		return res.json(rows.map(r => ({ questionId: r.questionId, moduleId: r.moduleId, chapterId: r.chapterId, count: r.count, lastSeenAt: r.lastSeenAt })));
	} catch (err) {
		console.error('Error listing incorrect questions', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// POST /api/review/backfill - one-time helper to backfill moduleId (and optionally chapterId)
// WARNING: keep this non-public in production; add auth as needed
router.post('/backfill', async (req, res) => {
  try {
    const { limit = 1000 } = req.body || {};
    const missing = await UserIncorrectQuestion.find({ $or: [ { moduleId: { $exists: false } }, { moduleId: '' } ] }).limit(Number(limit));
    let updated = 0;
    for (const row of missing) {
      if (!row.questionId) continue;
      const [mod] = String(row.questionId).split('_');
      if (!mod) continue;
      row.moduleId = mod;
      await row.save();
      updated += 1;
    }
    return res.json({ updated, scanned: missing.length });
  } catch (err) {
    console.error('Error backfilling incorrect questions', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

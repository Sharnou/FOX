// backend/routes/favorites.js
// Favorites stored in User.favorites[] (MongoDB) — was using in-memory store (bug fix)
import { Router } from "express";
import { auth as requireAuth } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = Router();

async function getUserModel() {
  const { default: User } = await import("../models/User.js");
  return User;
}

async function getAdModel() {
  const { default: Ad } = await import("../models/Ad.js");
  return Ad;
}

// GET /api/favorites — list user's favorited ad IDs
router.get("/", requireAuth, async (req, res) => {
  try {
    const User = await getUserModel();
    const user = await User.findById(req.user.id).select("favorites").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.favorites || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/favorites — add ad to favorites
router.post("/", requireAuth, async (req, res) => {
  try {
    const { ad_id } = req.body;
    if (!ad_id) return res.status(400).json({ error: "ad_id required" });
    if (!mongoose.Types.ObjectId.isValid(ad_id)) {
      return res.status(400).json({ error: "Invalid ad_id format" });
    }
    const User = await getUserModel();
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favorites: ad_id } },
      { new: true }
    );
    res.status(201).json({ ok: true, ad_id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/favorites/:id — remove ad from favorites
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const adId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: "Invalid id format" });
    }
    const User = await getUserModel();
    await User.findByIdAndUpdate(req.user.id, { $pull: { favorites: adId } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

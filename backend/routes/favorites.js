import { Router } from "express";
import { auth as requireAuth } from "../middleware/auth.js";
import { db, makeId } from "../lib/store.js";

const router = Router();

// Use req.user.id (from JWT) instead of req.user.email (not in JWT)
router.get("/", requireAuth, (req, res) => {
  const userId = req.user.id;
  const favs = db.favorites.filter((f) => f.user_id === userId);
  res.json(favs);
});

router.post("/", requireAuth, (req, res) => {
  const { ad_id } = req.body;
  const userId = req.user.id;
  if (!ad_id) return res.status(400).json({ error: "ad_id required" });
  const exists = db.favorites.find((f) => f.ad_id === ad_id && f.user_id === userId);
  if (exists) return res.json(exists);
  const fav = { id: makeId(), ad_id, user_id: userId, created_at: new Date().toISOString() };
  db.favorites.push(fav);
  res.status(201).json(fav);
});

router.delete("/:id", requireAuth, (req, res) => {
  const userId = req.user.id;
  const idx = db.favorites.findIndex((f) => f.id === req.params.id && f.user_id === userId);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.favorites.splice(idx, 1);
  res.json({ ok: true });
});

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { countryLock } from "../middleware/countryLock.js";
import { db, makeId } from "../lib/store.js";

const router = Router();

router.get("/", requireAuth, countryLock, (req, res) => {
  const favs = db.favorites.filter((f) => f.user_email === req.user.email);
  res.json(favs);
});

router.post("/", requireAuth, countryLock, (req, res) => {
  const { ad_id } = req.body;
  if (!ad_id) return res.status(400).json({ error: "ad_id required" });
  const exists = db.favorites.find((f) => f.ad_id === ad_id && f.user_email === req.user.email);
  if (exists) return res.json(exists);
  const fav = { id: makeId(), ad_id, user_email: req.user.email, created_at: new Date().toISOString() };
  db.favorites.push(fav);
  res.status(201).json(fav);
});

router.delete("/:id", requireAuth, countryLock, (req, res) => {
  const idx = db.favorites.findIndex((f) => f.id === req.params.id && f.user_email === req.user.email);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.favorites.splice(idx, 1);
  res.json({ ok: true });
});

export default router;

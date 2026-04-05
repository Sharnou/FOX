import { Router } from "express";
import { auth as requireAuth } from "../middleware/auth.js";
import { db, makeId } from "../lib/store.js";

const router = Router();

// Use req.user.id (from JWT) instead of req.user.id (not in JWT)
router.post("/", requireAuth, (req, res) => {
  const { seller_id, rating, comment } = req.body;
  const userId = req.user.id;
  if (!seller_id || !rating) return res.status(400).json({ error: "seller_id and rating required" });
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "Rating must be 1-5" });
  }
  if (!db.seller_reviews) db.seller_reviews = [];
  const review = {
    id: makeId(),
    seller_id,
    rating: ratingNum,
    comment: comment || "",
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  db.seller_reviews.push(review);
  res.status(201).json(review);
});

router.get("/seller/:id/reviews", (req, res) => {
  if (!db.seller_reviews) db.seller_reviews = [];
  const items = db.seller_reviews.filter((r) => r.seller_id === req.params.id);
  res.json(items);
});

export default router;

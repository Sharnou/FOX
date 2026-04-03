import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { countryLock } from "../middleware/countryLock.js";
import { db, makeId } from "../lib/store.js";

const router = Router();

router.post("/", requireAuth, countryLock, (req, res) => {
  const { seller_id, rating, comment } = req.body;
  if (!seller_id || !rating) return res.status(400).json({ error: "seller_id and rating required" });
  const review = {
    id: makeId(),
    seller_id,
    rating,
    comment: comment || "",
    user_email: req.user.email,
    created_at: new Date().toISOString(),
  };
  db.seller_reviews.push(review);
  res.status(201).json(review);
});

router.get("/seller/:id/reviews", (req, res) => {
  const items = db.seller_reviews.filter((r) => r.seller_id === req.params.id);
  res.json(items);
});

export default router;

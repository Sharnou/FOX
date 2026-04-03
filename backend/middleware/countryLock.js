import { PLATFORM_COUNTRY } from "../lib/settings.js";

export function countryLock(req, res, next) {
  if (req.user?.country && req.user.country !== PLATFORM_COUNTRY) {
    return res.status(403).json({ error: "Marketplace restricted to platform country" });
  }
  next();
}

export default countryLock;

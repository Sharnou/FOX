import { NextResponse } from "next/server";

let Ad;
async function getAdModel() {
  if (Ad) return Ad;
  const mongoose = await import("mongoose");
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI not set");
  if (mongoose.default.connection.readyState === 0) {
    await mongoose.default.connect(MONGODB_URI);
  }
  const adSchema = new mongoose.default.Schema({}, { strict: false });
  Ad = mongoose.default.models.Ad || mongoose.default.model("Ad", adSchema, "ads");
  return Ad;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    if (!category || !city) {
      return NextResponse.json(null, { status: 400 });
    }
    const AdModel = await getAdModel();
    const ads = await AdModel.find({
      category: { $regex: new RegExp(category, "i") },
      city: { $regex: new RegExp(city, "i") },
      status: "active",
      price: { $gt: 0 },
    })
      .select("price currency")
      .limit(150)
      .lean();

    if (!ads || ads.length < 2) return NextResponse.json(null);

    const prices = ads.map((a) => Number(a.price)).filter((p) => p > 0);
    if (prices.length < 2) return NextResponse.json(null);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const currency = ads[0]?.currency || "ج.م";

    return NextResponse.json({ min, avg, max, count: prices.length, currency });
  } catch (err) {
    console.error("[price-suggest]", err);
    return NextResponse.json(null, { status: 500 });
  }
}

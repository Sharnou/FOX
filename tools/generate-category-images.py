#!/usr/bin/env python3
"""
Generate ALL 76 realistic category images for FOX marketplace using DALL-E 3.
Run this LOCALLY (not in a sandboxed environment).

Usage:
    pip install openai pillow aiohttp
    python tools/generate-category-images.py

Images are saved to: frontend/public/category-images/
"""

import asyncio
import aiohttp
import os
from pathlib import Path
from io import BytesIO
from PIL import Image

API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_KEY_HERE")
OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "category-images"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "accessories": "Close-up realistic photography of fashion accessories: elegant watch, sunglasses, and jewelry on white marble surface. Professional product photography, no text.",
    "animals": "Realistic photography of cute domestic pets including a dog and cat together in a cozy home setting, warm natural lighting.",
    "apartments-rent": "Modern apartment interior, bright open-plan living room with contemporary furniture, large windows, natural daylight. Realistic real estate photography.",
    "apartments-sale": "Stylish modern apartment living room with elegant furniture, warm lighting, realistic interior photography for real estate listing.",
    "bedroom": "Elegant bedroom with king bed, modern furniture, soft lighting. Realistic interior photography in a showroom.",
    "bicycles": "Modern bicycle leaning against a wall outdoors, realistic product photography, natural setting.",
    "birds": "Colorful parrot perched on branch in natural setting, realistic bird photography, vibrant feathers.",
    "books": "Stack of books on a wooden desk with reading glasses, warm cozy lighting, realistic photography.",
    "cameras": "Professional DSLR camera with multiple lenses arranged on dark surface, realistic product photography.",
    "car-accessories": "Car interior accessories on clean surface, realistic automotive product photography.",
    "car-parts": "Automotive engine spare parts on workshop bench, realistic industrial photography.",
    "cars": "Sleek modern SUV car on a road with city background, realistic automotive photography, cinematic lighting.",
    "cats": "Adorable domestic cat portrait with striking eyes, realistic pet photography, shallow depth of field.",
    "clothes": "Stylish clothing hanging on rack in modern boutique store, realistic fashion photography.",
    "collectibles": "Vintage collectible figurines displayed on wooden shelf, realistic photography.",
    "cosmetics": "Luxury skincare and makeup products on white marble surface, realistic beauty product photography.",
    "courses": "Student studying at laptop with open notebooks, bright study environment, realistic photography.",
    "decor": "Modern home decor items, elegant vases and art pieces on minimalist shelf, realistic interior photography.",
    "design": "Graphic designer at modern workstation with large monitor, realistic photography.",
    "dogs": "Friendly golden retriever dog outdoors in park, realistic pet photography, natural lighting.",
    "dolls": "Children classic dolls arranged in display, realistic toy photography.",
    "education": "Modern classroom with books and educational materials, realistic photography.",
    "educational-toys": "Colorful wooden educational toys for toddlers on white background, realistic product photography.",
    "electronics": "Latest smartphone, laptop and wireless earbuds on dark surface, realistic tech product photography.",
    "engineering-jobs": "Civil engineer reviewing blueprints at construction site wearing hard hat, realistic professional photography.",
    "fish": "Colorful tropical fish swimming in clear aquarium, realistic aquarium photography.",
    "fishing": "Fisherman at golden hour casting line into calm lake, realistic outdoor photography, beautiful reflection.",
    "food": "Gourmet restaurant meal on white plate with garnish, realistic food photography, appetizing.",
    "football": "Soccer ball on green stadium grass with goal post in background, realistic sports photography.",
    "furniture": "Modern living room furniture set in bright showroom, realistic interior photography.",
    "gifts": "Elegantly wrapped gift boxes with ribbons on white background, realistic product photography.",
    "groceries": "Fresh colorful vegetables and fruits at vibrant market stall, realistic food market photography.",
    "headphones": "Premium wireless over-ear headphones on white surface, realistic audio product photography.",
    "health-beauty": "Clean modern pharmacy interior with organized medicine shelves, realistic healthcare photography.",
    "home-appliances": "Modern home appliances refrigerator and washing machine in bright kitchen, realistic product photography.",
    "homemade-food": "Traditional home-cooked meal in ceramic bowl, warm kitchen background, realistic food photography.",
    "household-tools": "Set of household tools hammer screwdriver and wrench on wooden surface, realistic product photography.",
    "it-jobs": "Software developer coding at modern workstation with multiple monitors showing code, realistic photography.",
    "jobs": "Professional business people in modern bright office, realistic corporate photography.",
    "kids-bikes": "Colorful children bicycle with training wheels in park, realistic product photography.",
    "kids-clothes": "Children clothing items neatly displayed on hangers, realistic fashion photography.",
    "kitchen-furniture": "Modern kitchen with elegant cabinets and marble countertop, realistic interior photography.",
    "land": "Green open plot of land at sunset, realistic real estate photography.",
    "laptops": "Modern slim laptop open on clean wooden desk with coffee cup, realistic product photography.",
    "living-room": "Elegant modern living room with sofa in showroom, realistic interior photography.",
    "maintenance": "Professional worker doing home maintenance with power drill, realistic construction photography.",
    "medical-devices": "Stethoscope and blood pressure monitor on white surface, realistic healthcare photography.",
    "medical-jobs": "Doctor in white coat examining patient in modern clinic, realistic medical photography.",
    "mens-clothes": "Men smart casual outfit on mannequin in boutique, realistic fashion photography.",
    "mobile-phones": "Latest smartphone with vivid screen on white surface, realistic product photography.",
    "monitors": "Ultra-wide curved computer monitor on modern desk, realistic product photography.",
    "motorcycles": "Sleek modern sports motorcycle on road, realistic automotive photography, dramatic angle.",
    "moving": "Moving cardboard boxes stacked neatly, realistic photography.",
    "novels": "Open novel book with coffee on wooden table, realistic cozy photography.",
    "office-furniture": "Modern ergonomic office desk and chair setup, realistic interior photography.",
    "offices": "Empty modern office space with city view through large windows, realistic architectural photography.",
    "other": "Assorted marketplace items at colorful bazaar, realistic photography.",
    "passenger-cars": "Modern passenger sedan car on city street, realistic automotive photography.",
    "perfumes": "Luxury perfume bottles on glossy black surface with soft lighting, realistic product photography.",
    "pet-supplies": "Pet food bowls toys and leash on white background, realistic product photography.",
    "plumbing-electrical": "Professional plumber fixing pipes under sink, realistic tradesperson photography.",
    "real-estate": "Modern residential apartment building exterior with blue sky, realistic real estate photography.",
    "sales-jobs": "Friendly salesperson assisting customer in retail store, realistic professional photography.",
    "services": "Professional service worker in uniform smiling at camera, realistic business photography.",
    "shoes": "Collection of stylish shoes and sneakers displayed on shelf, realistic fashion product photography.",
    "sports": "Various sports equipment gym weights and balls, realistic sports photography.",
    "sports-equipment": "Gym dumbbells and fitness equipment on rubber floor, realistic product photography.",
    "sportswear": "Athletic sportswear outfit on mannequin in sports store, realistic fashion photography.",
    "stationery": "Premium stationery pens notebooks and planner on clean desk, realistic product photography.",
    "supplements": "Sports nutrition protein powder and vitamin bottles, realistic product photography.",
    "sweets": "Assorted pastries and sweets on elegant display tray, realistic food photography.",
    "tablets": "Modern tablet with stylus on white surface, realistic product photography.",
    "teaching-jobs": "Teacher at whiteboard engaging with students in classroom, realistic education photography.",
    "textbooks": "Stack of colorful academic textbooks, realistic photography.",
    "toys": "Colorful children toys collection spread on floor, realistic product photography.",
    "video-games": "Gaming console with controllers and game cases, realistic product photography.",
    "villas": "Luxury villa exterior with swimming pool and lush garden, realistic real estate photography.",
    "womens-clothes": "Elegant women fashion clothing on display rack in boutique, realistic fashion photography.",
}

SYSTEM_NOTE = "Photorealistic photography only. No illustrations, no cartoons, no graphics, no text overlay, no watermarks. Real photograph style."


async def generate_and_save(session, slug, prompt, semaphore):
    async with semaphore:
        out = OUTPUT_DIR / f"{slug}.jpg"
        if out.exists() and out.stat().st_size > 80_000:
            print(f"  SKIP {slug} (already exists, {out.stat().st_size//1024}KB)")
            return True

        headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
        body = {
            "model": "dall-e-3",
            "prompt": f"{SYSTEM_NOTE} {prompt}",
            "n": 1,
            "size": "1792x1024",
            "quality": "standard",
            "response_format": "url",
        }

        try:
            async with session.post(
                "https://api.openai.com/v1/images/generations",
                headers=headers, json=body,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as r:
                if r.status != 200:
                    print(f"  FAIL {slug}: {r.status} {await r.text()[:150]}")
                    return False
                url = (await r.json())["data"][0]["url"]

            async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as r:
                data = await r.read()

            img = Image.open(BytesIO(data)).convert("RGB").resize((1200, 600), Image.LANCZOS)
            img.save(out, "JPEG", quality=85, optimize=True)
            print(f"  OK   {slug} ({out.stat().st_size//1024}KB)")
            return True
        except Exception as e:
            print(f"  ERR  {slug}: {e}")
            return False


async def main():
    if API_KEY == "YOUR_KEY_HERE":
        print("ERROR: Set OPENAI_API_KEY env variable or edit API_KEY in this script")
        return

    print(f"Generating {len(PROMPTS)} images → {OUTPUT_DIR}")
    sem = asyncio.Semaphore(3)
    async with aiohttp.ClientSession() as s:
        results = await asyncio.gather(*[generate_and_save(s, k, v, sem) for k, v in PROMPTS.items()])

    ok = sum(results)
    print(f"\nDone: {ok}/{len(PROMPTS)} images generated.")
    if ok < len(PROMPTS):
        print("Re-run to retry failures.")
    else:
        print("All done! Run: git add -A && git commit -m 'feat: realistic DALL-E 3 category images' && git push")


if __name__ == "__main__":
    asyncio.run(main())

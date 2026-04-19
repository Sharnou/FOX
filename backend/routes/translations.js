import express from 'express';
import OpenAI from 'openai';
import TranslationCache from '../models/TranslationCache.js';

const router = express.Router();

// Current translation schema version — bump to invalidate all cached translations
const TRANSLATION_VERSION = 1;

// Languages already 100% covered in the static bundle — skip OpenAI for these
const STATIC_LANGS = new Set(['ar', 'en', 'fr', 'de', 'es', 'tr', 'ru', 'zh']);

// Language names for prompting OpenAI
const LANG_NAMES = {
  nl: 'Dutch', ja: 'Japanese', ko: 'Korean', it: 'Italian', pt: 'Portuguese',
  pl: 'Polish', uk: 'Ukrainian', ro: 'Romanian', el: 'Greek', he: 'Hebrew',
  fa: 'Persian (Farsi)', ur: 'Urdu', hi: 'Hindi', bn: 'Bengali', id: 'Indonesian',
  ms: 'Malay', th: 'Thai', vi: 'Vietnamese', sw: 'Swahili', am: 'Amharic',
  so: 'Somali', az: 'Azerbaijani', ka: 'Georgian', hy: 'Armenian', sr: 'Serbian',
  hr: 'Croatian', bg: 'Bulgarian', cs: 'Czech', sk: 'Slovak', hu: 'Hungarian',
  fi: 'Finnish', sv: 'Swedish', da: 'Danish', no: 'Norwegian', is: 'Icelandic',
  lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian', sl: 'Slovenian', mk: 'Macedonian',
  sq: 'Albanian', bs: 'Bosnian', me: 'Montenegrin', mt: 'Maltese', cy: 'Welsh',
  eu: 'Basque', ca: 'Catalan', gl: 'Galician', af: 'Afrikaans', zu: 'Zulu',
  xh: 'Xhosa', yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', mg: 'Malagasy',
  si: 'Sinhala', my: 'Burmese', km: 'Khmer', lo: 'Lao', mn: 'Mongolian',
  ne: 'Nepali', pa: 'Punjabi', gu: 'Gujarati', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', tl: 'Filipino', jv: 'Javanese',
};

// GET /api/translations/:lang
router.get('/:lang', async (req, res) => {
  const { lang } = req.params;

  // Validate lang code
  if (!/^[a-z]{2,5}$/.test(lang)) {
    return res.status(400).json({ error: 'Invalid language code' });
  }

  // Static languages — tell frontend to use bundle
  if (STATIC_LANGS.has(lang)) {
    return res.json({ lang, cached: true, static: true, translations: null });
  }

  try {
    // Check MongoDB cache first
    const cached = await TranslationCache.findOne({ lang, version: TRANSLATION_VERSION });
    if (cached) {
      return res.json({ lang, cached: true, translations: cached.translations });
    }

    // Not cached — generate via OpenAI
    const langName = LANG_NAMES[lang];
    if (!langName) {
      return res.json({ lang, cached: false, translations: null, error: 'Unknown language' });
    }

    console.log(`[Translations] Generating ${langName} (${lang}) via OpenAI...`);

    const englishKeys = getEnglishTranslations();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are a professional translator for a marketplace app called XTOX (an Egyptian online marketplace like OLX).
Translate the following JSON object values from English to ${langName}.
Rules:
- Translate ONLY the values, never the keys
- Keep translations concise (UI labels, buttons, short phrases)
- For marketplace/commerce terms, use natural ${langName} equivalents
- For Arabic names (Cairo, Egypt, etc.) use the standard ${langName} name
- Keep emojis as-is
- Keep placeholders like {name} or %s as-is
- Return ONLY valid JSON, no explanation, no markdown, no code blocks
- Include ALL ${Object.keys(englishKeys).length} keys — do not skip any

English source:
${JSON.stringify(englishKeys, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    });

    let translated;
    try {
      translated = JSON.parse(completion.choices[0].message.content);
    } catch (parseErr) {
      console.error(`[Translations] JSON parse error for ${lang}:`, parseErr);
      return res.json({ lang, cached: false, translations: null, error: 'Parse error' });
    }

    const keyCount = Object.keys(translated).length;
    const expectedCount = Object.keys(englishKeys).length;
    console.log(`[Translations] Generated ${keyCount}/${expectedCount} keys for ${langName}`);

    // Fill in missing keys with English fallback
    for (const [key, val] of Object.entries(englishKeys)) {
      if (!translated[key]) translated[key] = val;
    }

    // Cache in MongoDB (upsert)
    await TranslationCache.findOneAndUpdate(
      { lang },
      { lang, translations: translated, generatedAt: new Date(), version: TRANSLATION_VERSION },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[Translations] ${langName} cached successfully`);
    res.json({ lang, cached: false, generated: true, translations: translated });

  } catch (err) {
    console.error(`[Translations] Error for ${lang}:`, err.message);
    res.json({ lang, cached: false, translations: null, error: err.message });
  }
});

// POST /api/translations/:lang/invalidate — force regeneration
router.post('/:lang/invalidate', async (req, res) => {
  try {
    await TranslationCache.deleteOne({ lang: req.params.lang });
    res.json({ success: true, message: `Cache for ${req.params.lang} invalidated` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/translations — list all cached languages
router.get('/', async (req, res) => {
  try {
    const cached = await TranslationCache.find({}, { lang: 1, generatedAt: 1, version: 1 }).lean();
    res.json({ cached, static: Array.from(STATIC_LANGS) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ENGLISH SOURCE TRANSLATIONS
// UPDATE THIS when you add new translation keys.
// ============================================================
function getEnglishTranslations() {
  return {
    // Navigation
    nav_home: 'Home', nav_sell: 'Post Ad', nav_chat: 'Messages',
    nav_profile: 'My Account', nav_login: 'Sign In', nav_logout: 'Sign Out',
    nav_admin: 'Dashboard', nav_search_placeholder: 'Search ads...',
    nav_nearby: 'Nearby', nav_swipe: 'Browse', nav_promote: 'Promote',
    nav_saved: 'Saved', nav_winner: 'Honor Roll', nav_privacy: 'Privacy',
    nav_terms: 'Terms', nav_about: 'About',

    // Auth / Login
    login_title: 'Sign In', login_tab_whatsapp: 'WhatsApp',
    login_tab_email: 'Email', login_tab_google: 'Google',
    login_phone_label: 'Phone Number', login_phone_placeholder: 'e.g. +201234567890',
    login_email_label: 'Email Address', login_email_placeholder: 'example@email.com',
    login_send_otp: 'Send Code', login_enter_otp: 'Enter Code',
    login_otp_placeholder: 'Code sent to you', login_verify: 'Verify',
    login_continue_google: 'Continue with Google', login_back: 'Back',
    login_sending: 'Sending...', login_verifying: 'Verifying...',
    login_otp_sent: 'Code sent', login_error_invalid_otp: 'Invalid code',
    login_error_try_again: 'Something went wrong, try again',
    login_name_label: 'Name (for new accounts)', login_name_placeholder: 'Your full name',

    // Homepage
    home_hero_title: 'XTOX Marketplace', home_hero_subtitle: 'Buy and sell safely in Egypt',
    home_search_btn: 'Search', home_categories: 'Categories',
    home_latest_ads: 'Latest Ads', home_see_all: 'See All',
    home_no_ads: 'No ads found', home_loading: 'Loading...',
    home_sell_now: 'Post Your Ad Now', home_featured: 'Featured', home_free: 'Free',

    // Ad card
    ad_ago: 'ago', ad_condition_new: 'New', ad_condition_used: 'Used',
    ad_condition_like_new: 'Like New', ad_price: 'Price', ad_currency: 'EGP',
    ad_city: 'City', ad_save: 'Save', ad_saved: 'Saved', ad_share: 'Share',
    ad_contact: 'Contact', ad_report: 'Report', ad_edit: 'Edit',
    ad_delete: 'Delete', ad_promote: 'Promote Ad',

    // Sell / Create ad
    sell_title: 'Post New Ad', sell_category: 'Category', sell_subcategory: 'Subcategory',
    sell_ad_title: 'Ad Title', sell_description: 'Description', sell_price: 'Price (EGP)',
    sell_condition: 'Condition', sell_city: 'City', sell_photos: 'Photos',
    sell_add_photo: 'Add Photo', sell_submit: 'Post Ad', sell_submitting: 'Posting...',
    sell_success: 'Ad posted successfully',

    // Profile
    profile_edit: 'Edit Profile', profile_save: 'Save', profile_cancel: 'Cancel',
    profile_name: 'Name', profile_phone: 'Phone', profile_country: 'Country',
    profile_country_locked: '🔒 Egypt (EG) — Cannot be changed',
    profile_my_ads: 'My Ads', profile_reviews: 'Reviews', profile_points: 'Points',
    profile_tier: 'Tier', profile_join_date: 'Joined',

    // Errors
    err_generic: 'Something went wrong, please try again',
    err_network: 'Connection error', err_not_found: 'Page not found',
    err_unauthorized: 'Please sign in first',
    err_country_locked: 'This service is available in Egypt only',
    err_loading: 'Error loading', err_try_again: 'Try again', err_go_home: '← Home',

    // Buttons
    btn_submit: 'Submit', btn_cancel: 'Cancel', btn_confirm: 'Confirm',
    btn_close: 'Close', btn_back: 'Back', btn_next: 'Next', btn_save: 'Save',
    btn_delete: 'Delete', btn_edit: 'Edit', btn_load_more: 'Load More',
    btn_retry: 'Try Again', btn_clear_cache: '🔄 Clear Cache & Reload',

    // Chat
    chat_title: 'Messages', chat_placeholder: 'Type a message...', chat_send: 'Send',
    chat_no_messages: 'No messages yet', chat_new: 'New Chat',

    // Winner / Honor Roll
    winner_title: 'Honor Roll', winner_subtitle: 'Top sellers this month',
    winner_rank: 'Rank', winner_name: 'Name', winner_points: 'Points',
    winner_history: 'History', winner_month: 'Month',

    // Admin
    admin_title: 'Dashboard', admin_users: 'Users', admin_ads: 'Ads',
    admin_reports: 'Reports', admin_stats: 'Statistics',

    // Country lock
    country_locked_msg: 'This app is currently available in Egypt only',

    // Nearby
    nearby_title: 'Nearby Ads', nearby_enable_location: 'Enable Location',
    nearby_radius: 'Search radius (km)',

    // Promote
    promote_title: 'Promote Ad', promote_select_plan: 'Select Plan',
    promote_days: 'days', promote_pay: 'Pay Now',

    // AI
    ai_title: 'AI Assistant', ai_placeholder: 'Ask your AI assistant...',
    ai_send: 'Send', ai_thinking: 'Thinking...',

    // Categories
    cat_all: 'All Ads', cat_electronics: 'Electronics', cat_mobile_phones: 'Phones & Tablets',
    cat_computers: 'Computers & Devices', cat_cars: 'Cars', cat_vehicles: 'Vehicles',
    cat_real_estate: 'Real Estate', cat_furniture: 'Furniture & Home',
    cat_clothing: 'Clothing & Fashion', cat_jobs: 'Jobs',
    cat_services: 'Services', cat_animals: 'Animals',
    cat_sports: 'Sports & Hobbies', cat_kids: 'Kids & Toys',
    cat_tools: 'Tools & Equipment', cat_food: 'Fast Food', cat_fast_food: 'Fast Food',
    cat_books: 'Books & Education', cat_beauty: 'Beauty & Care',
    cat_supermarket: 'Supermarket', cat_pharmacy: 'Pharmacy', cat_fashion: 'Fashion',
    cat_other: 'Other',

    // Subcategories
    subcat_smartphones: 'Smartphones', subcat_tablets: 'Tablets',
    subcat_laptops: 'Laptops', subcat_desktops: 'Desktop PCs',
    subcat_tvs: 'TVs', subcat_cameras: 'Cameras',
    subcat_accessories: 'Accessories', subcat_audio: 'Audio',
    subcat_gaming: 'Gaming', subcat_printers: 'Printers & Scanners',
    subcat_networking: 'Networking', subcat_cars_sale: 'Cars for Sale',
    subcat_cars_rent: 'Cars for Rent', subcat_auto_parts: 'Auto Parts',
    subcat_motorcycles: 'Motorcycles', subcat_trucks: 'Trucks',
    subcat_boats: 'Boats', subcat_apartments_sale: 'Apartments for Sale',
    subcat_apartments_rent: 'Apartments for Rent', subcat_villas: 'Villas',
    subcat_land: 'Land', subcat_commercial: 'Commercial',
    subcat_rooms: 'Rooms for Rent', subcat_mens: "Men's Clothing",
    subcat_womens: "Women's Clothing", subcat_kids_clothing: "Kids' Clothing",
    subcat_shoes: 'Shoes', subcat_bags: 'Bags', subcat_watches: 'Watches',
    subcat_jewelry: 'Jewelry', subcat_bedroom: 'Bedrooms',
    subcat_living_room: 'Living Rooms', subcat_kitchen: 'Kitchens',
    subcat_office_furniture: 'Office Furniture', subcat_appliances: 'Home Appliances',
    subcat_decor: 'Decor', subcat_full_time: 'Full Time',
    subcat_part_time: 'Part Time', subcat_freelance: 'Freelance',
    subcat_internship: 'Internship', subcat_remote: 'Remote',
    subcat_cats: 'Cats', subcat_dogs: 'Dogs', subcat_birds: 'Birds',
    subcat_fish: 'Fish', subcat_pets_acc: 'Pet Accessories',

    // Cities (Egyptian)
    city_cairo: 'Cairo', city_alexandria: 'Alexandria', city_giza: 'Giza',
    city_luxor: 'Luxor', city_aswan: 'Aswan', city_mansoura: 'Mansoura',
    city_tanta: 'Tanta', city_port_said: 'Port Said', city_suez: 'Suez',
    city_ismailia: 'Ismailia', city_faiyum: 'Faiyum', city_zagazig: 'Zagazig',
    city_sharm: 'Sharm El-Sheikh', city_hurghada: 'Hurghada',
    city_damietta: 'Damietta', city_sohag: 'Sohag', city_other: 'Other',

    // Conditions
    cond_new: 'New', cond_used: 'Used', cond_like_new: 'Like New',
    cond_excellent: 'Excellent', cond_good: 'Good', cond_fair: 'Fair',
    cond_for_parts: 'For Parts',

    // Tiers
    tier_bronze: 'Bronze', tier_silver: 'Silver', tier_gold: 'Gold',
    tier_platinum: 'Platinum', tier_diamond: 'Diamond',

    // Time
    time_just_now: 'Just now', time_minutes: 'minutes', time_hours: 'hours',
    time_days: 'days', time_weeks: 'weeks', time_months: 'months', time_ago: 'ago',

    // Months
    month_jan: 'January', month_feb: 'February', month_mar: 'March',
    month_apr: 'April', month_may: 'May', month_jun: 'June',
    month_jul: 'July', month_aug: 'August', month_sep: 'September',
    month_oct: 'October', month_nov: 'November', month_dec: 'December',

    // Notifications
    notif_title: 'Notifications', notif_enable: 'Enable Notifications',
    notif_new_message: 'New message', notif_new_offer: 'New offer',
    notif_ad_sold: 'Ad sold', notif_no_notifs: 'No notifications yet',

    // Offers
    offer_title: 'Make an Offer', offer_amount: 'Offer amount (EGP)',
    offer_send: 'Send Offer', offer_accept: 'Accept', offer_reject: 'Decline',
    offer_pending: 'Pending', offer_accepted: 'Accepted', offer_rejected: 'Declined',

    // Report
    report_title: 'Report Ad', report_spam: 'Spam',
    report_fraud: 'Fraud / Scam', report_wrong_cat: 'Wrong category',
    report_duplicate: 'Duplicate', report_offensive: 'Offensive content',
    report_other: 'Other', report_submit: 'Submit Report',
    report_thanks: 'Thank you for your report',

    // Install PWA
    install_title: 'Install XTOX App', install_subtitle: 'Fast access from your home screen',
    install_btn: 'Install', install_later: 'Maybe later',

    // Search
    search_title: 'Search', search_results: 'results',
    search_no_results: 'No results found', search_filter: 'Filter',
    search_sort: 'Sort', search_sort_newest: 'Newest first',
    search_sort_price_low: 'Price: Low to High', search_sort_price_high: 'Price: High to Low',

    // Swipe
    swipe_like: 'Save', swipe_skip: 'Skip', swipe_no_more: 'No more ads',
    swipe_refresh: 'Refresh',

    // Voice call
    call_connecting: 'Connecting...', call_calling: 'Calling...',
    call_in_call: 'In call', call_ended: 'Call ended',
    call_end: 'End Call', call_mute: 'Mute', call_unmute: 'Unmute',
    call_speaker: 'Speaker', call_failed: 'Call failed',
  };
}

export default router;

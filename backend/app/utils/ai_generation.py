"""
AI generation utilities for REACHLO campaign generation pipeline.

Architecture:
  - Business Analysis is computed ONCE at registration and cached in the DB.
  - Campaign generation uses ONE Gemini API call that reasons internally and returns
    a structured JSON containing: business_analysis, marketing_strategy, buyer_psychology,
    creative_brief, campaign content, and an optimized image_prompt.
  - The image_prompt is enriched with quality anchors before being sent to the image API.

Image Generation Priority (generate_campaign_image):
  1. Cloudflare Workers AI (FLUX.1-schnell) — primary, free 10K neurons/day, fast edge inference
  2. Ideogram v2 API                        — secondary, best text rendering, paid
  3. Pollinations AI (FLUX)                 — free fallback, always available

Key functions:
  detect_category()                  — Gemini: classify business → category + sub_category
  analyze_business()                 — Gemini: deep business analysis cached in DB
  generate_full_campaign()           — Single Gemini call: all reasoning + content + image_prompt
  build_flux_prompt()                — Programmatic: append quality/style anchors (for FLUX)
  build_cloudflare_prompt()          — Programmatic: build Cloudflare FLUX-optimized prompt
  build_ideogram_prompt()            — Programmatic: build Ideogram-native prompt
  run_hallucination_guard()          — Pure Python text scan: flag suspicious content
  generate_image_with_cloudflare()   — Cloudflare Workers AI: FLUX.1-schnell inference
  generate_campaign_image()          — Full generation pipeline with priority fallback
  compose_campaign_ad_thumbnail()    — Pillow: compose final ad poster with text overlay

Naming convention:
  business_description  = what the seller's BUSINESS provides (businesses.business_description)
  campaign_description  = the per-CAMPAIGN marketing copy (campaigns.description)
  These are completely different fields and must not be confused.
"""

import os
import io
import re
import json
import uuid
import random
import requests
from datetime import datetime
import urllib.parse
from app.config import settings

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    Image = ImageDraw = ImageFont = ImageFilter = None


# ---------------------------------------------------------------------------
# WebP optimization helper — shared by all image-generation paths
# ---------------------------------------------------------------------------

MAX_WEBP_WIDTH = 1024
MAX_WEBP_HEIGHT = 768
WEBP_QUALITY = 82


def _optimize_to_webp(raw_bytes: bytes, save_path: str) -> str:
    """
    Convert raw image bytes to an optimized WebP file.

    - Resizes only when the image exceeds MAX_WEBP_WIDTH×MAX_WEBP_HEIGHT,
      preserving the original aspect ratio.
    - Saves with WebP quality=82 and optimize=True.
    - Returns the final file path (with .webp extension).
    - On failure, falls back to saving the raw bytes unchanged so the
      campaign generation pipeline never crashes due to image conversion.
    """
    # Ensure .webp extension regardless of what the caller specified
    webp_path = os.path.splitext(save_path)[0] + ".webp"

    if Image is None:
        # Pillow not available — save raw bytes with original extension
        with open(save_path, "wb") as f:
            f.write(raw_bytes)
        print(f"[WARN] Pillow not available, saved raw image: {save_path} ({len(raw_bytes) // 1024} KB)")
        return save_path

    try:
        img = Image.open(io.BytesIO(raw_bytes))
        original_size = len(raw_bytes)

        # Convert palette / RGBA → RGB for WebP compatibility
        if img.mode in ("P", "LA"):
            img = img.convert("RGBA")
        if img.mode == "RGBA":
            # Composite on white background to drop alpha
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize only when necessary (preserve aspect ratio)
        w, h = img.size
        if w > MAX_WEBP_WIDTH or h > MAX_WEBP_HEIGHT:
            img.thumbnail((MAX_WEBP_WIDTH, MAX_WEBP_HEIGHT), Image.LANCZOS)

        img.save(webp_path, "WEBP", quality=WEBP_QUALITY, optimize=True)
        webp_size = os.path.getsize(webp_path)
        print(
            f"[INFO] WebP optimized: {webp_path} "
            f"({original_size // 1024} KB -> {webp_size // 1024} KB, "
            f"{img.size[0]}x{img.size[1]})"
        )
        return webp_path

    except Exception as e:
        print(f"[WARN] WebP conversion failed ({e}), saving raw image as fallback")
        with open(save_path, "wb") as f:
            f.write(raw_bytes)
        return save_path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 900  # 4:3 — matches the campaign card hero image aspect ratio

# Category list for Gemini classification (used at registration only)
CATEGORY_LIST = [
    "IT & Technology Services",
    "Education & Training",
    "Health & Wellness",
    "Beauty & Personal Care",
    "Food & Restaurants",
    "Events & Entertainment",
    "Home Services",
    "Finance & Accounting",
    "Legal Services",
    "Retail & Shopping",
    "Logistics & Transport",
    "Real Estate",
    "Manufacturing",
    "Media & Advertising",
    "Other",
]

# ---------------------------------------------------------------------------
# Visual quality constants — ad creative design approach
# PHILOSOPHY SHIFT: We generate social media AD POSTER CREATIVES, not cinematic photos.
# Clean backgrounds + isolated subjects = reads in 1 second on mobile feed.
# ---------------------------------------------------------------------------

# Quality anchors target premium 3D illustration / vector aesthetic
FLUX_QUALITY_ANCHORS = (
    "Premium commercial product photography, clean minimalistic still-life, soft natural studio lighting, "
    "highly elegant and uncluttered, high-end editorial look, sharp photorealistic details, "
    "clean modern backdrop, beautiful textures, 4:3 aspect ratio, "
    "NO humans, NO people"
)

# Negative prompt — block everything that creates generic stock-photo feel AND humans
FLUX_NEGATIVE_PROMPT = (
    "human, person, people, man, woman, child, face, hands, portrait, body, character, model, silhouette, "
    "glowing, neon, floating objects, sparks, cyber, chaotic, messy, cluttered, abstract geometry, 3D render, cartoon, lottie, "
    "readable text, gibberish text, words, letters, numbers, watermark, logo, brand name, price tag, "
    "UI overlay, messy background, low quality, blurry, pixelated, out of focus"
)

# ---------------------------------------------------------------------------
# Sub-category AD CREATIVE layout templates (two-tier lookup)
# ARCHITECTURE CHANGE: These are now AD POSTER LAYOUT TEMPLATES, not scene descriptions.
# Each entry specifies: background gradient + subject description + composition + style tag.
# This directly maps to how real Instagram/Meta/LinkedIn ad creatives are designed.
#
# Lookup: SUB_CATEGORY_VISUAL_ARCHETYPES[category][sub_category]
#       → falls back to SUB_CATEGORY_VISUAL_ARCHETYPES[category]["_default"]
#       → falls back to "Other" _default
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Category key normalizer — maps DB values to archetype dict keys
# DB stores: "IT & Technology Services", "Education & Training", "Health & Wellness"
# Archetype dict uses: "IT & Technology Services", "Education & Training", etc.
# Keys here are kept identical to CATEGORY_LIST values so the lookup always works.
# ---------------------------------------------------------------------------

SUB_CATEGORY_VISUAL_ARCHETYPES: dict[str, dict[str, str]] = {

    # ── IT & Technology Services ──────────────────────────────────────────
    "IT & Technology Services": {
        "Website Development": (
            "a sleek modern laptop open on a clean wooden desk, displaying a glowing wireframe UI, "
            "dark navy blue fading to deep charcoal gradient background, "
            "soft natural window light, right area clean for text overlay, "
            "premium commercial tech photography, modern brand poster"
        ),
        "Mobile App Development": (
            "a premium smartphone resting on a minimalist slate surface, screen glowing softly, "
            "deep tech blue gradient fading to lighter blue-white at bottom, "
            "subject center frame, clean architectural background, "
            "premium product photography, tech startup poster"
        ),
        "UI/UX Design": (
            "a sleek tablet with a stylus resting next to it, elegant color swatches, "
            "clean light gray to white gradient with soft purple accent, left area clean for text, "
            "soft diffused studio lighting, premium design agency ad poster"
        ),
        "Software Development": (
            "a modern matte black keyboard and a glowing server rack component, "
            "dark charcoal to deep teal gradient background, "
            "cool cinematic low-key studio lighting, premium tech company photography"
        ),
        "Cloud Consulting": (
            "a sleek modern desk setup with a tablet displaying clean data analytics, "
            "clean light corporate gray to soft white gradient background, "
            "soft professional studio lighting, LinkedIn corporate brand advertisement"
        ),
        "Cybersecurity Services": (
            "a sleek metallic padlock resting on a modern glowing server blade, "
            "deep dark navy to near-black gradient with subtle green neon accent, "
            "security brand commercial photography ad poster"
        ),
        "_default": (
            "a sleek modern tech device resting on a minimalist surface, "
            "dark navy blue to charcoal gradient background, "
            "professional premium tech brand photography ad poster"
        ),
    },

    # ── Education & Training ───────────────────────────────────────────────
    "Education & Training": {
        "Spoken English Classes": (
            "a beautiful open notebook with elegant typography, a premium fountain pen, "
            "clean sky blue fading to soft white gradient background, "
            "bright studio lighting, premium IELTS coaching advertisement photography"
        ),
        "UPSC Coaching": (
            "a majestic brass paperweight and a premium fountain pen on an open journal, "
            "warm golden beige fading to soft cream gradient background, "
            "warm golden sidelight, aspirational achievement photography poster"
        ),
        "NEET/JEE Coaching": (
            "a neat stack of modern thick textbooks and a sleek tablet on a clean wooden desk, "
            "deep royal blue fading to clean white gradient background, "
            "bright morning sunlight, premium NEET JEE coaching photography poster"
        ),
        "Coding Bootcamps": (
            "a sleek open laptop showing code snippets next to a modern coffee mug, "
            "dark purple-blue gradient fading to deep charcoal background, "
            "premium tech bootcamp photography ad poster style"
        ),
        "AI Courses": (
            "a modern glowing microchip resting on a sleek glass desk surface, "
            "deep purple fading to soft lavender-white gradient background, "
            "futuristic premium AI education photography ad poster"
        ),
        "_default": (
            "a premium neat stack of modern books, elegant reading glasses resting on top, "
            "clean royal blue to white gradient background, "
            "bright natural lighting, premium education achievement photography poster"
        ),
    },

    # ── Health & Wellness ──────────────────────────────────────────────────
    "Health & Wellness": {
        "Gyms": (
            "a sleek matte black kettlebell resting on a pristine wooden floor, "
            "dark charcoal to near-black gradient background with warm orange rim accent, "
            "dramatic studio lighting, premium fitness brand photography poster"
        ),
        "Fitness Centers": (
            "a sleek insulated water bottle and a fresh folded gym towel, "
            "clean white to bright orange gradient background, "
            "bright energetic natural lighting, lifestyle fitness photography ad"
        ),
        "Yoga Studios": (
            "a neatly rolled premium yoga mat next to a delicate lotus flower, "
            "clean white to soft sage green gradient background, "
            "soft warm natural morning lighting, wellness photography poster"
        ),
        "Personal Trainers": (
            "a premium metal stopwatch resting on a sleek clipboard, "
            "clean white to warm light gray gradient background, "
            "bright professional studio lighting, personal training photography ad"
        ),
        "Nutrition Consultants": (
            "a beautifully arranged fresh vibrant salad bowl on a clean marble surface, "
            "fresh white to vibrant green gradient background, "
            "vibrant lifestyle nutrition photography ad poster"
        ),
        "Physiotherapy Clinics": (
            "a sleek modern foam roller and a pristine folded white towel, "
            "clean white to soft sky blue gradient background, "
            "healthcare brand premium photography ad poster"
        ),
        "_default": (
            "a premium health or fitness object resting beautifully on a clean surface, "
            "clean white to fresh green gradient background, "
            "bright lighting, health brand photography ad poster"
        ),
    },

    # ── Beauty & Personal Care ─────────────────────────────────────────────
    "Beauty & Personal Care": {
        "Salons": (
            "elegant golden salon scissors and a sleek hairdryer on a marble vanity, "
            "soft blush pink fading to warm cream gradient background, "
            "warm flattering beauty lighting, premium salon photography ad poster"
        ),
        "Spas": (
            "smooth black spa stones, glowing candles, and scattered fresh rose petals, "
            "warm amber fading to soft cream gradient background, "
            "dreamlike soft diffused lighting, luxury spa brand photography poster"
        ),
        "Skin Clinics": (
            "a sleek frosted glass serum bottle resting on a pristine white surface, "
            "clean pure white to very soft rose gradient background, "
            "soft beauty lighting, premium dermatology photography ad poster"
        ),
        "Hair Treatments": (
            "a luxurious golden bottle of hair oil and a premium wooden comb, "
            "warm golden to soft cream gradient background, "
            "backlit golden glow effect, haircare brand photography ad poster"
        ),
        "Bridal Makeup": (
            "a stunning ornate bridal jewelry necklace resting on soft silk, "
            "soft gold to warm peach gradient background, "
            "rich warm bridal lighting, luxury bridal advertisement photography poster"
        ),
        "Grooming Packages": (
            "a sleek modern razor and a premium amber grooming oil bottle on dark slate, "
            "dark charcoal fading to deep brown gradient background, "
            "premium barbershop photography ad"
        ),
        "_default": (
            "elegant premium beauty product bottles resting on a clean marble surface, "
            "soft blush pink to warm cream gradient background, "
            "warm beauty lighting, premium beauty photography ad poster"
        ),
    },

    # ── Food & Restaurants ─────────────────────────────────────────────────
    "Food & Restaurants": {
        "Cafes": (
            "a beautifully crafted artisan coffee with perfect latte art in a ceramic cup, "
            "warm cream to soft brown gradient background, "
            "warm golden morning light, cafe food photography ad poster"
        ),
        "Restaurants": (
            "an elegant silver cloche opening slightly to reveal appetizing steam, "
            "deep warm brown to rich amber gradient background, "
            "warm ambient lighting, premium restaurant photography ad poster"
        ),
        "Bakeries": (
            "a perfect golden flaky croissant resting on a wooden board, scattered flour, "
            "soft warm cream to light golden gradient background, "
            "warm morning bakery light, artisan bakery photography ad"
        ),
        "Cloud Kitchens": (
            "a sleek premium food delivery box neatly packed with vibrant fresh ingredients, "
            "clean white to warm cream gradient background, "
            "bright lifestyle lighting, food delivery photography ad poster"
        ),
        "Catering Services": (
            "an elegant silver platter adorned with fresh vibrant culinary garnishes, "
            "deep rich gold to warm amber gradient background, "
            "warm golden event lighting, catering brand photography ad poster"
        ),
        "_default": (
            "a beautifully plated appetizing food dish with rising steam, "
            "warm cream to golden gradient background, "
            "warm golden food photography, food brand ad poster"
        ),
    },

    # ── Events & Entertainment ─────────────────────────────────────────────
    "Events & Entertainment": {
        "Wedding Planners": (
            "elegant golden wedding rings resting on a pristine white silk pillow, "
            "warm deep gold fading to soft cream gradient background, "
            "warm romantic fairy-light glow, luxury wedding photography ad poster"
        ),
        "Event Organizers": (
            "a beautiful elegant table setting with a blank premium invitation card, "
            "deep midnight blue to dark gradient background, "
            "bold dramatic event lighting, professional event photography ad poster"
        ),
        "Photography Services": (
            "a sleek professional camera lens resting on a clean surface, "
            "warm golden to rich amber gradient background, "
            "golden warm natural light, photography brand photography ad poster"
        ),
        "DJ Services": (
            "a premium vinyl record resting on a sleek modern turntable, "
            "deep navy to vibrant purple gradient background with colored light accents, "
            "bold vibrant colored lighting, DJ brand photography ad poster"
        ),
        "Birthday Event Packages": (
            "a beautifully decorated birthday cake with a lit sparkler candle, "
            "warm cream to festive gold gradient background, "
            "warm celebratory lighting, birthday event photography ad poster"
        ),
        "_default": (
            "elegant celebratory champagne glasses or decor on a premium table, "
            "deep gold to warm cream gradient background, "
            "warm dramatic event lighting, events brand photography ad poster"
        ),
    },

    # ── Home Services ──────────────────────────────────────────────────────
    "Home Services": {
        "Cleaning Services": (
            "a set of premium cleaning supplies — gleaming spray bottle and folded microfiber cloth on a marble surface, "
            "clean white to soft sky blue gradient background, "
            "bright natural studio light, home service brand photography ad poster"
        ),
        "Plumbing": (
            "a polished chrome wrench and fresh copper pipe fitting resting on a clean white surface, "
            "clean light gray to white gradient, bright professional studio lighting, "
            "home maintenance brand photography ad poster"
        ),
        "Interior Design": (
        "a stunning luxury modular kitchen with marble countertops, gleaming pendant lights, "
        "and sleek matte-white cabinets, empty beautiful space with no people, "
        "warm cream to rich taupe gradient background, architectural photography, premium interior design ad"
    ),
    "Cleaning Services": (
        "a spotlessly clean bright modern living room with gleaming hardwood floors, "
        "a perfectly arranged white sofa and fresh flowers on a clean marble coffee table, "
        "clean white to soft sky blue gradient background, premium home interior photography ad"
    ),
    "Plumbing": (
        "a brand-new gleaming chrome bathroom fixture and a sleek modern sink basin on a clean marble counter, "
        "clean light gray to white gradient, bright professional studio lighting, home maintenance ad"
    ),
    "Electrician": (
        "a sleek modern smart home switch panel with glowing indicator lights mounted on a clean white wall, "
        "dark charcoal to medium gray gradient background, professional studio lighting, electrical services ad"
    ),
    "_default": (
        "a beautifully finished premium home space — clean, modern, and aspirational, "
        "clean white to light gray gradient background, "
        "bright professional architectural photography, home services brand ad"
    ),
    },

    # ── Finance & Accounting ───────────────────────────────────────────────
    "Finance & Accounting": {
        "Tax Filing": (
            "a sleek leather-bound document folder, a premium gold pen, and a crisp invoice sheet on a dark wooden desk, "
            "deep navy blue to clean white gradient background, "
            "premium professional studio lighting, finance brand photography ad poster"
        ),
        "GST Consulting": (
            "a sharp modern calculator and a neatly stacked set of premium documents on a clean glass desk, "
            "rich dark navy to soft silver-gray gradient background, "
            "professional studio key lighting, GST consulting brand photography ad"
        ),
        "Accounting Services": (
            "a sleek modern laptop showing a clean spreadsheet next to a premium ballpoint pen and notepad, "
            "clean light gray to bright white gradient background, "
            "professional corporate studio lighting, accounting brand photography ad poster"
        ),
        "Investment Advisory": (
            "a premium golden bar chart trophy model resting next to a sleek document on a dark marble surface, "
            "deep navy to rich gold gradient background, "
            "warm dramatic studio lighting, investment advisory brand photography ad poster"
        ),
        "_default": (
            "a premium calculator and a sleek leather portfolio resting on a clean dark wooden desk, "
            "deep navy to clean white gradient background, "
            "professional studio lighting, finance brand photography ad poster"
        ),
    },

    # ── Legal Services ─────────────────────────────────────────────────────
    "Legal Services": {
        "Corporate Law": (
            "a heavy premium hardcover law book and an elegant silver fountain pen on a dark mahogany desk, "
            "deep dark charcoal to rich slate gray gradient background, "
            "warm dramatic sidelight, premium corporate legal photography ad poster"
        ),
        "Property Registration": (
            "a brass house key resting on a clean legal document with an elegant stamp, "
            "warm golden amber to deep navy gradient background, "
            "professional photography, property legal services ad poster"
        ),
        "Family Law": (
            "a premium leather legal brief with a gold seal and an elegant pen on a clean desk, "
            "warm white to light cream gradient background, "
            "professional warm studio lighting, family law photography ad poster"
        ),
        "_default": (
            "a premium law book and elegant fountain pen on a clean professional desk surface, "
            "deep dark navy to rich slate gradient background, "
            "warm dramatic studio lighting, legal services brand photography ad poster"
        ),
    },

    # ── Retail & Shopping ──────────────────────────────────────────────────
    "Retail & Shopping": {
        "Fashion": (
            "an elegant premium clothing tag and a sleek folded garment in a refined fabric on a clean surface, "
            "soft warm cream to blush pink gradient background, "
            "warm fashion studio lighting, premium retail fashion photography ad poster"
        ),
        "Electronics": (
            "a sleek premium wireless earphone case and a gleaming smartphone resting on a dark matte surface, "
            "deep charcoal to midnight navy gradient background, "
            "premium tech product photography ad poster"
        ),
        "Gift Stores": (
            "an elegant gift box tied with a premium silk ribbon on a clean marble surface, "
            "warm soft gold to cream gradient background, "
            "warm celebratory studio lighting, gift retail photography ad poster"
        ),
        "_default": (
            "a premium product or stylized retail item resting beautifully on a clean display surface, "
            "clean warm gradient from brand accent to white background, "
            "soft studio lighting, premium retail photography ad poster"
        ),
    },

    # ── Logistics & Transport ──────────────────────────────────────────────
    "Logistics & Transport": {
        "Courier Services": (
            "a premium sealed cardboard parcel box with a printed shipping label on a clean warehouse floor, "
            "clean white to light gray gradient background, "
            "bright professional studio lighting, courier services photography ad poster"
        ),
        "Moving & Relocation": (
            "a set of neatly stacked sealed moving boxes on a clean surface with a premium packing tape gun, "
            "clean white to soft warm gray gradient background, "
            "bright professional studio lighting, relocation services photography ad poster"
        ),
        "Fleet Management": (
            "a sleek miniature truck model resting on a clean surface with a clipboard showing a route, "
            "deep navy to slate gray gradient background, "
            "cool corporate studio lighting, fleet services photography ad poster"
        ),
        "_default": (
            "a premium sealed parcel or vehicle accessory resting on a clean professional surface, "
            "clean white to light gray gradient background, "
            "bright professional studio lighting, logistics brand photography ad poster"
        ),
    },

    # ── Real Estate ────────────────────────────────────────────────────────
    "Real Estate": {
        "Property Sales": (
            "a premium brass house key and a sleek modern floor plan blueprint on a clean glass table, "
            "warm golden amber to soft white gradient background, "
            "premium warm studio lighting, real estate photography ad poster"
        ),
        "Rentals": (
            "a modern apartment key fob and a lease agreement document on a clean marble desk, "
            "clean light gray to white gradient background, "
            "bright professional studio lighting, property rental photography ad poster"
        ),
        "Commercial Real Estate": (
            "a sleek architectural building model and a premium pen on a clean glass desk, "
            "deep navy to soft slate gradient background, "
            "premium corporate studio lighting, commercial real estate photography ad poster"
        ),
        "_default": (
            "a premium property key and an elegant floor plan document on a clean desk surface, "
            "warm golden to soft white gradient background, "
            "professional studio lighting, real estate brand photography ad poster"
        ),
    },

    # ── Manufacturing ──────────────────────────────────────────────────────
    "Manufacturing": {
        "_default": (
            "a precision-engineered metal component or finished product resting on a clean industrial surface, "
            "deep dark charcoal to slate gray gradient background, "
            "professional industrial studio lighting, manufacturing brand photography ad poster"
        ),
    },

    # ── Media & Advertising ────────────────────────────────────────────────
    "Media & Advertising": {
        "Digital Marketing": (
            "a sleek premium smartphone showing a clean ad dashboard and a stylus resting next to it, "
            "deep vibrant purple to clean white gradient background, "
            "premium studio lighting, digital marketing photography ad poster"
        ),
        "Content Creation": (
            "a premium mirrorless camera body resting next to a clean tripod on a minimal surface, "
            "warm amber to soft cream gradient background, "
            "warm golden studio lighting, content creation photography ad poster"
        ),
        "Graphic Design": (
            "a premium Wacom stylus resting on a sleek drawing tablet next to refined color swatches, "
            "clean soft lavender to white gradient background, "
            "soft creative studio lighting, graphic design photography ad poster"
        ),
        "_default": (
            "a premium camera or creative tool resting on a clean minimal surface, "
            "deep vibrant purple to soft white gradient background, "
            "professional studio lighting, media brand photography ad poster"
        ),
    },

    # ── Catch-all ────────────────────────────────────────────────────────
    "Other": {
        "_default": (
            "a premium stylized object related to the business resting on a clean surface, "
            "clean professional gradient from brand primary color to white background, "
            "clean studio lighting, premium commercial photography brand ad poster"
        ),
    },
}


def _get_visual_archetype(category: str, sub_category: str | None) -> str:
    """
    Two-tier lookup: category → sub_category → archetype string.
    Falls back gracefully: sub_category match → category _default → Other _default.

    The DB stores full category names (e.g. "IT & Technology Services") which match
    CATEGORY_LIST exactly — we now use those same strings as dict keys.
    """
    cat_map = SUB_CATEGORY_VISUAL_ARCHETYPES.get(category)
    if cat_map is None:
        # Graceful fallback: try stripping common suffixes so legacy data still resolves
        for key in SUB_CATEGORY_VISUAL_ARCHETYPES:
            if key.lower().startswith(category.lower().split("&")[0].strip().lower()):
                cat_map = SUB_CATEGORY_VISUAL_ARCHETYPES[key]
                break
    if cat_map is None:
        cat_map = SUB_CATEGORY_VISUAL_ARCHETYPES.get("Other", {})

    if sub_category:
        archetype = cat_map.get(sub_category)
        if archetype:
            return archetype
        # Try partial sub-category match (e.g. "Salons" matches "Salon")
        sub_lower = sub_category.lower()
        for key, val in cat_map.items():
            if key != "_default" and (key.lower() in sub_lower or sub_lower in key.lower()):
                return val

    return cat_map.get("_default") or SUB_CATEGORY_VISUAL_ARCHETYPES["Other"]["_default"]


def _normalize_category_for_guard(category: str = "", sub_category: str = "") -> str:
    """Return a combined lowercase string for _category_visual_guard matching."""
    return f"{category or ''} {sub_category or ''}".lower()


def _category_visual_guard(category: str = None, sub_category: str = None, campaign_title: str = None) -> str:
    """
    Short positive guardrails for known categories to enforce photorealistic object visuals.
    Returns a short style-enforcement suffix appended to the FLUX prompt.
    """
    text = f"{category or ''} {sub_category or ''} {campaign_title or ''}".lower()
    if "education" in text or "neet" in text or "jee" in text or "coaching" in text:
        return (
            "premium commercial photography, neat stack of modern books on a desk, "
            "clean academy poster style, highly realistic but uncluttered, NO human face, NO people"
        )
    if "beauty" in text or "salon" in text or "personal care" in text or "spa" in text:
        return "premium beauty product photography, stylized elegant bottles or tools on marble, NO human face, NO people"
    if "food" in text or "restaurant" in text or "bakery" in text or "cafe" in text or "catering" in text:
        return "premium food photography, appetizing dish or ingredient, clean warm lighting, NO human hands, NO people"
    if "health" in text or "fitness" in text or "wellness" in text or "gym" in text or "yoga" in text:
        return "premium commercial health photography, sleek fitness equipment or wellness prop, clean studio, NO humans, NO people"
    if "technology" in text or "software" in text or "it " in f"{text} " or "tech" in text or "app" in text:
        return "premium commercial tech photography, sleek modern device on a desk, clean interface, NO humans, NO people"
    if "finance" in text or "accounting" in text or "tax" in text or "gst" in text or "investment" in text:
        return "premium finance photography, elegant documents and pen on a clean desk, professional corporate style, NO humans, NO people"
    if "legal" in text or "law" in text:
        return "premium legal services photography, leather document folder and fountain pen on mahogany desk, NO humans, NO people"
    if "real estate" in text or "property" in text:
        return "premium real estate photography, brass key and floor plan on clean desk, NO humans, NO people"
    if "home" in text or "cleaning" in text or "plumbing" in text or "interior" in text:
        return "premium home services photography, professional tool or cleaning product on clean surface, NO humans, NO people"
    if "retail" in text or "shopping" in text or "fashion" in text:
        return "premium retail product photography, elegant product on clean display surface, NO humans, NO people"
    if "media" in text or "marketing" in text or "advertising" in text or "design" in text:
        return "premium creative industry photography, sleek camera or design tool on minimal surface, NO humans, NO people"
    if "logistics" in text or "transport" in text or "delivery" in text or "courier" in text:
        return "premium logistics photography, clean parcel or professional transport prop on clean surface, NO humans, NO people"
    return "premium commercial product photography, minimalist setup, clean studio, NO humans, NO people"


# ---------------------------------------------------------------------------
# Text-safe zone anchor
# The app UI overlays offer badge + campaign title over the bottom of the image.
# This ensures the lower third is always clean/dark enough for text to read.
# ---------------------------------------------------------------------------

TEXT_SAFE_ZONE_ANCHOR = (
    "lower 30% of frame deliberately clean, darker, and simple, "
    "fading to a soft shadow gradient, no busy details in bottom area, "
    "reserved high-contrast zone for text overlay"
)


# ---------------------------------------------------------------------------
# Gemini API helper
# ---------------------------------------------------------------------------

import time

def _call_gemini(
    prompt: str,
    system_instruction: str = None,
    temperature: float = 0.7,
    max_tokens: int = 8192,
    image_path: str = None,
) -> str:
    """
    Call Gemini Flash API with a prompt and optional system instruction.
    Implements model fallback and retry logic to handle 503/429/timeout errors on free tier.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    # Priority: gemini-3.6-flash is the active free-tier model for new keys.
    models_to_try = [
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
    ]

    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    if image_path and os.path.exists(image_path):
        import base64
        import mimetypes
        with open(image_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("utf-8")
        mime_type, _ = mimetypes.guess_type(image_path)
        contents[0]["parts"].append({
            "inlineData": {
                "mimeType": mime_type or "image/png",
                "data": b64_data
            }
        })
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    last_error = None
    
    # Try the whole list of models up to 3 times
    for attempt in range(3):
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text.strip()
                else:
                    response.raise_for_status()
            except requests.exceptions.RequestException as e:
                last_error = e
                status_code = getattr(e.response, "status_code", None) if getattr(e, "response", None) is not None else None
                # If it's a 4xx error that is NOT 429, skip to next model
                if status_code and 400 <= status_code < 500 and status_code != 429:
                    print(f"[WARN] Non-retryable error on {model} (Status: {status_code})")
                    continue
                
                print(f"[WARN] Attempt {attempt + 1} failed for {model} (Status: {status_code}). Trying next model...")
                continue
            except Exception as e:
                last_error = e
                print(f"[WARN] Unexpected error on {model}: {type(e).__name__}")
                continue
                
        # If we exhausted all models in this attempt, wait before retrying the list
        if attempt < 2:
            wait_time = 3 * (attempt + 1)
            time.sleep(wait_time)
            
    raise ValueError("AI generation service is currently unavailable. Please try again.")


def _extract_json(text: str) -> dict:
    """Extract JSON object from a text response (handles markdown code blocks)."""
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    
    # Extract via brace counting to handle multiple JSON objects (e.g., if model echoes the prompt)
    json_objects = []
    start = -1
    braces = 0
    in_string = False
    escape = False
    
    for i, char in enumerate(text):
        if char == '"' and not escape:
            in_string = not in_string
        elif char == '\\' and not escape:
            escape = True
            continue
        
        if escape:
            escape = False
            continue
            
        if not in_string:
            if char == '{':
                if braces == 0:
                    start = i
                braces += 1
            elif char == '}':
                braces -= 1
                if braces == 0 and start != -1:
                    json_objects.append(text[start:i+1])
                    start = -1
                    
    # Return the last valid JSON object found, as the model's actual answer is typically at the end
    if json_objects:
        for obj in reversed(json_objects):
            try:
                parsed = json.loads(obj, strict=False)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
                
    # Fallback to the old method if brace counting fails
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(), strict=False)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON parse error: {e}\nRaw text: {text[:500]}")
            
    raise ValueError(f"No JSON object found in response: {text[:300]}")


# ---------------------------------------------------------------------------
# STAGE 0 — Category auto-detection (called once at registration)
# ---------------------------------------------------------------------------

def detect_category(business_description: str) -> dict:
    """
    Use Gemini Flash to classify a business description into a category and sub-category.
    Called ONCE at registration — result saved to businesses.category and businesses.sub_category.
    If this call fails, caller defaults to 'Other'.

    Returns: {"category": str, "sub_category": str | None}
    """
    categories_str = "\n".join(f"- {c}" for c in CATEGORY_LIST)
    prompt = f"""You are a business classifier. Given a business description, return the best matching category and sub-category.

Business description:
\"\"\"{business_description}\"\"\"

Available categories:
{categories_str}

Return ONLY a JSON object with exactly these two keys:
- "category": best matching category from the list (use exact string)
- "sub_category": the most specific sub-category (can be your own words if not in list, keep concise)

Example: {{"category": "IT & Technology Services", "sub_category": "Website Development"}}"""

    text = _call_gemini(prompt, temperature=0.2, max_tokens=8192)
    result = _extract_json(text)

    cat = result.get("category", "Other")
    if cat not in CATEGORY_LIST:
        cat = "Other"

    return {"category": cat, "sub_category": result.get("sub_category")}


# ---------------------------------------------------------------------------
# STAGE 1 — Business Analysis (cached at registration, updated on profile edit)
# ---------------------------------------------------------------------------

def analyze_business(
    business_name: str,
    business_description: str,
    usp: str,
    category: str,
    city: str,
    website_url: str = None,
) -> dict:
    """
    Deep business analysis using Gemini. Called ONCE at registration and stored in
    businesses.ai_business_analysis. Reused for all future campaign generations.

    Also called when the seller updates their business_description or USP.

    Returns a dict representing the structured business analysis.
    """
    system_instruction = """You are a senior business analyst and brand strategist with 20 years of experience.
You deeply understand business models, market positioning, buyer psychology, and competitive strategy.
You reason about businesses the way a McKinsey consultant would — with precision, depth, and commercial awareness.
You must return ONLY valid JSON — no markdown, no explanation, no commentary."""

    prompt = f"""Analyze this business deeply and return a structured business profile.

Business Name: {business_name}
Category: {category}
City: {city}
What this business provides: {business_description}
What makes them different (USP): {usp or "Not specified"}
Website: {website_url or "Not specified"}

Return this exact JSON:
{{
  "industry": "Specific industry name (e.g., 'B2B SaaS', 'Quick Service Restaurant', 'Aesthetic Dermatology')",
  "business_type": "Type such as: Service Provider / Product Retailer / SaaS / Franchise / Freelancer / Agency / Clinic / Restaurant etc.",
  "business_positioning": "How this business is positioned in the market (e.g., 'Premium boutique gym targeting working professionals', 'Affordable family restaurant with authentic home-style cooking')",
  "primary_service": "The single most important thing this business sells or does",
  "secondary_services": ["service 1", "service 2"],
  "core_strengths": ["strength 1", "strength 2", "strength 3"],
  "customer_problems_solved": ["problem 1", "problem 2", "problem 3"],
  "customer_benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "expected_buyer_persona": "Detailed description of the ideal customer (age, profession, income level, lifestyle, what they care about)",
  "business_maturity": "Startup / Growing / Established / Enterprise",
  "competitive_advantage": "The single clearest reason a buyer would choose THIS business over a competitor",
  "brand_personality": "2-3 adjectives that describe this brand's personality (e.g., 'trustworthy, premium, approachable')",
  "visual_identity_hint": "What visual language would represent this business well (e.g., 'dark sophisticated tones with gold accents', 'bright energetic colors with clean white', 'warm earthy food photography')"
}}"""

    text = _call_gemini(prompt, system_instruction=system_instruction, temperature=0.3, max_tokens=8192)
    return _extract_json(text)


# ---------------------------------------------------------------------------
# STAGE 2 — Full Campaign Generation (single Gemini call — all reasoning inside)
# ---------------------------------------------------------------------------

def generate_full_campaign(
    business_name: str,
    business_description: str,
    usp: str,
    category: str,
    city: str,
    campaign_topic: str,
    price_or_deal: str = None,
    cached_business_analysis: dict = None,
    festival_name: str = None,
    days_to_festival: int = None,
    season: str = None,
    trend_direction: str = None,
    competitor_titles: list = None,
    sub_category: str = None,
    logo_color: str = None,
    existing_visual_style: dict = None,
) -> dict:
    """
    ONE Gemini call that reasons internally across all stages and returns a single
    structured JSON containing:
      - marketing_strategy: how to position and advertise this campaign
      - buyer_psychology: who the buyer is and what emotion to trigger
      - creative_brief: exact visual direction for the advertisement
      - campaign: title, description, offer, cta_type, target_audience
      - image_prompt: a precise, FLUX-optimized visual scene description

    Uses cached_business_analysis if available (avoids repeating business reasoning).
    Accepts sub_category, logo_color, existing_visual_style for personalized visual generation.
    """
    system_instruction = """You are REACHLO's Ad Creative Director — a specialist in designing premium, highly realistic, minimalist product-photography advertisement creatives for Indian small businesses.

CORE PHILOSOPHY: You are designing an AD CREATIVE POSTER using completely object-focused, commercial still-life photography. You must NEVER generate a human, person, or face.

━━━ THE STILL-LIFE AD CREATIVE DESIGN LAW ━━━

Real high-converting ad posters look like THIS:
  • ONE HERO OBJECT (or clean cluster of objects) resting naturally on a clean surface or studio backdrop.
  • NO HUMANS. EVER. No models, no people, no portraits.
  • CLEAN NEGATIVE SPACE in lower 30% and/or one side for text overlay.
  • PHOTOREALISTIC, grounded lighting — NO chaotic floating objects, NO neon glowing lines, NO messy cyber elements.

EXAMPLES of what ad creatives look like:

NEET/JEE Coaching ✔:
  Premium commercial photography of a neat stack of modern physics textbooks and a sleek tablet on a clean wooden desk.
  Deep royal blue to white gradient background — clean, clear, reads in 1 second.

Salon ✔:
  Elegant golden scissors and a premium serum bottle resting on pristine marble.
  Soft blush pink to warm cream studio lighting.

Restaurant ✔:
  Beautifully plated artisan dish on a clean elegant table setting with rising steam.
  Warm amber studio background.

━━━ SELLER DIFFERENTIATION LAW ━━━

When two sellers in the SAME category run the SAME campaign topic, their images MUST look different:
  • DIFFERENT background gradient colors (derived from each seller's brand personality and USP)
  • DIFFERENT key objects (tied to their specific offer)
  • DIFFERENT composition direction (some left-heavy, some centered, some right-heavy)

NEVER output a generic image_prompt. Every visual detail must be uniquely justified by THIS seller's business_description and USP.

━━━ ABSOLUTE RULES ━━━

1. NO HUMANS: Never include people, hands, faces, or silhouettes.
2. NO GLOWING/FLOATING: Objects must sit naturally. No neon lines, no cyber/3D render chaos.
3. ONE FOCAL OBJECT CLUSTER: One central symbolic still-life setup.
4. NO TEXT: No words, signs, logos, prices in the image — app overlays all text
5. LOWER THIRD CLEAN: Bottom 30% must be darker and simpler for text overlay readability
6. PHOTOREALISTIC STYLE: Always specify 'premium commercial product photography, clean minimalist still-life'

Return ONLY valid JSON. No markdown, no explanation."""

    system_instruction += """

UPDATED CREATIVE DIRECTION (higher priority than earlier examples):
- Do not create humans. Ever.
- The thumbnail must look like a designed, high-end, clean product photography campaign creative: clear hero objects, realistic grounding, premium composition, and a readable lower-third overlay zone.
- Use 1-2 category-relevant realistic props. For NEET/JEE, examples are a neat stack of books, a tablet displaying charts, a premium pen.
- STRICTLY RELEVANT PROPS ONLY: Do NOT add arbitrary "aesthetic" objects like plants, leaves, coffee cups, or vases unless the business is explicitly a plant nursery or a cafe. 
- Strictly avoid busy real-world clutter. Keep the background clean, like a professional studio photoshoot.
"""

    # Assemble context
    analysis_block = ""
    if cached_business_analysis:
        analysis_block = f"""
CACHED BUSINESS ANALYSIS (pre-computed, use this as your business intelligence):
{json.dumps(cached_business_analysis, indent=2)}
"""

    # Sub-category and brand identity context
    sub_cat_block = ""
    if sub_category:
        sub_cat_block = f"\n- Sub-Category (exact): {sub_category}"
    if logo_color:
        sub_cat_block += (
            f"\n- Brand Color / Visual Identity Hint: {logo_color} "
            "(let this tonality influence lighting, environment color grade, and scene atmosphere — NOT as a logo or text)"
        )

    # Existing visual style memory — passed in for repeat campaigns by the same seller
    style_memory_block = ""
    if existing_visual_style:
        style_memory_block = (
            "\nEXISTING BRAND VISUAL STYLE (this seller's established look — maintain palette/mood, vary the scene):"
            f"\n  Palette: {existing_visual_style.get('palette', '')}"
            f"\n  Mood: {existing_visual_style.get('mood', '')}"
            f"\n  Subject Type: {existing_visual_style.get('subject_type', '')}"
            "\nIMPORTANT: Use a DIFFERENT scene/setting from their previous campaign but keep the same color temperature, lighting mood, and brand feel."
        )

    market_context = ""
    if festival_name and days_to_festival:
        market_context += f"\nUpcoming Festival: {festival_name} is {days_to_festival} days away."
    if season:
        market_context += f"\nCurrent Season/Context: {season}"
    if trend_direction == "RISING":
        market_context += f"\nMarket Trend: Demand for {category} is currently RISING in {city}."

    competitor_block = ""
    if competitor_titles:
        competitor_block = f"\nActive competitor campaigns in {city}: {', '.join(competitor_titles[:3])}. Differentiate from these."

    current_month = datetime.now().strftime("%B %Y")
    current_date_context = f"Today is {current_month}."

    prompt = f"""Generate a complete premium advertising campaign uniquely tailored to this exact seller's business.

BUSINESS PROFILE (study this deeply — the campaign must be unique to THIS seller):
- Business Name: {business_name}
- Category: {category}{sub_cat_block}
- Location: {city}
- What this business specifically provides: {business_description}
- Their Unique Selling Proposition: {usp or "Not specified"}
{analysis_block}{style_memory_block}
CAMPAIGN DETAILS:
- This campaign is specifically about: {campaign_topic}
- Price or deal to highlight: {price_or_deal or "Not specified — use general persuasive language, do not invent a price"}
- {current_date_context}
{market_context}
{competitor_block}

VISUAL STORYTELLING REASONING (reason through ALL 6 steps before writing image_prompt or visual_narrative):
1. OUTCOME SCENE: What does the buyer's life look like AFTER choosing {business_name} for this campaign? Describe the exact real-world moment of success or satisfaction.
2. PROTAGONIST: Who is the specific person in {city} who would stop scrolling for this ad? (age, gender, profession, what they wear, what they look like)
3. DECISIVE EMOTION: What is the ONE specific emotion on their face in the outcome scene? (NOT generic 'happy' — be precise: 'quiet triumphant pride', 'joyful disbelief', 'relieved confidence')
4. ENVIRONMENT STORYTELLING: What specific real-world setting amplifies the meaning of the outcome? (not just 'outdoors' — the specific place that signals success in THIS industry)
5. CINEMATIC MOMENT: Is this the moment of receiving good news, the reveal, the first experience, the achievement? Name the exact story beat.
6. SEPARATION FROM COMPETITOR: How is this scene visually unlike any generic ad in this category? What makes it unmistakably THIS business's story?

Return this exact JSON structure:

{{
  "marketing_strategy": {{
    "business_goal": "What {business_name} ultimately wants",
    "campaign_goal": "What THIS specific campaign must achieve",
    "primary_principle": "The core marketing principle (e.g., social proof, scarcity, aspiration)",
    "value_proposition": "The single most compelling reason a buyer in {city} should choose {business_name} right now"
  }},
  "buyer_psychology": {{
    "target_buyer": "Hyper-specific buyer persona for {city} (age, profession, lifestyle, income, what they worry about)",
    "buyer_emotion": "The PRIMARY emotion this ad must trigger (be specific: not just 'trust' — e.g., 'confident pride in choosing premium quality')",
    "expected_buyer_reaction": "What the buyer thinks/feels in 3 seconds of seeing this ad"
  }},
  "brand_identity": {{
    "brand_personality": "3 words describing {business_name}'s brand character",
    "visual_tone": "The visual language that uniquely represents this brand (colors, mood, style)",
    "accent_color": "A bold accent color for CTA button and offer pill on the overlay"
  }},
  "visual_story": {{
    "single_scene": "The ONE ad creative still-life moment that communicates the offer instantly — what objects are present?",
    "hero_subject_description": "Exact description of the REALISTIC HERO OBJECT (e.g., 'a sleek modern tablet resting on textbooks', 'an elegant ceramic coffee cup') — NO HUMANS, NO GLOWING",
    "person_emotion": "N/A - LEAVE EMPTY",
    "key_prop": "The ONE secondary realistic prop that supports the main object (e.g., 'a premium fountain pen', 'a folded pristine towel')",
    "visual_message": "the one-second message conveyed by the image without overlay text.",
    "visual_metaphor": "a concrete campaign poster idea unique to this seller, using realistic objects.",
    "supporting_props": ["prop 1", "prop 2"]
  }},
  "ad_creative_design": {{
    "background_gradient": "Exact gradient colors unique to this seller's brand — specify direction and both colors (e.g., 'deep royal blue top fading to clean white bottom', 'warm golden amber left to soft cream right') — this must be DIFFERENT from generic defaults",
    "subject_position": "Where the object sits in 4:3 frame — one of: center / center-left / center-right / left-third / right-third",
    "composition_note": "One sentence on how negative space is created for text overlay",
    "color_accent": "One bold accent color for visual pop that matches this brand",
    "poster_layout": "the designed ad layout device (e.g., clean studio surface, diagonal shadow, elegant desktop)",
    "visual_format": "choose one of: product_only, minimal_environment"
  }},
  "photography": {{
    "camera_angle": "Specific angle (e.g., 'eye-level 3/4 portrait', 'close-up product shot at 45 degrees', 'low-angle power shot')",
    "lighting": "Studio lighting type (e.g., 'soft bright studio key light', 'warm rim backlight on subject', 'clean diffused white studio light')",
    "mood": "The emotional atmosphere",
    "color_grade": "Post-processing direction that reinforces brand and emotion"
  }},
  "campaign": {{
    "title": "Headline — max 8-12 words, outcome/benefit-driven, specific to {campaign_topic}, easy to scan on mobile",
    "campaign_description": "Marketing copy — max 2-4 short sentences, conversational, highlight real benefits, mobile-optimized",
    "offer": "Offer badge text — max 6-8 words, specific, urgent",
    "cta_type": "WHATSAPP or CALL or LINK or FORM",
    "target_audience": "B2C or B2B or BOTH"
  }},
  "image_prompt": "Write a FLUX image generation prompt as an AD CREATIVE DESIGN BRIEF in 4 parts, joined naturally: SUBJECT — describe the hero product/objects (appearance, position, strictly relevant props only, max 35 words). BACKGROUND — the exact gradient background from ad_creative_design (specify both colors and direction, max 20 words). COMPOSITION — where subject is in the frame and where the clean space is (max 15 words). STYLE — end with: Instagram advertisement poster, social media sponsored post, clean studio lighting, sharp focus. Total maximum 90 words. No marketing language. Pure visual description."
}}"""

    prompt += """

HIGH PRIORITY IMAGE_PROMPT ADDENDUM:
The JSON must include these additional fields inside visual_story:
- visual_message: the one-second message conveyed by the image without overlay text.
- visual_metaphor: a concrete campaign poster idea unique to this seller, not a category default.
- supporting_props: an array of 2-4 symbolic props/background cues that support the message without readable text.

The JSON must include this additional field inside ad_creative_design:
- poster_layout: the designed ad layout device, such as clean studio surface, diagonal band area, layered geometric shapes, or premium product table.
- visual_format: choose one of "symbolic", "product_only", or "environment". Do NOT choose "human".

The JSON must include this additional top-level object:
- poster_copy:
  - hook: 2-5 word catchy ad hook for the thumbnail only. It must NOT repeat the campaign title. Make it billboard-style, e.g. "Crack The Next Step", "Glow Starts Here", "Taste The Weekend". MUST sound extremely modern and punchy.
  - support_line: 3-8 word benefit phrase for the thumbnail only. It must NOT repeat the campaign description.
  - badge: 1-4 word urgency/proof/quality badge. It must NOT repeat the offer or price. Use proof/urgency words like "Admissions Open", "Expert Led", "Fresh Batch", "Premium Care".

For education/NEET/JEE, strictly use realistic objects: a neat stack of modern books, a sleek tablet, a premium pen, an elegant desk surface. NEVER generate a human. NEVER generate glowing/floating 3D effects.

The image_prompt must be a FLUX prompt in 5 visual parts:
1. CONCEPT: visual_message plus visual_metaphor in concrete visual terms.
2. SUBJECT: the realistic hero object and clean supporting props. NO HUMANS.
3. SUPPORTING PROPS: 2-4 grounded realistic props.
4. BACKGROUND/COMPOSITION: background_gradient, poster_layout, subject_position, and clean darker lower-third overlay space.
5. STYLE: premium commercial product photography, clean minimalist still-life, highly elegant and uncluttered, NO humans, NO people.

Hard rule for image_prompt: NO HUMANS. NO PEOPLE. NO GLOWING. No readable text, logos, prices, brand names, banners with words, or fake writing inside the generated image.
"""

    text = _call_gemini(
        prompt,
        system_instruction=system_instruction,
        temperature=0.65,
        max_tokens=8192,
    )
    return _extract_json(text)


# ---------------------------------------------------------------------------
# STAGE 3 — Prompt Composer (programmatic — no LLM call)
# ---------------------------------------------------------------------------

def build_flux_prompt(
    ai_image_prompt: str,
    category: str = None,
    sub_category: str = None,
    ad_creative_design: dict = None,
    visual_story: dict = None,
    visual_narrative: dict = None,
    photography: dict = None,
    campaign_title: str = None,
    offer_text: str = None,
    target_audience: str = None,
    panel_color: str = None,
    hero_position: str = "right",
) -> str:
    """
    Compose the final FLUX-optimized image prompt.

    ARCHITECTURE: Ad Creative Design approach.
    Priority order: base subject description → background/composition (ad_creative_design)
    → sub-category style tag → text-safe zone → quality anchors.

    Key improvements:
    - ad_creative_design injects per-seller background gradient + composition (main differentiator)
    - Sub-category archetype reduced to style-tag only (prevents token budget overflow)
    - Hard 120-word cap: FLUX quality degrades significantly above ~200 tokens
    - TEXT_SAFE_ZONE_ANCHOR always kept to ensure text overlay readability
    """
    # ── Step 1: Clean the base image_prompt ──────────────────────────────────
    base = ai_image_prompt.strip().rstrip(".")
    # Strip any Gemini label brackets that FLUX cannot interpret
    base = re.sub(r'\[(?:SUBJECT|BACKGROUND|COMPOSITION|STYLE|SCENE|LIGHTING|MOOD|[A-Z ]+)\s*[:\u2014-]\s*', '', base, flags=re.IGNORECASE)
    base = re.sub(r'PREMIUM ADVERTISEMENT for [^:]+:\s*', '', base, flags=re.IGNORECASE)
    base = re.sub(r'\]', '', base)
    base = re.sub(r'\s+', ' ', base).strip().rstrip('.')

    # ── Step 2: Ad creative structural spec from Gemini's ad_creative_design field ────
    # This is the KEY DIFFERENTIATOR between two sellers in the same category.
    # Seller A gets navy/white gradient; Seller B gets gold/cream gradient.
    ad_structure_parts = []
    if ad_creative_design:
        bg = ad_creative_design.get("background_gradient", "").strip()
        position = ad_creative_design.get("subject_position", "").strip()
        comp = ad_creative_design.get("composition_note", "").strip()
        layout = ad_creative_design.get("poster_layout", "").strip()
        visual_format = ad_creative_design.get("visual_format", "").strip().lower()
        if bg and bg.lower() not in base.lower():
            ad_structure_parts.append(bg)
        if layout and layout.lower() not in base.lower():
            ad_structure_parts.append(layout)
        if visual_format in {"symbolic", "product_only", "environment"}:
            ad_structure_parts.append("no visible human face, no portrait, use symbolic hero objects and environment cues")
        if position and position.lower() not in base.lower():
            ad_structure_parts.append(f"subject {position}")
        if comp and comp.lower() not in base.lower():
            ad_structure_parts.append(comp)
    ad_structure = ", ".join(p for p in ad_structure_parts if p)

    # ── Step 2b: Preserve the seller-specific campaign idea from Gemini ──────
    # These fields are the difference between a generic category image and a
    # meaningful ad thumbnail. Keep them close to the front of the prompt.
    concept_parts = []
    if visual_story:
        for key in ("visual_message", "visual_metaphor", "key_prop"):
            value = visual_story.get(key)
            if isinstance(value, str):
                cleaned = value.strip()
                if cleaned and cleaned.lower() not in base.lower():
                    concept_parts.append(cleaned)

        supporting_props = visual_story.get("supporting_props")
        if isinstance(supporting_props, list):
            prop_text = ", ".join(str(p).strip() for p in supporting_props if str(p).strip())
            if prop_text and prop_text.lower() not in base.lower():
                concept_parts.append(f"supporting visual cues: {prop_text}")
        elif isinstance(supporting_props, str) and supporting_props.strip():
            prop_text = supporting_props.strip()
            if prop_text.lower() not in base.lower():
                concept_parts.append(f"supporting visual cues: {prop_text}")

    visual_concept = ", ".join(concept_parts[:4])

    # ── Step 3: Sub-category style tag (last phrase only — keeps token budget tight) ───
    cat_archetype = _get_visual_archetype(category or "Other", sub_category)
    # Extract only the final style-tag phrase (after last comma group) to avoid bloat
    archetype_phrases = [p.strip() for p in cat_archetype.split(",") if p.strip()]
    # Take the last 2 phrases which contain the style tag (e.g. "Instagram ad poster style")
    style_tag = ", ".join(archetype_phrases[-2:]) if len(archetype_phrases) >= 2 else cat_archetype

    # ── Step 4: Assemble — strict priority order ─────────────────────────────
    parts = [base]
    category_guard = _category_visual_guard(category, sub_category, campaign_title)
    if category_guard and category_guard.lower() not in base.lower():
        parts.append(category_guard)
    if visual_concept:
        parts.append(visual_concept)
    if ad_structure:
        parts.append(ad_structure)
    if style_tag and style_tag.lower() not in base.lower():
        parts.append(style_tag)
    parts.append(TEXT_SAFE_ZONE_ANCHOR)
    parts.append(FLUX_QUALITY_ANCHORS)

    full_prompt = ", ".join(p.rstrip(", ") for p in parts if p)

    # ── Step 5: Hard token cap — FLUX degrades at 200+ tokens (~150 words) ────────
    words = full_prompt.split()
    if len(words) > 130:
        # Keep: beginning (subject + background) + end (text-safe + quality anchors)
        # Drop the middle enrichment to avoid FLUX confusion
        quality_tail = f"{TEXT_SAFE_ZONE_ANCHOR}, {FLUX_QUALITY_ANCHORS}"
        tail_words = quality_tail.split()
        head_budget = 130 - len(tail_words)
        head = " ".join(words[:head_budget])
        full_prompt = f"{head}, {quality_tail}"

    return full_prompt


# ---------------------------------------------------------------------------
# Hallucination guard (pure Python, no AI, no latency)
# ---------------------------------------------------------------------------

def run_hallucination_guard(generated: dict, seller_inputs: dict) -> list:
    """
    Scan generated campaign content for numbers and superlatives NOT present
    in the seller's own inputs. Returns a list of warning strings.

    This does NOT auto-correct — the seller sees warnings and decides.
    Specific warnings are more useful than vague ones.

    seller_inputs: combination of business_description, usp, campaign_topic, price_or_deal
    """
    warnings = []

    # Combine all seller-provided text into one string (lowercase for comparison)
    seller_text = " ".join(filter(None, [
        seller_inputs.get("business_description", ""),
        seller_inputs.get("usp", ""),
        seller_inputs.get("campaign_topic", ""),
        seller_inputs.get("price_or_deal", ""),
    ])).lower()

    # Extract campaign content from generated dict
    campaign = generated.get("campaign", {})
    generated_text = " ".join(filter(None, [
        campaign.get("title", ""),
        campaign.get("campaign_description", ""),
        campaign.get("offer", ""),
    ]))

    # Check 1: Numbers in generated text not in seller input
    generated_numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', generated_text)
    seller_numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', seller_text)
    for num in generated_numbers:
        try:
            val = float(num.rstrip('%'))
        except ValueError:
            continue
        if val > 9 and num not in seller_numbers:
            warnings.append(
                f"The number '{num}' appears in your campaign but was not in your inputs — please verify or edit it."
            )

    # Check 2: Superlatives and strong claims
    superlatives = [
        "best in", "only in", "#1", "number 1", "top rated", "award winning",
        "guaranteed", "100% guarantee", "zero risk", "fastest in", "cheapest in",
    ]
    gen_lower = generated_text.lower()
    seller_lower = seller_text.lower()
    for term in superlatives:
        if term in gen_lower and term not in seller_lower:
            warnings.append(
                f"The phrase '{term}' appears in your campaign but was not in your inputs — please verify or edit it."
            )

    return warnings


# ---------------------------------------------------------------------------
# Deterministic ad poster compositor (Pillow)
# ---------------------------------------------------------------------------

def _load_font(size: int, bold: bool = False):
    if ImageFont is None:
        raise RuntimeError("Pillow is required for ad thumbnail composition. Install backend requirements.")

    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def _text_size(draw, text: str, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _wrap_text(draw, text: str, font, max_width: int, max_lines: int = 3) -> list[str]:
    words = (text or "").strip().split()
    if not words:
        return []

    lines = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if _text_size(draw, trial, font)[0] <= max_width:
            current = trial
            continue
        if current:
            lines.append(current)
        current = word
        if len(lines) >= max_lines:
            break

    if current and len(lines) < max_lines:
        lines.append(current)

    if len(lines) == max_lines:
        last = lines[-1]
        while last and _text_size(draw, f"{last}...", font)[0] > max_width:
            last = last[:-1].rstrip()
        if last and " ".join(lines) != " ".join(words):
            lines[-1] = f"{last}..."

    return lines


def _accent_palette(category: str, accent_hint: str = None):
    text = f"{category or ''} {accent_hint or ''}".lower()
    if "education" in text or "neet" in text or "jee" in text:
        return (18, 64, 154), (255, 196, 31), (8, 20, 45)
    if "beauty" in text or "salon" in text:
        return (179, 42, 99), (255, 196, 117), (48, 18, 36)
    if "food" in text or "restaurant" in text:
        return (185, 72, 24), (255, 188, 73), (58, 26, 13)
    if "health" in text or "fitness" in text:
        return (17, 132, 102), (255, 126, 48), (8, 37, 35)
    if "technology" in text or "it" in text:
        return (24, 96, 225), (88, 216, 255), (8, 18, 43)
    return (37, 99, 235), (245, 158, 11), (12, 23, 42)


def _fallback_poster_copy(category: str = None, campaign_title: str = None) -> dict:
    text = f"{category or ''} {campaign_title or ''}".lower()
    if "education" in text or "neet" in text or "jee" in text:
        return {
            "hook": "Crack The Next Step",
            "support_line": "Focused prep. Strong foundation.",
            "badge": "Admissions Open",
        }
    if "beauty" in text or "salon" in text:
        return {
            "hook": "Glow Starts Here",
            "support_line": "Premium care. Confident look.",
            "badge": "Book Today",
        }
    if "food" in text or "restaurant" in text:
        return {
            "hook": "Fresh Taste Awaits",
            "support_line": "Hot, delicious, made for you.",
            "badge": "Order Now",
        }
    if "health" in text or "fitness" in text:
        return {
            "hook": "Feel Stronger Daily",
            "support_line": "Guided care for real progress.",
            "badge": "Start Today",
        }
    if "technology" in text or "software" in text or "it " in f"{text} ":
        return {
            "hook": "Build Smarter Online",
            "support_line": "Modern solutions for growth.",
            "badge": "Get Started",
        }
    return {
        "hook": "Make It Happen",
        "support_line": "A better choice starts here.",
        "badge": "Limited Time",
    }


def _clean_poster_copy_value(value: str, fallback: str, max_chars: int) -> str:
    value = (value or "").strip()
    if not value:
        value = fallback
    value = re.sub(r"\s+", " ", value)
    return value[:max_chars].rstrip()


def compose_campaign_ad_thumbnail(
    base_image_path: str,
    campaign_title: str,
    offer_text: str = None,
    business_name: str = None,
    category: str = None,
    target_audience: str = None,
    ad_creative_design: dict = None,
    poster_copy: dict = None,
    save_dir: str = "uploads/ai-thumbnails",
) -> str:
    """
    Convert the generated visual into a finished ad thumbnail.

    Design philosophy (modern Instagram/Meta ad style):
    - Full-bleed hero image behind everything
    - Cinematic gradient from transparent → near-black over the bottom 55%
    - Text drawn DIRECTLY on the gradient zone (white on dark) — clean, modern
    - No white boxes or dated overlays — just premium typography on depth
    - Bottom zone layout: hook headline → support line → badge + CTA row
    - Top-left: frosted glass pill with brand name & category
    - Accent colour stripe above text zone for visual pop

    Layout at 1200×900 (4:3):
      ┌─────────────────────────────────────────┐
      │ [Brand Pill]                     ACTIVE │  y=0..90
      │                                         │
      │         HERO IMAGE (full bleed)         │
      │                                         │
      ├─────────────────────────────────────────┤  y≈450 gradient starts
      │ ═══ accent stripe                       │  y=490
      │                                         │
      │  HOOK HEADLINE                          │  y=520..630
      │  Support line tagline                   │  y=640
      │                                         │
      │  [BADGE PILL]          [CTA BUTTON →]   │  y=780
      └─────────────────────────────────────────┘  y=900
    """
    if Image is None:
        raise RuntimeError("Pillow is required for ad thumbnail composition. Install backend requirements.")

    os.makedirs(save_dir, exist_ok=True)
    output_path = os.path.join(save_dir, f"{uuid.uuid4().hex}.webp")

    # ── 1. Load + crop base image to 1200×900 ──────────────────────────────
    base = Image.open(base_image_path).convert("RGB")
    src_ratio = base.width / base.height
    target_ratio = IMAGE_WIDTH / IMAGE_HEIGHT
    if src_ratio > target_ratio:
        new_h = IMAGE_HEIGHT
        new_w = int(new_h * src_ratio)
    else:
        new_w = IMAGE_WIDTH
        new_h = int(new_w / src_ratio)
    base = base.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - IMAGE_WIDTH) // 2
    top  = (new_h - IMAGE_HEIGHT) // 2
    canvas = base.crop((left, top, left + IMAGE_WIDTH, top + IMAGE_HEIGHT)).convert("RGBA")

    # Mild sharpening for crispness
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.0, percent=110, threshold=3))

    # ── 2. Derive colour palette ────────────────────────────────────────────
    primary, accent, dark = _accent_palette(category, (ad_creative_design or {}).get("color_accent"))

    # ── 3. Cinematic gradient overlay — transparent top → dark bottom ───────
    gradient = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(gradient)
    GRAD_START_Y = 350      # gradient begins here (transparent) — earlier start = more text-safe zone
    GRAD_OPAQUE_Y = 580     # fully opaque by this point — ensures hook text is always on dark bg
    for gy in range(IMAGE_HEIGHT):
        if gy < GRAD_START_Y:
            continue
        t = min(1.0, (gy - GRAD_START_Y) / (GRAD_OPAQUE_Y - GRAD_START_Y))
        # Ease-in-out for a smooth, cinematic look
        t = t * t * (3 - 2 * t)
        alpha = int(t * 245)  # raised from 230 — stronger opacity for text contrast
        grad_draw.line([(0, gy), (IMAGE_WIDTH, gy)], fill=(dark[0], dark[1], dark[2], alpha))

    canvas = Image.alpha_composite(canvas, gradient)

    # ── 3b. Text scrim safety layer — solid dark block behind text zone (invisible but ensures readability) ──
    # This guarantees hook text is readable even if the base image is bright at y=520
    scrim = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT), (0, 0, 0, 0))
    scrim_draw = ImageDraw.Draw(scrim)
    scrim_draw.rectangle(
        [(0, 500), (IMAGE_WIDTH, IMAGE_HEIGHT)],
        fill=(dark[0], dark[1], dark[2], 100)  # soft additional scrim — adds ~40% more contrast
    )
    canvas = Image.alpha_composite(canvas, scrim)

    # ── 4. Accent stripe — thin coloured bar above the text zone ───────────
    stripe_layer = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT), (0, 0, 0, 0))
    stripe_draw = ImageDraw.Draw(stripe_layer)
    STRIPE_Y = 500
    stripe_draw.rectangle([(0, STRIPE_Y), (IMAGE_WIDTH, STRIPE_Y + 5)],
                           fill=(accent[0], accent[1], accent[2], 220))
    # Slightly wider highlight on the left 280px for visual weight
    stripe_draw.rectangle([(0, STRIPE_Y), (280, STRIPE_Y + 5)],
                           fill=(255, 255, 255, 200))
    canvas = Image.alpha_composite(canvas, stripe_layer)

    # ── 5. Load fonts ───────────────────────────────────────────────────────
    font_brand    = _load_font(28, bold=True)
    font_cat      = _load_font(20, bold=False)
    font_hook     = _load_font(72, bold=True)
    font_hook_sm  = _load_font(58, bold=True)   # fallback for longer hooks
    font_support  = _load_font(32, bold=False)
    font_badge    = _load_font(28, bold=True)
    font_cta      = _load_font(27, bold=True)

    draw = ImageDraw.Draw(canvas)

    # ── 6. Gather text content ──────────────────────────────────────────────
    fallback_copy = _fallback_poster_copy(category, campaign_title)
    poster_copy   = poster_copy or {}
    hook         = _clean_poster_copy_value(poster_copy.get("hook"),         fallback_copy["hook"],         32)
    support_line = _clean_poster_copy_value(poster_copy.get("support_line"), fallback_copy["support_line"], 52)
    badge        = _clean_poster_copy_value(poster_copy.get("badge"),        fallback_copy["badge"],         22)
    cta_label    = "ENROLL NOW" if "education" in (category or "").lower() else "BOOK NOW"

    # ── 7. Top-left brand pill (frosted glass style) ─────────────────────
    brand = (business_name or "REACHLO").strip()[:26]
    cat   = (category or target_audience or "Campaign").strip()[:30]

    brand_w, brand_h = _text_size(draw, brand, font_brand)
    pill_padding = 18
    pill_w = brand_w + pill_padding * 2
    pill_h = 68

    pill_layer = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT), (0, 0, 0, 0))
    pill_draw  = ImageDraw.Draw(pill_layer)
    # Dark semi-transparent pill
    pill_draw.rounded_rectangle(
        (36, 22, 36 + pill_w, 22 + pill_h),
        radius=16,
        fill=(dark[0], dark[1], dark[2], 190)
    )
    canvas = Image.alpha_composite(canvas, pill_layer)
    draw   = ImageDraw.Draw(canvas)

    # Accent left border on pill
    draw.rounded_rectangle(
        (36, 22, 42, 22 + pill_h),
        radius=4,
        fill=(accent[0], accent[1], accent[2], 255)
    )
    draw.text((36 + pill_padding + 4, 26),      brand,          font=font_brand, fill=(255, 255, 255, 255))
    draw.text((36 + pill_padding + 4, 26 + 34), cat.upper(),    font=font_cat,   fill=(accent[0], accent[1], accent[2], 230))

    # ── 8. Hook headline — white text with drop-shadow on gradient ─────────
    HOOK_LEFT   = 48
    HOOK_TOP    = 520
    HOOK_MAX_W  = IMAGE_WIDTH - HOOK_LEFT - 60   # leave right margin

    # Pick font size: try large, fall back to smaller if text is long
    hook_words = hook.split()
    hook_lines = _wrap_text(draw, hook, font_hook, HOOK_MAX_W, max_lines=2)
    if len(" ".join(hook_lines)) < len(hook):   # text got cut — use smaller font
        hook_lines = _wrap_text(draw, hook, font_hook_sm, HOOK_MAX_W, max_lines=2)
        chosen_hook_font = font_hook_sm
        line_h = 66
    else:
        chosen_hook_font = font_hook
        line_h = 80

    # Draw soft drop-shadow first, then white text
    shadow_offset = 3
    cur_y = HOOK_TOP
    for line in hook_lines:
        draw.text((HOOK_LEFT + shadow_offset, cur_y + shadow_offset), line,
                  font=chosen_hook_font, fill=(0, 0, 0, 120))
        draw.text((HOOK_LEFT, cur_y), line,
                  font=chosen_hook_font, fill=(255, 255, 255, 255))
        cur_y += line_h

    # ── 9. Support tagline — slightly muted white ──────────────────────────
    SUPPORT_TOP = cur_y + 10
    # Clamp support line to fit above the bottom action row (y=760)
    if SUPPORT_TOP > 720:
        SUPPORT_TOP = 720
    support_lines = _wrap_text(draw, support_line, font_support, HOOK_MAX_W, max_lines=2)
    sup_y = SUPPORT_TOP
    for sline in support_lines:
        draw.text((HOOK_LEFT + 2, sup_y + 2), sline,   # shadow
                  font=font_support, fill=(0, 0, 0, 90))
        draw.text((HOOK_LEFT, sup_y), sline,
                  font=font_support, fill=(220, 230, 255, 210))
        sup_y += 40

    # ── 10. Bottom action row: [BADGE PILL] ··················· [CTA BUTTON] ─
    ACTION_Y    = 822   # bottom of row
    ACTION_H    = 54    # pill/button height

    # Badge pill (left)
    badge_w, _ = _text_size(draw, badge, font_badge)
    BADGE_X     = HOOK_LEFT
    BADGE_Y     = ACTION_Y

    badge_layer = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT), (0, 0, 0, 0))
    badge_draw  = ImageDraw.Draw(badge_layer)
    badge_draw.rounded_rectangle(
        (BADGE_X, BADGE_Y, BADGE_X + badge_w + 44, BADGE_Y + ACTION_H),
        radius=27,
        fill=(accent[0], accent[1], accent[2], 255)
    )
    canvas = Image.alpha_composite(canvas, badge_layer)
    draw   = ImageDraw.Draw(canvas)

    # Badge text: dark colour on accent background for maximum contrast
    badge_text_color = (dark[0], dark[1], dark[2], 255)
    draw.text(
        (BADGE_X + 22, BADGE_Y + (ACTION_H - 28) // 2),
        badge,
        font=font_badge,
        fill=badge_text_color
    )

    # CTA button (right side, aligned to right margin)
    CTA_RIGHT   = IMAGE_WIDTH - 48
    cta_w, _   = _text_size(draw, cta_label, font_cta)
    CTA_BTN_W  = cta_w + 52
    CTA_X      = CTA_RIGHT - CTA_BTN_W
    CTA_Y      = ACTION_Y

    cta_layer = Image.new("RGBA", (IMAGE_WIDTH, IMAGE_HEIGHT), (0, 0, 0, 0))
    cta_draw  = ImageDraw.Draw(cta_layer)
    cta_draw.rounded_rectangle(
        (CTA_X, CTA_Y, CTA_X + CTA_BTN_W, CTA_Y + ACTION_H),
        radius=27,
        fill=(primary[0], primary[1], primary[2], 245)
    )
    canvas = Image.alpha_composite(canvas, cta_layer)
    draw   = ImageDraw.Draw(canvas)
    draw.text(
        (CTA_X + (CTA_BTN_W - cta_w) // 2, CTA_Y + (ACTION_H - 27) // 2),
        cta_label,
        font=font_cta,
        fill=(255, 255, 255, 255)
    )

    canvas.convert("RGB").save(output_path, "WEBP", quality=WEBP_QUALITY, optimize=True)
    print(f"[INFO] Composed ad thumbnail saved: {output_path}")
    return output_path



# ---------------------------------------------------------------------------
# Ideogram-native prompt builder
# ---------------------------------------------------------------------------

def build_ideogram_prompt(
    ai_image_prompt: str,
    category: str = None,
    sub_category: str = None,
    ad_creative_design: dict = None,
    visual_story: dict = None,
    campaign_title: str = None,
) -> str:
    """
    Build a prompt string specifically optimised for Ideogram v2.

    Ideogram v2 excels at:
      - Photorealistic product/lifestyle photography
      - Precise composition control (split-panel, left/right subject position)
      - Accurate background gradients and colour palettes
      - Clean text-safe zones (important for our UI overlays)

    Strategy:
      1. Start with the Gemini-composed ai_image_prompt (most specific seller context)
      2. Inject the per-seller background gradient from ad_creative_design
      3. Inject key visual story props (visual_message, key_prop)
      4. Inject the sub-category style archetype (last 2 phrases = style tag)
      5. Append Ideogram-specific quality suffixes
      6. Hard cap at 400 characters (Ideogram degrades above this length)

    Returns a single prompt string ready for the Ideogram v2 API.
    """
    # ── Step 1: Clean the base Gemini prompt ────────────────────────────────
    base = ai_image_prompt.strip().rstrip(".")
    base = re.sub(r'\[(?:SUBJECT|BACKGROUND|COMPOSITION|STYLE|SCENE|LIGHTING|MOOD|[A-Z ]+)\s*[:\u2014-]\s*', '', base, flags=re.IGNORECASE)
    base = re.sub(r'PREMIUM ADVERTISEMENT for [^:]+:\s*', '', base, flags=re.IGNORECASE)
    base = re.sub(r'\]', '', base)
    base = re.sub(r'\s+', ' ', base).strip().rstrip('.')

    parts = [base]

    # ── Step 2: Per-seller background gradient (KEY DIFFERENTIATOR) ─────────
    if ad_creative_design:
        bg = ad_creative_design.get("background_gradient", "").strip()
        position = ad_creative_design.get("subject_position", "").strip()
        layout = ad_creative_design.get("poster_layout", "").strip()
        if bg and bg.lower() not in base.lower():
            parts.append(bg)
        if layout and layout.lower() not in base.lower():
            parts.append(layout)
        if position and position.lower() not in base.lower():
            parts.append(f"subject positioned {position}")

    # ── Step 3: Key visual props from Gemini's visual_story ─────────────────
    if visual_story:
        for key in ("visual_message", "key_prop"):
            value = (visual_story.get(key) or "").strip()
            if value and value.lower() not in base.lower():
                parts.append(value)

    # ── Step 4: Sub-category style archetype (last 2 phrases = style tag) ───
    cat_archetype = _get_visual_archetype(category or "Other", sub_category)
    archetype_phrases = [p.strip() for p in cat_archetype.split(",") if p.strip()]
    style_tag = ", ".join(archetype_phrases[-2:]) if len(archetype_phrases) >= 2 else cat_archetype
    if style_tag.lower() not in base.lower():
        parts.append(style_tag)

    # ── Step 5: Ideogram quality anchors ────────────────────────────────────
    # Ideogram responds best to photography-style descriptors; avoid token-heavy FLUX anchors
    parts.append(
        "commercial advertising photography, clean studio composition, "
        "lower third darker for text overlay, no visible text, no watermarks, "
        "4:3 aspect ratio, ultra high resolution"
    )

    full = ", ".join(p.rstrip(", ") for p in parts if p)

    # ── Step 6: Hard cap at 400 characters for Ideogram optimal quality ──────
    if len(full) > 400:
        # Keep head (most specific) + always preserve the quality suffix
        quality_suffix = (
            "commercial advertising photography, clean studio composition, "
            "lower third darker for text overlay, no visible text, 4:3 aspect ratio"
        )
        max_head = 400 - len(quality_suffix) - 2  # 2 for ", "
        full = full[:max_head].rstrip(", ") + ", " + quality_suffix

    return full


def build_cloudflare_prompt(
    ai_image_prompt: str,
    category: str = None,
    sub_category: str = None,
    ad_creative_design: dict = None,
    visual_story: dict = None,
    campaign_title: str = None,
    offer_text: str = None,
) -> str:
    """
    Build a FLUX-optimized prompt for Cloudflare Workers AI.

    Core strategy (max 80 words):
      1. GEMINI'S SCENE FIRST — it has the seller-specific aspirational context.
         The Gemini prompt already describes a specific, relevant visual.
         Strip its structural labels and use the pure descriptive content.
      2. Background gradient from ad_creative_design — critical for visual identity.
      3. Archetype style tag (last phrase only) — just the style descriptor, not the object list.
      4. Strong ad-creative FLUX anchors — aspirational, no tools, no props.
    """
    # ── Step 1: Extract the clean scene from Gemini's prompt ─────────────────────
    raw = ai_image_prompt.strip()
    # Strip structural labels (CONCEPT:, SUBJECT:, BACKGROUND:, etc.)
    raw = re.sub(r'(?:CONCEPT|SUBJECT|BACKGROUND|COMPOSITION|STYLE|SCENE|LIGHTING|MOOD|VISUAL STORY|KEY PROP|SETTING)\s*:\s*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'PREMIUM ADVERTISEMENT for [^:]+:\s*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\[.*?\]', '', raw)  # remove [LABEL] brackets
    raw = re.sub(r'\s+', ' ', raw).strip().rstrip('.')

    # Extract only the first strong sentence (before '. ') — most scene-specific
    sentences = re.split(r'(?<=[.!?])\s+', raw)
    core_scene = sentences[0].strip() if sentences else raw

    # ── Step 2: Build the aspirational FLUX prompt ──────────────────────────
    parts = []

    # Use the Gemini scene as primary visual description if it's meaningful
    if len(core_scene.split()) >= 8:
        parts.append(core_scene)
    else:
        # Gemini gave nothing useful — fall back to archetype SCENE description
        archetype = _get_visual_archetype(category or "Other", sub_category)
        archetype_phrases = [p.strip() for p in archetype.split(",") if p.strip()]
        scene_desc = ", ".join(archetype_phrases[:5])  # first 5 phrases = the visual scene
        parts.append(scene_desc)

    # ── Step 3: Background gradient ───────────────────────────────────────
    if ad_creative_design:
        bg = (ad_creative_design.get("background_gradient") or "").strip()
        if bg:
            parts.append(f"background: {bg}")

    # ── Step 4: Ad quality anchors ────────────────────────────────────────
    parts.append(
        "aspirational lifestyle ad photography, beautiful composition, "
        "lower third clear and dark for text, no people, no text, no watermark, sharp focus"
    )

    full_prompt = ", ".join(p.rstrip(", ") for p in parts if p)

    # ── Step 5: Hard cap at 80 words ──────────────────────────────────────
    words = full_prompt.split()
    if len(words) > 80:
        tail = "background: aspirational lifestyle ad photography, lower third clear and dark for text, no people, no text, sharp focus"
        tail_words = tail.split()
        head = " ".join(words[:80 - len(tail_words)])
        full_prompt = f"{head}, {tail}"

    return full_prompt


def generate_image_with_cloudflare(
    prompt: str,
    save_dir: str = "uploads/ai-thumbnails",
) -> str | None:
    """
    Generate an ad image using Cloudflare Workers AI.

    Tries two Cloudflare models in priority order:
      1. @cf/stabilityai/stable-diffusion-xl-base-1.0 — SDXL, best commercial ad quality.
         Better lighting, composition, and scene understanding than FLUX.1-schnell.
      2. @cf/black-forest-labs/flux-1-schnell — Fast fallback if SDXL is unavailable.

    Returns the local file path on success, or None if all Cloudflare models fail.
    """
    account_id = settings.CF_ACCOUNT_ID
    api_token = settings.CF_API_TOKEN
    if not account_id or not api_token:
        print("[INFO] Cloudflare Workers AI not configured (CF_ACCOUNT_ID/CF_API_TOKEN missing). Skipping.")
        return None

    os.makedirs(save_dir, exist_ok=True)
    headers = {"Authorization": f"Bearer {api_token}"}

    # Priority: SDXL first (best quality), FLUX.1-schnell as fallback
    cf_models = [
        {
            "id": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
            "payload": {"prompt": prompt, "num_steps": 12},
        },
        {
            "id": "@cf/black-forest-labs/flux-1-schnell",
            "payload": {"prompt": prompt, "steps": 8},
        },
    ]

    for model_info in cf_models:
        model_id = model_info["id"]
        payload = model_info["payload"]
        filename = f"cf_{uuid.uuid4().hex[:12]}.webp"
        filepath = os.path.join(save_dir, filename)

        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model_id}"
        print(f"[INFO] Calling Cloudflare Workers AI ({model_id.split('/')[-1]}) | prompt_len={len(prompt.split())} words")
        print(f"[INFO] Cloudflare prompt preview: {prompt[:180]}...")

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=120)
        except requests.exceptions.Timeout:
            print(f"[WARN] Cloudflare {model_id} timed out after 120s. Trying next...")
            continue
        except requests.exceptions.RequestException as e:
            print(f"[WARN] Cloudflare {model_id} request failed: {e}. Trying next...")
            continue

        if response.status_code != 200:
            print(f"[WARN] Cloudflare {model_id} returned {response.status_code}: {response.text[:300]}")
            continue

        # Try raw image bytes first (preferred)
        content_type = response.headers.get("content-type", "")
        if "image" in content_type:
            saved = _optimize_to_webp(response.content, filepath)
            return saved

        # Then try JSON with base64
        try:
            resp_json = response.json()
            result = resp_json.get("result", {})
            img_b64 = result.get("image") if isinstance(result, dict) else None
            if img_b64:
                import base64
                img_bytes = base64.b64decode(img_b64)
                saved = _optimize_to_webp(img_bytes, filepath)
                return saved
        except Exception:
            pass

        print(f"[WARN] Cloudflare {model_id}: unexpected response format (Content-Type: {content_type})")

    print("[WARN] All Cloudflare models failed.")
    return None


def generate_campaign_image(
    full_prompt: str,
    negative_prompt: str = None,
    save_dir: str = "uploads/ai-thumbnails",
    cloudflare_prompt: str = None,
) -> str:
    """
    Generate a premium advertising-quality 4:3 image.

    Generation priority (highest quality first):
      1. Cloudflare Workers AI (FLUX.1-schnell)
         — Primary. Free 10K neurons/day, fast, photorealistic.
         — Uses cloudflare_prompt (80-word FLUX-tuned) if provided, else full_prompt.
      2. Ideogram v2 API
         — Secondary. Best text rendering. Uses full_prompt (ideogram-native format).
      3. Pollinations AI (FLUX)
         — Free fallback. Always available. Uses full_prompt.

    Returns the local file path to the saved generated image.
    """
    # ── Attempt 1: Cloudflare Workers AI (FLUX.1-schnell) ───────────────────────
    cf_prompt_to_use = cloudflare_prompt or full_prompt
    cf_path = generate_image_with_cloudflare(cf_prompt_to_use, save_dir=save_dir)
    if cf_path:
        return cf_path

    # ── Attempt 2: Ideogram v2 ─────────────────────────────────────────────
    api_key = settings.IDEOGRAM_API_KEY
    if api_key:
        os.makedirs(save_dir, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.webp"
        filepath = os.path.join(save_dir, filename)
        neg = negative_prompt or FLUX_NEGATIVE_PROMPT
        url = "https://api.ideogram.ai/generate"
        headers = {"Api-Key": api_key, "Content-Type": "application/json"}
        payload = {
            "image_request": {
                "prompt": full_prompt,
                "negative_prompt": neg,
                "model": "V_2",
                "aspect_ratio": "ASPECT_4_3",
                "style_type": "REALISTIC",
                "magic_prompt_option": "ON",
                "num_images": 1,
            }
        }
        print(f"[INFO] Calling Ideogram v2 | prompt_len={len(full_prompt)} chars")
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=180)
            if response.status_code == 200:
                resp_data = response.json()
                images = resp_data.get("data", [])
                if images and images[0].get("url"):
                    img_url = images[0]["url"]
                    img_response = requests.get(img_url, timeout=120)
                    img_response.raise_for_status()
                    saved = _optimize_to_webp(img_response.content, filepath)
                    print(f"[INFO] Ideogram image saved: {saved}")
                    return saved
            elif response.status_code in (401, 402, 403):
                print(f"[WARN] Ideogram API auth/billing error {response.status_code} — skipping to Pollinations")
            else:
                print(f"[WARN] Ideogram API error {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"[WARN] Ideogram generation failed: {e}")

    # ── Attempt 3: Pollinations AI (free FLUX fallback) ──────────────────────
    print("[INFO] Falling back to Pollinations AI (FLUX) for image generation...")
    os.makedirs(save_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.webp"
    filepath = os.path.join(save_dir, filename)
    # Use cf_prompt_to_use (80-word FLUX-tuned) for Pollinations too
    encoded_prompt = urllib.parse.quote(cf_prompt_to_use)
    fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1344&height=1008&model=flux-pro&nologo=true"
    img_response = requests.get(fallback_url, timeout=120)
    img_response.raise_for_status()
    saved = _optimize_to_webp(img_response.content, filepath)
    print(f"[INFO] Pollinations image saved: {saved}")
    return saved


# ---------------------------------------------------------------------------
# Image Quality Reviewer (Gemini Vision)
# ---------------------------------------------------------------------------

def review_campaign_image(image_path: str, business_name: str, category: str, title: str) -> dict:
    """
    Evaluate the generated image using Gemini Vision API.

    Rubric updated from 'photorealism' to 'ad-effectiveness':
    The question is not 'does this look like a nice photo' but
    'does this image WORK as a real ad creative for mobile feed?'

    Six criteria (total 100pts):
      1. Offer Clarity (25pts)        - can you tell what's being offered without reading text?
      2. Thumb-Stop Power (20pts)     - would this stop a scroll in 1.5 seconds on mobile?
      3. Text-Zone Contrast (20pts)   - is the lower third naturally darker/cleaner for overlay text?
      4. Brand Differentiation (15pts)- does the scene look unique vs generic category stock?
      5. Subject Specificity (10pts)  - is the subject tied to THIS offer, not a generic success mood shot?
      6. No Unwanted Text (10pts)     - letters, logos, watermarks? (Major failure if yes.)

    Score >= 75 = accept. Feedback drives retry prompt refinement if < 75.

    Returns: {"score": int (0-100), "feedback": str, "prompt_adjustment": str}
    """
    system_instruction = """You are an Ad Creative Effectiveness Reviewer for REACHLO.
Your job is NOT to judge photographic beauty — you are judging whether this image works as a REAL mobile ad creative.
Evaluate the provided image on a scale of 0-100 based on these 6 ad-effectiveness criteria:

IMPORTANT: Full-bleed subjects filling the frame are CORRECT and must NOT be penalized.
IMPORTANT: A plain portrait on a gradient with only one paper/phone prop is NOT a strong ad creative and must score below 65 unless it has a clear visual metaphor, professional category styling, and meaningful supporting props.
IMPORTANT: For education campaigns, penalize adult office attire, awkward facial styling, religious forehead marks, and images that do not look like a real coaching institute ad.

1. OFFER CLARITY (25pts):
   Can a viewer understand what product/service/deal is being offered in under 2 seconds WITHOUT reading any text?
   25 = immediately obvious | 15 = somewhat clear | 0-10 = confusing or generic

2. THUMB-STOP POWER (20pts):
   Would this image cause someone to stop scrolling on a mobile feed (Instagram/Whatsapp style)?
   Score on: visual drama, emotional pull, color contrast, compositional dynamism.
   20 = would definitely stop a scroll | 10 = would probably scroll past | 0-5 = invisible in a feed

3. TEXT-ZONE CONTRAST (20pts):
   Is the lower third of the image naturally darker, simpler, or less detailed -- creating a high-contrast zone where title + offer badge text can be overlaid and still be readable?
   20 = perfect clean lower third | 10 = somewhat busy lower third | 0 = lower third is bright/cluttered (overlay text would be unreadable)

4. BRAND DIFFERENTIATION (15pts):
   Does the scene feel UNIQUE to this specific business/category, or could it be a generic stock photo for any brand in the industry?
   15 = unmistakably specific to this sub-category | 8 = recognizable category but generic | 0-3 = could be any business

5. AD CONCEPT & SUBJECT SPECIFICITY (10pts):
   Is there a meaningful ad idea, metaphor, proof moment, or set of symbolic props tied to THIS exact offer -- or is it just a generic aspirational person/product shot?
   10 = clear ad concept with relevant props | 5 = loosely related | 0 = generic portrait/product shot

6. NO UNWANTED TEXT (10pts):
   Are there any unwanted text, letters, logos, watermarks, or UI overlays in the image?
   10 = completely clean | 0 = any visible text/watermark (automatic major fail)

Return exactly this JSON structure (no markdown, no prose outside JSON):
{
  "score": 85,
  "prompt_adjustment": "If score < 75, provide 1-3 SPECIFIC, concise visual changes to improve the scene (e.g., 'Zoom in on the subject face to make them more prominent, use warmer lighting'). Keep under 30 words. If score >= 75, leave this field empty string."
}
"""

    prompt = (
        f"Evaluate this image for a '{category}' business named '{business_name}'. "
        f"The campaign headline will be: '{title}'. "
        f"Score it strictly on the 6 criteria above. Remember: a full-bleed subject filling the frame is CORRECT and should NOT be penalized."
    )

    try:
        text = _call_gemini(
            prompt,
            system_instruction=system_instruction,
            temperature=0.2,
            max_tokens=2048,
            image_path=image_path
        )
        return _extract_json(text)
    except Exception as e:
        print(f"[WARN] Image review failed: {e}")
        # Default fallback to pass if reviewer fails
        return {"score": 80, "feedback": "Quality review unavailable, defaulting to standard score.", "prompt_adjustment": ""}

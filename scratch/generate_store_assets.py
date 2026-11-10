import os
from PIL import Image, ImageDraw, ImageFont

# Ensure directories
os.makedirs('store_assets/android', exist_ok=True)
os.makedirs('store_assets/ios', exist_ok=True)
os.makedirs('store_assets/screenshots', exist_ok=True)
os.makedirs('store_assets/metadata', exist_ok=True)

# Colors
MAROON_DARK = (24, 7, 12)
MAROON = (107, 29, 47)
MAROON_BRIGHT = (123, 30, 45)
GOLD = (212, 160, 23)
GOLD_LIGHT = (245, 200, 66)
GOLD_PEARL = (253, 224, 71)
WHITE = (255, 255, 255)
TEXT_DIM = (160, 165, 180)
CARD_BG = (22, 27, 46)
CARD_INNER = (26, 32, 56)
GREEN = (34, 197, 94)
RED = (239, 68, 68)
ORANGE = (245, 158, 11)

# Fonts
try:
    font_bold = lambda sz: ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', sz)
    font_reg = lambda sz: ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', sz)
    font_kn = lambda sz: ImageFont.truetype('C:/Windows/Fonts/Nirmala.ttc', sz)
except Exception:
    font_bold = lambda sz: ImageFont.load_default()
    font_reg = lambda sz: ImageFont.load_default()
    font_kn = lambda sz: ImageFont.load_default()

print("Generating App Icons...")
# 1. Base App Icon from docs/assets/images/app_icon.jpg
base_icon = Image.open('docs/assets/images/app_icon.jpg').convert('RGB')

# 1a. iOS 1024x1024 Icon (MUST BE RGB, NO ALPHA)
ios_icon = base_icon.resize((1024, 1024), Image.Resampling.LANCZOS)
ios_icon.save('store_assets/ios/icon_1024.png', 'PNG')
print("✅ Saved store_assets/ios/icon_1024.png (1024x1024 RGB)")

# Also copy to iOS native project
ios_dest = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
if os.path.exists(os.path.dirname(ios_dest)):
    ios_icon.save(ios_dest, 'PNG')
    print(f"✅ Updated {ios_dest}")

# 1b. Android 512x512 Icon (32-bit PNG with alpha support)
android_icon = base_icon.convert('RGBA').resize((512, 512), Image.Resampling.LANCZOS)
android_icon.save('store_assets/android/icon_512.png', 'PNG')
print("✅ Saved store_assets/android/icon_512.png (512x512 RGBA)")

# Also update native Android mipmap launcher icons
mipmap_sizes = {
    'android/app/src/main/res/mipmap-mdpi': 48,
    'android/app/src/main/res/mipmap-hdpi': 72,
    'android/app/src/main/res/mipmap-xhdpi': 96,
    'android/app/src/main/res/mipmap-xxhdpi': 144,
    'android/app/src/main/res/mipmap-xxxhdpi': 192,
}
for folder, sz in mipmap_sizes.items():
    if os.path.exists(folder):
        resized = base_icon.resize((sz, sz), Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder, 'ic_launcher.png'), 'PNG')
        resized.save(os.path.join(folder, 'ic_launcher_round.png'), 'PNG')
        resized.save(os.path.join(folder, 'ic_launcher_foreground.png'), 'PNG')
print("✅ Updated Android mipmap icons across all DPIs")

# 2. Google Play Feature Graphic (1024 x 500 px)
print("Generating Google Play Feature Graphic (1024x500)...")
fg = Image.new('RGB', (1024, 500), color=MAROON_DARK)
fg_draw = ImageDraw.Draw(fg)

# Vertical Gradient Background
for y in range(500):
    ratio = y / 500.0
    r = int(107 * (1.0 - ratio * 0.7) + 24 * (ratio * 0.7))
    g = int(29 * (1.0 - ratio * 0.7) + 7 * (ratio * 0.7))
    b = int(47 * (1.0 - ratio * 0.7) + 12 * (ratio * 0.7))
    fg_draw.line([(0, y), (1024, y)], fill=(r, g, b))

# Decorative Gold Borders
fg_draw.rectangle([(20, 20), (1004, 480)], outline=GOLD, width=2)
fg_draw.rectangle([(26, 26), (998, 474)], outline=(120, 90, 20), width=1)

# Subtle corner ornaments
for cx, cy in [(20, 20), (1004, 20), (20, 480), (1004, 480)]:
    fg_draw.rectangle([(cx - 8, cy - 8), (cx + 8, cy + 8)], fill=GOLD)

# Left emblem
emblem = base_icon.resize((260, 260), Image.Resampling.LANCZOS)
# Add gold border around emblem
emblem_framed = Image.new('RGB', (272, 272), color=GOLD)
emblem_framed.paste(emblem, (6, 6))
fg.paste(emblem_framed, (60, 114))

# Text Column (starting at x=360)
fg_draw.text((360, 90), "KUBERAN SILKS PRESENTS", fill=GOLD, font=font_bold(18))
fg_draw.text((360, 118), "KUBERAN PANCHANGAM", fill=GOLD_PEARL, font=font_bold(38))
fg_draw.text((360, 170), "ಕುಬೇರನ್ ಪಂಚಾಂಗ — ವೈದಿಕ ದೃಕ್ ಪಂಚಾಂಗ", fill=WHITE, font=font_kn(22))

fg_draw.text((360, 218), "High-Precision Drik Ganita · Modern Swiss Ephemeris & VSOP87", fill=TEXT_DIM, font=font_reg(16))
fg_draw.text((360, 244), "Chitrapaksha (Lahiri) Ayanamsa · 100% On-Device DPDP & GDPR Safe", fill=TEXT_DIM, font=font_reg(15))

# Feature Pills row
pills = [
    ("🌙 Daily Panchanga & Live Timers", GREEN),
    ("📜 Janma Kundli & D9 Navamsha", GOLD),
    ("⏳ Vimshottari Dasha & Kuja Dosha", ORANGE),
    ("⏱️ Gowri Panchangam & Muhurtha", GOLD_LIGHT),
    ("🪔 Karnataka Festivals & Eclipses", WHITE)
]
px, py = 360, 290
for pill_text, p_col in pills:
    pill_w = int(len(pill_text) * 8.5 + 24)
    if px + pill_w > 990:
        px = 360
        py += 40
    fg_draw.rounded_rectangle([(px, py), (px + pill_w, py + 30)], radius=6, fill=CARD_BG, outline=p_col, width=1)
    fg_draw.text((px + 12, py + 6), pill_text, fill=p_col, font=font_bold(12))
    px += pill_w + 10

# Bottom Heritage Tag
fg_draw.text((360, 435), "Heritage Chickpet, Bengaluru · Trusted by Devotees Globally · kuberansilks.com", fill=GOLD, font=font_reg(13))

fg.save('store_assets/android/feature_graphic_1024x500.png', 'PNG')
print("✅ Saved store_assets/android/feature_graphic_1024x500.png (1024x500)")

# 3. Four Showcase Screenshots (1080 x 1920 px, 9:16 aspect ratio)
def create_screenshot_canvas(headline_en, headline_kn, sub_en, accent_col):
    sc = Image.new('RGB', (1080, 1920), color=MAROON_DARK)
    d = ImageDraw.Draw(sc)
    
    # Top banner gradient
    for y in range(320):
        r = int(107 - y * 0.25)
        g = int(29 - y * 0.07)
        b = int(47 - y * 0.11)
        d.line([(0, y), (1080, y)], fill=(max(15, r), max(5, g), max(10, b)))
    
    # Header Branding
    d.text((60, 48), "KUBERAN SILKS • CHICKPET, BENGALURU", fill=GOLD, font=font_bold(22))
    d.text((60, 84), headline_en, fill=WHITE, font=font_bold(44))
    d.text((60, 142), headline_kn, fill=GOLD_PEARL, font=font_kn(28))
    d.text((60, 188), sub_en, fill=TEXT_DIM, font=font_reg(22))
    
    # Divider Line with Gold Diamond
    d.line([(60, 240), (1020, 240)], fill=(80, 60, 25), width=2)
    d.rectangle([(532, 236), (548, 244)], fill=accent_col)
    
    # Simulated Device Phone Body Frame
    phone_box = [(60, 270), (1020, 1850)]
    d.rounded_rectangle(phone_box, radius=28, fill=CARD_BG, outline=GOLD, width=3)
    
    # Notch / Safe-Area Header inside phone
    d.rounded_rectangle([(390, 282), (690, 312)], radius=15, fill=(12, 15, 26))
    
    # App Bar inside Phone
    d.rectangle([(63, 330), (1017, 410)], fill=(17, 21, 39))
    d.text((100, 355), "🕉️ KUBERAN PANCHANGAM", fill=GOLD_PEARL, font=font_bold(26))
    d.text((820, 357), "📍 Bengaluru", fill=TEXT_DIM, font=font_reg(20))
    
    return sc, d

# --- SCREENSHOT 1: Daily Panchangam ---
print("Generating Screenshot 1: Daily Panchangam...")
sc1, d1 = create_screenshot_canvas(
    "AUTHENTIC DRIK PANCHANGAM",
    "ದೃಕ್ ಸಿದ್ಧ ಪಂಚಾಂಗ & ಲೈವ್ ಮುಹೂರ್ತ",
    "Precise Tithi Start-End, Nakshatra, Rahu Kala & Moon Phase",
    GOLD
)

# Header Card
d1.rounded_rectangle([(100, 440), (980, 590)], radius=16, fill=MAROON, outline=GOLD, width=2)
d1.text((140, 465), "Shubhakrit Samvatsara · Dakshinayana · Sharad Ritu", fill=GOLD_PEARL, font=font_kn(26))
d1.text((140, 505), "Ashvina Masa · Shukla Paksha · Friday (ಶುಕ್ರವಾರ)", fill=WHITE, font=font_bold(28))
d1.text((140, 545), "☀️ Sunrise: 06:10 AM   |   🌇 Sunset: 06:05 PM", fill=TEXT_DIM, font=font_reg(22))

# Live Muhurtha Alert Banner
d1.rounded_rectangle([(100, 615), (980, 695)], radius=12, fill=(34, 197, 94, 40), outline=GREEN, width=2)
d1.text((130, 630), "✨ Abhijit Muhurtha Active Now (ಅಭಿಜಿತ್ ಮುಹೂರ್ತ)", fill=GREEN, font=font_bold(24))
d1.text((130, 660), "11:44 AM – 12:32 PM · Highly Auspicious for all beginnings", fill=WHITE, font=font_reg(20))

# 5 Limbs Cards (2x2 grid + 1 wide)
limbs = [
    ("🌙 TITHI (ತಿಥಿ)", "Shukla Dashami (ವಿಜಯದಶಮಿ)", "Start: 07:15 AM · End: 06:40 AM (Next Day)", GOLD_PEARL),
    ("⭐ NAKSHATRA (ನಕ್ಷತ್ರ)", "Shravana (ಶ್ರವಣ) · Pada 2", "Ends: 05:22 PM · Subrahmanya Preeti", WHITE),
    ("🧘 YOGA (ಯೋಗ)", "Siddha (ಸಿದ್ಧ ಯೋಗ)", "Auspicious Spiritual Harmony", WHITE),
    ("⚡ KARANA (ಕರಣ)", "Garija (ಗರಿಜ ಕರಣ)", "Prosperous Mercantile Success", WHITE),
    ("📅 VARA & SAMVATSARA", "Bhargava Vara (Venus Day)", "Auspicious for Silk, Gold & Wealth Rituals", GOLD_LIGHT)
]

y_pos = 720
for label, val, sub, col in limbs[:4]:
    d1.rounded_rectangle([(100, y_pos), (980, y_pos + 110)], radius=12, fill=CARD_INNER, outline=(50, 60, 90), width=1)
    d1.text((130, y_pos + 14), label, fill=GOLD, font=font_bold(18))
    d1.text((130, y_pos + 42), val, fill=col, font=font_bold(26))
    d1.text((130, y_pos + 78), sub, fill=TEXT_DIM, font=font_reg(19))
    y_pos += 125

# Inauspicious Periods Box
d1.rounded_rectangle([(100, y_pos), (980, y_pos + 260)], radius=14, fill=CARD_INNER, outline=(120, 40, 50), width=2)
d1.text((130, y_pos + 18), "⚠️ TIME WINDOWS (ಕಾಲ ವಿವರಗಳು)", fill=RED, font=font_bold(20))

windows = [
    ("⛔ Rahu Kalam (ರಾಹು ಕಾಲ):", "10:30 AM – 12:00 PM", RED),
    ("🟡 Yamaganda (ಯಮಗಂಡ):", "03:00 PM – 04:30 PM", ORANGE),
    ("🟣 Gulika Kalam (ಗುಳಿಕ ಕಾಲ):", "07:30 AM – 09:00 AM", (180, 120, 255)),
    ("🍯 Amrit Kalam (ಅಮೃತ ಕಾಲ):", "02:15 PM – 03:50 PM", GREEN)
]
wy = y_pos + 56
for w_name, w_time, w_col in windows:
    d1.text((130, wy), w_name, fill=WHITE, font=font_reg(22))
    d1.text((580, wy), w_time, fill=w_col, font=font_bold(22))
    wy += 46

# Moon Phase Banner at bottom
d1.rounded_rectangle([(100, 1500), (980, 1610)], radius=14, fill=MAROON, outline=GOLD, width=1)
d1.text((140, 1525), "🌔 Shukla Paksha — 84% Waxing Gibbous Moon", fill=GOLD_PEARL, font=font_bold(24))
d1.text((140, 1565), "Next Pournami: Oct 29 · Chandra Gochara in Makara Rashi", fill=WHITE, font=font_reg(20))

sc1.save('store_assets/screenshots/screenshot_1_daily_panchangam.png', 'PNG')
print("✅ Saved Screenshot 1")

# --- SCREENSHOT 2: Kundli & Jathaka ---
print("Generating Screenshot 2: Janma Jathaka & Dasha...")
sc2, d2 = create_screenshot_canvas(
    "VEDIC JANMA JATHAKA & KUNDLI",
    "ಜನ್ಮ ಜಾತಕ, ನವಾಂಶ & ವಿಂಶೋತ್ತರಿ ದಶಾ",
    "South & North Indian Kundli Charts, D9 Navamsha & Kuja Dosha",
    GOLD_PEARL
)

# Profile Card
d2.rounded_rectangle([(100, 440), (980, 550)], radius=14, fill=CARD_INNER, outline=GOLD, width=2)
d2.text((130, 460), "👤 Native: Ananya Sharma", fill=GOLD_PEARL, font=font_bold(28))
d2.text((130, 502), "DOB: 15 May 1996, 09:45 AM · Bengaluru, India (12.97°N, 77.59°E)", fill=TEXT_DIM, font=font_reg(20))

# Vedic Planets & Signs Summary Grid
d2.rounded_rectangle([(100, 570), (980, 730)], radius=14, fill=CARD_INNER, outline=(50, 60, 90), width=1)
d2.text((130, 588), "⭐ JANMA NAKSHATRA & RASHI SUMMARY", fill=GOLD, font=font_bold(19))
summary_items = [
    ("Moon Sign (ಚಂದ್ರ ರಾಶಿ):", "Mesha (Aries / ಮೇಷ)"),
    ("Janma Nakshatra:", "Ashwini (Pada 3 / ಅಶ್ವಿನಿ)"),
    ("Ascendant / Lagna (ಲಗ್ನ):", "Mithuna (Gemini / ಮಿಥುನ)"),
    ("Namakarana Syllable:", "Cho / ಚೋ (Vedic Letter)")
]
sy = 624
for s_lbl, s_val in summary_items:
    d2.text((130, sy), s_lbl, fill=TEXT_DIM, font=font_reg(20))
    d2.text((540, sy), s_val, fill=WHITE, font=font_bold(21))
    sy += 24

# Simulated South Indian Kundli Chart
d2.rounded_rectangle([(240, 755), (840, 1155)], radius=10, fill=(16, 21, 38), outline=GOLD, width=3)
# 4x4 Grid lines
for i in [390, 540, 690]:
    d2.line([(i, 755), (i, 1155)], fill=GOLD, width=1)
for j in [855, 955, 1055]:
    d2.line([(240, j), (840, j)], fill=GOLD, width=1)
# Center block
d2.rectangle([(390, 855), (690, 1055)], fill=(12, 15, 26), outline=GOLD, width=2)
d2.text((450, 930), "D1 RASI", fill=GOLD_PEARL, font=font_bold(26))
d2.text((435, 970), "CHAKRA", fill=WHITE, font=font_bold(22))

# Graha labels in houses
d2.text((260, 780), "♓ Jup", fill=GOLD_LIGHT, font=font_bold(20))
d2.text((410, 780), "♈ Moon", fill=WHITE, font=font_bold(20))
d2.text((560, 780), "♉ Sun, Ven", fill=GOLD, font=font_bold(20))
d2.text((710, 780), "♊ Lagna", fill=GREEN, font=font_bold(20))
d2.text((710, 880), "♋ Mars", fill=RED, font=font_bold(20))
d2.text((710, 980), "♌ Rahu", fill=ORANGE, font=font_bold(20))
d2.text((560, 1080), "♐ Sat", fill=(100, 180, 255), font=font_bold(20))

# Kuja Dosha Status Card
d2.rounded_rectangle([(100, 1180), (980, 1310)], radius=14, fill=(34, 197, 94, 30), outline=GREEN, width=2)
d2.text((130, 1205), "🛡️ Kuja Dosha Status: Cancelled (ದೋಷ ಭಂಗ / ಪರಿಹಾರ)", fill=GREEN, font=font_bold(24))
d2.text((130, 1245), "Mars in Cancer (Neecha Kshetra) & Jupiter Aspect pacifies affliction.", fill=WHITE, font=font_reg(20))
d2.text((130, 1275), "Suitable for both Manglik and Non-Manglik alliances without hesitation.", fill=TEXT_DIM, font=font_reg(18))

# Vimshottari Dasha Timeline Card
d2.rounded_rectangle([(100, 1335), (980, 1680)], radius=14, fill=CARD_INNER, outline=GOLD, width=2)
d2.text((130, 1358), "⏳ VIMSHOTTARI DASHA & ANTARDASHA (ವಿಂಶೋತ್ತರಿ ದಶಾ ವಿವರ)", fill=GOLD_PEARL, font=font_bold(22))

dashas = [
    ("Ketu Mahadasha (ಜನ್ಮ ಶೇಷ):", "1996 → 2001 (5 Yrs Balance)", WHITE),
    ("Venus Mahadasha (ಶುಕ್ರ ದಶಾ):", "2001 → 2021 (20 Yrs Completed)", TEXT_DIM),
    ("Sun Mahadasha (ಸೂರ್ಯ ದಶಾ):", "2021 → 2027 (ACTIVE NOW)", GREEN),
    ("   ↳ Current Antardasha:", "Sun-Jupiter (ಗುರು ಭುಕ್ತಿ) till Mar 2027", GOLD_LIGHT),
    ("Moon Mahadasha (ಚಂದ್ರ ದಶಾ):", "2027 → 2037 (10 Years Upcoming)", WHITE)
]
dy = 1400
for d_lbl, d_val, d_col in dashas:
    d2.text((130, dy), d_lbl, fill=d_col, font=font_bold(21) if "ACTIVE" in d_val or "Current" in d_lbl else font_reg(21))
    d2.text((550, dy), d_val, fill=d_col, font=font_bold(21))
    dy += 52

sc2.save('store_assets/screenshots/screenshot_2_kundli_jathaka.png', 'PNG')
print("✅ Saved Screenshot 2")

# --- SCREENSHOT 3: Gowri & Choghadiya ---
print("Generating Screenshot 3: Gowri Panchangam & Muhurtha...")
sc3, d3 = create_screenshot_canvas(
    "GOWRI PANCHANGAM & CHOGHADIYA",
    "ಗೌರಿ ಪಂಚಾಂಗ, ಚೋಘಡಿಯಾ & ಹೋರಾ",
    "Karnataka Tradition 8 Time Slots, Day-Night Horas & Tarabalam",
    GOLD
)

# Gowri Intro Card
d3.rounded_rectangle([(100, 440), (980, 540)], radius=14, fill=MAROON, outline=GOLD, width=2)
d3.text((130, 462), "☀️ Day & Night Gowri Panchangam (ಗೌರಿ ಪಂಚಾಂಗ ಸಮಯ)", fill=GOLD_PEARL, font=font_bold(26))
d3.text((130, 502), "8 rotating slots derived from Karnataka almanac tradition for auspicious ventures.", fill=WHITE, font=font_reg(19))

# Gowri Slots Table
gowri_slots = [
    ("Amrita (ಅಮೃತ)", "06:10 AM – 07:40 AM", "🌟 Best / ಅತ್ಯಂತ ಶುಭ (Nectar)", GREEN),
    ("Vishakanda (ವಿಷಕಂದ)", "07:40 AM – 09:10 AM", "⛔ Inauspicious / ವರ್ಜ್ಯ (Poison)", RED),
    ("Mahodaya (ಮಹೋದಯ)", "09:10 AM – 10:40 AM", "✅ Auspicious / ಶುಭ (Great Rise)", GREEN),
    ("Dhanada (ಧನದ)", "10:40 AM – 12:10 PM", "✅ Wealth & Trade / ಲಾಭದಾಯಕ", GREEN),
    ("Rogana (ರೋಗಣ)", "12:10 PM – 01:40 PM", "⚠️ Health Hindrance / ಜಾಗ್ರತೆ", RED),
    ("Kaalvela (ಕಾಲವೇಲ)", "01:40 PM – 03:10 PM", "⛔ Death window / ಅಶುಭ", RED),
    ("Shubha (ಶುಭ)", "03:10 PM – 04:40 PM", "✅ Safe & Fruitful / ಶುಭ ಫಲ", GREEN),
    ("Laabha (ಲಾಭ)", "04:40 PM – 06:05 PM", "🌟 Highly Profitable / ಸರ್ವ ಲಾಭ", GREEN)
]

gy = 560
for g_name, g_time, g_effect, g_col in gowri_slots:
    d3.rounded_rectangle([(100, gy), (980, gy + 64)], radius=10, fill=CARD_INNER, outline=(40, 50, 75), width=1)
    # Status dot
    d3.ellipse([(124, gy + 24), (142, gy + 42)], fill=g_col)
    d3.text((160, gy + 18), g_name, fill=WHITE, font=font_bold(22))
    d3.text((480, gy + 18), g_time, fill=TEXT_DIM, font=font_reg(21))
    d3.text((750, gy + 18), g_effect.split('/')[0], fill=g_col, font=font_bold(20))
    gy += 74

# Planetary Horas Card
d3.rounded_rectangle([(100, gy + 20), (980, gy + 280)], radius=14, fill=CARD_INNER, outline=GOLD, width=2)
d3.text((130, gy + 42), "🪐 PLANETARY HORAS (ಗ್ರಹ ಹೋರಾ ವಿವರಣೆ)", fill=GOLD_PEARL, font=font_bold(22))
d3.text((130, gy + 78), "Chaldean Planetary Order with Real-Time Countdown Indicators", fill=TEXT_DIM, font=font_reg(19))

horas = [
    ("☀️ Sun Hora (ಸೂರ್ಯ)", "06:10 AM – 07:10 AM", "Admin & Govt Deeds", ORANGE),
    ("⚪ Venus Hora (ಶುಕ್ರ)", "07:10 AM – 08:10 AM", "Silk Buying, Jewelry, Luxury", GREEN),
    ("🟢 Mercury Hora (ಬುಧ)", "08:10 AM – 09:10 AM", "Commerce, Accounts, Learning", GREEN),
    ("🌙 Moon Hora (ಚಂದ್ರ)", "09:10 AM – 10:10 AM", "Travel, Domestic Harmony", WHITE)
]
hy = gy + 115
for h_name, h_time, h_use, h_col in horas:
    d3.text((130, hy), h_name, fill=h_col, font=font_bold(21))
    d3.text((450, hy), h_time, fill=WHITE, font=font_reg(20))
    d3.text((740, hy), h_use, fill=TEXT_DIM, font=font_reg(18))
    hy += 38

# Suvarna & Pattu Muhurtha Banner
d3.rounded_rectangle([(100, 1500), (980, 1630)], radius=14, fill=MAROON, outline=GOLD, width=2)
d3.text((130, 1525), "👑 SUVARNA & PATTU MUHURTHAM (ಚಿನ್ನ & ರೇಷ್ಮೆ ಖರೀದಿ)", fill=GOLD_PEARL, font=font_bold(24))
d3.text((130, 1565), "Guru/Shukra Hora overlap with Pushya/Hasta Nakshatras flagged automatically.", fill=WHITE, font=font_reg(19))
d3.text((130, 1595), "Perfect for wedding saree trousseau shopping at Kuberan Silks.", fill=GOLD_LIGHT, font=font_bold(18))

sc3.save('store_assets/screenshots/screenshot_3_gowri_choghadiya.png', 'PNG')
print("✅ Saved Screenshot 3")

# --- SCREENSHOT 4: Karnataka Calendar & Eclipses ---
print("Generating Screenshot 4: Karnataka Festivals & Calendar...")
sc4, d4 = create_screenshot_canvas(
    "FESTIVALS, VRATAS & ECLIPSES",
    "ಕರ್ನಾಟಕ ಹಬ್ಬ-ಹರಿದಿನಗಳು & ಗ್ರಹಣ",
    "Complete Lunar & Solar Calendar with Eclipse Sutaka Timers",
    GOLD
)

# Year Banner
d4.rounded_rectangle([(100, 440), (980, 540)], radius=14, fill=MAROON, outline=GOLD, width=2)
d4.text((130, 462), "🗓️ 2026-2027 Karnataka Cultural & Religious Calendar", fill=GOLD_PEARL, font=font_bold(26))
d4.text((130, 502), "Amanta Lunar Months, Adhika Masa, Kshaya Tithis & All 12 Solar Sankrantis.", fill=WHITE, font=font_reg(19))

# Festival Highlight Cards
fests = [
    ("🪔 Ugadi (ಯುಗಾದಿ ಹಬ್ಬ)", "Chaitra Shukla Prathama", "Thursday, 19 Mar 2026", "New Samvatsara Begins · Nimba-Kusuma", GOLD_PEARL),
    ("✨ Akshaya Tritiya (ಅಕ್ಷಯ ತೃತೀಯ)", "Vaishakha Shukla Tritiya", "Sunday, 19 Apr 2026", "Gold & Silk Buying Mahamuhurtha", GOLD_LIGHT),
    ("🌺 Gowri Habba & Ganesha Chaturthi", "Bhadrapada Shukla 3 & 4", "14 & 15 Sep 2026", "Grand Mangala Gowri Pooja", WHITE),
    ("👑 Mysuru Dasara / Vijayadashami", "Ashvina Shukla Dashami", "Wednesday, 21 Oct 2026", "Mysuru Jamboo Savari · Ayudha Puja", GOLD_PEARL),
    ("🪔 Deepavali (ಲಕ್ಷ್ಮೀ ಪೂಜೆ)", "Ashvina Krishna Amavasya", "Sunday, 08 Nov 2026", "Dhana Trayodashi · Bali Padyami", GOLD_LIGHT),
    ("☀️ Makara Sankranti (ಮಕರ ಸಂಕ್ರಾಂತಿ)", "Makara Solar Ingress", "Thursday, 14 Jan 2027", "Uttarayana Punya Kaala · Suggi Habba", WHITE)
]

fy = 560
for f_name, f_tithi, f_date, f_desc, f_col in fests:
    d4.rounded_rectangle([(100, fy), (980, fy + 95)], radius=12, fill=CARD_INNER, outline=(50, 60, 90), width=1)
    d4.text((130, fy + 12), f_name, fill=f_col, font=font_bold(23))
    d4.text((700, fy + 14), f_date, fill=GOLD, font=font_bold(20))
    d4.text((130, fy + 44), f_tithi, fill=TEXT_DIM, font=font_reg(19))
    d4.text((130, fy + 68), f_desc, fill=WHITE, font=font_reg(18))
    fy += 110

# Eclipse Finder Card
d4.rounded_rectangle([(100, fy + 15), (980, fy + 265)], radius=14, fill=CARD_INNER, outline=(180, 70, 70), width=2)
d4.text((130, fy + 38), "🌑 SURYA & CHANDRA GRAHANAM FINDER (ಗ್ರಹಣ ಕಾಲ)", fill=RED, font=font_bold(22))
d4.text((130, fy + 72), "Astronomical Obscuration & Local Visibility Calculation for India", fill=TEXT_DIM, font=font_reg(19))

eclipses = [
    ("Chandra Grahanam (Total)", "03 Mar 2026", "👁️ Visible in India", "Sparsha: 03:20 PM · Moksha: 06:48 PM", GREEN),
    ("Surya Grahanam (Annular)", "12 Aug 2026", "🌐 Not Visible in India", "Acharana Not Required (ಅಗೋಚರ)", TEXT_DIM)
]
ey = fy + 110
for e_title, e_date, e_vis, e_times, e_col in eclipses:
    d4.text((130, ey), e_title + " — " + e_date, fill=WHITE, font=font_bold(21))
    d4.text((720, ey), e_vis, fill=e_col, font=font_bold(20))
    d4.text((130, ey + 28), e_times, fill=TEXT_DIM, font=font_reg(18))
    ey += 68

# Offline ICS Calendar Sync Banner
d4.rounded_rectangle([(100, 1530), (980, 1650)], radius=14, fill=MAROON, outline=GOLD, width=2)
d4.text((130, 1555), "📲 ONE-CLICK CALENDAR SYNC (.ICS & WHATSAPP)", fill=GOLD_PEARL, font=font_bold(24))
d4.text((130, 1595), "Add Vratas & Auspicious Muhurthams directly to Google Calendar & Apple iCal.", fill=WHITE, font=font_reg(19))

sc4.save('store_assets/screenshots/screenshot_4_karnataka_calendar.png', 'PNG')
print("✅ Saved Screenshot 4")

print("\n🎉 ALL STORE ASSETS GENERATED SUCCESSFULLY!")

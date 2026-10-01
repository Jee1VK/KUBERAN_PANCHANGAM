# PANCHANGAM — DOMAIN KNOWLEDGE + APP BUILD BRIEF
*(Paste this whole file into Antigravity as one prompt. Written 20 Sep 2026.)*

**Tag legend used below**
- **[V]** = verified against live web sources on 20 Sep 2026 (or reproduced by running code in this brief).
- **[C]** = classical/standard convention (consistent across all sources I checked, but it is a convention, not a measurement).
- **[?]** = NOT verified — depends on the specific printed almanac. Make it a **configuration value**, never a hard-coded assumption.

---

## 0. INSTRUCTIONS TO THE CODING AGENT

You are helping build an app around the **Panchangam** (Hindu almanac), specifically the Kannada/Mysuru tradition represented by the **Vontikoppal Panchanga**. Treat Sections 1–11 as the authoritative domain spec. Do not invent astrological rules that are not in this brief; if something is tagged [?], expose it as a setting and ask me.

**Default product to build (edit this block to match your real idea):**
1. Daily view: for any date + location show the five limbs (tithi, vara, nakshatra, yoga, karana) with exact start/end times, sunrise/sunset, Rahu Kala / Yamaganda / Gulika, Abhijit, Brahma Muhurta, Sun/Moon rashi, masa/paksha/samvatsara/ayana/ritu.
2. Month grid view + festival/vrata list (Ekadashi, Amavasya, Purnima, Sankashti Chaturthi, major festivals).
3. "Good time finder": list windows in a day that avoid Rahu Kala, Yamaganda, Gulika, Vishti karana and inauspicious yogas.
4. Bilingual UI: **Kannada (primary) + English**. Use the Kannada names in Section 5.
5. Location-aware (lat/lon/timezone), default Bengaluru; Mysuru selectable. Timezone Asia/Kolkata (UTC+5:30).
6. Engine setting: `drik` (computed, default) vs `manual_override` (table you can import from a licensed source). See Section 3.

**Non-negotiable engineering rules**
- Compute from astronomy (Section 9); do not scrape festival dates.
- Every time value is stored as an absolute instant (UTC) and rendered in the location's timezone. A "panchangam day" runs **sunrise → next sunrise**, not midnight → midnight.
- A single civil day can contain **two tithis, two nakshatras, two yogas, and up to four karanas**. Never store "the tithi of the day" as a single value without also storing the transition time.
- Pass the test vectors in Section 10 (tolerance ±3 minutes) before adding features.
- Add the disclaimer: "Computed values may differ from a printed almanac; for religious observance follow your family priest / the printed Panchanga."

---

## 1. WHAT IS A PANCHANGAM

- **Panchāṅga** = *pañca* (five) + *aṅga* (limb): a Hindu calendar/almanac that gives, for each day, five "limbs" of time **[V]** (Wikipedia "Panchangam"; Drik Panchang; several Panchang explainers).
- Names: **Panchangam** (South India, Telugu/Tamil), **Panchanga** (Kannada: ಪಂಚಾಂಗ), **Panjika** (Bengal/Odisha/Assam/Nepal), **Panchang** (Hindi) **[V]**.
- The five limbs: **Tithi** (lunar day), **Vara** (weekday), **Nakshatra** (lunar mansion), **Yoga** (Sun+Moon combination), **Karana** (half-tithi) **[V]**.
- Used for: fixing festival/vrata dates, choosing muhurta (auspicious times) for weddings, upanayana, griha pravesha, naming ceremonies, business openings; eclipse and planetary-transit tables; annual predictions (rashi phala); and the **Panchanga Shravana** (reading of the almanac on Ugadi) **[V]**.
- Mental model for the app: *a panchangam is a lookup of Sun–Moon geometry, evaluated at local sunrise, plus a set of rules that turn that geometry into named periods and "good/bad time" windows.*
- It is a **lunisolar** system: tithis/months follow the Moon; year, seasons and month naming are tied to the Sun **[C]**.

---

## 2. THE "ONTIKOPPAL / VONTIKOPPAL PANCHANGA"

(The user's spelling "ontikopal" = **Vontikoppal / Ontikoppal**, Kannada **ಒಂಟಿಕೊಪ್ಪಲ್ ಪಂಚಾಂಗ**, also called the **Mysore Panchanga**.)

**What is verified [V — two near-identical 2012 newspaper features (Bangalore First, My Miscellany) plus retail/aggregator listings from 2025–26]:**
- Based in **Mysuru** (Vontikoppal / Vani Vilas Mohalla is a Mysuru locality).
- Started in **1887–88** by **Siddhanti Tammaiah Shastry**; continuous annual printing since. As of 2012 the **fifth generation** of the family was carrying it on; the authors named then were **Siddhanti R. Kumar and his son K. Manohar**, with Kumar's father as verifier. (Dated — the current team may differ [?].)
- It prints values by **all four computation systems — Surya Siddhanta, Aryabhatiya (Arya), Vakya and Drik Ganita — and in both Chandramana and Souramana** reckoning (Siddhanti R. Kumar's own claim in the 2012 article).
- The same article says regional usage is: Vakya → Tamil / Souramana followers; Arya → Vaishnavas; Drik → South Kanara; Surya Siddhanta → rest of Karnataka.
- The 2012 article states it was accepted as the **official Panchanga of the Government of Karnataka**: dates of festivals for the Muzrai (religious endowments) department and government holidays are fixed by the family around June–July, with the gazette notification in October. (2012 claim — re-confirm before stating as current fact [?].)
- 2026–27 edition: Kannada, for the **Parabhava Nama Samvatsara** (year begins 19 Mar 2026). Retail listings name **T. N. Krishnaiah Setty & Sons** as publisher/seller.
- Listed contents (retail description): daily tithi/nakshatra/yoga/karana, Rahu-Yamaganda-Gulika kalas, festival and vrata list (Ekadashi, Amavasya, Purnima, Sankashti, Navaratri…), muhurta dates (vivaha, upanayana, griha pravesha, namakarana), solar & lunar eclipses, Guru/Shani/Rahu-Ketu transits, annual rashi phala with remedies, temple festivals of the Mysuru region.

**NOT verified [?] — ask the user / read the book's introduction (ಪಂಚಾಂಗ ವಿವರಣೆ) before hard-coding:**
- Which of the four systems is the "primary" column for tithi end-times; the exact ayanamsa constant; the reference longitude/city for the printed sunrise; whether times are printed in ghati-vighati from sunrise, clock time, or both (Kannada almanacs traditionally use ghati-vighati **[C]**); the exact print layout.

**Practical/legal notes**
- Astronomical facts (a tithi end-time) are not copyrightable, but the *compiled, edited tables and text* of a published almanac are. Compute your own data; only ingest Vontikoppal's printed values with written permission from the publisher/family.
- Listing error to ignore: one retailer labels the 2025–26 year "Vrishabha Nama Samvatsara" — there is no such name in the 60-year cycle; 2025–26 was **Vishvavasu** [V].

---

## 3. COMPUTATION SYSTEMS (why two almanacs can disagree)

| System | What it is | Who uses it (per Vontikoppal article) |
|---|---|---|
| **Surya Siddhanta (SS)** | Classical text-based algorithm (spherical trigonometry, mean motions + corrections) | Most of Karnataka; Sringeri Peetham publishes an SS-based Panchangam (file name "2026-27-surya-siddhanta-parabha-panchangam") [V] |
| **Aryabhatiya (Arya)** | Aryabhata's parameters | Vaishnavas |
| **Vakya** | Table/verse ("vakya") method that yields positions from memorised sentences | Tamil tradition, Souramana |
| **Drik Ganita** | Modern astronomical computation of actual planetary positions ("drik" = observation) | South Kanara; Drik Panchang website; most apps |

- **Drik Panchang states it computes only Drik Ganita and does not support Surya Siddhanta panchang (except Tamil Panchangam and Bengali Panjika)**, because in its view SS gives imprecise planetary positions [V]. Traditional almanac-makers keep using siddhanta methods for continuity with the texts **[C]**.
- **Consequence for the app:** a Drik-based engine and a Surya-Siddhanta-based printed almanac can give different tithi/nakshatra end-times, and occasionally a different *day* for a festival. Never claim your app "matches Vontikoppal". Show the engine name on screen.
- Design: `engine = "drik"` (default, section 9) | `"manual_override"` (imported table, e.g. licensed Vontikoppal data). Log the engine in every API response.

---

## 4. TIME & CALENDAR FRAMEWORK

**4.1 Day boundary [V/C].** The panchangam day starts and ends at **sunrise** (Drik Panchang notes this explicitly). The tithi/nakshatra/yoga/karana "of the day" is whichever is running at sunrise; the almanac also lists the end-time of each.

**4.2 Traditional time units [C].** 1 day = 60 **ghati** → 1 ghati = 24 min; 1 ghati = 60 **vighati** → 1 vighati = 24 s. 1 **muhurta** = 48 min = 1/30 of a full day-night (= 2 ghati).

**4.3 Sidereal zodiac.** Panchangam positions are **sidereal (nirayana)**: tropical longitude minus **ayanamsa**. India's standard is **Lahiri (Chitrapaksha)** [V — adopted as national standard; Telugu almanacs cite "Lahiri… national standard since 1957"]. Value on 20 Sep 2026 computed by the engine: **24.2303°** (24°13′49″).

**4.4 Month systems.**
- **Chandramana (lunar), Amanta** — month runs new moon → new moon. Used in Karnataka, Andhra, Telangana, Maharashtra, Gujarat [V]. Ugadi = **Chaitra Shukla Pratipada** [V].
- **Purnimanta** — month runs full moon → full moon (North India). Same tithi = same festival, but Krishna-paksha days carry the *next* month's name. (E.g., Karnataka's Magha-Krishna Chaturdashi = North India's Phalguna-Krishna Chaturdashi [C].) The app must default to **Amanta** for Karnataka.
- **Souramana (solar)** — months begin at sankranti (Sun entering a sidereal sign); used in Tamil Nadu/Kerala; Vontikoppal also prints it [V]. Mesha Sankranti ≈ 14 April (Puthandu/Vishu) [V].

**4.5 Year naming.**
- **Samvatsara** (60-year Jovian/“Nama Samvatsara” cycle). 2026–27 = **Parabhava, the 40th** [V] (started Ugadi, Thu **19 Mar 2026** [V]; next year **Plavanga**, 41st, starting Wed **7 Apr 2027** [V]).
- **Shaka era:** 1948 from Ugadi 2026 (1947 before it) [V]. **Vikrama Samvat (Chaitra-based): 2083 → 2084 on 7 Apr 2027** [V]. (Gujarat's Kartikadi Vikrama year differs; not needed for Karnataka.)
- **Formula (checked at 5 anchor years: Sharvari 2020, Krodhi 2024, Vishvavasu 2025, Parabhava 2026, Plavanga 2027):** `index = (shaka_year + 12) mod 60` (0 → 60); `name = SAMVATSARA[index-1]`. Year number changes at Ugadi, not on 1 January.
- Kali-yuga year = Shaka + 3179 (elapsed) — almanacs print elapsed or running (+1) inconsistently [?]; follow the book.

60-year list (index: name; a few names have spelling variants, e.g. Prajapati/Prajotpatti, Nala/Anala, Kalayukti/Kaalayukta):
1 Prabhava, 2 Vibhava, 3 Shukla, 4 Pramoduta, 5 Prajapati, 6 Angirasa, 7 Shrimukha, 8 Bhava, 9 Yuva, 10 Dhatri, 11 Ishvara, 12 Bahudhanya, 13 Pramathi, 14 Vikrama, 15 Vrisha, 16 Chitrabhanu, 17 Svabhanu, 18 Tarana, 19 Parthiva, 20 Vyaya, 21 Sarvajit, 22 Sarvadhari, 23 Virodhi, 24 Vikruti, 25 Khara, 26 Nandana, 27 Vijaya, 28 Jaya, 29 Manmatha, 30 Durmukhi, 31 Hevilambi, 32 Vilambi, 33 Vikari, 34 Sharvari, 35 Plava, 36 Shubhakrit, 37 Shobhakrit, 38 Krodhi, 39 Vishvavasu, 40 Parabhava, 41 Plavanga, 42 Kilaka, 43 Saumya, 44 Sadharana, 45 Virodhikrit, 46 Paridhavi, 47 Pramadicha, 48 Ananda, 49 Rakshasa, 50 Nala, 51 Pingala, 52 Kalayukti, 53 Siddharthi, 54 Raudra, 55 Durmati, 56 Dundubhi, 57 Rudhirodgari, 58 Raktakshi, 59 Krodhana, 60 Akshaya. (Indices 34–41 are [V]; the rest is the standard order [C] — cross-check against the printed book's year page.)

**4.6 Ayana & Ritu [C].**
- **Uttarayana** starts at Makara Sankranti (~14 Jan); **Dakshinayana** at Karka Sankranti (~16 Jul). On 20 Sep 2026 → Dakshinayana.
- Six **ritus** (lunar-month based in Kannada almanacs): Vasanta (Chaitra–Vaishakha), Grishma (Jyeshtha–Ashadha), Varsha (Shravana–Bhadrapada), Sharad (Ashvina–Kartika), Hemanta (Margashira–Pushya), Shishira (Magha–Phalguna).
- Example header for 20 Sep 2026: *Parabhava Nama Samvatsara · Dakshinayana · Varsha Ritu · Bhadrapada Masa · Shukla Paksha · Navami · Sunday* (ಪರಾಭವ ನಾಮ ಸಂವತ್ಸರ, ದಕ್ಷಿಣಾಯನ, ವರ್ಷ ಋತು, ಭಾದ್ರಪದ ಮಾಸ, ಶುಕ್ಲ ಪಕ್ಷ, ನವಮಿ) — Bhadrapada/Shukla/Navami confirmed by several panchang sites [V].

---

## 5. THE FIVE LIMBS — DEFINITIONS, FORMULAS, TABLES

Let **S** = Sun's sidereal longitude, **M** = Moon's sidereal longitude (degrees, 0–360).

### 5.1 Tithi (ತಿಥಿ) — lunar day **[V]**
- `elongation = (M − S) mod 360`; **tithi number = floor(elongation / 12) + 1** → 1..30. One tithi = the time for the Moon to gain 12° on the Sun.
- Tithi duration varies (roughly 19–26 h) because Moon/Sun speeds vary [V], so tithis start/end at arbitrary clock times.
- **Paksha (ಪಕ್ಷ):** tithis 1–15 = **Shukla** (waxing, ಶುಕ್ಲ), 16–30 = **Krishna** (waning, ಕೃಷ್ಣ). Tithi 15 = **Purnima**, tithi 30 = **Amavasya**. Amanta months start at Shukla Pratipada.
- Names (Kannada): 1 Pratipada ಪಾಡ್ಯ · 2 Dwitiya ಬಿದಿಗೆ · 3 Tritiya ತದಿಗೆ · 4 Chaturthi ಚತುರ್ಥಿ (ಚೌತಿ) · 5 Panchami ಪಂಚಮಿ · 6 Shashthi ಷಷ್ಠಿ · 7 Saptami ಸಪ್ತಮಿ · 8 Ashtami ಅಷ್ಟಮಿ · 9 Navami ನವಮಿ · 10 Dashami ದಶಮಿ · 11 Ekadashi ಏಕಾದಶಿ · 12 Dwadashi ದ್ವಾದಶಿ · 13 Trayodashi ತ್ರಯೋದಶಿ · 14 Chaturdashi ಚತುರ್ದಶಿ · 15 Purnima ಹುಣ್ಣಿಮೆ (ಪೂರ್ಣಿಮೆ) · 30 Amavasya ಅಮಾವಾಸ್ಯೆ.
- **Tithi groups [C]:** Nanda (1,6,11), Bhadra (2,7,12), Jaya (3,8,13), Rikta (4,9,14), Purna (5,10,15) — repeated in each paksha. Rikta tithis are commonly avoided for auspicious starts; Amavasya is avoided for most auspicious events.
- Muhurta guidance sources list Shukla Dwitiya, Tritiya, Panchami, Saptami, Dashami, Ekadashi, Dwadashi, Trayodashi as generally favourable for new beginnings [V, one source; treat as a soft rule].

### 5.2 Vara (ವಾರ) — weekday **[C]**
Sunday ಭಾನುವಾರ (Sun) · Monday ಸೋಮವಾರ (Moon) · Tuesday ಮಂಗಳವಾರ (Mars) · Wednesday ಬುಧವಾರ (Mercury) · Thursday ಗುರುವಾರ (Jupiter) · Friday ಶುಕ್ರವಾರ (Venus) · Saturday ಶನಿವಾರ (Saturn). The vara changes at **sunrise**, not midnight.

### 5.3 Nakshatra (ನಕ್ಷತ್ರ) — lunar mansion **[V]**
- 27 equal parts of the zodiac, each **13°20′ (13.3333°)**. `nakshatra index = floor(M / 13.3333)` (0=Ashwini … 26=Revati). **Pada (quarter)** = 3°20′ each → `pada = floor((M mod 13.3333)/3.3333) + 1` (1–4). 4 padas × 27 = 108.
- Moon's rashi = `floor(M/30)` (0=Mesha). Each rashi = 9 padas.
- Vimshottari lord of nakshatra = `["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"][index % 9]` [C].

| # | Nakshatra | Kannada | # | Nakshatra | Kannada |
|---|---|---|---|---|---|
| 1 | Ashwini | ಅಶ್ವಿನಿ | 15 | Swati | ಸ್ವಾತಿ |
| 2 | Bharani | ಭರಣಿ | 16 | Vishakha | ವಿಶಾಖ |
| 3 | Krittika | ಕೃತ್ತಿಕಾ | 17 | Anuradha | ಅನುರಾಧ |
| 4 | Rohini | ರೋಹಿಣಿ | 18 | Jyeshtha | ಜ್ಯೇಷ್ಠ |
| 5 | Mrigashira | ಮೃಗಶಿರ | 19 | Mula | ಮೂಲ |
| 6 | Ardra | ಆರ್ದ್ರಾ | 20 | Purva Ashadha | ಪೂರ್ವಾಷಾಢ |
| 7 | Punarvasu | ಪುನರ್ವಸು | 21 | Uttara Ashadha | ಉತ್ತರಾಷಾಢ |
| 8 | Pushya | ಪುಷ್ಯ | 22 | Shravana | ಶ್ರವಣ |
| 9 | Ashlesha | ಆಶ್ಲೇಷ | 23 | Dhanishta | ಧನಿಷ್ಠ |
| 10 | Magha | ಮಘ | 24 | Shatabhisha | ಶತಭಿಷ |
| 11 | Purva Phalguni | ಪೂರ್ವ ಫಲ್ಗುಣಿ | 25 | Purva Bhadrapada | ಪೂರ್ವಾಭಾದ್ರ |
| 12 | Uttara Phalguni | ಉತ್ತರ ಫಲ್ಗುಣಿ | 26 | Uttara Bhadrapada | ಉತ್ತರಾಭಾದ್ರ |
| 13 | Hasta | ಹಸ್ತ | 27 | Revati | ರೇವತಿ |
| 14 | Chitra | ಚಿತ್ರಾ | | | |

- **Ganda-Mula nakshatras** (junction nakshatras; births in them get special observance): Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati [V].

### 5.4 Yoga (ಯೋಗ) — Sun+Moon **[V]**
- `yoga angle = (S + M) mod 360`; **yoga index = floor(angle / 13.3333)** → 27 yogas. (Not the physical practice, not natal-chart yogas.)
- Order: 1 Vishkambha, 2 Priti, 3 Ayushman, 4 Saubhagya, 5 Shobhana, 6 Atiganda, 7 Sukarma, 8 Dhriti, 9 Shula, 10 Ganda, 11 Vriddhi, 12 Dhruva, 13 Vyaghata, 14 Harshana, 15 Vajra, 16 Siddhi, 17 Vyatipata, 18 Variyan, 19 Parigha, 20 Shiva, 21 Siddha, 22 Sadhya, 23 Shubha, 24 Shukla, 25 Brahma, 26 Indra, 27 Vaidhriti.
- Traditionally **inauspicious (avoid new starts) [C; consistent with sources]:** Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti. Others are neutral/auspicious (Siddha, Amrita-type combos, Brahma/Indra = supportive).
- A single day can pass through two yogas.

### 5.5 Karana (ಕರಣ) — half-tithi **[V]**
- Karana = time for elongation to advance **6°**. 30 tithis × 2 = **60 karanas per lunar month**, but only **11 names**.
- **7 movable (chara), repeating 8 times:** Bava, Balava, Kaulava, Taitila, Gara, Vanija, **Vishti (Bhadra — inauspicious)**.
- **4 fixed (sthira), once a month:** Shakuni, Chatushpada, Naga, Kimstughna.
- Position rule (`k = floor(elongation/6) + 1`, 1..60): k=1 → Kimstughna (first half of Shukla Pratipada); k=2..57 → movable, `MOVABLE[(k−2) mod 7]`; k=58 → Shakuni (Krishna Chaturdashi 2nd half); k=59 → Chatushpada (Amavasya 1st half); k=60 → Naga (Amavasya 2nd half). Fixed karanas are traditionally considered inauspicious for new work; Vishti/Bhadra is the one to flag in the UI.

### 5.6 Rashi (ರಾಶಿ) — zodiac signs (Sun and Moon positions are printed daily)
Index 0–11: Mesha ಮೇಷ (Mars) · Vrishabha ವೃಷಭ (Venus) · Mithuna ಮಿಥುನ (Mercury) · Karka ಕರ್ಕಾಟಕ (Moon) · Simha ಸಿಂಹ (Sun) · Kanya ಕನ್ಯಾ (Mercury) · Tula ತುಲಾ (Venus) · Vrishchika ವೃಶ್ಚಿಕ (Mars) · Dhanu ಧನುಸ್ಸು (Jupiter) · Makara ಮಕರ (Saturn) · Kumbha ಕುಂಭ (Saturn) · Meena ಮೀನ (Jupiter). Each = 30° sidereal.

---

## 6. LUNAR MONTH (MASA) NAMING, ADHIKA & KSHAYA

**Amanta month rule [C, reproduced by code below]:** a lunar month runs from one new moon to the next. Name it by the **sidereal sign the Sun occupies at the *starting* new moon**:

| Sun's sign at starting new moon | Meena | Mesha | Vrishabha | Mithuna | Karka | Simha | Kanya | Tula | Vrishchika | Dhanu | Makara | Kumbha |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Month | **Chaitra** | Vaishakha | Jyeshtha | Ashadha | Shravana | Bhadrapada | Ashvina | Kartika | Margashira | Pushya | Magha | Phalguna |
| Kannada | ಚೈತ್ರ | ವೈಶಾಖ | ಜ್ಯೇಷ್ಠ | ಆಷಾಢ | ಶ್ರಾವಣ | ಭಾದ್ರಪದ | ಆಶ್ವಯುಜ | ಕಾರ್ತಿಕ | ಮಾರ್ಗಶಿರ | ಪುಷ್ಯ | ಮಾಘ | ಫಾಲ್ಗುಣ |

- **Adhika masa (ಅಧಿಕ ಮಾಸ, "Mala/Purushottama masa")**: a lunar month in which **no sankranti occurs** (Sun is in the same sign at both bounding new moons). It is an extra month, ~every 33 months (range 28–36) [V]. It is named after the **normal month that follows it**, which is then called **Nija (ನಿಜ)**. Auspicious samskaras (weddings, griha pravesha, etc.) are traditionally not performed in it [V]; vratas already begun may continue; religious study/charity/Vishnu worship are emphasised [V].
- **2026 example [V]:** *Adhika Jyeshtha* = **17 May – 15 Jun 2026**; *Nija Jyeshtha* = 16 Jun – 14 Jul 2026 (Kannada, Telugu, Marathi, Gujarati and North-Indian calendars agree on the Adhika dates). Not observed in Tamil Nadu/Kerala/Bengal-type solar calendars [V].
- **Kshaya masa**: the opposite (two sankrantis inside one lunar month). Extremely rare (decades apart). Detect and flag; don't build UI for it.
- A lunar month has 29–30 tithis' worth of days; a tithi can be **skipped (kshaya tithi)** or **repeated (vriddhi tithi)** at sunrise (see Section 8).

**Computed lunar months Ugadi 2026 → Ugadi 2027 (start/end = new-moon instants, IST; engine output):**

| Month | Starts (new moon) | Ends |
|---|---|---|
| Chaitra | 19 Mar 2026 06:53 | 17 Apr 17:21 |
| Vaishakha | 17 Apr 17:21 | 17 May 01:31 |
| **Adhika Jyeshtha** | 17 May 01:31 | 15 Jun 08:24 |
| Nija Jyeshtha | 15 Jun 08:24 | 14 Jul 15:13 |
| Ashadha | 14 Jul 15:13 | 12 Aug 23:06 |
| Shravana | 12 Aug 23:06 | 11 Sep 08:57 |
| Bhadrapada | 11 Sep 08:57 | 10 Oct 21:20 |
| Ashvina | 10 Oct 21:20 | 9 Nov 12:32 |
| Kartika | 9 Nov 12:32 | 9 Dec 06:21 |
| Margashira | 9 Dec 06:21 | 8 Jan 2027 01:54 |
| Pushya | 8 Jan 2027 01:54 | 6 Feb 21:26 |
| Magha | 6 Feb 21:26 | 8 Mar 14:59 |
| Phalguna | 8 Mar 14:59 | 7 Apr 05:21 |

(The "first tithi of a month" is Shukla Pratipada, which begins right after the new moon; the *civil* start day depends on sunrise — see Ugadi below.)

---

## 7. DAILY INAUSPICIOUS / AUSPICIOUS WINDOWS

All of these need **local sunrise and sunset** (they scale with day length; a fixed "7:30–9:00" table is only right on a 6:00–18:00 day) [V].

### 7.1 Rahu Kala, Yamaganda, Gulika (ರಾಹುಕಾಲ, ಯಮಗಂಡ, ಗುಳಿಕ) [V — cross-checked across ≥5 sources; one aggregator (temples.bio) prints a table that contradicts all others for Sun/Mon/Fri/Sat Rahu — ignore it]
Divide (sunset − sunrise) into **8 equal parts** numbered 1–8 from sunrise. The window for each weekday is the given part:

| Day | Rahu Kala | Yamaganda | Gulika |
|---|---|---|---|
| Sunday | 8th | 5th | 7th |
| Monday | 2nd | 4th | 6th |
| Tuesday | 7th | 3rd | 5th |
| Wednesday | 5th | 2nd | 4th |
| Thursday | 6th | 1st | 3rd |
| Friday | 4th | 7th | 2nd |
| Saturday | 3rd | 6th | 1st |

- Rahu Kala is never the 1st part. On a 6:00–18:00 day each part = 90 min (e.g., Monday Rahu = 07:30–09:00) [V].
- Meaning: avoid **starting** new ventures (journeys, purchases, agreements, auspicious rites) in these windows; routine work/daily puja may continue [V]. Gulika is considered "repeating" in effect, so some traditions avoid it for one-time/death-related events but accept it for things meant to recur [V, single source — soft rule]. South Indian practice weights Rahu Kala most heavily [V].

### 7.2 Other windows [C — verified numerically against 3 sites within ±2 min]
- **Abhijit Muhurta:** the 8th of 15 equal daytime muhurtas = from `sunrise + 7/15·daylen` to `sunrise + 8/15·daylen` (≈ solar noon ±24 min). Generally an auspicious fallback window (not applied on Wednesdays by some traditions [?]).
- **Brahma Muhurta:** 96 to 48 minutes before sunrise (wake-up / first puja time) [V — Drik].
- **Durmuhurta, Varjyam, Amrita Kala, Choghadiya, Tarabala/Chandrabala/Chandrashtama, Amrita-Siddhi/Sarvartha-Siddhi/Ravi-Pushya yogas:** appear in Kannada almanacs and app pages. Their exact tables vary by almanac — do **not** implement until the tables are supplied [?].

---

## 8. DECIDING THE CIVIL DAY FOR A TITHI/FESTIVAL

1. **Base rule:** the tithi (and nakshatra) prevailing **at local sunrise** names the day ("udaya tithi") [C].
2. **Kshaya (skipped) tithi:** a tithi that starts after one sunrise and ends before the next never prevails at sunrise. **Vriddhi (repeated) tithi:** a tithi spanning two sunrises appears on two civil days. The app must model this (two tithis per day, none at sunrise).
3. **Festival-specific rules** pick a *time of day* at which the tithi must prevail, not always sunrise [C]: Ekadashi (sunrise; Smarta and Vaishnava sects differ on Dashami-touch), Ganesh Chaturthi (madhyahna/midday), Deepavali Lakshmi Puja (Amavasya at pradosha/evening), Mahashivaratri (Magha-Krishna Chaturdashi at nishita/midnight), Sankashti Chaturthi (moonrise), Shraddha (aparahna/afternoon), Navaratri/Ugadi (sunrise, with fallback below).
4. **Edge case you must handle — Ugadi 2026 (verified):** New moon fell at **06:53 IST on 19 Mar 2026**, after Bengaluru's sunrise (~06:24). So sunrise of 19 Mar = **Amavasya**; Chaitra Shukla Pratipada ran from 06:53 on 19 Mar to about 04:53 on 20 Mar (source: Vedic-astrology Ugadi chart page), i.e., it ended *before* the 20 Mar sunrise (sunrise of 20 Mar = Dwitiya, ends 02:31 on 21 Mar in the engine). The almanacs still list **Ugadi = Thu 19 Mar 2026** [V]. Reason: when the required tithi never prevails at sunrise, pick the day on which it prevails during the day (here: 19 Mar). The pure "tithi at sunrise" rule would wrongly give 20 Mar. Implement: `festival_day = day where tithi prevails at the festival's required time-of-day; if none, day with the largest overlap of that tithi with daytime`, and let a `manual_override` table win.
5. Ugadi 2027 = **Wed 7 Apr 2027** (Chaitra Shukla Pratipada at sunrise; new moon 05:21 IST before sunrise) [V].
6. Never hardcode a festival date; store the **rule** (masa, paksha, tithi, time-of-day, sect) and compute.

---

## 9. ASTRONOMICAL COMPUTATION SPEC (Drik engine)

**Inputs:** date, latitude, longitude, timezone, (elevation optional). **Outputs:** everything in Sections 4–7.

**Algorithm:**
1. Sunrise/sunset for the location (upper limb, standard refraction — Swiss Ephemeris default). Different almanacs use disc-centre and/or no refraction → 1–3 minute differences; make `sunrise_convention` a setting [C].
2. Geocentric apparent longitudes of Sun and Moon; subtract **Lahiri ayanamsa** for sidereal. (Panchangam limbs are geocentric — tithi/nakshatra end instants are the *same instant everywhere on Earth*; only clock time changes with timezone [C, consistent with sites for different cities].)
3. At sunrise compute current tithi/nakshatra/yoga/karana indices (Section 5 formulas).
4. **End-times:** find the next instant when the relevant angle crosses the next multiple of its unit (12°, 13°20′, 13°20′ for Sun+Moon, 6°). Use bisection/root-finding on a 1.6-day bracket; accuracy < 1 s. To list *all* elements inside sunrise → next sunrise, iterate until you pass the next sunrise.
5. New moons: root-find where `(M−S) mod 360` crosses 0. Month name via Section 6.
6. Kalas (Section 7) from sunrise/sunset.
7. Cache results per (date, location) — inputs are deterministic.

**Libraries:** Swiss Ephemeris (`pyswisseph`, used for the reference below; it can run without data files using the built-in Moshier ephemeris, accurate to well under a minute for tithi/nakshatra purposes; install ephemeris files for best precision). **Licensing:** Swiss Ephemeris is dual-licensed (AGPL or paid commercial licence) — check before shipping a closed-source/commercial app. Permissive alternatives: `skyfield` + JPL DE ephemeris (Python), `astronomy-engine` (JS, MIT).

---

## 10. TEST VECTORS (the engine below reproduces these; tolerance ±3 min)

**T1 — Bengaluru (12.9716 N, 77.5946 E), Sunday 20 Sep 2026.** Engine output vs. live panchang sites checked on 20 Sep 2026:

| Item | Engine | Sources [V] |
|---|---|---|
| Sunrise | 06:08:46 | 06:08 (PanchangBodh, Bengaluru) |
| Tithi | Shukla Navami until 17:52 → Dashami | until 17:51–17:53 (four sites) |
| Nakshatra | Purva Ashadha (pada 1) until 04:34 on 21 Sep → Uttara Ashadha | until 04:34 (Prokerala) |
| Yoga | Saubhagya until 15:22 → Shobhana | until 15:22–15:23 |
| Karana | Kaulava until 17:52 → Taitila | Kaulava until 17:51–17:52 → Taitila |
| Sun / Moon rashi | Kanya / Dhanu | Kanya / Dhanu |
| Masa / paksha | Bhadrapada / Shukla | "Bhadrapada Sukla Paksha Navami" |
| Rahu / Yama / Gulika | 16:46–18:17 / 12:13–13:44 / 15:15–16:46 | Sites for nearby cities show Rahu ≈ 16:49–18:21 (different city/sunset convention); accept ±5 min |
| Abhijit | 11:48–12:37 | 11:50–12:39 (other city) |
| Ayanamsa (Lahiri) | 24.2303° | — |

**T2 — Ugadi 2026:** sunrise 19 Mar = Krishna Amavasya (ends 06:53); sunrise 20 Mar = Shukla Dwitiya; festival still 19 Mar (Section 8.4).
**T3 — Adhika masa:** lunar month starting new moon 17 May 2026 01:31 IST has Sun in Vrishabha at both ends → `adhika = true`, name Jyeshtha; runs to 15 Jun 2026 08:24 IST.
**T4 — Ugadi 2027:** Wed 7 Apr 2027; Samvatsara Plavanga (41), Shaka 1949.
**T5 — Samvatsara formula:** shaka 1942→Sharvari(34), 1946→Krodhi(38), 1947→Vishvavasu(39), 1948→Parabhava(40), 1949→Plavanga(41).
**T6 — Karana cycle:** k=1 Kimstughna, k=2 Bava, k=8 Vishti, k=9 Bava, k=57 Vishti, k=58 Shakuni, k=59 Chatushpada, k=60 Naga.

---

## 11. REFERENCE IMPLEMENTATION (tested; Python 3 + `pip install pyswisseph`)

```python
"""Reference Drik-Ganita panchanga engine (Lahiri sidereal, Swiss Ephemeris).
pip install pyswisseph
"""
import math, datetime as dt
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)
FL = swe.FLG_MOSEPH | swe.FLG_SIDEREAL          # use FLG_SWIEPH + ephemeris files for max precision
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))

TITHI = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
         "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi"]
NAKSHATRA = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
 "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
 "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada",
 "Uttara Bhadrapada","Revati"]
YOGA = ["Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula",
 "Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha",
 "Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"]
MOVABLE_KARANA = ["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"]   # Vishti = Bhadra
MASA = ["Chaitra","Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashvina","Kartika",
        "Margashira","Pushya","Magha","Phalguna"]
RASHI = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"]
# weekday index: Sunday=0 ... Saturday=6 ; value = which 1/8th of daytime (1..8)
RAHU   = [8,2,7,5,6,4,3]
YAMA   = [5,4,3,2,1,7,6]
GULIKA = [7,6,5,4,3,2,1]

def to_jd(d):
    u = d.astimezone(dt.timezone.utc)
    return swe.julday(u.year,u.month,u.day,u.hour+u.minute/60+u.second/3600)
def from_jd(jd, tz=IST):
    y,m,d,h = swe.revjul(jd)
    return (dt.datetime(y,m,d,tzinfo=dt.timezone.utc)+dt.timedelta(hours=h)).astimezone(tz)

def sun(jd):  return swe.calc_ut(jd, swe.SUN,  FL)[0][0]
def moon(jd): return swe.calc_ut(jd, swe.MOON, FL)[0][0]
def elongation(jd): return (moon(jd)-sun(jd)) % 360         # -> tithi (12 deg), karana (6 deg)
def yoga_angle(jd): return (moon(jd)+sun(jd)) % 360         # -> yoga (13d20m)

def sun_rise_set(date, lat, lon):
    jd0 = to_jd(dt.datetime(date.year,date.month,date.day,tzinfo=IST))
    rise = swe.rise_trans(jd0, swe.SUN, swe.CALC_RISE, (lon,lat,0), 1013.25, 15)[1][0]
    sset = swe.rise_trans(jd0, swe.SUN, swe.CALC_SET,  (lon,lat,0), 1013.25, 15)[1][0]
    return rise, sset

def next_boundary(jd, f, unit):
    """Time (JD) at which angle f() next reaches a multiple of `unit` degrees (bisection)."""
    target = (math.floor(f(jd)/unit)+1)*unit % 360
    lo, hi = jd, jd+1.6
    for _ in range(50):
        mid = (lo+hi)/2
        if ((f(mid)-target+180) % 360 - 180) >= 0: hi = mid
        else: lo = mid
    return hi

def karana_name(k):                 # k = 1..60 (index within the lunar month)
    if k == 1:  return "Kimstughna"
    if k == 58: return "Shakuni"
    if k == 59: return "Chatushpada"
    if k == 60: return "Naga"
    return MOVABLE_KARANA[(k-2) % 7]

def new_moon_after(jd):
    lo = jd; hi = jd+30
    # coarse scan then bisect on signed elongation crossing 0
    step = 0.5; t = jd; prev = elongation(t)
    while True:
        t += step; cur = elongation(t)
        if prev > 300 and cur < 60: break
        prev = cur
    lo, hi = t-step, t
    for _ in range(50):
        mid = (lo+hi)/2
        if elongation(mid) > 180: lo = mid
        else: hi = mid
    return hi

def lunar_month(jd_new_moon_start):
    """Amanta month starting at this new moon. Returns (name, is_adhika)."""
    nm2 = new_moon_after(jd_new_moon_start+1)
    r1 = int(sun(jd_new_moon_start)//30)       # 0=Mesha ... 11=Meena
    r2 = int(sun(nm2)//30)
    name = MASA[(r1+1) % 12]                   # Meena(11)->Chaitra(0); Mesha(0)->Vaishakha(1)
    return name, (r1 == r2), nm2

def panchanga(date, lat, lon):
    rise, sset = sun_rise_set(date, lat, lon)
    e, m = elongation(rise), moon(rise)
    t_no = int(e//12)+1                                   # 1..30
    paksha = "Shukla" if t_no <= 15 else "Krishna"
    tname = "Amavasya" if t_no == 30 else "Purnima" if t_no == 15 else TITHI[(t_no-1) % 15]
    nk = int(m//(360/27)); pada = int((m % (360/27))//(360/108))+1
    yo = int(yoga_angle(rise)//(360/27))
    k_no = int(e//6)+1
    wd = (date.weekday()+1) % 7                            # Sunday=0
    part = (sset-rise)/8
    seg = lambda p: (from_jd(rise+(p-1)*part), from_jd(rise+p*part))
    return dict(
        date=str(date), weekday=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][wd],
        sunrise=from_jd(rise), sunset=from_jd(sset),
        tithi=(paksha, tname, from_jd(next_boundary(rise, elongation, 12))),
        nakshatra=(NAKSHATRA[nk], pada, from_jd(next_boundary(rise, moon, 360/27))),
        yoga=(YOGA[yo], from_jd(next_boundary(rise, yoga_angle, 360/27))),
        karana=(karana_name(k_no), from_jd(next_boundary(rise, elongation, 6))),
        sun_rashi=RASHI[int(sun(rise)//30)], moon_rashi=RASHI[int(m//30)],
        rahu=seg(RAHU[wd]), yamaganda=seg(YAMA[wd]), gulika=seg(GULIKA[wd]),
        abhijit=(from_jd(rise+7*(sset-rise)/15), from_jd(rise+8*(sset-rise)/15)),
        brahma_muhurta=(from_jd(rise-96/1440), from_jd(rise-48/1440)),
    )

if __name__ == "__main__":
    p = panchanga(dt.date(2026,9,20), 12.9716, 77.5946)     # Bengaluru
    for k,v in p.items(): print(k, v)
    jd = to_jd(dt.datetime(2026,5,10,tzinfo=IST))
    nm = new_moon_after(jd)
    print("Month starting", from_jd(nm), lunar_month(nm)[:2])
```

---

## 12. DATA MODEL & API (build this)

**Daily response (one sunrise-to-sunrise day) — every "limb" is a LIST because several can occur in one day:**
```json
{
  "date": "2026-09-20",
  "weekday": {"en": "Sunday", "kn": "ಭಾನುವಾರ"},
  "location": {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946, "tz": "Asia/Kolkata"},
  "engine": {"system": "drik", "ayanamsa": "lahiri", "ephemeris": "swiss-moshier", "sunrise_convention": "upper-limb-refraction"},
  "sunrise": "2026-09-20T06:08:46+05:30",
  "sunset": "2026-09-20T18:17:18+05:30",
  "year": {"samvatsara": "Parabhava", "index": 40, "shaka": 1948, "vikrama": 2083},
  "ayana": "Dakshinayana",
  "ritu": "Varsha",
  "masa": {"name": "Bhadrapada", "adhika": false, "system": "amanta"},
  "paksha": "Shukla",
  "tithi": [
    {"number": 9, "name": "Navami", "start": "2026-09-19T...", "end": "2026-09-20T17:52:04+05:30", "at_sunrise": true},
    {"number": 10, "name": "Dashami", "start": "2026-09-20T17:52:04+05:30", "end": "2026-09-21T...", "at_sunrise": false}
  ],
  "nakshatra": [{"index": 19, "name": "Purva Ashadha", "pada_at_sunrise": 1, "end": "2026-09-21T04:34:55+05:30"}],
  "yoga": [{"index": 3, "name": "Saubhagya", "end": "2026-09-20T15:22:50+05:30"}],
  "karana": [{"name": "Kaulava", "end": "2026-09-20T17:52:04+05:30"}, {"name": "Taitila", "end": "..."}],
  "rashi": {"sun": "Kanya", "moon": "Dhanu"},
  "windows": {
    "rahu": ["16:46", "18:17"], "yamaganda": ["12:13", "13:44"], "gulika": ["15:15", "16:46"],
    "abhijit": ["11:48", "12:37"], "brahma_muhurta": ["04:32", "05:20"]
  },
  "flags": {"vishti_karana": false, "inauspicious_yoga": false, "adhika_masa": false}
}
```
(`...` = fill from the engine.)

**Endpoints:** `GET /api/panchanga?date=YYYY-MM-DD&lat=&lon=&tz=&engine=drik`; `GET /api/month?year=&month=&lat=&lon=`; `GET /api/festivals?samvatsara_shaka=1948`; `GET /api/windows?date=&lat=&lon=` (good-time finder).
**Storage:** none required — compute on demand and cache; optional table `manual_overrides(date, location, field, value, source)`.
**Localisation:** all names via a lookup with `en` and `kn`; use Sections 4–6 tables; Yoga/Karana Kannada names to be supplied by the user/book [?] (show Sanskrit-transliterated names until then; do NOT machine-translate).
**UI:** Kannada primary font (Noto Sans Kannada), 12-hour and 24-hour toggle, "prevailing at sunrise" highlighted, day timeline bar showing Rahu/Yama/Gulika/Abhijit, colour-coded good/avoid, month grid with tithi + nakshatra + festival chips, PWA/offline (pre-compute a year at a time).
**Validation plan:** (1) unit tests for T1–T6; (2) regression: 200 random dates in 2026–27 compared with a Drik-based site for tithi/nakshatra/yoga/karana end-times (expect ≤3 min); (3) manual comparison of 30 dates against the printed Vontikoppal book; record differences per engine (this quantifies Drik-vs-Surya-Siddhanta gaps); (4) festival list compared with the Karnataka government holiday notification.
**Do not build (unless licensed data is supplied):** AI-generated rashi phala/predictions, muhurta lists for weddings, temple-festival lists.

---

## 13. WHAT WAS VERIFIED, AND WHAT WAS NOT

**Verified against live sources or by running code (20 Sep 2026):** definition/etymology of Panchangam; tithi 12°, karana 6°, nakshatra & yoga 13°20′; 11 karana names (7 movable + 4 fixed); Rahu/Yamaganda/Gulika weekday tables (≥5 sources agree); Ugadi 2026 = 19 Mar (Thu), Parabhava = 40th year, Ugadi 2027 = 7 Apr (Plavanga, 41st); Adhika Jyeshtha 17 May–15 Jun 2026; Bhadrapada Shukla Navami on 20 Sep 2026 with tithi/nakshatra/yoga/karana end-times matching 3–4 independent sites within ~1–2 minutes; Vontikoppal history and "four systems" claim (2012 articles).
**Conflicts noticed and resolved:** one blog says Ugadi 2026 is 29 Mar (wrong; all other sources and the code give 19 Mar); one retailer names the 2025–26 year "Vrishabha" (wrong; Vishvavasu); one aggregator's Rahu table contradicts all others; another site labels the 2027 year "Sarvajit" (wrong; Plavanga).
**Not verified [?]:** Vontikoppal's current authors/print layout, its primary calculation system, ayanamsa/reference city, ghati usage; the 2012 "official Government of Karnataka Panchanga" claim as of 2026; durmuhurta/varjyam/other muhurta tables; Kannada names of yoga and karana; whether Abhijit is disallowed on Wednesdays in Karnataka practice; Kali-yuga year convention in the book.

**Source pages used:** en.wikipedia.org (Panchangam, Tithi, Karaṇa, Rāhukāla, Ugadi); mymiscelany.blogspot.com and bangalorefirst.in (Vontikoppal Panchanga, 2012); hindupad.com and exoticindiaart.com (2026–27 Kannada almanacs); drikpanchang.com; madhwasakha.com, hindupad.com, adhikmaas.com (Adhika masa 2026); outlookindia.com, onlinejyotish.com, astrogle.com (Parabhava/Ugadi 2026); samvat.in, nityapanchangam.com (Ugadi 2027); hindutva.online, pocalc.com, boldsky.com (Yamaganda); calcatools.com (Gulika); prokerala.com, panchangbodh.com, horasarvam.blogspot.com, muhuratchoghadiya.com (20 Sep 2026 cross-check).

# Kuberan Panchangam — Build Pack

Repo: https://github.com/Jee1VK/KUBERAN_PANCHANGAM

**How to use**
1. Commit this file to the repo as `docs/BUILD_PACK.md`.
2. Paste **Part A** into Antigravity as the task prompt.
3. **Part B** has the specs (S1–S8). **Part C** has the rule tables and the open questions to verify against the Vontikoppal Panchanga (or your family purohit) before you trust any output.

This pack was written from the README and `app_specification.md` only, not the code. Part A tells the agent to audit the code first and adapt to what exists.

---

# PART A — Master prompt (paste into Antigravity)

You are a senior Python and full-stack engineer who is also a careful implementer of Vedic astronomy. You are extending **Kuberan Panchangam**, an offline-capable South Indian (Karnataka, Chandramana, Amavasyant) Panchangam app aligned with the Vontikoppal Panchanga.

## Existing project (verify by reading the code; do not assume)
- Backend: Python FastAPI (`app.py`). Calculation engine: `engine.py` using `pyswisseph`, Lahiri ayanamsa, Drik Ganita.
- Frontend: responsive HTML/JS in `static/`. `docs/` appears to back the GitHub Pages site; find out how (is it a static copy of the front-end? does it call a backend?).
- Existing features: the five limbs (Tithi, Vara, Nakshatra, Yoga, Karana), custom lat/lon or preset cities, multi-person Tara Bala for up to 10 people, Windows offline build via PyInstaller (`build.ps1`, `KuberanPanchangam.spec`).
- Domain rules already in `app_specification.md`: day anchored at local sunrise, Kshaya/Vriddhi handling, all times stored as UTC and rendered in the location's timezone, Kannada terminology by default.

## Mission
Implement the eight enhancement specs in Part B of `docs/BUILD_PACK.md` (S1–S8), in the phase order below. Rule tables are in Part C. Read all of `docs/BUILD_PACK.md` before writing code.

## Phase order
- **Phase 0:** audit, foundations, test harness (S6), i18n key mechanism, calibration profile.
- **Phase 1:** S1 Festivals and vratas.
- **Phase 2:** S4 Planetary data, sankrantis, eclipses, asta/udaya (S2 depends on asta/udaya).
- **Phase 3:** S2 Muhurtham finder.
- **Phase 4:** S3 Birth chart, Dasha, Gochara, family profiles.
- **Phase 5:** S5 Kannada UI and printable output.
- **Phase 6:** S7 Export and sharing.
- **Phase 7:** S8 Distribution.

## Rules of engagement
1. **Audit first.** Before any feature code, read every file, then write `docs/ARCHITECTURE.md` (modules, endpoints, data flow, what the docs/ site does, what is missing versus `app_specification.md`). Post a short plan and wait for my go-ahead before Phase 1.
2. **Do not break what exists.** Keep current endpoints and the current UI working. Add new endpoints under `/api/v2/...` if the existing shapes are awkward.
3. **Engine purity.** All astronomy and rule logic lives in importable Python modules with no FastAPI dependency. `app.py` only wires HTTP to the engine.
4. **Time.** Store every instant as UTC (timezone-aware datetimes or Julian Day UT). Convert to the location's IANA timezone only at the edge. Include the `tzdata` package in requirements so Windows builds have timezone data.
5. **Data-driven rules.** Every rule table (festivals, muhurtham packs, dasha lords, translations) is a JSON file under `rules/` with a `source` and `confidence` field per entry. No hard-coded tables in code.
6. **Calibration profile.** Every calculation reads a profile (see B0). Ship `profiles/vontikoppal.json` as the default. Never scatter magic constants.
7. **Offline-first.** No network calls at runtime except the optional update check in S8. No telemetry. Personal data (birth details) stays on the user's machine.
8. **Ambiguity protocol.** When a rule is ambiguous or traditions differ, do not guess silently. Pick the documented default, make it a profile option, and append an entry to `docs/OPEN_QUESTIONS.md` (question, default chosen, where it matters, what evidence would settle it).
9. **Explainability.** Any recommendation (muhurtham, festival date, Ekadashi day) must return a machine-readable `reasons` list saying why. Users will only trust the app if it can show its working.
10. **Tests before features.** Write engine tests and fixtures first (S6). A phase is not done until its tests pass in CI.
11. **Performance.** Month grid under 1 s, year festival list under 5 s, muhurtham search over 90 days under 5 s on a normal laptop. Cache by (date, location, profile hash).
12. **Code quality.** Python 3.9+ compatible, type hints, `ruff`, `pytest`, Pydantic models for every API response.
13. **i18n from day one.** Every user-facing string uses an i18n key (`en` and `kn`). No hard-coded display strings in JS or Python responses (return codes/keys plus values).

## Definition of done for each phase
- Feature implemented per its spec, behind documented API endpoints.
- Tests and fixtures added and passing; CI green.
- UI reachable from the main navigation, mobile-friendly.
- `README.md` and `docs/` updated; sample output committed under `docs/samples/`.
- `docs/OPEN_QUESTIONS.md` updated.
- A short demo summary (what changed, how to try it, what is still uncertain).

## Start now
Do Step 1 only: the audit and `docs/ARCHITECTURE.md`, then propose the Phase 0 task list and stop for my approval.

---

# PART B — Specs

## B0. Shared definitions (all specs use these)

**Angles (sidereal, Lahiri unless profile says otherwise)**
- Tithi index (1–30) = floor(((Moon − Sun) mod 360) / 12) + 1. Tithi 1–15 is Shukla, 16–30 is Krishna (15 = Purnima, 30 = Amavasya).
- Nakshatra index (1–27) = floor(Moon / 13°20′) + 1. Pada = quarter within it.
- Yoga index (1–27) = floor(((Sun + Moon) mod 360) / 13°20′) + 1.
- Karana index k (1–60) = floor(((Moon − Sun) mod 360) / 6) + 1. k=1 is Kimstughna; k=58 Shakuni, 59 Chatushpada, 60 Naga; otherwise movable karana = [Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti][(k − 2) mod 7]. Vishti is Bhadra.
- Rashi of a body = floor(longitude / 30) + 1 (Mesha = 1).

**End-time solving.** To find when an angle function crosses a boundary, bracket the crossing (Moon's speed varies, so bracket ±1 day around an estimate), then use a bracketed root finder (Brent or bisection) with tolerance ≤ 1 second. Handle the 360° wrap explicitly.

**Day context.** `DayContext(date, sunrise, sunset, next_sunrise, day_length, night_length)`. The Vedic day runs sunrise to next sunrise. The day's tithi/nakshatra/yoga/karana are those prevailing at sunrise (udaya).

**Day segments (all derived from DayContext)**
- Eight-part division of sunrise→sunset (Rahu Kala, Yamagandam, Gulika): part index by weekday in Part C.
- Muhurtas: 15 equal daytime muhurtas. Abhijit = the 8th.
- Five-part division of the day: purvahna (1st), sangava (2nd), madhyahna (3rd), aparahna (4th), sayahna (5th).
- Pradosha: sunset to sunset + `pradosha_minutes` (profile).
- Nishita: centred on the midpoint of sunset→next sunrise, ± `nishita_half_window_minutes`.
- Arunodaya: `arunodaya_minutes` before sunrise (default 96).
- Ghati–pala: 1 ghati = `ghati_minutes` (default 24) counted from sunrise; 1 ghati = 60 pala.

**Masa (Chandramana, Amavasyant)**
- A lunar month runs new moon to next new moon. Let r be the Sun's sidereal rashi (1–12) at the month's starting new moon. Month number m = (r mod 12) + 1, where 1 = Chaitra, 2 = Vaishakha, … 12 = Phalguna. Example: Sun in Meena (12) at new moon → Chaitra.
- If the Sun's rashi at the next new moon is the same r, the month is **Adhika** (the following month with the same m is the Nija month).
- If the Sun advances two rashis between consecutive new moons, flag a **Kshaya** month (very rare; detect and raise a warning).
- Krishna paksha belongs to the month that ends on its Amavasya (Amavasyant).

**Year names**
- Shaka year = Gregorian year − 78 from Ugadi (Chaitra Shukla Pratipada) onward, −79 before it.
- Samvatsara index = (Shaka + 12) mod 60 (0 → 60), using the Prabhavadi list in Part C. Check: Shaka 1948 (from Ugadi 2026) → 40 → Parabhava.
- Ayana: Uttarayana from Makara sankranti, Dakshinayana from Karka sankranti. Ritu: Vasanta = Chaitra–Vaishakha, and so on in pairs (config).

**Profile file (`profiles/*.json`)**
```json
{
  "id": "vontikoppal",
  "ayanamsa": "LAHIRI",
  "node": "MEAN",
  "sunrise_mode": "UPPER_LIMB_REFRACTION",
  "ghati_minutes": 24,
  "arunodaya_minutes": 96,
  "pradosha_minutes": 144,
  "nishita_half_window_minutes": 24,
  "ekadashi_tradition": "SMARTA",
  "sutak_hours": { "solar": 12, "lunar": 9 },
  "gulika_treatment": "AVOID_FOR_NEW_BEGINNINGS",
  "year_days_for_dasha": 365.25
}
```
Every value is a calibration knob: the goal is to find the combination that reproduces the printed Vontikoppal Panchanga best (see S6).

---

## S1. Festival and Vrata Calendar

**Goal.** Compute every festival and recurring vrata for a year at a chosen location, resolve the correct civil date per traditional rules, and show them in a month grid and list.

**Inputs.** `year`, `lat`, `lon`, `tz`, `profile`, optional `layers` (festivals, ekadashi, sankashti, pradosha, amavasya_purnima, sankramana, masa_shivaratri, shashti).

**Rule schema (`rules/festivals.json`).** One entry per observance:
```json
{
  "id": "ganesha_chaturthi",
  "name": { "en": "Ganesha Chaturthi", "kn": "ಗಣೇಶ ಚತುರ್ಥಿ" },
  "masa": "Bhadrapada", "paksha": "Shukla", "tithi": 4,
  "window": "MADHYAHNA",
  "choose": "MAX_OVERLAP", "tie_break": "FIRST",
  "category": "festival", "shopping_peak": false,
  "source": "seed", "confidence": "verify"
}
```
`window` is one of UDAYA (sunrise), PURVAHNA, MADHYAHNA, APARAHNA, PRADOSHA, NISHITA, MOONRISE, ARUNODAYA. Other rule types: `WEEKDAY_BEFORE` (Varamahalakshmi: the Friday before Shravana Purnima), `SANKRANTI` (solar ingress), `NAKSHATRA_WITH_TITHI`. A starter festival list is in Part C.

**Algorithm.**
1. Build the lunar month table (B0) for the year, including Adhika months. Adhika months carry no festivals except those flagged `adhika_allowed`.
2. For each rule, find the target tithi interval(s) inside the target masa/paksha.
3. For each candidate civil date, compute the overlap between the tithi interval and the rule's window on that date.
4. Choose the date per `choose`: `MAX_OVERLAP` (largest overlap), `FIRST_TO_TOUCH`, or `UDAYA_ONLY`. If two dates tie, apply `tie_break`.
5. Handle Kshaya (tithi with no sunrise) and Vriddhi (tithi across two sunrises) explicitly and record which happened in `notes`.
6. Return `rule_used`, `reasons`, and `alternates` (other plausible dates) whenever the choice was not clear-cut.

**Ekadashi.** Three rule sets selected by `ekadashi_tradition` (SMARTA, MADHWA, SRI_VAISHNAVA). Every Ekadashi output includes `vrata_date`, `dashami_viddha` (boolean, checked at arunodaya), and the `parana_window` (Dwadashi, after Hari Vasara = first quarter of Dwadashi, and before Dwadashi ends). Seed rules and caveats are in Part C; they must be verified.

**Sankranti.** Exact moment of each solar ingress. Makara Sankranti's observed date follows `sankranti_day_rule` (profile): default is the civil date on which the ingress falls before sunset, otherwise the next day.

**API.**
- `GET /api/v2/festivals?year=&lat=&lon=&tz=&layers=`
- `GET /api/v2/month?year=&month=&lat=&lon=&tz=` → per day: five limbs, sunrise/sunset, Rahu Kala, festivals, masa, paksha.
- `GET /api/v2/masa-table?year=` → lunar months with UTC start/end, Adhika/Kshaya flags.

**UI.** Month grid with colour-coded layers and a layer toggle; a list view by month; tap a festival to see the rule, tithi interval, alternates and reasons. Search box. Highlight `shopping_peak` observances (togglable).

**Acceptance criteria.**
- Festival dates for 2024–2027 match the printed Vontikoppal Panchanga (fixtures from S6) except entries logged in `OPEN_QUESTIONS.md`.
- Adhika masa years (2023, and 2026 per most published panchangas; verify) produce a correct masa table and no duplicated festivals.
- A Kshaya tithi day and a Vriddhi tithi day are covered by fixtures.
- Every festival response has non-empty `reasons`.

---

## S2. Muhurtham Finder

**Goal.** Given a purpose, a date range and optional people, return ranked good days (and time windows) with plain-language reasons and warnings. It extends the existing Tara Bala feature.

**Purposes (v1).** `vivaha`, `upanayana`, `griha_pravesha`, `namakarana`, `vahana` (buying a vehicle), `vyapara_arambha` (opening a shop or new store), `general_shubha`. Each purpose is a rule pack in `rules/muhurtham/<purpose>.json`.

**Inputs.** `purpose`, `from`, `to`, `lat`, `lon`, `tz`, `people[]` (each with birth nakshatra and rashi, or a saved profile id from S3), `weekday_filter`, `avoid_windows` (e.g. working hours), `min_score`.

**Method.** Evaluate each day, then each sub-window inside good days.

1. **Hard exclusions** (day fails): Adhika/Kshaya masa (per pack), Chaturmasa if the pack excludes it, Guru Asta or Shukra Asta if the pack requires them clear (needs S4), eclipse day or the pack's eclipse buffer, forbidden tithis, forbidden nakshatras, forbidden weekdays, forbidden yogas (Part C dushta list), Vishti karana for the whole muhurtham window, Chandrashtama for any listed person (Moon in the 8th rashi from their Janma Rashi).
2. **Person checks** for each person: Tarabala (from Janma Nakshatra to the day's nakshatra, count inclusive, mod 9; Part C) and Chandrabala (Moon's rashi counted from Janma Rashi; Part C). Output per-person status good, neutral or bad. Pack decides whether all must pass (e.g. for the principal person) or whether a majority is enough.
3. **Time windows** inside a good day: remove Rahu Kala, Yamagandam, Durmuhurtham, and Gulika per `gulika_treatment` (Part C: traditions differ); prefer Abhijit unless the pack forbids it; remove Vishti karana intervals; mark windows where tithi, nakshatra and yoga are all acceptable simultaneously.
4. **Score** (0–100): base 50 for a day that passes all hard checks; add or subtract pack-defined weights (preferred tithi/nakshatra/weekday, Amrita Siddhi yoga, Tarabala quality per person); cap and clamp. The weights are data, not code.
5. **Optional Lagna filter (Phase 2 of S2).** Compute the ascendant through the muhurtham window (Swiss `houses_ex` with sidereal flag). Allow only pack-approved lagnas and require the 8th house free of planets. Return the time slices when lagna is acceptable.

**Output (per result).**
```json
{
  "date": "2027-02-12",
  "score": 84,
  "windows": [{ "start_utc": "...", "end_utc": "...", "local": "10:40–12:05" }],
  "panchanga": { "tithi": "...", "nakshatra": "...", "yoga": "...", "karana": "..." },
  "people": [{ "id": "p1", "tarabala": "SAMPAT", "chandrabala": "GOOD" }],
  "reasons_good": ["Rohini nakshatra is approved for vivaha", "Tarabala good for all 3 people"],
  "reasons_caution": ["Panchami ends at 11:20; window shortened"],
  "reasons_excluded_windows": ["Rahu Kala 15:05–16:35"]
}
```

**API.**
- `POST /api/v2/muhurtham/search` (body = inputs above)
- `GET /api/v2/muhurtham/purposes`
- `GET /api/v2/muhurtham/day?date=&purpose=&people=` → full breakdown for one day (why is this day not recommended?).

**UI.** A purpose picker, date-range picker, people selector (from saved profiles or manual nakshatra entry), a results list sorted by score with green/amber badges, a calendar heat-map of scores, and a "Why not this day?" drawer. A printable one-page shortlist for the family.

**Acceptance criteria.**
- Rahu Kala, Yamagandam and Gulika match the weekday tables in Part C for all seven weekdays at three latitudes.
- Tarabala and Chandrabala tables reproduce the existing Tara Bala feature exactly for a shared test set.
- For each purpose pack, at least five hand-verified good days and five hand-verified bad days from the Vontikoppal book (fixtures) are classified correctly.
- Every excluded day returns the exact reason.
- A disclaimer in the UI: guidance only; consult the family purohit for final muhurtham.

---

## S3. Birth Chart, Vimshottari Dasha, Gochara and Rashi Phala

**Goal.** From birth details, compute the chart, determine Janma Nakshatra and Rashi automatically, show running Dasha periods, and show current transit effects. Saved profiles feed S2.

**Inputs.** Name, date of birth, time of birth (local), place (lat/lon, preset city or manual), IANA timezone (default `Asia/Kolkata`), optional manual UTC-offset override.

**Time handling.** Use the IANA database for the historic UTC offset of the birth place and date. For births before 1955, show a warning: historic Indian time zones and wartime offsets vary, so the user should confirm with family records or allow the offset override.

**Chart computation.**
- Sidereal longitudes of Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (mean or true per profile) and Ketu (Rahu + 180°). Flag retrograde.
- Lagna (ascendant) and house cusps (whole-sign houses by default; configurable).
- For each body: rashi, degree within rashi, nakshatra and pada.
- Janma Nakshatra and Janma Rashi are those of the Moon.
- Chart styles: South Indian square (default, as used in Karnataka) and North Indian diamond. Both rendered as SVG.

**Vimshottari Dasha.**
- Nakshatra lords in order from Ashwini: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, repeating three times. Periods in years: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17 (total 120).
- Balance of the first Dasha = (remaining fraction of the Moon's nakshatra) × lord's period.
- Antardasha lengths are proportional: Antar = (Maha years × Antar lord years) / 120. Show Maha and Antar for the full 120 years, highlight the running period, and add Pratyantar for the running Antar.
- Year length from profile `year_days_for_dasha` (365.25 default).

**Gochara (transit) and Rashi Phala.**
- For a chosen date, compute each planet's transit rashi and its house counted from the Janma Rashi.
- Favourable houses per planet come from Part C. Output per planet: house number, favourable or not, and a short neutral note from `rules/gochara_text.json`. The app ships no fixed predictive prose of its own beyond what the family provides in this editable file; keep tone neutral and informational.
- Flag Sade Sati phases (Saturn in the 12th, 1st and 2nd from natal Moon rashi), Ashtama Shani (8th) and Kantaka Shani (4th), with dates of entry/exit.
- Weekly and monthly Rashi Phala views are the transit table for the Moon-sign, refreshed for the period.

**Family profiles.** Local SQLite in the user data directory (`platformdirs`): `people(id, name, dob_local, tob_local, tz, lat, lon, place_name, janma_nakshatra, janma_rashi)`. Import/export as JSON. A "Delete all data" button. Nothing leaves the machine.

**Optional later phase.** Ashtakoota (36-guna) matching between two profiles, feeding S2's `vivaha` purpose.

**API.**
- `POST /api/v2/chart` → chart, dasha table.
- `GET /api/v2/gochara?profile_id=&date=`
- `GET/POST/DELETE /api/v2/profiles`

**Acceptance criteria.**
- Longitudes agree with an independent ephemeris (see S6) within 1 arc-minute for at least 20 sample births.
- Dasha start balance and first three Maha periods match a published reference chart for three test births.
- Janma Nakshatra selection updates the S2 people list automatically.
- Charts render correctly on a 360 px wide phone.
- The app makes clear this is for cultural and informational use.

---

## S4. Planetary Data, Sankrantis, Eclipses, Asta and Udaya

**Goal.** Add the astronomical events that panchangas list and that muhurtham rules depend on.

**Features.**
1. **Graha positions table.** Daily sidereal longitudes (rashi, degree, nakshatra) for all nine bodies at sunrise (configurable time).
2. **Ingresses (rashi pravesha)** for all bodies with exact UTC times, including Sun (Sankranti), Jupiter (Guru transit), Saturn, Rahu and Ketu.
3. **Stations.** Vakri (retrograde start) and Margi (direct) times for Mercury, Venus, Mars, Jupiter, Saturn.
4. **Asta and Udaya (combustion).** For Jupiter and Venus (mandatory), Mercury, Mars and Saturn (optional): times when the body comes within its combustion orb of the Sun (Part C) and when it emerges. Expose `guru_asta`, `shukra_asta` day flags for S2.
5. **Eclipses.** For the location: solar and lunar eclipses in a year, with type (partial, total, annular, penumbral), contact times (for lunar: P1, U1, U2, max, U3, U4, P4), magnitude, visibility at the location, Sutak start (profile `sutak_hours`), Moksha time, and the nakshatra and rashi at greatest eclipse. Use `swe.sol_eclipse_when_loc` and `swe.lun_eclipse_when_loc` (check the current pyswisseph signatures in the installed version).
6. **Sutak logic.** Sutak applies only when the eclipse is visible at the location. Show it as a banner on the day view.

**API.**
- `GET /api/v2/grahas?date=&lat=&lon=`
- `GET /api/v2/ingresses?year=&bodies=`
- `GET /api/v2/asta?year=`
- `GET /api/v2/eclipses?year=&lat=&lon=`

**UI.** An "Astronomy" tab with: a graha table for the selected day, a yearly events timeline, an eclipse card list with visibility badge and Sutak times, and a banner in the daily view on eclipse days and Guru/Shukra asta periods.

**Acceptance criteria.**
- Sun and Moon longitudes agree with an independent ephemeris within 1 arc-minute over 2024–2030.
- Eclipse dates and greatest-eclipse times for 2026–2028 match NASA/Fred Espenak tables within 2 minutes (manual check listed in fixtures).
- Sankranti times for 2026 agree with the printed Vontikoppal Panchanga within 3 minutes (record any systematic offset in `OPEN_QUESTIONS.md`; it is likely an ayanamsa or Drik/Vakya difference).
- Guru Asta and Shukra Asta dates for 2026–2027 verified against the book.

---

## S5. Kannada UI and Printable Output

**Goal.** A fully Kannada-capable interface, and print-quality monthly and yearly panchanga pages in the traditional layout.

**i18n mechanism.**
- `static/i18n/en.json` and `static/i18n/kn.json`, accessed by `t(key, params)`. Language toggle persisted in browser storage; default `kn` per `app_specification.md`.
- APIs return codes and numeric values (for example `tithi: 4`, `paksha: "SHUKLA"`), never display strings. Text-producing endpoints (daily text, ICS, PDF) accept `?lang=`.
- Optional Kannada numerals (೦–೯) toggle for dates and times.
- Fonts: bundle Noto Sans Kannada and Noto Serif Kannada (SIL OFL) as local files. No CDN, since the app must work offline.

**Glossary (`rules/glossary.json`).** Every term in both languages: 5 limbs, 30 tithis (with the Kannada folk names such as Padyami, Bidige, Tadige, Chauthi, Hunnime, Amavasye alongside Sanskrit forms), 27 nakshatras, 27 yogas, 11 karanas, 7 varas, 12 masas, pakshas (Shukla/Bahula), 60 samvatsaras, rashis, planets, festival names. Every Kannada string the agent drafts must carry `"needs_review": true` until a fluent reviewer signs off. Generate `docs/GLOSSARY_REVIEW.md` (a table of English, Kannada, status) so someone can review it without opening JSON.

**Time display modes.** 12-hour, 24-hour, and **ghati–pala from sunrise** (traditional almanac style), alongside clock time.

**Printing.**
- *Phase A (first):* print stylesheet and a "Print month" button. A4 landscape and A5 portrait. Header band: Shaka year, Samvatsara, Ayana, Ritu, masa(s) in the month. One row per day: date, vara, tithi with end time, nakshatra with end time, yoga with end time, karana, sunrise/sunset, Rahu Kala, festivals/notes. Footer: location, profile, "computed with Swiss Ephemeris". The browser handles Kannada text shaping, so this path is reliable.
- *Phase B (only if needed):* server-side PDF for one-click year booklets. Indic scripts need proper text shaping (conjuncts such as ಕ್ಷ, ತ್ಯ, ಶ್ರೀ). Use a library that supports shaping (for example `fpdf2` with `uharfbuzz`) and add a rendering test with those conjuncts. Do not use a PDF library without shaping for Kannada.
- Year booklet: 12 month pages, festival list, eclipses, Sankrantis, Asta periods, page numbers.

**Accessibility.** "Large text" mode for elders, high-contrast theme, tap targets of at least 44 px, no information conveyed by colour alone.

**Acceptance criteria.**
- Toggling to Kannada leaves no untranslated English strings in the UI (a test scans the DOM/i18n keys).
- A printed month page fits on one A4 landscape sheet without truncation for the longest month.
- Kannada conjunct rendering test passes in the chosen print path.
- Glossary review file generated; unreviewed strings are visibly flagged in a dev build.

---

## S6. Accuracy and Validation Suite (build this first)

**Goal.** Make correctness provable. A panchangam is only worth using if people trust the dates.

**Test layers.**
1. **Unit tests** for each formula in B0 (tithi, nakshatra, yoga, karana indexes; masa naming; samvatsara index; segment tables).
2. **Golden fixtures** from the printed Vontikoppal Panchanga: `tests/fixtures/vontikoppal/YYYY-MM.csv` with columns `date, sunrise, tithi_no, tithi_end, nakshatra_no, nakshatra_end, yoga_no, yoga_end, karana, masa, paksha, rahu_start, rahu_end, festival_ids, source`. Start with about 10 days per month for 2026, including Kshaya and Vriddhi days, Sankranti days, an Adhika masa boundary and eclipse days. Add 2024, 2025 and 2027 later. Type in values only, with a page reference in `source`. Do not commit scans or photos of the book.
3. **Independent cross-check.** A dev-only test that compares Sun and Moon longitudes with a second ephemeris (`skyfield` with JPL DE440s, or `astropy`) using the same ayanamsa value. Never bundled in the release. Tolerance: 1 arc-minute.
4. **Property tests.** Tithi end times strictly increase; 30 tithis per synodic month; sanity bounds on durations (tithi about 19–27 h, nakshatra about 21–28 h, yoga about 19–26 h, karana about 9–14 h); UTC round-trip; determinism (same inputs give identical outputs); shifting longitude by 15° shifts sunrise by about one hour.
5. **Timezone and location tests.** `Asia/Kolkata`, `America/New_York` across a DST change, `Australia/Sydney`, a location with a non-integer hour offset, and a polar latitude where sunrise does not occur (the engine must return a clear `NO_SUNRISE` error, not crash).

**Tolerances.** Discrete values (numbers, names, dates) must match exactly. Sunrise ±1 minute. Limb end times ±2 minutes (record actual deviations, do not silently widen).

**Calibration tools.**
- `python -m tools.compare --year 2026 --profile vontikoppal` writes an HTML report: pass/fail per row, deviation statistics, and the first mismatches.
- `python -m tools.calibrate` tries combinations of `sunrise_mode`, `node`, `ayanamsa` (Lahiri, Lahiri ICRC, True Chitra; check which constants the installed pyswisseph provides) and ranks them by mismatch count against the fixtures. The winner is written into `profiles/vontikoppal.json` with a note explaining the evidence.

**CI.** `.github/workflows/ci.yml` on every push and pull request: `ruff`, `pytest` (unit, property, golden), Python 3.9, 3.11 and 3.12, on Ubuntu and Windows.

**Acceptance criteria.**
- Golden fixtures pass for 2026 at the stated tolerances with the calibrated profile.
- The comparison report and calibration output are committed for the chosen profile.
- CI is green and required before merge.
- `docs/ACCURACY.md` states the tolerances, what was validated, and known deviations.

---

## S7. Export and Sharing

**Goal.** Put the panchangam into calendars, WhatsApp, Instagram and the shop's website.

**Calendar export (ICS).**
- `GET /api/v2/export/ics?from=&to=&layers=&lat=&lon=&tz=&lang=`. Use the `icalendar` library.
- Layers: festivals, ekadashi, sankashti, pradosha, amavasya_purnima, sankranti, eclipses, tithi_at_sunrise (optional daily event).
- Festivals are all-day events. Sankranti and eclipses are timed events (UTC). Stable `UID`s such as `{layer}-{id}-{date}@kuberanpanchangam` so re-importing updates rather than duplicates.
- Optional reminders: a `VALARM` (for example one day before for festivals, one hour before for eclipse Sutak start).
- Calendar name and description set via `X-WR-CALNAME` and `X-WR-CALDESC`.

**Daily text for WhatsApp.** `GET /api/v2/daily/text?date=&lang=` returns a compact plain-text summary: date, samvatsara/masa/paksha/tithi, nakshatra, yoga, karana, sunrise/sunset, Rahu Kala, festival of the day. Templates live in the i18n files. A "Share" button uses `navigator.share` where available, with a `wa.me` deep link fallback.

**Share card image.**
- Generated in the browser (so Kannada text is shaped correctly) with a locally bundled `html-to-image` (or canvas), at 1080×1080 and 1080×1920.
- Content: date in both scripts, samvatsara/masa/paksha/tithi, nakshatra, yoga, karana, sunrise/sunset, Rahu Kala, festival of the day.
- Optional branding from `branding.json` (`enabled` false by default, logo path, one or two footer lines), so the shop can put its name on cards without changing the open-source default.
- `navigator.share({ files })` on mobile, download button elsewhere.

**Public feeds for the website.**
- `python -m tools.build_feeds --years 2026 2027 --cities bengaluru mysuru mangaluru` writes static files to `docs/feeds/<city>/<year>/`: `days.json`, `festivals.json`, `muhurtham-vivaha.json`, `muhurtham-griha-pravesha.json`, `muhurtham-vyapara-arambha.json`, `calendar.ics`.
- Each file has `generated_at`, `profile`, `reviewed` (boolean, false until a human sets it true), `disclaimer`.
- `docs/embed/widget.js`: a dependency-free script that fetches a feed and renders "Upcoming muhurtham dates" or "Upcoming festivals" into a `<div>`. GitHub Pages serves files with permissive CORS, so a Shopify page can load them.
- `docs/embed/muhurtham-page.html`: a plain HTML template for a "Wedding muhurtham dates" page.
- The widget must show nothing but a "coming soon" notice for any feed where `reviewed` is false. Do not publish unreviewed muhurtham data on the shop's site.

**Acceptance criteria.**
- The generated ICS imports cleanly into Google Calendar, Apple Calendar and Outlook (manual check), with correct dates and no duplicates on re-import.
- The share card renders Kannada correctly on Android Chrome and desktop Chrome, at both sizes.
- Feeds for a full year build in under 2 minutes.
- The widget renders on a plain HTML page and gracefully handles a failed fetch.

---

## S8. Distribution

**Goal.** One tagged release produces downloadable, verifiable builds for all platforms, with correct licensing.

**1. Licensing (do this first).** Swiss Ephemeris is dual-licensed: AGPL or a paid Swiss Ephemeris Professional License. Distributing the app publicly means the app should be published under AGPL-3.0 with source available, or you must buy the professional licence. Add `LICENSE` (AGPL-3.0), `NOTICE.md` (credit Astrodienst for Swiss Ephemeris, and the Noto fonts under OFL), and an About page with a link to the source. This is not legal advice; confirm with a lawyer if you plan to sell the app or keep it closed.

**2. Ephemeris files.** Find out whether the app uses `.se1` data files or falls back to the built-in Moshier ephemeris. Bundle the required files (for 1800–2400 AD: `sepl_18.se1`, `semo_18.se1`, plus asteroid files only if needed) through PyInstaller `datas`, set `swe.set_ephe_path` from `sys._MEIPASS` when frozen, and add a startup self-check that logs which mode is active and fails loudly if expected files are missing. Show the mode in About.

**3. Release pipeline.** `.github/workflows/release.yml` on tag `v*`. Matrix `windows-latest`, `macos-latest`, `ubuntu-latest`: checkout, set up Python 3.11, install requirements and PyInstaller, run tests, build with the spec, zip as `KuberanPanchangam-<os>-<tag>.zip`, write SHA-256 checksums, upload to the GitHub Release. Single version source (`VERSION` file) shown in About.

**4. Desktop behaviour.** Auto-open the default browser, pick a free port if 8000 is taken, bind to `127.0.0.1` only, single-instance guard, clean shutdown (tray icon or clear console instruction), app icon, no console window in release builds, log file in the user data directory (`platformdirs`).

**5. Windows SmartScreen.** Unsigned executables trigger warnings. Options: apply to SignPath Foundation (free code signing for open source) or buy a certificate. Until signed, document "More info → Run anyway" in the README and publish checksums.

**6. Update check.** Optional and off by default. When enabled, once per week fetch `https://api.github.com/repos/Jee1VK/KUBERAN_PANCHANGAM/releases/latest` and show a banner with the download link. No auto-install. Fails silently when offline.

**7. Phone access.** The engine is Python/C, so a phone PWA cannot compute live.
- *Track A (do first):* a PWA (manifest, service worker) that reads the precomputed feeds from S7 for preset cities and a rolling three years, cache-first, fully offline for daily, month and festival views. No muhurtham search.
- *Track B (spike only):* evaluate a WebAssembly build of Swiss Ephemeris for in-browser computing. Timebox to two days and report on licensing, size and accuracy before committing.
- Android/iOS wrappers are a later step.

**8. README refresh.** Screenshots, feature list, download table, accuracy statement linking `docs/ACCURACY.md`, "verify with your Panchanga / purohit" note, roadmap, contributing.

**Acceptance criteria.**
- Pushing a `v*` tag produces three zips and checksums on the Release page without manual steps.
- The Windows build runs on a clean machine with no Python installed and passes the startup self-check.
- The PWA installs and shows the current month offline in airplane mode.
- `LICENSE`, `NOTICE.md` and an About page exist.

---

# PART C — Rule seeds and open questions

**Read this first.** Everything below is seed data taken from commonly cited conventions. Traditions differ, and the Vontikoppal Panchanga (or your family purohit) is the authority. Load these as editable JSON with `"confidence": "verify"`, and let S6's fixtures settle disputes.

## C1. Samvatsara list (Prabhavadi, index = (Shaka + 12) mod 60)
1 Prabhava, 2 Vibhava, 3 Shukla, 4 Pramoda, 5 Prajapati, 6 Angirasa, 7 Shrimukha, 8 Bhava, 9 Yuva, 10 Dhata, 11 Ishvara, 12 Bahudhanya, 13 Pramathi, 14 Vikrama, 15 Vrisha, 16 Chitrabhanu, 17 Svabhanu, 18 Tarana, 19 Parthiva, 20 Vyaya, 21 Sarvajit, 22 Sarvadhari, 23 Virodhi, 24 Vikruti, 25 Khara, 26 Nandana, 27 Vijaya, 28 Jaya, 29 Manmatha, 30 Durmukhi, 31 Hevilambi, 32 Vilambi, 33 Vikari, 34 Sharvari, 35 Plava, 36 Shubhakrut, 37 Shobhakrut, 38 Krodhi, 39 Vishvavasu, 40 Parabhava, 41 Plavanga, 42 Kilaka, 43 Saumya, 44 Sadharana, 45 Virodhikrut, 46 Paridhavi, 47 Pramadicha, 48 Ananda, 49 Rakshasa, 50 Nala, 51 Pingala, 52 Kalayukti, 53 Siddharthi, 54 Raudri, 55 Durmati, 56 Dundubhi, 57 Rudhirodgari, 58 Raktakshi, 59 Krodhana, 60 Akshaya.
Sanity check: Ugadi 2024 = Krodhi (38), 2025 = Vishvavasu (39), 2026 = Parabhava (40).

## C2. Rahu Kala, Yamagandam, Gulika (part number of the 8 equal parts from sunrise to sunset)
| Weekday | Rahu Kala | Yamagandam | Gulika |
|---|---|---|---|
| Sunday | 8 | 5 | 7 |
| Monday | 2 | 4 | 6 |
| Tuesday | 7 | 3 | 5 |
| Wednesday | 5 | 2 | 4 |
| Thursday | 6 | 1 | 3 |
| Friday | 4 | 7 | 2 |
| Saturday | 3 | 6 | 1 |

Note: `app_specification.md` calls Gulika Kalam "auspicious". Many muhurtham traditions treat Gulika as a window to avoid for new beginnings (some say what starts in Gulika tends to repeat, so it is avoided for things you do not want repeated, such as funerals). Make it a profile option (`gulika_treatment`: `AVOID_FOR_NEW_BEGINNINGS`, `NEUTRAL`, `AUSPICIOUS_FOR_REPETITIVE`) and settle it against the book.

## C3. Tarabala and Chandrabala
- Tarabala: n = ((day_nakshatra − janma_nakshatra) mod 27) + 1; tara = ((n − 1) mod 9) + 1.
  1 Janma (caution), 2 Sampat (good), 3 Vipat (bad), 4 Kshema (good), 5 Pratyari (bad), 6 Sadhana (good), 7 Naidhana/Vadha (bad), 8 Mitra (good), 9 Parama Mitra (good).
- Chandrabala: h = ((moon_rashi − janma_rashi) mod 12) + 1. Good: 1, 3, 6, 7, 10, 11. Bad: 4, 8, 12. Neutral: 2, 5, 9 (often accepted in Shukla paksha). h = 8 is Chandrashtama: avoid.

## C4. Yogas usually avoided for muhurtham (seed)
Vyatipata, Vaidhriti (whole yoga); Vishkambha, Parigha (partial, first portion); Atiganda, Shula, Ganda, Vyaghata, Vajra. Encode as `avoid: "WHOLE"` or `"PARTIAL"` with the partial fraction in data.

## C5. Amrita Siddhi (weekday × nakshatra bonus)
Sunday–Hasta, Monday–Mrigashira, Tuesday–Ashwini, Wednesday–Anuradha, Thursday–Pushya, Friday–Revati, Saturday–Rohini.

## C6. Muhurtham purpose packs (seed; all need verification)
Common defaults: avoid Rikta tithis (4, 9, 14), Amavasya, Ashtami unless a pack allows them; avoid Adhika/Kshaya masa; avoid eclipse days; prefer weekdays Monday, Wednesday, Thursday, Friday.
- **vivaha:** tithis 2, 3, 5, 7, 10, 11, 13 (Shukla preferred). Nakshatras: Rohini, Mrigashira, Magha, Uttara Phalguni, Hasta, Swati, Anuradha, Mula, Uttarashadha, Uttarabhadra, Revati. Exclude: Chaturmasa, Guru or Shukra Asta, Sun in Dhanus or Meena (Kharamasa), the Pitru paksha fortnight.
- **upanayana:** tithis 2, 3, 5, 10, 11, 12, 13. Nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra, Swati, Shravana, Dhanishta, Shatabhisha, Uttarashadha, Uttarabhadra, Revati. Prefer Uttarayana. Exclude Guru/Shukra Asta.
- **griha_pravesha:** tithis 2, 3, 5, 7, 10, 11, 13. Nakshatras: Rohini, Mrigashira, Uttara Phalguni, Uttarashadha, Uttarabhadra, Chitra, Anuradha, Dhanishta, Shatabhisha, Revati. Preferred masas: Vaishakha, Shravana, Kartika, Margashira, Magha, Phalguna. Avoid Ashadha–Bhadrapada.
- **namakarana:** normally the 11th or 12th day after birth (fallbacks 10th, 13th, 16th, 19th, 22nd, 32nd); nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Uttarashadha, Uttarabhadra, Hasta, Chitra, Swati, Anuradha, Shravana, Dhanishta, Shatabhisha, Revati.
- **vahana:** nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha, Shravana, Dhanishta, Shatabhisha, Revati; Tarabala and Chandrabala for the owner are mandatory.
- **vyapara_arambha (shop or store opening):** tithis 2, 3, 5, 7, 10, 11, 13; nakshatras: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra, Swati, Anuradha, Uttarashadha, Shravana, Dhanishta, Shatabhisha, Uttarabhadra, Revati; Tarabala and Chandrabala for the principal owner(s) mandatory; prefer Abhijit or an approved lagna window.

## C7. Festival starter list (`rules/festivals.json`, Karnataka, Amavasyant)
`shopping_peak` marks observances the shop may want highlighted (editable).
| Festival | Masa | Tithi | Window / rule | shopping_peak |
|---|---|---|---|---|
| Ugadi | Chaitra | Shukla 1 | UDAYA | yes |
| Rama Navami | Chaitra | Shukla 9 | MADHYAHNA | no |
| Akshaya Tritiya | Vaishakha | Shukla 3 | PURVAHNA / UDAYA | yes |
| Shayani (Ashadha) Ekadashi | Ashadha | Shukla 11 | Ekadashi rule | no |
| Guru Purnima | Ashadha | Purnima | UDAYA / aparahna (verify) | no |
| Nagara Panchami | Shravana | Shukla 5 | UDAYA / MADHYAHNA | no |
| Varamahalakshmi Vrata | Shravana | Friday before Shravana Purnima | WEEKDAY_BEFORE | yes |
| Shravana Purnima | Shravana | Purnima | APARAHNA (avoid Bhadra) | no |
| Krishna Janmashtami | Shravana | Krishna 8 | NISHITA | no |
| Gowri Habba | Bhadrapada | Shukla 3 | PURVAHNA | yes |
| Ganesha Chaturthi | Bhadrapada | Shukla 4 | MADHYAHNA | yes |
| Ananta Chaturdashi | Bhadrapada | Shukla 14 | UDAYA | no |
| Mahalaya Amavasya | Bhadrapada | Amavasya | APARAHNA | no |
| Navaratri begins | Ashvija | Shukla 1 | UDAYA | yes |
| Maha Navami / Ayudha Puja | Ashvija | Shukla 9 | APARAHNA | yes |
| Vijayadashami | Ashvija | Shukla 10 | APARAHNA | yes |
| Dhana Trayodashi | Ashvija | Krishna 13 | PRADOSHA | yes |
| Naraka Chaturdashi | Ashvija | Krishna 14 | ARUNODAYA | yes |
| Deepavali Amavasya (Lakshmi Puja) | Ashvija | Amavasya | PRADOSHA | yes |
| Bali Padyami | Kartika | Shukla 1 | UDAYA | yes |
| Karthika Purnima | Kartika | Purnima | PRADOSHA | no |
| Prabodhini Ekadashi / Tulasi Vivaha | Kartika | Shukla 11–12 | Ekadashi rule | no |
| Vaikuntha Ekadashi | Pushya | Shukla 11 | Ekadashi rule | no |
| Makara Sankranti | solar | Sun enters Makara | SANKRANTI | yes |
| Ratha Saptami | Magha | Shukla 7 | ARUNODAYA | no |
| Maha Shivaratri | Magha | Krishna 14 | NISHITA | no |
| Holi (Kama Dahana) | Phalguna | Purnima | PRADOSHA (avoid Bhadra) | no |

Recurring vratas: Ekadashi (both pakshas), Sankashti Chaturthi (Krishna 4, tithi at moonrise), Vinayaka Chaturthi (Shukla 4, MADHYAHNA), Pradosha (Trayodashi at PRADOSHA), Masa Shivaratri (Krishna 14, NISHITA), Amavasya, Purnima, Sankramana (every solar ingress).

## C8. Ekadashi seed rules (verify each)
- SMARTA: vrata on the civil date on which Ekadashi prevails at sunrise. If it prevails at two sunrises (Vriddhi), use `tie_break`. If none (Kshaya), take the date on which the tithi is present at some part of the day.
- MADHWA / SRI_VAISHNAVA: if Dashami overlaps the arunodaya of the Ekadashi day (Dashami-viddha), shift the vrata to the following day.
- Parana: on Dwadashi, after Hari Vasara (first quarter of Dwadashi), before Dwadashi ends.

## C9. Gochara favourable houses from natal Moon rashi
Sun 3, 6, 10, 11 · Moon 1, 3, 6, 7, 10, 11 · Mars 3, 6, 11 · Mercury 2, 4, 6, 8, 10, 11 · Jupiter 2, 5, 7, 9, 11 · Venus 1, 2, 3, 4, 5, 8, 9, 11, 12 · Saturn 3, 6, 11 · Rahu and Ketu 3, 6, 11 (some texts add 10).

## C10. Combustion (asta) orbs from the Sun, in degrees
Moon 12 · Mars 17 · Mercury 14 (12 if retrograde) · Jupiter 11 · Venus 10 (8 if retrograde) · Saturn 15.

## C11. Open questions to settle (copy into `docs/OPEN_QUESTIONS.md`)
1. Which sunrise convention does the Vontikoppal Panchanga use (upper limb with refraction, or disc centre)?
2. Mean or true Rahu node, and which Lahiri variant?
3. Gulika Kala: avoid, neutral, or auspicious for repetitive actions?
4. Length of Pradosha Kala (2 ghatikas, 3 muhurtas, or another) and Nishita window.
5. Ekadashi: which tradition does the family follow (Smarta, Madhwa, Sri Vaishnava)?
6. Makara Sankranti: which day rule when the ingress is after sunset?
7. Hanuma Jayanti and other festivals where regional dates differ: which does the book follow?
8. Kharamasa, Chaturmasa and Pitru paksha exclusions: exact ranges the book applies for each purpose.
9. Adhika masa 2026: confirm dates against the book.
10. Kannada strings: who reviews `needs_review` entries?
11. Spelling: `app_specification.md` writes "Ontikoppal"; pick one spelling (Vontikoppal or Ontikoppal) and use it everywhere.
12. Which sample days and pages from the book will you type into the fixtures first?

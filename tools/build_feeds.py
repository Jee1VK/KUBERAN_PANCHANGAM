#!/usr/bin/env python3
"""
build_feeds.py — Kuberan Panchangam Static Feed Builder
========================================================
Pre-computes accurate Panchangam data using the pyswisseph (Swiss Ephemeris)
library and saves it as static JSON files that the PWA can consume offline.

Usage:
    python tools/build_feeds.py --years 2025 2026 2027

Output:
    docs/feeds/<city_slug>/<year>/days.json

Each days.json contains a JSON array of day objects with all five Panchangam
limbs, sunrise/sunset, inauspicious periods, and calendar metadata.
"""

import sys
import os

# ---------------------------------------------------------------------------
# Allow imports from the project root (one level above tools/)
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import json
import math
import traceback
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

import swisseph as swe
from zoneinfo import ZoneInfo

# ═══════════════════════════════════════════════════════════════════════════
# Constants & Configuration
# ═══════════════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROFILE_PATH = PROJECT_ROOT / "profiles" / "vontikoppal.json"
OUTPUT_BASE = PROJECT_ROOT / "docs" / "feeds"

# Default list of cities with their geographic coordinates and timezones
CITIES = [
    {"name": "Bengaluru", "slug": "bengaluru", "lat": 12.9716, "lon": 77.5946, "tz": "Asia/Kolkata"},
    {"name": "Mysuru",    "slug": "mysuru",    "lat": 12.3052, "lon": 76.6552, "tz": "Asia/Kolkata"},
    {"name": "Delhi",     "slug": "delhi",     "lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata"},
    {"name": "Chennai",   "slug": "chennai",   "lat": 13.0827, "lon": 80.2707, "tz": "Asia/Kolkata"},
    {"name": "Mumbai",    "slug": "mumbai",    "lat": 19.0760, "lon": 72.8777, "tz": "Asia/Kolkata"},
    {"name": "Hyderabad", "slug": "hyderabad", "lat": 17.3850, "lon": 78.4867, "tz": "Asia/Kolkata"},
    {"name": "Mangaluru", "slug": "mangaluru", "lat": 12.8714, "lon": 74.8431, "tz": "Asia/Kolkata"},
]

# ---------------------------------------------------------------------------
# Tithi names (1–30)
# ---------------------------------------------------------------------------
TITHI_NAMES = [
    # Shukla Paksha (1–15)
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
    # Krishna Paksha (16–30)
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya",
]

# ---------------------------------------------------------------------------
# Nakshatra names (1–27)
# ---------------------------------------------------------------------------
NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

# ---------------------------------------------------------------------------
# Yoga names (1–27)
# ---------------------------------------------------------------------------
YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
    "Indra", "Vaidhriti",
]

# ---------------------------------------------------------------------------
# Karana names (repeating cycle of 11, with 4 fixed karanas)
# ---------------------------------------------------------------------------
# The 60 karanas follow this pattern:
#   Karana 1: Kimstughna (fixed)
#   Karanas 2-57: cycle through Bava, Balava, Kaulava, Taitila, Garaja,
#                 Vanija, Vishti (7 repeating)
#   Karana 58: Shakuni (fixed)
#   Karana 59: Chatushpada (fixed)
#   Karana 60: Nagava (fixed)
KARANA_CYCLE = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"]

def karana_name(index: int) -> str:
    """Return the name of the karana for a 1-based index (1–60)."""
    if index == 1:
        return "Kimstughna"
    elif index == 58:
        return "Shakuni"
    elif index == 59:
        return "Chatushpada"
    elif index == 60:
        return "Nagava"
    else:
        # Karanas 2–57 cycle through the 7 movable karanas
        return KARANA_CYCLE[(index - 2) % 7]

# ---------------------------------------------------------------------------
# Vara (weekday) names
# ---------------------------------------------------------------------------
VARA_NAMES = [
    "Ravivara",   # Sunday    (0)
    "Somavara",   # Monday    (1)
    "Mangalavara",# Tuesday   (2)
    "Budhavara",  # Wednesday (3)
    "Guruvara",   # Thursday  (4)
    "Shukravara", # Friday    (5)
    "Shanivara",  # Saturday  (6)
]

# ---------------------------------------------------------------------------
# Rashi names (1–12)
# ---------------------------------------------------------------------------
RASHI_NAMES = [
    "Mesha", "Vrishabha", "Mithuna", "Karka",
    "Simha", "Kanya", "Tula", "Vrischika",
    "Dhanus", "Makara", "Kumbha", "Meena",
]

# ---------------------------------------------------------------------------
# Masa (lunar month) names — Amanta system (month ends at Amavasya)
# ---------------------------------------------------------------------------
MASA_NAMES = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha",
    "Shravana", "Bhadrapada", "Ashvina", "Kartika",
    "Margashira", "Pushya", "Magha", "Phalguna",
]

# ---------------------------------------------------------------------------
# Ritu (season) names
# ---------------------------------------------------------------------------
RITU_NAMES = [
    "Vasanta",   # Chaitra–Vaishakha
    "Grishma",   # Jyeshtha–Ashadha
    "Varsha",    # Shravana–Bhadrapada
    "Sharad",    # Ashvina–Kartika
    "Hemanta",   # Margashira–Pushya
    "Shishira",  # Magha–Phalguna
]

# ---------------------------------------------------------------------------
# Samvatsara names (60-year cycle)
# ---------------------------------------------------------------------------
SAMVATSARA_NAMES = [
    "Prabhava", "Vibhava", "Shukla", "Pramodoota", "Prajothpatti",
    "Angirasa", "Shrimukha", "Bhava", "Yuva", "Dhata",
    "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrisha",
    "Chitrabhanu", "Svabhanu", "Tarana", "Parthiva", "Vyaya",
    "Sarvajit", "Sarvadhari", "Virodhi", "Vikrita", "Khara",
    "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
    "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava",
    "Shubhakrit", "Shobhakrit", "Krodhi", "Vishvavasu", "Parabhava",
    "Plavanga", "Kilaka", "Saumya", "Sadharana", "Virodhikrit",
    "Paridhavi", "Pramadicha", "Ananda", "Rakshasa", "Nala",
    "Pingala", "Kalayukti", "Siddharthi", "Raudra", "Durmathi",
    "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya",
]

# ═══════════════════════════════════════════════════════════════════════════
# Swiss Ephemeris Helpers
# ═══════════════════════════════════════════════════════════════════════════

def init_swisseph():
    """Initialize Swiss Ephemeris with Lahiri ayanamsa and built-in Moshier ephemeris."""
    swe.set_ephe_path('')  # Use built-in Moshier ephemeris (no external files needed)
    swe.set_sid_mode(swe.SIDM_LAHIRI)


def gregorian_to_jd(year: int, month: int, day: int,
                    hour: float = 0.0) -> float:
    """Convert a Gregorian date/time to Julian Day (UT)."""
    return swe.julday(year, month, day, hour)


def jd_to_utc_iso(jd: float) -> str:
    """Convert Julian Day to an ISO-8601 UTC timestamp string."""
    year, month, day, hour_frac = swe.revjul(jd)
    hours = int(hour_frac)
    remainder = (hour_frac - hours) * 60
    minutes = int(remainder)
    seconds = (remainder - minutes) * 60
    try:
        dt = datetime(year, month, day, hours, minutes, int(seconds),
                      tzinfo=timezone.utc)
    except (ValueError, OverflowError):
        # Fallback for edge cases near midnight
        dt = datetime(year, month, day, tzinfo=timezone.utc)
    return dt.isoformat()


def jd_to_local_iso(jd: float, tz_name: str) -> str:
    """Convert Julian Day to a local-time ISO-8601 timestamp string."""
    year, month, day, hour_frac = swe.revjul(jd)
    hours = int(hour_frac)
    remainder = (hour_frac - hours) * 60
    minutes = int(remainder)
    seconds = (remainder - minutes) * 60
    try:
        dt_utc = datetime(year, month, day, hours, minutes, int(seconds),
                          tzinfo=timezone.utc)
    except (ValueError, OverflowError):
        dt_utc = datetime(year, month, day, tzinfo=timezone.utc)
    tz = ZoneInfo(tz_name)
    dt_local = dt_utc.astimezone(tz)
    return dt_local.isoformat()


def get_sidereal_longitude(jd: float, planet: int) -> float:
    """
    Return the sidereal longitude of a planet at the given Julian Day.
    Uses Lahiri ayanamsa (set globally via swe.set_sid_mode).
    """
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    result, _ret_flags = swe.calc_ut(jd, planet, flags)
    return result[0]  # Longitude in degrees


def get_sun_sid(jd: float) -> float:
    """Return sidereal longitude of the Sun."""
    return get_sidereal_longitude(jd, swe.SUN)


def get_moon_sid(jd: float) -> float:
    """Return sidereal longitude of the Moon."""
    return get_sidereal_longitude(jd, swe.MOON)


# ═══════════════════════════════════════════════════════════════════════════
# Panchangam Limb Computations
# ═══════════════════════════════════════════════════════════════════════════

def compute_tithi_index(jd: float) -> int:
    """
    Compute the Tithi index (1–30) at a given Julian Day.
    Tithi = floor(((moon_sid - sun_sid) mod 360) / 12) + 1
    Shukla 1-15, Krishna 16-30.
    """
    moon = get_moon_sid(jd)
    sun = get_sun_sid(jd)
    diff = (moon - sun) % 360.0
    return int(math.floor(diff / 12.0)) + 1


def compute_nakshatra_index(jd: float) -> int:
    """
    Compute the Nakshatra index (1–27) at a given Julian Day.
    Nakshatra = floor(moon_sid / (360/27)) + 1
    """
    moon = get_moon_sid(jd)
    return int(math.floor(moon / (360.0 / 27.0))) + 1


def compute_nakshatra_pada(jd: float) -> int:
    """
    Compute the Nakshatra pada (1–4) at a given Julian Day.
    Each nakshatra spans 13°20' = 360/27 degrees.
    Each pada spans 3°20' = (360/27)/4 degrees.
    """
    moon = get_moon_sid(jd)
    nakshatra_span = 360.0 / 27.0
    position_in_nakshatra = moon % nakshatra_span
    pada = int(math.floor(position_in_nakshatra / (nakshatra_span / 4.0))) + 1
    return min(pada, 4)  # Clamp to 4


def compute_yoga_index(jd: float) -> int:
    """
    Compute the Yoga index (1–27) at a given Julian Day.
    Yoga = floor(((sun_sid + moon_sid) mod 360) / (360/27)) + 1
    """
    moon = get_moon_sid(jd)
    sun = get_sun_sid(jd)
    total = (sun + moon) % 360.0
    return int(math.floor(total / (360.0 / 27.0))) + 1


def compute_karana_index(jd: float) -> int:
    """
    Compute the Karana index (1–60) at a given Julian Day.
    Karana = floor(((moon_sid - sun_sid) mod 360) / 6) + 1
    """
    moon = get_moon_sid(jd)
    sun = get_sun_sid(jd)
    diff = (moon - sun) % 360.0
    return int(math.floor(diff / 6.0)) + 1


# ═══════════════════════════════════════════════════════════════════════════
# End-time Finder via Bisection
# ═══════════════════════════════════════════════════════════════════════════

def find_end_time(jd_start: float, jd_end: float,
                  index_func, current_index: int,
                  tolerance_days: float = 1.0 / 86400.0) -> float:
    """
    Use bisection to find the Julian Day when `index_func` transitions
    away from `current_index` within the interval [jd_start, jd_end].

    The tolerance is ~1 second (1/86400 of a day).

    Returns the JD of the transition, or jd_end if no transition is found
    within the bracket (i.e., the limb extends beyond the search window).
    """
    # Verify that a transition actually exists in this interval
    if index_func(jd_end) == current_index:
        return jd_end  # No transition in this window

    lo = jd_start
    hi = jd_end

    while (hi - lo) > tolerance_days:
        mid = (lo + hi) / 2.0
        if index_func(mid) == current_index:
            lo = mid
        else:
            hi = mid

    return hi


def find_limb_end_time(jd_sunrise: float, index_func, current_index: int,
                       search_days: float = 2.0) -> float:
    """
    Find the end time (JD) of the current limb, searching up to
    `search_days` ahead from sunrise.
    """
    jd_end = jd_sunrise + search_days
    return find_end_time(jd_sunrise, jd_end, index_func, current_index)


# ═══════════════════════════════════════════════════════════════════════════
# Sunrise / Sunset
# ═══════════════════════════════════════════════════════════════════════════

def compute_sunrise(jd_ut: float, lat: float, lon: float) -> float | None:
    """
    Compute sunrise JD using swe.rise_trans with upper-limb + refraction.
    `jd_ut` should be the Julian Day at 0h UT of the desired date.
    Returns the JD of sunrise, or None on failure.
    """
    # SE_CALC_RISE = 1, SE_BIT_DISC_BOTTOM is not what we want for upper limb.
    # For upper limb with refraction: SE_CALC_RISE | SE_BIT_DISC_CENTER is default,
    # but SE_BIT_DISC_BOTTOM gives the moment the lower edge of the disc touches
    # the horizon. For "upper limb with refraction" (traditional Hindu sunrise),
    # we actually want SE_BIT_DISC_BOTTOM which is when the full disc has just
    # cleared the horizon — this is the Vontikoppal convention.
    rsmi = swe.CALC_RISE | swe.BIT_DISC_BOTTOM
    geopos = (lon, lat, 0.0)  # (longitude, latitude, altitude)
    try:
        result = swe.rise_trans(jd_ut, swe.SUN, '', rsmi, geopos, 0.0, 0.0)
        # result is a tuple: (return_code, (jd_rise,))
        if result[0] == -1:
            return None
        return result[1][0]
    except Exception:
        return None


def compute_sunset(jd_ut: float, lat: float, lon: float) -> float | None:
    """
    Compute sunset JD using swe.rise_trans with upper-limb + refraction.
    Returns the JD of sunset, or None on failure.
    """
    rsmi = swe.CALC_SET | swe.BIT_DISC_BOTTOM
    geopos = (lon, lat, 0.0)
    try:
        result = swe.rise_trans(jd_ut, swe.SUN, '', rsmi, geopos, 0.0, 0.0)
        if result[0] == -1:
            return None
        return result[1][0]
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════
# Inauspicious Periods (Rahu Kala, Yamaganda, Gulika Kala)
# ═══════════════════════════════════════════════════════════════════════════

def compute_inauspicious_period(jd_sunrise: float, jd_sunset: float,
                                weekday: int, parts_list: list[int]) -> dict:
    """
    Compute an inauspicious period (Rahu Kala, Yamaganda, or Gulika Kala).

    The day (sunrise-to-sunset) is divided into 8 equal parts.
    `parts_list` is a 7-element list (indexed by weekday 0=Sun..6=Sat)
    giving the 1-based part number for that weekday.

    Returns a dict with 'start' and 'end' Julian Days.
    """
    day_duration = jd_sunset - jd_sunrise
    part_duration = day_duration / 8.0
    part_number = parts_list[weekday]  # 1-based
    start = jd_sunrise + (part_number - 1) * part_duration
    end = start + part_duration
    return {"start": start, "end": end}


# ═══════════════════════════════════════════════════════════════════════════
# Calendar Metadata (Samvatsara, Masa, Paksha, Ritu, Ayana)
# ═══════════════════════════════════════════════════════════════════════════

def compute_samvatsara(gregorian_year: int, month: int) -> dict:
    """
    Compute the Samvatsara (60-year cycle name).
    Shaka year = Gregorian year - 78.
    Before Ugadi (roughly before April), use previous year.
    Samvatsara index = (shaka_year + 12) % 60  (0-based for array lookup).
    """
    # The Hindu new year (Ugadi) typically falls in March/April (Chaitra).
    # If we're before April, we consider it the previous Shaka year.
    if month < 4:
        shaka_year = gregorian_year - 78 - 1
    else:
        shaka_year = gregorian_year - 78

    samvatsara_index = (shaka_year + 12) % 60  # 0-based
    return {
        "index": samvatsara_index + 1,  # 1-based for display
        "name": SAMVATSARA_NAMES[samvatsara_index],
        "shaka_year": shaka_year,
    }


def compute_paksha(tithi_index: int) -> str:
    """Return 'Shukla' or 'Krishna' based on tithi index (1–30)."""
    return "Shukla" if tithi_index <= 15 else "Krishna"


def compute_masa(jd: float) -> dict:
    """
    Approximate the lunar Masa based on Sun's sidereal longitude.
    The Masa corresponds to the Sun's transit through each Rashi
    (Amanta system — month ends at Amavasya).

    This is a simplified approximation. For exact Masa determination,
    one would need to track the Amavasya-to-Amavasya boundaries and
    check for Adhika Masa (intercalary months).
    """
    sun_sid = get_sun_sid(jd)
    # The solar month index: Sun in Mesha (0-30°) → Chaitra, etc.
    # In the Amanta system, the lunar month is named after the solar month
    # in which the Amavasya ending the month falls.
    # Simplified: We use the Sun's rashi to approximate the masa.
    # Mesha → Chaitra, Vrishabha → Vaishakha, etc.
    rashi_index = int(math.floor(sun_sid / 30.0))  # 0-based
    masa_index = rashi_index  # 0-based, Chaitra=0
    return {
        "index": masa_index + 1,  # 1-based
        "name": MASA_NAMES[masa_index],
    }


def compute_ritu(masa_index: int) -> dict:
    """
    Compute the Ritu (season) from the Masa index (1-based).
    Two consecutive Masas form one Ritu:
      Chaitra-Vaishakha → Vasanta, Jyeshtha-Ashadha → Grishma, etc.
    """
    ritu_index = (masa_index - 1) // 2  # 0-based
    return {
        "index": ritu_index + 1,
        "name": RITU_NAMES[ritu_index],
    }


def compute_ayana(jd: float) -> str:
    """
    Compute the Ayana (solstice-based half-year).
    Uttarayana: Sun in Makara–Mithuna (sidereal long 270°–90°, i.e., roughly Jan–Jul).
    Dakshinayana: Sun in Karka–Dhanus (sidereal long 90°–270°, i.e., roughly Jul–Jan).
    """
    sun_sid = get_sun_sid(jd)
    # Uttarayana: Sun's sidereal longitude 270° to 90° (crossing 0°/360°)
    if sun_sid >= 270.0 or sun_sid < 90.0:
        return "Uttarayana"
    else:
        return "Dakshinayana"


def compute_rashi(longitude: float) -> dict:
    """Return the Rashi (zodiac sign) for a given sidereal longitude."""
    index = int(math.floor(longitude / 30.0)) % 12  # 0-based
    return {
        "index": index + 1,  # 1-based
        "name": RASHI_NAMES[index],
        "degree": round(longitude % 30.0, 4),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Day Builder — Assemble a single day's Panchangam data
# ═══════════════════════════════════════════════════════════════════════════

def build_day(d: date, city: dict, profile: dict) -> dict | None:
    """
    Build the complete Panchangam data for a single day and city.
    Returns a dict representing the day, or None on failure.
    """
    tz_name = city["tz"]
    lat = city["lat"]
    lon = city["lon"]

    # Julian Day at 0h UT for this date
    jd_ut = gregorian_to_jd(d.year, d.month, d.day, 0.0)

    # ── Sunrise & Sunset ──────────────────────────────────────────────
    jd_sunrise = compute_sunrise(jd_ut, lat, lon)
    jd_sunset = compute_sunset(jd_ut, lat, lon)

    if jd_sunrise is None or jd_sunset is None:
        # Extreme latitudes might not have sunrise/sunset on some days
        return None

    # ── Weekday (Vara) ────────────────────────────────────────────────
    weekday = d.weekday()  # Monday=0, Sunday=6 in Python
    # Convert to Sunday=0 convention for Panchangam
    vara_index = (weekday + 1) % 7  # Sun=0, Mon=1, ..., Sat=6

    # ── Tithi ─────────────────────────────────────────────────────────
    tithi_index = compute_tithi_index(jd_sunrise)
    tithi_end_jd = find_limb_end_time(jd_sunrise, compute_tithi_index, tithi_index)

    # ── Nakshatra ─────────────────────────────────────────────────────
    nak_index = compute_nakshatra_index(jd_sunrise)
    nak_pada = compute_nakshatra_pada(jd_sunrise)
    nak_end_jd = find_limb_end_time(jd_sunrise, compute_nakshatra_index, nak_index)

    # ── Yoga ──────────────────────────────────────────────────────────
    yoga_index = compute_yoga_index(jd_sunrise)
    yoga_end_jd = find_limb_end_time(jd_sunrise, compute_yoga_index, yoga_index)

    # ── Karana ─────────────────────────────────────────────────────────
    kar_index = compute_karana_index(jd_sunrise)

    # ── Inauspicious Periods ──────────────────────────────────────────
    rahu_kala_parts = profile.get("rahu_kala_parts", [8, 2, 7, 5, 6, 4, 3])
    yamagandam_parts = profile.get("yamagandam_parts", [5, 4, 3, 2, 1, 7, 6])
    gulika_kala_parts = profile.get("gulika_kala_parts", [7, 6, 5, 4, 3, 2, 1])

    rahu = compute_inauspicious_period(jd_sunrise, jd_sunset, vara_index, rahu_kala_parts)
    yama = compute_inauspicious_period(jd_sunrise, jd_sunset, vara_index, yamagandam_parts)
    gulika = compute_inauspicious_period(jd_sunrise, jd_sunset, vara_index, gulika_kala_parts)

    # ── Sun & Moon Longitudes and Rashis ──────────────────────────────
    sun_sid = get_sun_sid(jd_sunrise)
    moon_sid = get_moon_sid(jd_sunrise)

    # ── Calendar Metadata ─────────────────────────────────────────────
    samvatsara = compute_samvatsara(d.year, d.month)
    masa = compute_masa(jd_sunrise)
    paksha = compute_paksha(tithi_index)
    ritu = compute_ritu(masa["index"])
    ayana = compute_ayana(jd_sunrise)

    # ── Assemble Day Object ───────────────────────────────────────────
    return {
        "date": d.isoformat(),
        "vara": {
            "index": vara_index,
            "name": VARA_NAMES[vara_index],
        },
        "sunrise": {
            "jd": round(jd_sunrise, 8),
            "utc": jd_to_utc_iso(jd_sunrise),
            "local": jd_to_local_iso(jd_sunrise, tz_name),
        },
        "sunset": {
            "jd": round(jd_sunset, 8),
            "utc": jd_to_utc_iso(jd_sunset),
            "local": jd_to_local_iso(jd_sunset, tz_name),
        },
        "tithi": {
            "index": tithi_index,
            "name": TITHI_NAMES[tithi_index - 1],
            "paksha": paksha,
            "end_utc": jd_to_utc_iso(tithi_end_jd),
            "end_local": jd_to_local_iso(tithi_end_jd, tz_name),
            "end_jd": round(tithi_end_jd, 8),
        },
        "nakshatra": {
            "index": nak_index,
            "name": NAKSHATRA_NAMES[nak_index - 1],
            "pada": nak_pada,
            "end_utc": jd_to_utc_iso(nak_end_jd),
            "end_local": jd_to_local_iso(nak_end_jd, tz_name),
            "end_jd": round(nak_end_jd, 8),
        },
        "yoga": {
            "index": yoga_index,
            "name": YOGA_NAMES[yoga_index - 1],
            "end_utc": jd_to_utc_iso(yoga_end_jd),
            "end_local": jd_to_local_iso(yoga_end_jd, tz_name),
            "end_jd": round(yoga_end_jd, 8),
        },
        "karana": {
            "index": kar_index,
            "name": karana_name(kar_index),
        },
        "rahu_kala": {
            "start_utc": jd_to_utc_iso(rahu["start"]),
            "end_utc": jd_to_utc_iso(rahu["end"]),
            "start_local": jd_to_local_iso(rahu["start"], tz_name),
            "end_local": jd_to_local_iso(rahu["end"], tz_name),
        },
        "yamaganda": {
            "start_utc": jd_to_utc_iso(yama["start"]),
            "end_utc": jd_to_utc_iso(yama["end"]),
            "start_local": jd_to_local_iso(yama["start"], tz_name),
            "end_local": jd_to_local_iso(yama["end"], tz_name),
        },
        "gulika_kala": {
            "start_utc": jd_to_utc_iso(gulika["start"]),
            "end_utc": jd_to_utc_iso(gulika["end"]),
            "start_local": jd_to_local_iso(gulika["start"], tz_name),
            "end_local": jd_to_local_iso(gulika["end"], tz_name),
        },
        "sun": {
            "sidereal_longitude": round(sun_sid, 4),
            "rashi": compute_rashi(sun_sid),
        },
        "moon": {
            "sidereal_longitude": round(moon_sid, 4),
            "rashi": compute_rashi(moon_sid),
        },
        "samvatsara": samvatsara,
        "masa": masa,
        "paksha": paksha,
        "ritu": ritu,
        "ayana": ayana,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Feed Writer — Build and save JSON feeds
# ═══════════════════════════════════════════════════════════════════════════

def build_year_feed(year: int, city: dict, profile: dict) -> list[dict]:
    """Build Panchangam data for every day in the given year for a city."""
    days = []
    d = date(year, 1, 1)
    end = date(year + 1, 1, 1)
    total_days = (end - d).days

    while d < end:
        day_num = (d - date(year, 1, 1)).days + 1
        if day_num % 30 == 1 or day_num == total_days:
            print(f"    Day {day_num}/{total_days}: {d.isoformat()}")

        try:
            day_data = build_day(d, city, profile)
            if day_data is not None:
                days.append(day_data)
            else:
                print(f"    ⚠ No sunrise/sunset for {d.isoformat()} — skipped")
        except Exception as e:
            print(f"    ✗ Error on {d.isoformat()}: {e}")
            traceback.print_exc()

        d += timedelta(days=1)

    return days


def save_feed(days: list[dict], city: dict, year: int, profile_id: str):
    """Save the computed days as a JSON feed file."""
    out_dir = OUTPUT_BASE / city["slug"] / str(year)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "days.json"

    feed = {
        "profile_id": profile_id,
        "city": city["name"],
        "city_slug": city["slug"],
        "year": year,
        "latitude": city["lat"],
        "longitude": city["lon"],
        "timezone": city["tz"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "day_count": len(days),
        "days": days,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(feed, f, ensure_ascii=False, indent=2)

    size_kb = out_path.stat().st_size / 1024
    print(f"    ✓ Written {out_path} ({size_kb:.1f} KB, {len(days)} days)")


# ═══════════════════════════════════════════════════════════════════════════
# CLI Entry Point
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Kuberan Panchangam — Static Feed Builder",
        epilog="Example: python tools/build_feeds.py --years 2025 2026 2027",
    )
    parser.add_argument(
        "--years",
        type=int,
        nargs="+",
        required=True,
        help="One or more years to compute (e.g., 2025 2026 2027)",
    )
    parser.add_argument(
        "--cities",
        nargs="+",
        default=None,
        help="City slugs to compute (default: all). E.g., --cities bengaluru mysuru",
    )
    args = parser.parse_args()

    # ── Load Profile ──────────────────────────────────────────────────
    print(f"Loading profile from {PROFILE_PATH} ...")
    if not PROFILE_PATH.exists():
        print(f"✗ Profile not found: {PROFILE_PATH}")
        sys.exit(1)

    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        profile = json.load(f)

    profile_id = profile.get("id", "unknown")
    print(f"  Profile: {profile.get('display_name', profile_id)}")
    print(f"  Ayanamsa: {profile.get('ayanamsa', 'LAHIRI')}")
    print(f"  Sunrise mode: {profile.get('sunrise_mode', 'UPPER_LIMB_REFRACTION')}")
    print()

    # ── Initialize Swiss Ephemeris ────────────────────────────────────
    init_swisseph()
    print("Swiss Ephemeris initialized (Lahiri ayanamsa, Moshier ephemeris)")
    print()

    # ── Filter cities if requested ────────────────────────────────────
    if args.cities:
        selected_slugs = set(s.lower() for s in args.cities)
        cities = [c for c in CITIES if c["slug"] in selected_slugs]
        unknown = selected_slugs - set(c["slug"] for c in cities)
        if unknown:
            print(f"⚠ Unknown city slugs (ignored): {', '.join(unknown)}")
        if not cities:
            print("✗ No valid cities selected.")
            sys.exit(1)
    else:
        cities = CITIES

    # ── Build Feeds ───────────────────────────────────────────────────
    total_start = datetime.now()
    total_feeds = 0

    for year in sorted(args.years):
        for city in cities:
            print(f"═══ {city['name']} — {year} ═══")
            city_start = datetime.now()

            days = build_year_feed(year, city, profile)
            save_feed(days, city, year, profile_id)

            elapsed = (datetime.now() - city_start).total_seconds()
            print(f"    Completed in {elapsed:.1f}s")
            print()
            total_feeds += 1

    total_elapsed = (datetime.now() - total_start).total_seconds()
    print(f"Done. {total_feeds} feed(s) generated in {total_elapsed:.1f}s total.")

    # ── Cleanup Swiss Ephemeris ───────────────────────────────────────
    swe.close()


if __name__ == "__main__":
    main()

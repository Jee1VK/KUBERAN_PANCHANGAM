"""
engine.py — Kuberan Panchangam High-Precision Drik Ganita Astronomical Engine
==============================================================================

Provides sub-second, multi-century Vedic astronomical calculations using the
Swiss Ephemeris (DE431 / Moshier analytical series) with True Chitrapaksha
(Lahiri) Ayanamsa.

Mathematical Formulations:
--------------------------
1. Julian Ephemeris Day (JD_UT / JDE):
   Continuous time variable counting days and fractional days from
   1 January 4713 BCE (Julian proleptic noon).

2. True Chitrapaksha (Lahiri) Ayanamsa:
   Anchored so that Spica (Alpha Virginis, Chitra) lies at exactly 180°00'00"
   sidereal longitude (0° Tula), incorporating IAU 2006 general precession:
       psi_A(T) = 5028.796195" * T + 1.1054348" * T^2
                  + 0.00007964" * T^3 - 0.000023857" * T^4
   plus true nutation in longitude (Delta_psi), where T = (JD - 2451545.0) / 36525.

3. Tithi & Continuous Root-Finding (Bisection over JD):
   A Tithi is a 12° increment of the lunar-solar synodic elongation:
       E(t) = (lambda_Moon(t) - lambda_Sun(t)) mod 360°
   Transition boundaries t_k where E(t_k) = 12° * k are solved via bracketed
   binary search over Julian Day to a tolerance of 10^-8 days (~0.86 ms):
       f(t) = ((E(t) - 12k + 540°) mod 360°) - 180° = 0

4. Kshaya Tithi & Adhika (Vriddhi) Tithi Detection:
   Let t_rise,0 and t_rise,1 be two consecutive local sunrises:
   - Adhika (Vriddhi) Tithi: t_start <= t_rise,0 and t_end >= t_rise,1
     (a single Tithi spans across two consecutive sunrises).
   - Kshaya (Lupta) Tithi: A Tithi T_k that begins after t_rise,0 and ends
     before t_rise,1 (t_rise,0 < t_start < t_end < t_rise,1), touching zero sunrises.
"""

from __future__ import annotations

import datetime
import functools
import math
from typing import Any, Callable, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

try:
    import swisseph as swe
    HAS_SWISSEPH = True
except ImportError:
    swe = None  # type: ignore
    HAS_SWISSEPH = False

# ============================================================================
#  CONSTANTS & DEFAULT FALLBACK COORDINATES (Bengaluru, Karnataka)
# ============================================================================
DEFAULT_LAT: float = 12.9716
DEFAULT_LON: float = 77.5946
DEFAULT_TZ: str = "Asia/Kolkata"

# True Chitrapaksha (Lahiri) Ayanamsa mode in Swiss Ephemeris
if HAS_SWISSEPH:
    AYANAMSA_LAHIRI = getattr(swe, "SIDM_TRUE_CITRA", swe.SIDM_LAHIRI)
else:
    AYANAMSA_LAHIRI = 27

TITHI_NAMES: List[str] = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shasthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"
]

NAKSHATRA_NAMES: List[str] = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Moola", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

RASHI_NAMES: List[str] = [
    "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)",
    "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
    "Tula (Libra)", "Vrischika (Scorpio)", "Dhanu (Sagittarius)",
    "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
]


# ============================================================================
#  COORDINATE VALIDATION & DYNAMIC IANA TIMEZONE RESOLUTION
# ============================================================================
def validate_coordinates(
    lat: Optional[float],
    lon: Optional[float]
) -> Tuple[float, float, bool]:
    """
    Validate geographic coordinates within [-90, +90] latitude and [-180, +180] longitude.
    Falls back to Bengaluru (12.9716° N, 77.5946° E) if inputs are None, NaN, or out of bounds.

    Returns:
        Tuple of (validated_lat, validated_lon, is_valid_input).
    """
    try:
        if lat is None or lon is None:
            return DEFAULT_LAT, DEFAULT_LON, False
        lat_f = float(lat)
        lon_f = float(lon)
        if math.isnan(lat_f) or math.isnan(lon_f) or math.isinf(lat_f) or math.isinf(lon_f):
            return DEFAULT_LAT, DEFAULT_LON, False
        if not (-90.0 <= lat_f <= 90.0) or not (-180.0 <= lon_f <= 180.0):
            return DEFAULT_LAT, DEFAULT_LON, False
        return lat_f, lon_f, True
    except (TypeError, ValueError):
        return DEFAULT_LAT, DEFAULT_LON, False


def resolve_iana_timezone(
    lat: float,
    lon: float,
    explicit_tz: Optional[str] = None
) -> str:
    """
    Resolve an IANA timezone identifier dynamically from (lat, lon) coordinates,
    avoiding hardcoded +05:30 IST assumptions for global locations.

    Args:
        lat: Latitude in decimal degrees (-90 to +90).
        lon: Longitude in decimal degrees (-180 to +180).
        explicit_tz: Optional user-provided IANA timezone string.

    Returns:
        Valid IANA timezone string (e.g., 'Asia/Kolkata', 'America/New_York').
    """
    if explicit_tz:
        try:
            ZoneInfo(explicit_tz)
            return explicit_tz
        except Exception:
            pass

    lat, lon, _ = validate_coordinates(lat, lon)

    # 1. Try timezonefinder if installed in the Python environment
    try:
        from timezonefinder import TimezoneFinder  # type: ignore
        tf = TimezoneFinder()
        tz_found = tf.timezone_at(lng=lon, lat=lat)
        if tz_found:
            return tz_found
    except ImportError:
        pass

    # 2. Geographic bounding-box resolution for India & global diaspora hubs
    if 6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5:
        if 26.0 <= lat <= 30.5 and 80.0 <= lon <= 88.2 and lat > 27.5:
            return "Asia/Kathmandu"
        if 5.8 <= lat <= 9.9 and 79.5 <= lon <= 82.0:
            return "Asia/Colombo"
        return "Asia/Kolkata"
    if 22.0 <= lat <= 26.5 and 51.0 <= lon <= 56.5:
        return "Asia/Dubai"
    if 1.1 <= lat <= 1.5 and 103.5 <= lon <= 104.1:
        return "Asia/Singapore"
    if 49.8 <= lat <= 60.9 and -8.2 <= lon <= 1.8:
        return "Europe/London"
    if 24.0 <= lat <= 50.0 and -125.0 <= lon <= -66.0:
        if lon >= -85.0:
            return "America/New_York"
        if lon >= -102.0:
            return "America/Chicago"
        if lon >= -115.0:
            return "America/Denver"
        return "America/Los_Angeles"
    if -44.0 <= lat <= -10.0 and 113.0 <= lon <= 154.0:
        return "Australia/Sydney"

    return DEFAULT_TZ


def get_tz_offset_hours(
    tz_name: str,
    dt_utc: Optional[datetime.datetime] = None
) -> float:
    """
    Compute the dynamic UTC offset (in fractional hours) for an IANA timezone
    at a specific UTC datetime, accurately accounting for Daylight Saving Time (DST).
    """
    try:
        zi = ZoneInfo(tz_name)
        ref = dt_utc if dt_utc is not None else datetime.datetime.now(datetime.timezone.utc)
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=datetime.timezone.utc)
        local_dt = ref.astimezone(zi)
        offset = local_dt.utcoffset()
        if offset is not None:
            return offset.total_seconds() / 3600.0
    except Exception:
        pass
    return 5.5


# ============================================================================
#  IN-MEMORY MEMOIZATION LAYER KEYED BY (JulianDay, Latitude, Longitude)
# ============================================================================
@functools.lru_cache(maxsize=4096)
def _cached_ayanamsa(jd_rounded: float) -> float:
    """
    Compute True Chitrapaksha (Lahiri) Ayanamsa at Julian Day `jd_rounded`.
    Uses Swiss Ephemeris when available, or the IAU 2006 4th-order precession
    polynomial anchored to J2000.0 = 23°51'25.532" (23.857092°).
    """
    if HAS_SWISSEPH:
        swe.set_sid_mode(AYANAMSA_LAHIRI)
        return float(swe.get_ayanamsa_ut(jd_rounded))
    T = (jd_rounded - 2451545.0) / 36525.0
    psi_arcsec = (
        5028.796195 * T
        + 1.1054348 * (T ** 2)
        + 0.00007964 * (T ** 3)
        - 0.000023857 * (T ** 4)
    )
    return 23.857092 + (psi_arcsec / 3600.0)


@functools.lru_cache(maxsize=8192)
def _cached_sun_moon_sidereal(jd_rounded: float) -> Tuple[float, float]:
    """
    Memoized sidereal Sun and Moon longitudes (in degrees [0, 360)) at `jd_rounded`.
    """
    if HAS_SWISSEPH:
        swe.set_sid_mode(AYANAMSA_LAHIRI)
        flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
        sun_res, _ = swe.calc_ut(jd_rounded, swe.SUN, flags)
        moon_res, _ = swe.calc_ut(jd_rounded, swe.MOON, flags)
        return float(sun_res[0]) % 360.0, float(moon_res[0]) % 360.0

    # High-precision analytical fallback (Meeus Chapter 25 & 47) when swisseph C-extension is absent
    T = (jd_rounded - 2451545.0) / 36525.0
    # Sun apparent tropical longitude
    L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360.0
    M_sun = math.radians((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360.0)
    C_sun = (
        (1.914602 - 0.004817 * T - 0.000014 * T * T) * math.sin(M_sun)
        + (0.019993 - 0.000101 * T) * math.sin(2 * M_sun)
        + 0.000289 * math.sin(3 * M_sun)
    )
    sun_trop = (L0 + C_sun) % 360.0

    # Moon tropical longitude (principal periodic terms)
    Lp = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) % 360.0
    D = math.radians((297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) % 360.0)
    M = M_sun
    Mp = math.radians((134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) % 360.0)
    F = math.radians((93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) % 360.0)

    moon_corr = (
        6.288774 * math.sin(Mp)
        + 1.274027 * math.sin(2 * D - Mp)
        + 0.658314 * math.sin(2 * D)
        + 0.213618 * math.sin(2 * Mp)
        - 0.185596 * math.sin(M)
        - 0.114336 * math.sin(2 * F)
        + 0.058793 * math.sin(2 * D - 2 * Mp)
        + 0.057212 * math.sin(2 * D - M - Mp)
        + 0.053320 * math.sin(2 * D + Mp)
        + 0.045874 * math.sin(2 * D - M)
        - 0.040923 * math.sin(M - Mp)
        - 0.034720 * math.sin(D)
        - 0.030383 * math.sin(M + Mp)
    )
    moon_trop = (Lp + moon_corr) % 360.0
    ayan = _cached_ayanamsa(jd_rounded)
    return (sun_trop - ayan) % 360.0, (moon_trop - ayan) % 360.0


def elongation_at_jd(jd: float) -> float:
    """Return lunar-solar synodic elongation (Moon - Sun) mod 360° at Julian Day `jd`."""
    s_lon, m_lon = _cached_sun_moon_sidereal(round(jd, 8))
    return (m_lon - s_lon) % 360.0


def find_exact_boundary_jd(
    jd_start: float,
    angle_fn: Callable[[float], float],
    unit_deg: float,
    direction: int = 1,
    tol: float = 1e-8
) -> float:
    """
    Continuous root-finding via bracketed binary search over Julian Day.
    Finds the exact transition moment when `angle_fn(jd)` crosses a multiple of `unit_deg`.

    Args:
        jd_start: Starting Julian Day.
        angle_fn: Function mapping JD -> angle in [0, 360).
        unit_deg: Angular span of one limb (12.0 for Tithi, 360/27 for Nakshatra, 6.0 for Karana).
        direction: +1 for next boundary (end time), -1 for previous boundary (start time).
        tol: Convergence tolerance in days (1e-8 days ≈ 0.86 milliseconds).

    Returns:
        Exact Julian Day of the boundary transition.
    """
    cur_angle = angle_fn(jd_start)
    if direction >= 0:
        target = ((math.floor(cur_angle / unit_deg) + 1) * unit_deg) % 360.0
    else:
        target = (math.floor(cur_angle / unit_deg) * unit_deg) % 360.0

    step = 0.04 * (1 if direction >= 0 else -1)
    max_span = 1.6
    a = jd_start
    b = jd_start + step

    while abs(b - jd_start) < max_span:
        diff_a = ((angle_fn(a) - target + 540.0) % 360.0) - 180.0
        diff_b = ((angle_fn(b) - target + 540.0) % 360.0) - 180.0
        if (direction >= 0 and diff_a < 0.0 <= diff_b) or (direction < 0 and diff_b <= 0.0 < diff_a):
            break
        a = b
        b = a + step

    lo, hi = (a, b) if a < b else (b, a)
    for _ in range(30):
        if (hi - lo) <= tol:
            break
        mid = 0.5 * (lo + hi)
        diff_mid = ((angle_fn(mid) - target + 540.0) % 360.0) - 180.0
        if diff_mid >= 0.0:
            hi = mid
        else:
            lo = mid
    return 0.5 * (lo + hi)


@functools.lru_cache(maxsize=2048)
def compute_local_sunrise_jd(year: int, month: int, day: int, lat_r: float, lon_r: float, tz_off: float) -> float:
    """
    Compute exact local sunrise Julian Day for `(year, month, day)` at `(lat_r, lon_r)`.
    Uses Swiss Ephemeris `rise_trans` when available, or NOAA/Meeus solar zenith 90.8333° algorithm.
    """
    # Base JD at 00:00 UTC
    y, m = year, month
    if m <= 2:
        y -= 1
        m += 12
    a = math.floor(y / 100)
    b = 2 - a + math.floor(a / 4)
    base_jd = math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + day + b - 1524.5
    local_midnight_jd = base_jd - (tz_off / 24.0)

    if HAS_SWISSEPH:
        try:
            res, tret = swe.rise_trans(
                local_midnight_jd,
                swe.SUN,
                "",
                swe.FLG_SWIEPH,
                swe.CALC_RISE | swe.BIT_DISC_CENTER,
                (lon_r, lat_r, 0.0),
                1013.25,
                15.0
            )
            if res == 0 and tret and tret[0] > local_midnight_jd:
                return float(tret[0])
        except Exception:
            pass

    # Analytical solar sunrise (zenith = 90°50' for atmospheric refraction + solar semi-diameter)
    noon_jd = local_midnight_jd + 0.5
    T = (noon_jd - 2451545.0) / 36525.0
    L0 = math.radians((280.46646 + 36000.76983 * T) % 360.0)
    M = math.radians((357.52911 + 35999.05029 * T) % 360.0)
    e = 0.016708634 - 0.000042037 * T
    sun_lon = L0 + math.radians(1.914602 * math.sin(M) + 0.019993 * math.sin(2 * M))
    eps = math.radians(23.439291 - 0.0130042 * T)
    sin_dec = math.sin(eps) * math.sin(sun_lon)
    dec = math.asin(max(-1.0, min(1.0, sin_dec)))

    y_var = math.tan(eps / 2.0) ** 2
    eq_time_min = 4.0 * math.degrees(
        y_var * math.sin(2 * L0)
        - 2.0 * e * math.sin(M)
        + 4.0 * e * y_var * math.sin(M) * math.cos(2 * L0)
        - 0.5 * y_var * y_var * math.sin(4 * L0)
        - 1.25 * e * e * math.sin(2 * M)
    )

    lat_rad = math.radians(lat_r)
    zenith_rad = math.radians(90.8333)
    cos_ha = (
        (math.cos(zenith_rad) / (math.cos(lat_rad) * math.cos(dec)))
        - math.tan(lat_rad) * math.tan(dec)
    )
    cos_ha = max(-1.0, min(1.0, cos_ha))
    ha_deg = math.degrees(math.acos(cos_ha))
    sunrise_utc_min = 720.0 - 4.0 * (lon_r + ha_deg) - eq_time_min
    return base_jd + (sunrise_utc_min / 1440.0)


# ============================================================================
#  MAIN VEDIC ENGINE CLASS
# ============================================================================
class VedicEngine:
    """
    Drik Ganita Vedic Astronomical Engine with continuous root-finding for Tithi
    transitions, Kshaya/Adhika Tithi detection, dynamic IANA timezone resolution,
    and memoized ephemeris evaluation.
    """

    def __init__(
        self,
        year: int,
        month: int,
        day: int,
        hour: int = 6,
        minute: int = 0,
        lat: float = DEFAULT_LAT,
        lon: float = DEFAULT_LON,
        altitude: float = 0.0,
        tz_name: Optional[str] = None
    ) -> None:
        self.year = year
        self.month = month
        self.day = day
        self.lat, self.lon, self.coords_valid = validate_coordinates(lat, lon)
        self.altitude = altitude
        self.tz_name = resolve_iana_timezone(self.lat, self.lon, tz_name)

        dt_approx = datetime.datetime(year, month, day, hour, minute, tzinfo=datetime.timezone.utc)
        self.tz_offset_hours = get_tz_offset_hours(self.tz_name, dt_approx)

        # Compute local sunrise JD and target instant JD (converting local clock input to UTC)
        self.sunrise_jd = compute_local_sunrise_jd(
            year, month, day, round(self.lat, 4), round(self.lon, 4), self.tz_offset_hours
        )
        next_dt = datetime.date(year, month, day) + datetime.timedelta(days=1)
        self.next_sunrise_jd = compute_local_sunrise_jd(
            next_dt.year, next_dt.month, next_dt.day, round(self.lat, 4), round(self.lon, 4), self.tz_offset_hours
        )

        utc_hours = hour + (minute / 60.0) - self.tz_offset_hours
        if HAS_SWISSEPH:
            self.julian_day = float(swe.julday(year, month, day, utc_hours))
            swe.set_sid_mode(AYANAMSA_LAHIRI)
        else:
            y, m = year, month
            if m <= 2:
                y -= 1
                m += 12
            a = math.floor(y / 100)
            b = 2 - a + math.floor(a / 4)
            self.julian_day = (
                math.floor(365.25 * (y + 4716))
                + math.floor(30.6001 * (m + 1))
                + day
                + (utc_hours / 24.0)
                + b
                - 1524.5
            )

    def get_ayanamsa(self, jd: Optional[float] = None) -> float:
        """Return True Chitrapaksha (Lahiri) Ayanamsa in degrees."""
        target_jd = jd if jd is not None else self.julian_day
        return _cached_ayanamsa(round(target_jd, 6))

    def get_sun_moon_longitude(self, jd: Optional[float] = None) -> Tuple[float, float]:
        """Return sidereal (Sun_Longitude, Moon_Longitude) in degrees [0, 360)."""
        target_jd = jd if jd is not None else self.julian_day
        return _cached_sun_moon_sidereal(round(target_jd, 6))

    @staticmethod
    def _tithi_label(tithi_num: int) -> Tuple[str, str]:
        paksha = "Shukla Paksha" if tithi_num <= 15 else "Krishna Paksha"
        idx = (tithi_num - 1) % 15
        name = TITHI_NAMES[idx]
        if tithi_num == 15:
            name = "Purnima"
        elif tithi_num == 30:
            name = "Amavasya"
        return paksha, name

    def calculate_tithi(self, eval_jd: Optional[float] = None) -> Dict[str, Any]:
        """
        Compute the active Tithi at `eval_jd` (defaults to `self.julian_day`),
        along with exact start/end Julian Days via continuous binary search,
        and detect Kshaya Tithi or Adhika (Vriddhi) Tithi relative to local sunrises.
        """
        jd = eval_jd if eval_jd is not None else self.julian_day
        sun_lon, moon_lon = self.get_sun_moon_longitude(jd)
        diff = (moon_lon - sun_lon) % 360.0
        tithi_num = int(math.floor(diff / 12.0)) + 1
        tithi_completion = ((diff % 12.0) / 12.0) * 100.0
        paksha, name = self._tithi_label(tithi_num)

        start_jd = find_exact_boundary_jd(jd, elongation_at_jd, 12.0, direction=-1)
        end_jd = find_exact_boundary_jd(jd, elongation_at_jd, 12.0, direction=1)

        # Evaluate Udaya Tithi (at sunrise) to check Kshaya & Adhika status for the day
        sr_elong = elongation_at_jd(self.sunrise_jd)
        sr_tithi_num = int(math.floor(sr_elong / 12.0)) + 1
        sr_start_jd = find_exact_boundary_jd(self.sunrise_jd, elongation_at_jd, 12.0, direction=-1)
        sr_end_jd = find_exact_boundary_jd(self.sunrise_jd, elongation_at_jd, 12.0, direction=1)

        is_adhika = (sr_start_jd <= self.sunrise_jd and sr_end_jd >= self.next_sunrise_jd)
        is_kshaya = False
        kshaya_tithi_info: Optional[Dict[str, Any]] = None

        if sr_end_jd < self.next_sunrise_jd:
            next_tithi_end_jd = find_exact_boundary_jd(sr_end_jd + 0.01, elongation_at_jd, 12.0, direction=1)
            if next_tithi_end_jd < self.next_sunrise_jd:
                is_kshaya = True
                kshaya_num = (sr_tithi_num % 30) + 1
                k_paksha, k_name = self._tithi_label(kshaya_num)
                kshaya_tithi_info = {
                    "tithi_number": kshaya_num,
                    "paksha": k_paksha,
                    "name": k_name,
                    "start_jd": round(sr_end_jd, 6),
                    "end_jd": round(next_tithi_end_jd, 6)
                }

        return {
            "tithi_number": tithi_num,
            "paksha": paksha,
            "name": name,
            "completion_percentage": round(tithi_completion, 2),
            "start_jd": round(start_jd, 6),
            "end_jd": round(end_jd, 6),
            "is_adhika": is_adhika,
            "is_kshaya": is_kshaya,
            "kshaya_tithi": kshaya_tithi_info
        }

    def calculate_nakshatra(self, longitude: Optional[float] = None) -> Dict[str, Any]:
        """Compute Sidereal Lunar Nakshatra (1–27) and Pada (1–4)."""
        if longitude is None:
            _, longitude = self.get_sun_moon_longitude()

        nakshatra_degree = 360.0 / 27.0
        nakshatra_num = int(math.floor(longitude / nakshatra_degree)) + 1
        pada = min(4, int(math.floor((longitude % nakshatra_degree) / (nakshatra_degree / 4.0))) + 1)

        return {
            "nakshatra_number": nakshatra_num,
            "name": NAKSHATRA_NAMES[nakshatra_num - 1],
            "pada": pada
        }

    def calculate_rashi(self, longitude: Optional[float] = None) -> Dict[str, Any]:
        """Compute Sidereal Rashi (1–12) from ecliptic longitude."""
        if longitude is None:
            _, longitude = self.get_sun_moon_longitude()

        rashi_num = int(math.floor(longitude / 30.0)) + 1
        return {
            "rashi_number": rashi_num,
            "name": RASHI_NAMES[rashi_num - 1]
        }


def calculate_tara_bala(birth_nakshatra_num: int, transit_nakshatra_num: int) -> Dict[str, Any]:
    """Compute classical 9-fold Tarabala compatibility between birth star and transit star."""
    count = (transit_nakshatra_num - birth_nakshatra_num + 27) % 27 + 1
    tara_category = count % 9
    if tara_category == 0:
        tara_category = 9

    tara_names = {
        1: ("Janma", "Neutral/Danger to body"),
        2: ("Sampat", "Very Favorable (Wealth/Prosperity)"),
        3: ("Vipat", "Unfavorable (Losses/Obstacles)"),
        4: ("Kshema", "Favorable (Well-being/Prosperity)"),
        5: ("Pratyak", "Unfavorable (Obstacles)"),
        6: ("Sadhana", "Very Favorable (Success/Goals)"),
        7: ("Naidhana", "Highly Unfavorable (Avoid)"),
        8: ("Mitra", "Favorable (Friendship/Support)"),
        9: ("Parama Mitra", "Extremely Favorable (Best Results)")
    }
    name, status = tara_names[tara_category]
    is_auspicious = tara_category in [2, 4, 6, 8, 9]
    return {
        "tara_number": tara_category,
        "name": name,
        "status": status,
        "is_auspicious": is_auspicious
    }


def evaluate_multi_person_compatibility(
    people_birth_data: List[Dict[str, Any]],
    target_date_nakshatra_num: int
) -> Dict[str, Any]:
    """Evaluate group Tarabala suitability across multiple family members."""
    results = []
    total_auspicious = 0

    for person in people_birth_data:
        tb = calculate_tara_bala(person["nakshatra_num"], target_date_nakshatra_num)
        if tb["is_auspicious"]:
            total_auspicious += 1
        results.append({
            "person_name": person["name"],
            "tara_bala": tb
        })

    score_percentage = (total_auspicious / len(people_birth_data)) * 100.0 if people_birth_data else 0.0
    return {
        "overall_suitability_score": score_percentage,
        "is_recommended": score_percentage >= 70.0,
        "person_breakdown": results
    }

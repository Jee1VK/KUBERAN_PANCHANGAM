"""
app.py — Kuberan Panchangam FastAPI Server & REST Endpoints
============================================================

Exposes REST endpoints for computing high-precision Drik Ganita Panchangam
limbs and multi-person Tarabala compatibility with coordinate validation
and dynamic IANA timezone resolution.
"""

from __future__ import annotations

import datetime
from typing import List, Optional

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from engine import (
    DEFAULT_LAT,
    DEFAULT_LON,
    VedicEngine,
    evaluate_multi_person_compatibility,
    resolve_iana_timezone,
    validate_coordinates,
)

app = FastAPI(title="Kuberan Panchangam API")

# Serve static files (HTML, CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")


class PersonData(BaseModel):
    """Birth details for a single individual."""
    name: str
    dob: str  # ISO 8601 string


class CompatibilityRequest(BaseModel):
    """Request payload for multi-person Muhurtha compatibility."""
    activity: str
    target_date: str
    lat: float = DEFAULT_LAT
    lon: float = DEFAULT_LON
    tz: Optional[str] = None
    people: List[PersonData]


@app.get("/", response_class=HTMLResponse)
async def read_index() -> str:
    """Serve the main Panchangam application interface."""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.get("/sw.js")
async def get_sw() -> FileResponse:
    """Serve the Progressive Web App service worker."""
    return FileResponse("static/sw.js", media_type="application/javascript")


@app.get("/manifest.json")
async def get_manifest() -> FileResponse:
    """Serve the Web App Manifest."""
    return FileResponse("static/manifest.json", media_type="application/json")


@app.get("/api/panchanga")
def get_panchanga(
    date: str,
    lat: float = DEFAULT_LAT,
    lon: float = DEFAULT_LON,
    tz: Optional[str] = None
) -> dict:
    """
    Compute Tithi (with continuous root-found start/end JDs and Kshaya/Adhika flags),
    Nakshatra, Rashi, and Ayanamsa for the requested ISO datetime and coordinates.
    """
    v_lat, v_lon, is_valid = validate_coordinates(lat, lon)
    resolved_tz = resolve_iana_timezone(v_lat, v_lon, tz)
    dt = datetime.datetime.fromisoformat(date)
    engine = VedicEngine(
        dt.year, dt.month, dt.day, dt.hour, dt.minute,
        lat=v_lat, lon=v_lon, tz_name=resolved_tz
    )
    tithi = engine.calculate_tithi()
    nakshatra = engine.calculate_nakshatra()
    rashi = engine.calculate_rashi()
    return {
        "coordinates": {
            "lat": v_lat,
            "lon": v_lon,
            "timezone": resolved_tz,
            "valid_input": is_valid
        },
        "ayanamsa_deg": round(engine.get_ayanamsa(), 6),
        "sunrise_jd": round(engine.sunrise_jd, 6),
        "tithi": tithi,
        "nakshatra": nakshatra,
        "rashi": rashi
    }


@app.post("/api/compatibility")
def get_compatibility(req: CompatibilityRequest) -> dict:
    """
    Evaluate multi-person Tarabala compatibility against the active Nakshatra
    at local sunrise (or specified target timestamp) on `target_date`.
    """
    v_lat, v_lon, _ = validate_coordinates(req.lat, req.lon)
    resolved_tz = resolve_iana_timezone(v_lat, v_lon, req.tz)

    td = datetime.datetime.fromisoformat(req.target_date)
    target_engine = VedicEngine(
        td.year, td.month, td.day, td.hour, td.minute,
        lat=v_lat, lon=v_lon, tz_name=resolved_tz
    )
    # Evaluate target date Nakshatra at local sunrise when no specific hour was provided
    eval_jd = target_engine.sunrise_jd if (td.hour == 0 and td.minute == 0) else target_engine.julian_day
    _, target_moon_lon = target_engine.get_sun_moon_longitude(eval_jd)
    target_nak = target_engine.calculate_nakshatra(target_moon_lon)["nakshatra_number"]

    people_birth_data = []
    for p in req.people:
        if not p.dob:
            continue
        bd = datetime.datetime.fromisoformat(p.dob)
        pe = VedicEngine(
            bd.year, bd.month, bd.day, bd.hour, bd.minute,
            lat=v_lat, lon=v_lon, tz_name=resolved_tz
        )
        p_nak = pe.calculate_nakshatra()["nakshatra_number"]
        people_birth_data.append({
            "name": p.name,
            "nakshatra_num": p_nak
        })

    return evaluate_multi_person_compatibility(people_birth_data, target_nak)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import os
import uvicorn
import datetime

from engine import VedicEngine, evaluate_multi_person_compatibility

app = FastAPI(title="Kuberan Panchangam API")

# Serve static files (HTML, CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

class PersonData(BaseModel):
    name: str
    dob: str # ISO string
    
class CompatibilityRequest(BaseModel):
    activity: str
    target_date: str
    lat: float
    lon: float
    people: List[PersonData]

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/panchanga")
def get_panchanga(date: str, lat: float, lon: float):
    dt = datetime.datetime.fromisoformat(date)
    engine = VedicEngine(dt.year, dt.month, dt.day, dt.hour, dt.minute, lat, lon)
    tithi = engine.calculate_tithi()
    nakshatra = engine.calculate_nakshatra()
    rashi = engine.calculate_rashi()
    return {
        "tithi": tithi,
        "nakshatra": nakshatra,
        "rashi": rashi
    }

@app.post("/api/compatibility")
def get_compatibility(req: CompatibilityRequest):
    # Calculate for the target date
    td = datetime.datetime.fromisoformat(req.target_date)
    target_engine = VedicEngine(td.year, td.month, td.day, 12, 0, req.lat, req.lon)
    target_nak = target_engine.calculate_nakshatra()["nakshatra_number"]
    
    people_birth_data = []
    for p in req.people:
        if not p.dob: continue
        bd = datetime.datetime.fromisoformat(p.dob)
        # Assuming birth at noon if no time provided, just for calculation
        pe = VedicEngine(bd.year, bd.month, bd.day, bd.hour, bd.minute, req.lat, req.lon)
        p_nak = pe.calculate_nakshatra()["nakshatra_number"]
        people_birth_data.append({
            "name": p.name,
            "nakshatra_num": p_nak
        })
        
    result = evaluate_multi_person_compatibility(people_birth_data, target_nak)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

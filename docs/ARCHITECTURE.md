# Architecture & Code Audit

## 1. Current State of the Codebase
- **Backend (Python)**: `app.py` and `engine.py` form a robust FastAPI backend using `pyswisseph` (Swiss Ephemeris). It offers perfect astronomical accuracy (Drik Ganita, Lahiri).
- **Frontend (Static PWA)**: The `docs/` folder contains a standalone `index.html` that powers the GitHub Pages site. It is a Progressive Web App (PWA) that runs 100% offline.
- **The Divergence**: Because the PWA needs to run offline in the browser, it currently bypasses the Python backend and relies on a custom, lightweight JavaScript astronomical engine. This JS engine has a small error margin (~1-3 minutes) compared to the Swiss Ephemeris.

## 2. Gap Analysis vs. Specifications (S1-S8)
- **Accuracy (S6)**: The user's highest priority is exact match with the Ontikoppal Panchanga (sub-minute accuracy). The current offline JS engine cannot guarantee this. The Python engine can.
- **Offline PWA vs. High Accuracy (S8)**: The spec asks for an offline PWA. We cannot run Python offline on an iPhone browser. To get Swiss Ephemeris accuracy in an offline PWA, we must explore a WebAssembly (WASM) port of Swiss Ephemeris, or pre-compute all data in Python and serve static JSON feeds (`docs/feeds/...`) as specified in S7.
- **Missing Features**: We lack the `rules/` directory (JSON rule packs), the CLI calibration tools, exact Choghadiya/Gowri timings, and the advanced Muhurtham finder API.

## 3. Recommended Architecture Path
To achieve **both** 100% offline capability on GitHub Pages **and** Swiss Ephemeris accuracy (zero cost), we will follow Track A from S8:
1. **The Python Engine (Developer Side)**: We expand the Python `engine.py` to be our "ground truth" calculator.
2. **Static Data Feeds (S7)**: We write a script (`tools/build_feeds.py`) that runs the Python engine to pre-calculate all Panchangam, Muhurthams, and Festivals for the next 3 years for 20+ major cities. It outputs static JSON files to `docs/feeds/`.
3. **The PWA (User Side)**: The `docs/index.html` PWA will fetch and cache these JSON files. When a user checks the Panchangam offline, it reads the pre-calculated, 100% accurate Swiss Ephemeris data from the local cache. 

## 4. Phase 0 Task List (Proposed)
1. Restructure the repo: Move current backend files into an `api/` folder and setup the `rules/` and `profiles/` directories.
2. Implement the calibration profile (`profiles/vontikoppal.json`) and the test harness (S6).
3. Draft the initial `tests/fixtures/vontikoppal_2026.csv` using dummy data to establish the CI pipeline.
4. Update the Python `engine.py` to ensure it outputs timezone-aware UTC datetimes strictly.

---
*Awaiting User Approval to begin Phase 0.*
